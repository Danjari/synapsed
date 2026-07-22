#!/usr/bin/env python3
"""Process uploaded syllabus via /api/syllabus/extract."""

from __future__ import annotations

import sys
from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

from lib.api_client import load_json, poll_syllabus_extract, save_json  # noqa: E402


def main() -> int:
    meta_path = STUDY_ROOT / "data" / "syllabus" / "output" / "upload_meta.json"
    if not meta_path.exists():
        print("Run 03_upload_materials.py first")
        return 1

    meta = load_json(meta_path)
    material_id = meta["materialId"]
    result = poll_syllabus_extract(material_id)
    out_path = STUDY_ROOT / "data" / "syllabus" / "output" / "extract_result.json"
    save_json(out_path, result)
    print(f"Syllabus processed for materialId={material_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
