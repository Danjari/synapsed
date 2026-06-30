#!/usr/bin/env python3
"""Seed synthetic students, survey, and responses via /api/study/seed."""

from __future__ import annotations

import os
import sys
from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

from lib.api_client import (  # noqa: E402
    get_study_api_key,
    load_json,
    load_study_env,
    post_json,
    save_json,
)


def main() -> int:
    load_study_env()
    profiles_path = STUDY_ROOT / "data" / "profiles" / "synthetic_profiles.json"
    data = load_json(profiles_path)
    profiles = data["profiles"]

    body: dict = {
        "apiKey": get_study_api_key(),
        "profiles": profiles,
        "reset": True,
    }

    class_id = os.getenv("STUDY_CLASS_ID")
    professor_id = os.getenv("STUDY_PROFESSOR_ID")
    if class_id:
        body["classId"] = class_id
    elif professor_id:
        body["professorId"] = professor_id
    else:
        print("Set STUDY_CLASS_ID or STUDY_PROFESSOR_ID in study/.env")
        return 1

    result = post_json("/api/study/seed", body, api_key=get_study_api_key())
    out_path = STUDY_ROOT / "data" / "profiles" / "seed_result.json"
    save_json(out_path, result)
    print(f"Seeded classId={result['classId']} surveyId={result['surveyId']} ({len(result['students'])} students)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
