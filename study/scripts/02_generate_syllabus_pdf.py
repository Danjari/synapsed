#!/usr/bin/env python3
"""Generate syllabus PDF from syllabus.json."""

from __future__ import annotations

import sys
from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

from lib.api_client import load_json  # noqa: E402
from lib.pdf_builder import build_syllabus_pdf  # noqa: E402


def main() -> int:
    syllabus_path = STUDY_ROOT / "data" / "syllabus" / "syllabus.json"
    output_path = STUDY_ROOT / "data" / "syllabus" / "output" / "syllabus.pdf"
    syllabus = load_json(syllabus_path)
    build_syllabus_pdf(syllabus, output_path)
    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
