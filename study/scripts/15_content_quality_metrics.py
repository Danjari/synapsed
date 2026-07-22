#!/usr/bin/env python3
"""Does the nodeRole tag correspond to a real content difference, or just a
correct count? Three checks, all reading actual node text via local
embeddings + a readability proxy (no LLM judge, no API cost):

1. Cross-profile diversity: are scaffolding_catchup nodes for different
   students in the same tier textually distinct (personalized), or
   near-duplicates (templated)? Compared against core_required as a
   baseline, since required content is EXPECTED to be more uniform.
2. Within-pathway role separability: for a single student, is their
   scaffolding_catchup node in the foundational block actually different
   in content from their core_required/enrichment_advanced node there,
   or just a relabeled duplicate?
3. Readability: do scaffolding_catchup nodes read as simpler (higher
   Flesch Reading Ease) than core_required/enrichment_advanced nodes on
   average? This is the one check that speaks to "simpler," which
   embeddings alone (a similarity measure, not a difficulty measure)
   cannot answer on their own.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

import numpy as np  # noqa: E402

from lib.api_client import load_json, save_json  # noqa: E402
from lib.content_quality import flesch_reading_ease, mean_pairwise_similarity, node_text, pairwise_similarity  # noqa: E402
from lib.course_paths import resolve  # noqa: E402


def load_pathways(pathways_dir: Path) -> dict[str, list[dict[str, Any]]]:
    pathways = {}
    for path in sorted(pathways_dir.glob("*.json")):
        if path.name == "pathways_index.json":
            continue
        pathways[path.stem] = load_json(path).get("nodes", [])
    return pathways


def cross_profile_diversity(
    pathways: dict[str, list[dict[str, Any]]],
    profiles: list[dict[str, Any]],
    foundational_block_ids: list[str],
    tier_order: list[str],
) -> dict[str, Any]:
    tier_by_id = {p["id"]: p["tier"] for p in profiles}
    results: dict[str, Any] = {}
    for tier in tier_order:
        by_role: dict[str, list[str]] = {"scaffolding_catchup": [], "core_required": [], "enrichment_advanced": []}
        for pid, nodes in pathways.items():
            if tier_by_id.get(pid) != tier:
                continue
            for n in nodes:
                if n.get("syllabusBlockId") in foundational_block_ids:
                    role = n.get("nodeRole")
                    if role in by_role:
                        by_role[role].append(node_text(n))
        results[tier] = {
            role: {"n": len(texts), "mean_pairwise_similarity": mean_pairwise_similarity(texts)}
            for role, texts in by_role.items()
        }
    return results


def within_pathway_separability(
    pathways: dict[str, list[dict[str, Any]]], foundational_block_ids: list[str]
) -> dict[str, Any]:
    scaffold_vs_other: list[float] = []
    other_vs_other: list[float] = []
    for pid, nodes in pathways.items():
        foundational_nodes = [n for n in nodes if n.get("syllabusBlockId") in foundational_block_ids]
        scaffold = [n for n in foundational_nodes if n.get("nodeRole") == "scaffolding_catchup"]
        other = [n for n in foundational_nodes if n.get("nodeRole") in ("core_required", "enrichment_advanced")]
        for s in scaffold:
            for o in other:
                scaffold_vs_other.append(pairwise_similarity(node_text(s), node_text(o)))
        for i in range(len(other)):
            for j in range(i + 1, len(other)):
                other_vs_other.append(pairwise_similarity(node_text(other[i]), node_text(other[j])))
    return {
        "scaffolding_vs_core_or_enrichment": {
            "n_pairs": len(scaffold_vs_other),
            "mean_similarity": round(float(np.mean(scaffold_vs_other)), 4) if scaffold_vs_other else None,
        },
        "core_or_enrichment_vs_itself": {
            "n_pairs": len(other_vs_other),
            "mean_similarity": round(float(np.mean(other_vs_other)), 4) if other_vs_other else None,
        },
        "interpretation": (
            "If scaffolding-vs-other similarity is close to or higher than core/enrichment-vs-itself, "
            "the scaffolding node isn't meaningfully distinct content — it's a relabeled duplicate."
        ),
    }


def readability_by_role(pathways: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    scores: dict[str, list[float]] = {"scaffolding_catchup": [], "core_required": [], "enrichment_advanced": []}
    for nodes in pathways.values():
        for n in nodes:
            role = n.get("nodeRole")
            if role in scores:
                score = flesch_reading_ease(node_text(n))
                if score is not None:
                    scores[role].append(score)
    return {
        role: {"n": len(vals), "mean_flesch_reading_ease": round(float(np.mean(vals)), 2) if vals else None}
        for role, vals in scores.items()
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Content-quality checks (embeddings + readability)")
    parser.add_argument("--course", required=True)
    args = parser.parse_args()

    paths = resolve(args.course)
    spec = load_json(paths.spec)
    rc = spec.get("requiredCourseModel", {})
    foundational = rc.get("foundationalBlockIds", [])
    tier_order = rc.get("tierOrder", [])
    profiles = load_json(paths.profiles)["profiles"]
    pathways = load_pathways(paths.pathways_dir)

    print(f"=== {args.course}: content-quality checks ({len(pathways)} pathways) ===\n")

    print("1. Cross-profile diversity (is scaffolding content personalized or templated?)")
    diversity = cross_profile_diversity(pathways, profiles, foundational, tier_order)
    for tier, roles in diversity.items():
        print(f"  {tier}:")
        for role, d in roles.items():
            print(f"    {role}: n={d['n']}, mean pairwise similarity={d['mean_pairwise_similarity']}")

    print("\n2. Within-pathway role separability (is scaffolding distinct from core/enrichment?)")
    separability = within_pathway_separability(pathways, foundational)
    print(f"  scaffolding vs core/enrichment: {separability['scaffolding_vs_core_or_enrichment']}")
    print(f"  core/enrichment vs itself:      {separability['core_or_enrichment_vs_itself']}")

    print("\n3. Readability (does scaffolding read as simpler? higher Flesch = easier)")
    readability = readability_by_role(pathways)
    for role, d in readability.items():
        print(f"  {role}: n={d['n']}, mean Flesch Reading Ease={d['mean_flesch_reading_ease']}")

    report = {
        "course_id": args.course,
        "cross_profile_diversity": diversity,
        "within_pathway_separability": separability,
        "readability_by_role": readability,
    }
    save_json(paths.reports_dir / "content_quality.json", report)
    print(f"\nSaved: {paths.reports_dir}/content_quality.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
