#!/usr/bin/env python3
"""Upload syllabus PDF to Synapsed class materials."""

from __future__ import annotations

import sys
from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

from lib.api_client import get_class_id, load_json, save_json, upload_file  # noqa: E402


def main() -> int:
    pdf_path = STUDY_ROOT / "data" / "syllabus" / "output" / "syllabus.pdf"
    if not pdf_path.exists():
        print("Run 02_generate_syllabus_pdf.py first")
        return 1

    class_id = get_class_id()
    result = upload_file("/api/classMaterial/upload", class_id, pdf_path, "SYLLABUS")
    materials = result.get("materials", [])
    if not materials:
        print("Upload failed:", result)
        return 1

    material_id = materials[0]["id"]
    meta_path = STUDY_ROOT / "data" / "syllabus" / "output" / "upload_meta.json"
    save_json(meta_path, {"classId": class_id, "materialId": material_id, "materials": materials})
    print(f"Uploaded syllabus materialId={material_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
