#!/usr/bin/env python3
"""Validate syllabus.json schema and dedupe keys."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

from lib.api_client import load_json  # noqa: E402
from lib.course_paths import resolve  # noqa: E402

REQUIRED_TOP = ("courseTitle", "blocks", "learningObjectives", "prerequisites", "scheduleWeeks")
REQUIRED_BLOCK = ("id", "title", "calendarWeek", "lessons", "dedupeKey")


def validate_syllabus(syllabus: dict) -> list[str]:
    errors: list[str] = []
    for key in REQUIRED_TOP:
        if key not in syllabus:
            errors.append(f"Missing top-level field: {key}")

    blocks = syllabus.get("blocks", [])
    if not blocks:
        errors.append("blocks array is empty")

    seen_ids: set[str] = set()
    dedupe_keys: dict[str, str] = {}
    lesson_count = 0

    for i, block in enumerate(blocks):
        for key in REQUIRED_BLOCK:
            if key not in block:
                errors.append(f"Block {i}: missing {key}")
        block_id = block.get("id", "")
        if block_id in seen_ids:
            errors.append(f"Duplicate block id: {block_id}")
        seen_ids.add(block_id)

        dk = block.get("dedupeKey", "")
        if dk in dedupe_keys:
            errors.append(f"Duplicate dedupeKey '{dk}' in {block_id} and {dedupe_keys[dk]}")
        elif dk:
            dedupe_keys[dk] = block_id

        for j, lesson in enumerate(block.get("lessons", [])):
            if isinstance(lesson, dict):
                if "title" not in lesson or "source" not in lesson:
                    errors.append(f"Block {block_id} lesson {j}: needs title and source")
                lesson_count += 1
            elif isinstance(lesson, str):
                lesson_count += 1

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate syllabus.json schema and dedupe keys")
    parser.add_argument(
        "--course",
        default=None,
        help="Course id under data/courses/<id>/ (omit for the default AI-literacy course)",
    )
    args = parser.parse_args()

    path = resolve(args.course).syllabus
    syllabus = load_json(path)
    errors = validate_syllabus(syllabus)
    if errors:
        print("Syllabus validation FAILED:")
        for err in errors:
            print(f"  - {err}")
        return 1
    blocks = syllabus["blocks"]
    lessons = sum(len(b["lessons"]) for b in blocks)
    skipped = sum(len(b.get("skippedLessons", [])) for b in blocks)
    print(
        f"Syllabus OK: {len(blocks)} blocks, {lessons} included lessons, "
        f"{skipped} skipped, {syllabus['scheduleWeeks']} weeks, "
        f"{len(syllabus['learningObjectives'])} objectives"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
