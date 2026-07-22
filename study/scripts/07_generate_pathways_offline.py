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
from lib.course_paths import resolve  # noqa: E402
from lib.pathway_generator import generate_pathway_with_retry, get_gemini_client  # noqa: E402
from lib.rate_limit import api_delay_sec  # noqa: E402
from lib.research_metrics import block_multiset, block_sequence, compute_block_floors  # noqa: E402
from lib.syllabus_context import syllabus_to_context  # noqa: E402


def structure_lock_from_pathway(nodes: list[dict]) -> dict:
    return {
        "block_sequence": block_sequence(nodes),
        "block_counts": dict(block_multiset(nodes)),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate pathways offline via Gemini")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even if pathway JSON already exists",
    )
    parser.add_argument(
        "--course",
        default=None,
        help="Course id under data/courses/<id>/ (omit for the default AI-literacy course)",
    )
    args = parser.parse_args()

    paths = resolve(args.course)
    syllabus = load_json(paths.syllabus)
    profiles_data = load_json(paths.profiles)
    profiles = profiles_data["profiles"]

    syllabus_context = syllabus_to_context(syllabus)
    client = get_gemini_client()

    results_dir = paths.pathways_dir
    results_dir.mkdir(parents=True, exist_ok=True)
    spec_path = paths.spec if args.course else None

    block_floors = None
    if args.course:
        spec = load_json(paths.spec)
        rc = spec.get("requiredCourseModel")
        if rc:
            block_floors = compute_block_floors(syllabus, min_pathway_nodes=rc.get("floorMinPathwayNodes", 14))

    delay = api_delay_sec()
    generated: list[str] = []
    skipped = 0
    failed: list[dict[str, str]] = []
    profiles_by_id = {p["id"]: p for p in profiles}

    for profile in profiles:
        profile_id = profile["id"]
        out_path = results_dir / f"{profile_id}.json"

        if out_path.exists() and not args.force:
            print(f"Skipping {profile_id} (already exists — use --force to regenerate)")
            generated.append(profile_id)
            skipped += 1
            continue

        structure_lock = None
        paired_id = profile.get("paired_with")
        if paired_id:
            paired_path = results_dir / f"{paired_id}.json"
            if paired_path.exists():
                paired_nodes = load_json(paired_path).get("nodes", [])
                if paired_nodes:
                    structure_lock = structure_lock_from_pathway(paired_nodes)
                    print(f"Generating pathway for {profile_id} (structure locked to {paired_id})...")
                else:
                    print(f"Generating pathway for {profile_id}...")
            else:
                print(
                    f"WARNING: paired profile {paired_id} missing — generate it first",
                    file=sys.stderr,
                )
                print(f"Generating pathway for {profile_id}...")
        else:
            print(f"Generating pathway for {profile_id}...")

        try:
            nodes = generate_pathway_with_retry(
                client,
                syllabus,
                syllabus_context,
                profile["answers"],
                structure_lock=structure_lock,
                spec_path=spec_path,
                tier=profile.get("tier"),
                block_floors=block_floors,
            )
        except Exception as exc:
            print(f"FAILED {profile_id}: {exc}", file=sys.stderr)
            failed.append({"profileId": profile_id, "error": str(exc)})
            time.sleep(delay)
            continue

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
        paths.results_dir / "pathways_index.json",
        {
            "source": "offline",
            "profiles": generated,
            "count": len(generated),
            "skipped_existing": skipped,
            "failed": failed,
        },
    )
    print(f"Done: {len(generated)} on disk ({len(generated) - skipped} new, {skipped} skipped)")
    if failed:
        print(f"FAILED {len(failed)} profiles:", file=sys.stderr)
        for f in failed:
            print(f"  - {f['profileId']}: {f['error']}", file=sys.stderr)
        print("Re-run to retry failures only.", file=sys.stderr)
        return 1
    if len(generated) < len(profiles):
        print(f"WARNING: expected {len(profiles)} profiles, have {len(generated)}")
    print("Next: python scripts/09_research_evaluation.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
