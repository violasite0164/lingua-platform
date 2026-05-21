#!/usr/bin/env python3
"""Deep audit of questions_seed*.sql — facts, STEM collisions, explanation hints, DISPLAY_STRIP.

DISPLAY_STRIP logic must stay aligned with lib/quiz/question-utils.ts (stripQuestionNumberPrefix).
"""
from __future__ import annotations

import re
import sys
from collections import defaultdict
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from validate_question_seeds import iter_question_rows  # noqa: E402


def _normalize_inline_whitespace_py(text: str) -> str:
    """Mirror lib/quiz/question-utils.ts normalizeInlineWhitespace."""
    cleaned = (
        text.replace("\u00a0", " ")
        .replace("\u200b", "")
        .replace("\u2060", "")
        .replace("\u180e", "")
    )
    cleaned = re.sub(r"[\u2000-\u200f\u202f\u205f\u3000\uFEFF]", " ", cleaned)
    cleaned = re.sub(
        r"^[\s\u00a0\u2000-\u200f\u202f\u205f\u3000\uFEFF]+|[\s\u00a0\u2000-\u200f\u202f\u205f\u3000\uFEFF]+$",
        "",
        cleaned,
    )
    return re.sub(r"\s+", " ", cleaned)


def _strip_question_number_prefix_py(text: str) -> str:
    """Mirror lib/quiz/question-utils.ts stripQuestionNumberPrefix (keep regex in sync)."""
    s = _normalize_inline_whitespace_py(text)
    for _ in range(6):
        next_s = s
        next_s = re.sub(
            r"^\s*[【\[]\s*(?:\d+|[一二三四五六七八九十]+)\s*[】\]]\s*",
            "",
            next_s,
            flags=re.UNICODE,
        )
        next_s = re.sub(
            r"^\s*\d+\s*[\.)\uff0e\u3001:：]\s*",
            "",
            next_s,
            flags=re.UNICODE,
        )
        next_s = re.sub(
            r"^\s*[\(\uff08]\s*\d+\s*[\)\uff09]\s*",
            "",
            next_s,
            flags=re.UNICODE,
        )
        next_s = re.sub(
            r"^\s*[一二三四五六七八九十]+\s*(?:題\s*)?(?:[\.\)\uff0e\u3001:：\-–—])?\s*",
            "",
            next_s,
            flags=re.UNICODE,
        )
        next_s = re.sub(r"^\s*第\s*[一二三四五六七八九十]+\s*題\s*", "", next_s, flags=re.UNICODE)
        if next_s == s:
            break
        s = next_s
    out = _normalize_inline_whitespace_py(s)
    return out if out else _normalize_inline_whitespace_py(text)


_LEADING_ARABIC_THEN_ENGLISH_WORD = re.compile(r"^(\d+)\s+[A-Za-z]")


def audit_display_strip(rows: list[tuple[str, int, dict]]) -> list[str]:
    """
    Catch aggressive stripQuestionNumberPrefix regressions (e.g. '12 minus…' → 'minus…').
    If the stem opens with digits then an English letter, the displayed line must still start with those digits.
    """
    issues: list[str] = []
    for fname, lineno, r in rows:
        q = r["question_text"]
        nq = _normalize_inline_whitespace_py(q)
        stripped = _strip_question_number_prefix_py(q)
        m = _LEADING_ARABIC_THEN_ENGLISH_WORD.match(nq)
        if not m:
            continue
        prefix = m.group(1)
        if not stripped.startswith(prefix):
            issues.append(
                f"[DISPLAY_STRIP] {fname}:{lineno}: strip removed leading number {prefix!r} "
                f"(UI would hide math/context)\n  raw={nq[:90]!r}\n  out={stripped[:90]!r}"
            )
    return issues


def _opt_body(opt: str) -> str:
    return re.sub(r"^[A-D]\.\s*", "", opt).strip().lower()


def _norm_stem(q: str) -> str:
    s = q.strip().lower()
    for suf in (
        " (choose the best option).",
        " (choose the best option)?",
        " (choose the best option)",
    ):
        if s.endswith(suf):
            s = s[: -len(suf)]
    s = re.sub(r"^【[三四一二]】\s*", "", s)
    return s.strip()


WORD_NUM = {
    "zero": 0,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
    "twenty": 20,
}


def _answer_matches_number(txt: str, n: int) -> bool:
    t = txt.lower()
    if str(n) in re.findall(r"\d+", t):
        return True
    for w, v in WORD_NUM.items():
        if v == n and re.search(rf"\b{re.escape(w)}\b", t):
            return True
    return False


def audit_facts(rows: list[tuple[str, int, dict]]) -> list[str]:
    issues: list[str] = []
    for fname, lineno, r in rows:
        q = r["question_text"]
        opts = r["options"]
        idx = r["correct_index"]
        ans = _opt_body(opts[idx])

        m = re.search(r"(\d+)\s+minus\s+(\d+)\s+equals", q, re.I)
        if m:
            want = int(m.group(1)) - int(m.group(2))
            if not _answer_matches_number(ans, want):
                issues.append(
                    f"[ARITH] {fname}:{lineno}: expected result {want} for {q[:70]}… "
                    f"but keyed {_opt_body(opts[idx])}"
                )

        m = re.search(r"(\d+)\s+plus\s+(\d+)\s+equals", q, re.I)
        if m:
            want = int(m.group(1)) + int(m.group(2))
            if not _answer_matches_number(ans, want):
                issues.append(
                    f"[ARITH] {fname}:{lineno}: expected sum {want} for {q[:70]}… "
                    f"but keyed {_opt_body(opts[idx])}"
                )

        if re.search(r"triangle has ___ sides", q, re.I):
            if "three" not in ans.split() and ans.strip() != "3":
                issues.append(f"[FACT] {fname}:{lineno}: triangle sides should be three; got {ans!r} | {q}")

        if re.search(r"rectangle has ___ sides", q, re.I):
            if "four" not in ans.split() and ans.strip() != "4":
                issues.append(f"[FACT] {fname}:{lineno}: rectangle sides four; got {ans!r} | {q}")

        if re.search(r"water freezes at", q, re.I) and "celsius" in q.lower():
            if ans not in {"0", "zero"}:
                issues.append(f"[FACT] {fname}:{lineno}: freeze ≈ 0°C keyed {ans!r} | {q}")

        if re.search(r"boiling water", q, re.I) and "celsius" in q.lower():
            if "100" not in ans and "hundred" not in ans:
                issues.append(f"[FACT] {fname}:{lineno}: boiling ≈100°C keyed {ans!r} | {q}")

        expl = r["explanation"]

        if (
            "Scarcely had the train stopped" in q
            and "Scarcely...when" in expl.replace("…", "...")
            and ans != "when"
        ):
            issues.append(
                f"[EXPL_HINT] {fname}:{lineno}: Scarcely…when but answer is {ans!r}"
            )

        if "Hardly ___ sat down when" in q and "Hardly had I" in expl:
            if ans.replace(" ", "") != "hadi":
                issues.append(
                    f"[EXPL_HINT] {fname}:{lineno}: Hardly had I but answer is {ans!r}"
                )

        if "No sooner ___ the bell rung than" in q and "No sooner had" in expl:
            if ans != "had":
                issues.append(
                    f"[EXPL_HINT] {fname}:{lineno}: No sooner had but answer is {ans!r}"
                )

        em = re.search(r"(\d+)\s*[-−]\s*(\d+)\s*=\s*(\d+)", expl)
        if em:
            a, b, c = int(em.group(1)), int(em.group(2)), int(em.group(3))
            if a - b != c:
                issues.append(f"[EXPL_BAD] {fname}:{lineno}: explanation math wrong {expl[:80]}")
            elif not _answer_matches_number(ans, c):
                issues.append(
                    f"[EXPL_MISMATCH] {fname}:{lineno}: explanation says {c} but answer is {ans!r}"
                )

    return issues


def audit_duplicate_stems(rows: list[tuple[str, int, dict]]) -> list[str]:
    by: dict[str, list[tuple[str, int, str, str, int]]] = defaultdict(list)
    for fname, lineno, r in rows:
        stem = _norm_stem(r["question_text"])
        ans = _opt_body(r["options"][r["correct_index"]])
        by[stem].append((fname, lineno, r["difficulty"], ans, r["correct_index"]))
    issues: list[str] = []
    for stem, lst in sorted(by.items()):
        keys = {(x[3], x[4]) for x in lst}
        if len(keys) <= 1:
            continue
        issues.append(f"[STEM_SPLIT] Same stem appears with different keys ({len(keys)} variants):")
        for tup in lst:
            issues.append(f"    {tup[0]}:{tup[1]} [{tup[2]}] idx={tup[4]} ans={tup[3][:60]!r}")
        issues.append(f"    stem={stem[:100]}")
    return issues


def main() -> int:
    root = Path(__file__).resolve().parent
    seeds = sorted(
        p
        for p in root.glob("questions_seed*.sql")
        if p.name != "questions_seed_600.sql"
    )
    rows: list[tuple[str, int, dict]] = []
    for p in seeds:
        for lineno, r in iter_question_rows(p):
            rows.append((p.name, lineno, r))

    fact_issues = audit_facts(rows)
    dup_issues = audit_duplicate_stems(rows)
    strip_issues = audit_display_strip(rows)
    all_issues = fact_issues + dup_issues + strip_issues

    if all_issues:
        print("\n".join(all_issues))
        print(f"\n-- Found {len(all_issues)} finding(s).")
        return 2

    print(f"DEEP AUDIT OK: {len(rows)} row(s) across {len(seeds)} seed file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
