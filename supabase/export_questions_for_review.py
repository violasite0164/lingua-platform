#!/usr/bin/env python3
"""Export quiz seed rows to Markdown for bulk grammar review (e.g. Grok / external QA).

Parses INSERT … VALUES lines from questions_seed*.sql (single-line tuples).

Usage:
  python3 supabase/export_questions_for_review.py
  python3 supabase/export_questions_for_review.py --out supabase/questions_review_export.md
  python3 supabase/export_questions_for_review.py --only questions_seed_600.sql
  python3 supabase/export_questions_for_review.py --dedupe-first

Default output: supabase/questions_review_export.md
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class Row:
    source: str
    line_no: int
    difficulty: str
    question_text: str
    options_raw: str
    correct_answer_old: str
    correct_index: int
    explanation: str


def _read_sql_string(s: str, start: int) -> tuple[str, int]:
    """Parse a PostgreSQL single-quoted string starting at s[start] == ''."""
    if start >= len(s) or s[start] != "'":
        raise ValueError(f"expected opening quote at {start}: {s[start:start + 20]!r}")
    i = start + 1
    parts: list[str] = []
    while i < len(s):
        ch = s[i]
        if ch == "'":
            if i + 1 < len(s) and s[i + 1] == "'":
                parts.append("'")
                i += 2
                continue
            return "".join(parts), i + 1
        parts.append(ch)
        i += 1
    raise ValueError("unterminated string")


def _skip_ws(s: str, i: int) -> int:
    while i < len(s) and s[i] in " \t":
        i += 1
    return i


def _parse_int(s: str, i: int) -> tuple[int, int]:
    i = _skip_ws(s, i)
    j = i
    if j < len(s) and s[j] == "-":
        j += 1
    while j < len(s) and s[j].isdigit():
        j += 1
    if j == i or (j == i + 1 and s[i] == "-"):
        raise ValueError(f"expected int at {i}: {s[i:i + 20]!r}")
    return int(s[i:j]), j


def parse_tuple_line(line: str) -> tuple[str, str, str, str, int, str] | None:
    """Return (difficulty, question, options_json, letter, index, explanation) or None."""
    raw = line.strip()
    if not raw.startswith("("):
        return None
    if raw.endswith(","):
        raw = raw[:-1]
    if raw.endswith(";"):
        raw = raw[:-1]
    raw = raw.strip()
    if not raw.endswith(")"):
        return None
    inner = raw[1:-1]

    i = _skip_ws(inner, 0)
    difficulty, i = _read_sql_string(inner, i)
    i = _skip_ws(inner, i)
    if i >= len(inner) or inner[i] != ",":
        raise ValueError("expected comma after difficulty")
    i = _skip_ws(inner, i + 1)

    question_text, i = _read_sql_string(inner, i)
    i = _skip_ws(inner, i)
    if i >= len(inner) or inner[i] != ",":
        raise ValueError("expected comma after question_text")
    i = _skip_ws(inner, i + 1)

    options_raw, i = _read_sql_string(inner, i)
    i = _skip_ws(inner, i)
    cast = "::jsonb"
    if inner[i : i + len(cast)].lower() == cast.lower():
        i += len(cast)
    else:
        raise ValueError(f"expected ::jsonb after options, got {inner[i:i + 16]!r}")

    i = _skip_ws(inner, i)
    if i >= len(inner) or inner[i] != ",":
        raise ValueError("expected comma after ::jsonb")
    i = _skip_ws(inner, i + 1)

    letter, i = _read_sql_string(inner, i)
    i = _skip_ws(inner, i)
    if i >= len(inner) or inner[i] != ",":
        raise ValueError("expected comma after letter")
    i = _skip_ws(inner, i + 1)

    idx, i = _parse_int(inner, i)
    i = _skip_ws(inner, i)
    if i >= len(inner) or inner[i] != ",":
        raise ValueError("expected comma after correct_index")
    i = _skip_ws(inner, i + 1)

    explanation, i = _read_sql_string(inner, i)
    i = _skip_ws(inner, i)
    if i != len(inner):
        raise ValueError(f"trailing junk: {inner[i:i + 40]!r}")

    return difficulty, question_text, options_raw, letter, idx, explanation


def dedupe_first(rows: list[Row]) -> list[Row]:
    """Keep first row per (difficulty, question_text). Order preserved."""
    seen: set[tuple[str, str]] = set()
    out: list[Row] = []
    for r in rows:
        k = (r.difficulty, r.question_text)
        if k in seen:
            continue
        seen.add(k)
        out.append(r)
    return out


def iter_seed_files(roots: list[Path], only_names: list[str] | None) -> list[Path]:
    files: list[Path] = []
    only_set = {n.strip() for n in only_names} if only_names else None

    def keep_name(name: str) -> bool:
        if only_set is None:
            return True
        return name in only_set

    for root in roots:
        root = root.resolve()
        if root.is_file():
            if re.match(r"questions_seed.*\.sql$", root.name) and keep_name(root.name):
                files.append(root)
            continue
        if root.is_dir():
            for p in sorted(root.glob("questions_seed*.sql")):
                if keep_name(p.name):
                    files.append(p)
    # stable unique order
    seen: set[Path] = set()
    out: list[Path] = []
    for p in files:
        rp = p.resolve()
        if rp not in seen:
            seen.add(rp)
            out.append(rp)
    return sorted(out, key=lambda x: x.name)


def parse_file(path: Path) -> list[Row]:
    rows: list[Row] = []
    text = path.read_text(encoding="utf-8")
    for n, line in enumerate(text.splitlines(), start=1):
        if not line.strip().startswith("("):
            continue
        try:
            t = parse_tuple_line(line)
        except ValueError:
            continue
        if not t:
            continue
        difficulty, question_text, options_raw, letter, idx, explanation = t
        rows.append(
            Row(
                source=path.name,
                line_no=n,
                difficulty=difficulty,
                question_text=question_text,
                options_raw=options_raw,
                correct_answer_old=letter,
                correct_index=idx,
                explanation=explanation,
            )
        )
    return rows


def format_options_json(options_raw: str) -> tuple[list[str], str | None]:
    """Return bullet lines; err if JSON parse fails."""
    try:
        arr = json.loads(options_raw)
    except json.JSONDecodeError as e:
        return [], f"invalid options JSON: {e}"
    lines = []
    for item in arr:
        lines.append(f"- {item}")
    return lines, None


def build_markdown(rows: list[Row], *, deduped: bool) -> str:
    stem_map: dict[tuple[str, str], list[int]] = defaultdict(list)
    for i, r in enumerate(rows):
        stem_map[(r.difficulty, r.question_text)].append(i)

    dup_notes = {i for k, ids in stem_map.items() if len(ids) > 1 for i in ids}

    iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    parts: list[str] = [
        "# Quiz question bank — export for grammar review",
        "",
        f"_Generated {iso} · Parsed from local `questions_seed*.sql` (not live DB)"
        f"{' · **dedupe-first**' if deduped else ''}._",
        "",
        "Instructions for reviewers:",
        "",
        "1. Each block lists stem, four options, keyed letter/index, and author explanation.",
        "2. Flag **stem errors**, **wrong keyed answer**, **incoherent distractors**, or **bad explanation**.",
        "3. Rows marked **duplicate stem** share the same `(difficulty, question_text)` elsewhere in this export"
        + (" (meaningless if you ran `--dedupe-first`)." if deduped else "."),
        "",
        "---",
        "",
    ]

    for n, r in enumerate(rows, start=1):
        opts_lines, err = format_options_json(r.options_raw)
        letter = r.correct_answer_old.upper() if len(r.correct_answer_old) == 1 else r.correct_answer_old
        dup_tag = " · **duplicate stem (same difficulty)**" if n - 1 in dup_notes and len(stem_map[(r.difficulty, r.question_text)]) > 1 else ""

        parts.append(f"## Q{n:04d} — `{r.difficulty}` · `{r.source}`:{r.line_no}{dup_tag}")
        parts.append("")
        parts.append(f"**Stem:** {r.question_text}")
        parts.append("")
        parts.append("**Options:**")
        if err:
            parts.append(f"- _(parse error: {err})_ raw: `{r.options_raw[:120]}…`")
        else:
            parts.extend(opts_lines)
        parts.append("")
        parts.append(
            f"**Keyed answer:** {letter} (`correct_index={r.correct_index}`) — "
            f"_verify this matches the intended grammar rule._"
        )
        parts.append("")
        parts.append(f"**Explanation (zh):** {r.explanation}")
        parts.append("")
        parts.append("---")
        parts.append("")

    parts.append("## Duplicate stem index")
    parts.append("")
    for (diff, stem), ids in sorted(stem_map.items(), key=lambda x: (-len(x[1]), x[0][0], x[0][1])):
        if len(ids) < 2:
            continue
        qnums = ", ".join(f"Q{i + 1:04d}" for i in ids)
        parts.append(f"- **{diff}** · {stem[:80]}{'…' if len(stem) > 80 else ''} → {qnums}")
    parts.append("")

    parts.append(f"## Stats")
    parts.append("")
    parts.append(f"- Total rows: **{len(rows)}**")
    by_diff: dict[str, int] = defaultdict(int)
    for r in rows:
        by_diff[r.difficulty] += 1
    for d in sorted(by_diff.keys()):
        parts.append(f"- `{d}`: {by_diff[d]}")
    parts.append("")
    return "\n".join(parts)


def parse_options(options_raw: str) -> tuple[list[str] | None, str | None]:
    """Return parsed options list; err if JSON parse fails."""
    try:
        arr = json.loads(options_raw)
    except json.JSONDecodeError as e:
        return None, f"invalid options JSON: {e}"
    if not isinstance(arr, list):
        return None, "options JSON is not a list"
    return [str(x) for x in arr], None


def build_jsonl(rows: list[Row]) -> str:
    """One JSON object per line; easiest for external model batch review."""
    iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out_lines: list[str] = []
    for r in rows:
        options, err = parse_options(r.options_raw)
        keyed_letter = (
            r.correct_answer_old.upper() if len(r.correct_answer_old) == 1 else r.correct_answer_old
        )
        correct_option_text = None
        if options and 0 <= r.correct_index < len(options):
            correct_option_text = options[r.correct_index]
        payload = {
            "exported_at": iso,
            "source": r.source,
            "line_no": r.line_no,
            "difficulty": r.difficulty,
            "question_text": r.question_text,
            "options": options,
            "options_parse_error": err,
            "correct_answer_old": keyed_letter,
            "correct_index": r.correct_index,
            "correct_option_text": correct_option_text,
            "explanation": r.explanation,
        }
        out_lines.append(json.dumps(payload, ensure_ascii=False))
    return "\n".join(out_lines) + "\n"


def write_csv(rows: list[Row], out_path: Path) -> None:
    """Write review-friendly CSV (single file, no extra metadata rows)."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "source",
                "line_no",
                "difficulty",
                "question_text",
                "option_a",
                "option_b",
                "option_c",
                "option_d",
                "correct_answer_old",
                "correct_index",
                "correct_option_text",
                "explanation",
                "options_parse_error",
            ],
        )
        w.writeheader()
        for r in rows:
            options, err = parse_options(r.options_raw)
            opts = options or [None, None, None, None]
            opts = (opts + [None, None, None, None])[:4]
            keyed_letter = (
                r.correct_answer_old.upper() if len(r.correct_answer_old) == 1 else r.correct_answer_old
            )
            correct_option_text = None
            if options and 0 <= r.correct_index < len(options):
                correct_option_text = options[r.correct_index]
            w.writerow(
                {
                    "source": r.source,
                    "line_no": r.line_no,
                    "difficulty": r.difficulty,
                    "question_text": r.question_text,
                    "option_a": opts[0],
                    "option_b": opts[1],
                    "option_c": opts[2],
                    "option_d": opts[3],
                    "correct_answer_old": keyed_letter,
                    "correct_index": r.correct_index,
                    "correct_option_text": correct_option_text,
                    "explanation": r.explanation,
                    "options_parse_error": err,
                }
            )


def main() -> None:
    ap = argparse.ArgumentParser(description="Export questions_seed*.sql for bulk review.")
    ap.add_argument(
        "--roots",
        nargs="*",
        type=Path,
        default=[Path(__file__).resolve().parent],
        help="Files or directories to scan for questions_seed*.sql (default: supabase/)",
    )
    ap.add_argument(
        "--only",
        nargs="*",
        default=None,
        metavar="FILENAME",
        help="Only include these basenames (e.g. questions_seed_600.sql)",
    )
    ap.add_argument(
        "--dedupe-first",
        action="store_true",
        help="Keep first occurrence per (difficulty, question_text); shrinks overlapping seeds",
    )
    ap.add_argument(
        "--format",
        choices=["md", "jsonl", "csv"],
        default="md",
        help="Output format (default: md). jsonl/csv are best for model-assisted bulk checks.",
    )
    ap.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent / "questions_review_export.md",
        help="Output path (extension optional; not auto-changed)",
    )
    args = ap.parse_args()

    files = iter_seed_files(list(args.roots), args.only)
    if not files:
        raise SystemExit("No questions_seed*.sql found under given roots.")

    all_rows: list[Row] = []
    for f in files:
        all_rows.extend(parse_file(f))

    deduped = False
    if args.dedupe_first:
        before = len(all_rows)
        all_rows = dedupe_first(all_rows)
        deduped = len(all_rows) != before

    if args.format == "md":
        md = build_markdown(all_rows, deduped=bool(args.dedupe_first))
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(md, encoding="utf-8")
    elif args.format == "jsonl":
        js = build_jsonl(all_rows)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(js, encoding="utf-8")
    elif args.format == "csv":
        write_csv(all_rows, args.out)
    else:
        raise SystemExit(f"unsupported format: {args.format}")

    print(
        f"Wrote {len(all_rows)} questions to {args.out}"
        + (" (dedupe-first)" if args.dedupe_first else "")
        + f" [{args.format}]"
    )


if __name__ == "__main__":
    main()
