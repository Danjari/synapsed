#!/usr/bin/env python3
"""Generate pathways offline via Gemini — no DB, no dev server, no seed."""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

from lib.api_client import load_json, save_json  # noqa: E402
from lib.pathway_generator import generate_pathway_with_retry, get_gemini_client  # noqa: E402
from lib.rate_limit import api_delay_sec  # noqa: E402
from lib.syllabus_context import syllabus_to_context  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate pathways offline via Gemini")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even if pathway JSON already exists",
    )
    args = parser.parse_args()

    syllabus = load_json(STUDY_ROOT / "data" / "syllabus" / "syllabus.json")
    profiles_data = load_json(STUDY_ROOT / "data" / "profiles" / "synthetic_profiles.json")
    profiles = profiles_data["profiles"]

    syllabus_context = syllabus_to_context(syllabus)
    client = get_gemini_client()

    results_dir = STUDY_ROOT / "data" / "results" / "pathways"
    results_dir.mkdir(parents=True, exist_ok=True)

    delay = api_delay_sec()
    generated: list[str] = []
    skipped = 0

    for profile in profiles:
        profile_id = profile["id"]
        out_path = results_dir / f"{profile_id}.json"

        if out_path.exists() and not args.force:
            print(f"Skipping {profile_id} (already exists — use --force to regenerate)")
            generated.append(profile_id)
            skipped += 1
            continue

        print(f"Generating pathway for {profile_id}...")
        try:
            nodes = generate_pathway_with_retry(
                client, syllabus, syllabus_context, profile["answers"]
            )
        except Exception as exc:
            print(f"FAILED {profile_id}: {exc}", file=sys.stderr)
            print("Stopping. Re-run to resume — completed profiles are kept on disk.", file=sys.stderr)
            return 1

        payload = {
            "profileId": profile_id,
            "cluster": profile.get("cluster"),
            "field": profile.get("field"),
            "description": profile.get("description", ""),
            "studentId": f"offline-{profile_id}",
            "source": "offline-gemini",
            "nodeCount": len(nodes),
            "nodes": nodes,
        }
        save_json(out_path, payload)
        generated.append(profile_id)
        time.sleep(delay)

    save_json(
        STUDY_ROOT / "data" / "results" / "pathways_index.json",
        {"source": "offline", "profiles": generated, "count": len(generated), "skipped_existing": skipped},
    )
    print(f"Saved {len(generated)} pathway entries ({len(generated) - skipped} new, {skipped} skipped)")
    if len(generated) < len(profiles):
        print(f"WARNING: expected {len(profiles)} profiles, have {len(generated)}")
    print("Next: python scripts/09_research_evaluation.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
