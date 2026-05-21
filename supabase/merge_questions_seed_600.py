#!/usr/bin/env python3
"""Concatenate questions_seed_300_batch3.sql + batch4 into questions_seed_600.sql."""
from __future__ import annotations

from pathlib import Path


def _values_after_insert(path: Path) -> tuple[str, list[str]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    ins = next(i for i, L in enumerate(lines) if L.startswith("INSERT INTO questions"))
    return lines[ins], lines[ins + 1 :]


def main() -> None:
    root = Path(__file__).resolve().parent
    h3, v3 = _values_after_insert(root / "questions_seed_300_batch3.sql")
    _, v4 = _values_after_insert(root / "questions_seed_300_batch4.sql")
    if not v3[-1].endswith(");"):
        raise SystemExit(f"expected batch3 last line to end with ); got: {v3[-1]!r}")
    v3[-1] = v3[-1][:-2] + "),"
    out = [
        "-- 600 rows (batch3 + batch4): 75×4 difficulties each batch",
        "-- Regenerate: python3 supabase/generate_questions_300_batch3.py > supabase/questions_seed_300_batch3.sql",
        "--           python3 supabase/generate_questions_300_batch4.py > supabase/questions_seed_300_batch4.sql",
        "--           python3 supabase/merge_questions_seed_600.py",
        "",
        h3,
        *v3,
        *v4,
    ]
    (root / "questions_seed_600.sql").write_text("\n".join(out) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
