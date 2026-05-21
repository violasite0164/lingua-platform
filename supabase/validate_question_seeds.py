#!/usr/bin/env python3
"""Validate questions_seed_*.sql rows: correct_answer_old ↔ correct_index, options length, A–D prefixes."""
from __future__ import annotations

import json
import sys
from pathlib import Path


def _split_sql_tuple(inner: str) -> list[str]:
    """Split top-level comma-separated fields respecting '' escapes inside single-quoted strings."""
    fields: list[str] = []
    i = 0
    n = len(inner)
    start = 0
    depth_paren = 0
    in_quote = False
    while i < n:
        ch = inner[i]
        if in_quote:
            if ch == "'" and i + 1 < n and inner[i + 1] == "'":
                i += 2
                continue
            if ch == "'":
                in_quote = False
            i += 1
            continue
        if ch == "'":
            in_quote = True
            i += 1
            continue
        if ch == "(":
            depth_paren += 1
            i += 1
            continue
        if ch == ")":
            depth_paren = max(0, depth_paren - 1)
            i += 1
            continue
        if ch == "," and depth_paren == 0:
            fields.append(inner[start:i].strip())
            start = i + 1
        i += 1
    fields.append(inner[start:n].strip())
    return fields


def _strip_sql_string(s: str) -> str:
    s = s.strip()
    assert s.startswith("'") and s.endswith("'"), s[:80]
    body = s[1:-1].replace("''", "'")
    return body


def _parse_row(line: str) -> dict | None:
    line = line.strip().rstrip(",")
    if not line.startswith("("):
        return None
    if not line.endswith(")"):
        return None
    inner = line[1:-1]
    parts = _split_sql_tuple(inner)
    if len(parts) != 6:
        return None
    diff = _strip_sql_string(parts[0])
    qtext = _strip_sql_string(parts[1])
    opts_raw = parts[2].strip()
    if not opts_raw.endswith("::jsonb"):
        raise ValueError(f"expected ::jsonb, got {opts_raw[:120]!r}")
    opts_lit = opts_raw[: -len("::jsonb")].strip()
    json_txt = _strip_sql_string(opts_lit)
    options = json.loads(json_txt)
    letter = _strip_sql_string(parts[3])
    idx = int(parts[4].strip())
    expl = _strip_sql_string(parts[5])
    return {
        "difficulty": diff,
        "question_text": qtext,
        "options": options,
        "correct_answer_old": letter,
        "correct_index": idx,
        "explanation": expl,
    }


def iter_question_rows(path: Path):
    """Yield (lineno, row_dict) for each INSERT tuple row in a seed file."""
    text = path.read_text(encoding="utf-8")
    for lineno, line in enumerate(text.splitlines(), 1):
        if not line.strip().startswith("("):
            continue
        try:
            r = _parse_row(line)
        except Exception:
            continue
        if r:
            yield lineno, r


def validate_file(path: Path) -> list[str]:
    errors: list[str] = []
    text = path.read_text(encoding="utf-8")
    for lineno, line in enumerate(text.splitlines(), 1):
        if not line.strip().startswith("("):
            continue
        try:
            r = _parse_row(line)
        except Exception as e:
            errors.append(f"{path.name}:{lineno}: parse error: {e}")
            continue
        if not r:
            continue
        letter_idx = "ABCD".find(r["correct_answer_old"])
        if letter_idx < 0:
            errors.append(f"{path.name}:{lineno}: bad letter {r['correct_answer_old']!r}")
            continue
        if letter_idx != r["correct_index"]:
            errors.append(
                f"{path.name}:{lineno}: letter {r['correct_answer_old']} vs index {r['correct_index']} "
                f"| {r['question_text'][:60]}"
            )
        opts = r["options"]
        if len(opts) != 4:
            errors.append(f"{path.name}:{lineno}: expected 4 options got {len(opts)}")
            continue
        for i, lab in enumerate("ABCD"):
            pref = f"{lab}. "
            if not opts[i].startswith(pref):
                errors.append(
                    f"{path.name}:{lineno}: option[{i}] should start with {pref!r} got {opts[i][:40]!r}"
                )
    return errors


def main() -> int:
    root = Path(__file__).resolve().parent
    seeds = sorted(root.glob("questions_seed*.sql"))
    if not seeds:
        print("no questions_seed*.sql found", file=sys.stderr)
        return 1
    all_errs: list[str] = []
    for p in seeds:
        all_errs.extend(validate_file(p))
    if all_errs:
        print("\n".join(all_errs))
        return 1
    print(f"OK: validated {len(seeds)} seed file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
