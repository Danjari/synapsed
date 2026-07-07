#!/usr/bin/env python3
"""Power analysis for the AI-literacy Phase 0 pipeline, grounded in real Run 3 data.

Goal: instead of guessing a round number like "200 profiles," compute the
actual effect size and variance observed in the real 50-profile / 50-pathway
Run 3 dataset, then use standard power formulas (statsmodels) to report how
many profiles are actually needed to reliably detect each personalization
signal — and, for the primary diversity gate, bootstrap how the precision of
the mean-Jaccard estimate improves with sample size.

Two things this script deliberately does NOT do:
- It does not touch AI-literacy's existing spec/rules/thresholds/report.
- It does not invent new contrast groups — it reuses the exact same
  keyword/prereq logic already in lib/rule_validator.py, so the "low prior
  knowledge" / "business-oriented" / etc. groups here are the same real
  criteria the pipeline already checks, just applied across ALL profiles
  instead of only the two named H1-H4 anchors.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

import numpy as np  # noqa: E402
from statsmodels.stats.power import TTestIndPower  # noqa: E402

from lib.api_client import load_json, save_json  # noqa: E402
from lib.course_paths import resolve  # noqa: E402
from lib.research_metrics import block_count, multiset_jaccard  # noqa: E402
from lib.rule_validator import (  # noqa: E402
    BUSINESS_KEYWORDS,
    ETHICS_KEYWORDS,
    PROMPTING_KEYWORDS,
    RESEARCH_KEYWORDS,
    _has_any,
    _needs_foundation_compress,
    _needs_foundation_depth,
    _survey_text,
)

ALPHA = 0.05
TARGET_POWER = 0.80


def cohens_d(group_a: list[float], group_b: list[float]) -> float | None:
    a, b = np.array(group_a, dtype=float), np.array(group_b, dtype=float)
    if len(a) < 2 or len(b) < 2:
        return None
    pooled_var = ((len(a) - 1) * a.var(ddof=1) + (len(b) - 1) * b.var(ddof=1)) / (len(a) + len(b) - 2)
    pooled_std = pooled_var**0.5
    if pooled_std == 0:
        return float("inf") if a.mean() != b.mean() else 0.0
    return (a.mean() - b.mean()) / pooled_std


def required_n_per_group(d: float | None) -> str | int:
    """Direct small-n search rather than statsmodels' continuous solver: the
    solver's numerical search fails to converge for very large effect sizes
    (it can't bound a search whose answer is n=2, the minimum for a t-test),
    which is exactly the regime our rule-driven, near-deterministic contrasts
    fall into. Searching n=2..500 directly for the first n that reaches the
    target power avoids that failure mode and is just as exact."""
    if d is None:
        return "n/a (fewer than 2 profiles in a group)"
    if d == 0:
        return "undetectable (groups identical on this measure in current data)"
    if d == float("inf"):
        return 2  # perfectly separated groups in current data; minimum n for a t-test
    analysis = TTestIndPower()
    for n in range(2, 500):
        power = analysis.power(effect_size=abs(d), nobs1=n, alpha=ALPHA, ratio=1.0, alternative="larger")
        if power >= TARGET_POWER:
            return n
    return "n/a (>500 needed — effect size too small to reach target power in a reasonable range)"


def contrast_group_analysis(
    profiles: list[dict[str, Any]], pathways: dict[str, list[dict[str, Any]]]
) -> list[dict[str, Any]]:
    """Real (not anchor-only) group comparisons, using the same criteria
    lib/rule_validator.py already applies per-profile."""
    results = []

    def counts_for(pred, block_ids: list[str]) -> tuple[list[float], list[float]]:
        in_group, out_group = [], []
        for p in profiles:
            if p["id"] not in pathways:
                continue
            text = _survey_text(p.get("answers", {}))
            nodes = pathways[p["id"]]
            total = sum(block_count(nodes, b) for b in block_ids)
            (in_group if pred(p, text) else out_group).append(total)
        return in_group, out_group

    contrasts = [
        (
            "foundation_depth_vs_compress",
            "block_01 count: profiles needing foundation depth vs. profiles needing compression",
            lambda p, t: _needs_foundation_depth(p.get("answers", {}), t)
            and not _needs_foundation_compress(p.get("answers", {}), t),
            lambda p, t: _needs_foundation_compress(p.get("answers", {}), t),
            ["block_01"],
        ),
        (
            "business_vs_research_track",
            "block_05a count: business-keyword profiles vs. research-keyword profiles",
            lambda p, t: _has_any(t, BUSINESS_KEYWORDS) and not _has_any(t, RESEARCH_KEYWORDS),
            lambda p, t: _has_any(t, RESEARCH_KEYWORDS) and not _has_any(t, BUSINESS_KEYWORDS),
            ["block_05a"],
        ),
        (
            "research_vs_business_track",
            "block_05b count: research-keyword profiles vs. business-keyword profiles",
            lambda p, t: _has_any(t, RESEARCH_KEYWORDS) and not _has_any(t, BUSINESS_KEYWORDS),
            lambda p, t: _has_any(t, BUSINESS_KEYWORDS) and not _has_any(t, RESEARCH_KEYWORDS),
            ["block_05b"],
        ),
        (
            "ethics_emphasis",
            "block_06 count: ethics-keyword profiles vs. everyone else",
            lambda p, t: _has_any(t, ETHICS_KEYWORDS),
            lambda p, t: not _has_any(t, ETHICS_KEYWORDS),
            ["block_06"],
        ),
        (
            "prompting_emphasis",
            "block_03+block_04 count: prompting-keyword profiles vs. everyone else",
            lambda p, t: _has_any(t, PROMPTING_KEYWORDS),
            lambda p, t: not _has_any(t, PROMPTING_KEYWORDS),
            ["block_03", "block_04"],
        ),
    ]

    for key, description, pred_a, pred_b, block_ids in contrasts:
        group_a = counts_for(pred_a, block_ids)[0]
        group_b = counts_for(pred_b, block_ids)[0]
        d = cohens_d(group_a, group_b)
        results.append(
            {
                "contrast": key,
                "description": description,
                "n_group_a": len(group_a),
                "n_group_b": len(group_b),
                "mean_group_a": round(float(np.mean(group_a)), 3) if group_a else None,
                "mean_group_b": round(float(np.mean(group_b)), 3) if group_b else None,
                "observed_cohens_d": round(d, 3) if isinstance(d, float) and d not in (float("inf"),) else d,
                "required_n_per_group_for_80pct_power": required_n_per_group(d),
            }
        )
    return results


def bootstrap_diversity_precision(
    pathways: dict[str, list[dict[str, Any]]],
    *,
    sample_sizes: list[int],
    n_bootstrap: int = 500,
    seed: int = 42,
) -> list[dict[str, Any]]:
    """How much does the precision of the mean pairwise-Jaccard estimate
    improve as profile count grows? Resample profiles with replacement at
    each candidate N, recompute the mean pairwise Jaccard among the sampled
    set, and report the bootstrap 95% CI half-width at each N."""
    rng = np.random.default_rng(seed)
    ids = list(pathways.keys())
    results = []

    for n in sample_sizes:
        if n > len(ids):
            continue
        means = []
        for _ in range(n_bootstrap):
            sample_ids = rng.choice(ids, size=n, replace=False)
            sims = [
                multiset_jaccard(pathways[sample_ids[i]], pathways[sample_ids[j]])
                for i in range(n)
                for j in range(i + 1, n)
            ]
            if sims:
                means.append(float(np.mean(sims)))
        means_arr = np.array(means)
        lo, hi = np.percentile(means_arr, [2.5, 97.5])
        results.append(
            {
                "n_profiles": n,
                "bootstrap_mean_of_means": round(float(means_arr.mean()), 4),
                "ci_95_low": round(float(lo), 4),
                "ci_95_high": round(float(hi), 4),
                "ci_95_half_width": round(float(hi - lo) / 2, 4),
            }
        )
    return results


def main() -> int:
    paths = resolve(None)  # AI-literacy — default paths, read-only, nothing else touched
    profiles = load_json(paths.profiles)["profiles"]

    pathways: dict[str, list[dict[str, Any]]] = {}
    for path in sorted(paths.pathways_dir.glob("*.json")):
        if path.name == "pathways_index.json":
            continue
        pathways[path.stem] = load_json(path).get("nodes", [])

    print(f"Loaded {len(profiles)} profiles, {len(pathways)} pathways (Run 3, AI literacy)\n")

    print("=== Contrast group power analysis (real groups, not just anchor pairs) ===")
    contrast_results = contrast_group_analysis(profiles, pathways)
    for r in contrast_results:
        print(f"\n{r['contrast']}: {r['description']}")
        print(f"  group sizes: a={r['n_group_a']}, b={r['n_group_b']}")
        print(f"  means: a={r['mean_group_a']}, b={r['mean_group_b']}")
        print(f"  observed Cohen's d: {r['observed_cohens_d']}")
        print(f"  required n/group for 80% power: {r['required_n_per_group_for_80pct_power']}")

    print("\n=== Diversity-gate precision vs. sample size (bootstrap, 500 resamples/N) ===")
    diversity_results = bootstrap_diversity_precision(pathways, sample_sizes=[10, 20, 30, 40, 50])
    for r in diversity_results:
        print(
            f"  N={r['n_profiles']:>2}: mean Jaccard ~ {r['bootstrap_mean_of_means']} "
            f"(95% CI half-width {r['ci_95_half_width']})"
        )

    report = {
        "source": "Run 3 AI-literacy pathways (real data, no new API calls)",
        "alpha": ALPHA,
        "target_power": TARGET_POWER,
        "contrast_group_power_analysis": contrast_results,
        "diversity_gate_bootstrap_precision": diversity_results,
    }
    save_json(paths.reports_dir / "power_analysis.json", report)
    print(f"\nSaved: {paths.reports_dir}/power_analysis.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
