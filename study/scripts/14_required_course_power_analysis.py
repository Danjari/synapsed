#!/usr/bin/env python3
"""Power analysis / trend test for a required course's role-mix personalization.

Uses the real generated pathways (not synthetic placeholder data) to run a
Jonckheere-Terpstra test for a monotonic scaffolding-vs-tier trend, and
reports the finding honestly: since scripts 07's prompt now injects an exact
per-tier scaffolding target (see lib/personalization_prompt.py's SCAFFOLD
TARGET block — added after real data showed prose rules alone weren't
reliable), the role-mix trend is closer to an enforced constraint than an
emergent signal. This script reports compliance with that constraint and
notes what remains a genuinely open, uninjected question: whether the
CONTENT of scaffolding_catchup nodes is actually pedagogically appropriate.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

import numpy as np  # noqa: E402

from lib.api_client import load_json, save_json  # noqa: E402
from lib.course_paths import resolve  # noqa: E402
from lib.research_metrics import jonckheere_terpstra_test, role_count  # noqa: E402


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Power analysis for a required course's role-mix trend")
    parser.add_argument("--course", required=True)
    args = parser.parse_args()

    paths = resolve(args.course)
    profiles = load_json(paths.profiles)["profiles"]
    spec = load_json(paths.spec)
    rc = spec.get("requiredCourseModel", {})
    tier_order = rc.get("tierOrder", [])
    foundational = rc.get("foundationalBlockIds", [])
    targets = rc.get("tierScaffoldTargets", {})

    tier_by_id = {p["id"]: p["tier"] for p in profiles}
    by_tier: dict[str, list[float]] = {t: [] for t in tier_order}
    for path in sorted(paths.pathways_dir.glob("*.json")):
        if path.name == "pathways_index.json":
            continue
        d = load_json(path)
        tier = tier_by_id.get(d["profileId"])
        if tier not in by_tier:
            continue
        by_tier[tier].append(role_count(d["nodes"], "scaffolding_catchup", foundational))

    compliance = {}
    for tier in tier_order:
        target = targets.get(tier)
        vals = by_tier[tier]
        hits = sum(1 for v in vals if v == target) if target is not None else None
        compliance[tier] = {
            "n": len(vals),
            "target": target,
            "mean": round(float(np.mean(vals)), 3) if vals else None,
            "std": round(float(np.std(vals)), 3) if vals else None,
            "exact_target_compliance_rate": round(hits / len(vals), 3) if vals and hits is not None else None,
        }

    # Reverse tier order (strong -> ... -> no) to test "increasing as prior exposure drops"
    jt_groups = [by_tier[t] for t in reversed(tier_order)]
    jt_result = jonckheere_terpstra_test(jt_groups)

    all_zero_variance = all(compliance[t]["std"] == 0.0 for t in tier_order if compliance[t]["std"] is not None)

    report = {
        "course_id": args.course,
        "foundational_block_ids": foundational,
        "tier_scaffold_targets": targets,
        "per_tier": compliance,
        "jonckheere_terpstra_test": jt_result,
        "interpretation": (
            "All tiers show zero within-tier variance in scaffolding_catchup count — the explicit "
            "per-tier target injected into the prompt (added after real data showed prose rules alone "
            "were unreliable, see report_required_courses.md) is being followed exactly, not just "
            "approximately. This means the role-mix trend is now closer to an ENFORCED constraint than "
            "an emergent signal: a power analysis / sample-size question doesn't meaningfully apply to "
            "it anymore (the effect is deterministic). The genuinely open, uninjected question is "
            "whether scaffolding_catchup NODE CONTENT is pedagogically appropriate for its tier, which "
            "requires the embedding-based content metric or human review, not a bigger N."
            if all_zero_variance
            else "Within-tier variance is nonzero — the trend below reflects real distributional spread, "
            "and the reported p-value / required-N reasoning is meaningful in the usual sense."
        ),
    }

    print(f"=== {args.course}: role-mix power analysis ===")
    for tier in tier_order:
        c = compliance[tier]
        print(f"  {tier}: n={c['n']}, target={c['target']}, mean={c['mean']}, std={c['std']}, "
              f"exact-compliance={c['exact_target_compliance_rate']}")
    print(f"  Jonckheere-Terpstra: {jt_result}")
    print(f"  {report['interpretation']}")

    save_json(paths.reports_dir / "power_analysis.json", report)
    print(f"\nSaved: {paths.reports_dir}/power_analysis.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
