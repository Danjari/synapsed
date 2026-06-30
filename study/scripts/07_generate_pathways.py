#!/usr/bin/env python3
"""Generate learning pathways for all seeded synthetic profiles."""

from __future__ import annotations

import sys
import time
from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

from lib.api_client import get_json, load_json, post_json, save_json  # noqa: E402


def main() -> int:
    seed_path = STUDY_ROOT / "data" / "profiles" / "seed_result.json"
    if not seed_path.exists():
        print("Run 06_seed_study_class.py first")
        return 1

    seed = load_json(seed_path)
    class_id = seed["classId"]
    survey_id = seed["surveyId"]
    students = seed["students"]

    results_dir = STUDY_ROOT / "data" / "results" / "pathways"
    results_dir.mkdir(parents=True, exist_ok=True)

    generation_summary = []

    for student in students:
        profile_id = student["profileId"]
        student_id = student["studentId"]
        print(f"Generating pathway for {profile_id}...")

        gen_result = post_json(
            "/api/learning-paths/generate",
            {
                "classId": class_id,
                "surveyId": survey_id,
                "mode": "individual",
                "studentIds": [student_id],
            },
        )
        generation_summary.append({"profileId": profile_id, "studentId": student_id, "generation": gen_result})
        time.sleep(1)

    all_pathways = get_json(f"/api/pathway/professor/{class_id}")
    by_profile: dict = {}

    for student in students:
        profile_id = student["profileId"]
        student_id = student["studentId"]
        match = next((p for p in all_pathways.get("pathways", []) if p["studentId"] == student_id), None)
        if match:
            by_profile[profile_id] = match
            save_json(results_dir / f"{profile_id}.json", match)

    save_json(STUDY_ROOT / "data" / "results" / "generation_summary.json", generation_summary)
    save_json(STUDY_ROOT / "data" / "results" / "pathways_index.json", {"classId": class_id, "profiles": list(by_profile.keys())})
    print(f"Saved {len(by_profile)} pathway files to {results_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
