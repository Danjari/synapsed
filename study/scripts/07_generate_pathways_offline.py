#!/usr/bin/env python3
"""Generate pathways offline via Gemini — no DB, no dev server, no seed."""

from __future__ import annotations

import sys
import time
from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

from lib.api_client import load_json, save_json  # noqa: E402
from lib.pathway_generator import generate_pathway_with_retry, get_gemini_client  # noqa: E402
from lib.syllabus_context import syllabus_to_context  # noqa: E402


def main() -> int:
    syllabus = load_json(STUDY_ROOT / "data" / "syllabus" / "syllabus.json")
    profiles_data = load_json(STUDY_ROOT / "data" / "profiles" / "synthetic_profiles.json")
    profiles = profiles_data["profiles"]

    syllabus_context = syllabus_to_context(syllabus)
    client = get_gemini_client()

    results_dir = STUDY_ROOT / "data" / "results" / "pathways"
    results_dir.mkdir(parents=True, exist_ok=True)

    generated: list[str] = []
    for profile in profiles:
        profile_id = profile["id"]
        print(f"Generating pathway for {profile_id}...")
        nodes = generate_pathway_with_retry(
            client, syllabus, syllabus_context, profile["answers"]
        )
        payload = {
            "profileId": profile_id,
            "description": profile.get("description", ""),
            "studentId": f"offline-{profile_id}",
            "source": "offline-gemini",
            "nodeCount": len(nodes),
            "nodes": nodes,
        }
        save_json(results_dir / f"{profile_id}.json", payload)
        generated.append(profile_id)
        time.sleep(1)

    save_json(
        STUDY_ROOT / "data" / "results" / "pathways_index.json",
        {"source": "offline", "profiles": generated, "count": len(generated)},
    )
    print(f"Saved {len(generated)} pathways to {results_dir}")
    if len(generated) < len(profiles):
        print(f"WARNING: expected {len(profiles)} profiles, generated {len(generated)}")
    print("Next: python scripts/09_research_evaluation.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
