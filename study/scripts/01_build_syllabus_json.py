#!/usr/bin/env python3
"""Validate syllabus.json schema and dedupe keys."""

from __future__ import annotations

import sys
from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

from lib.api_client import load_json  # noqa: E402

REQUIRED_TOP = ("courseTitle", "modules", "learningObjectives", "prerequisites")
REQUIRED_MODULE = ("id", "title", "week", "lessons", "dedupeKey")


def validate_syllabus(syllabus: dict) -> list[str]:
    errors: list[str] = []
    for key in REQUIRED_TOP:
        if key not in syllabus:
            errors.append(f"Missing top-level field: {key}")

    modules = syllabus.get("modules", [])
    if not modules:
        errors.append("modules array is empty")

    seen_ids: set[str] = set()
    dedupe_keys: dict[str, str] = {}

    for i, mod in enumerate(modules):
        for key in REQUIRED_MODULE:
            if key not in mod:
                errors.append(f"Module {i}: missing {key}")
        mod_id = mod.get("id", "")
        if mod_id in seen_ids:
            errors.append(f"Duplicate module id: {mod_id}")
        seen_ids.add(mod_id)

        dk = mod.get("dedupeKey", "")
        if dk in dedupe_keys:
            errors.append(f"Duplicate dedupeKey '{dk}' in {mod_id} and {dedupe_keys[dk]}")
        elif dk:
            dedupe_keys[dk] = mod_id

    return errors


def main() -> int:
    path = STUDY_ROOT / "data" / "syllabus" / "syllabus.json"
    syllabus = load_json(path)
    errors = validate_syllabus(syllabus)
    if errors:
        print("Syllabus validation FAILED:")
        for err in errors:
            print(f"  - {err}")
        return 1
    print(f"Syllabus OK: {len(syllabus['modules'])} modules, {len(syllabus['learningObjectives'])} objectives")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
