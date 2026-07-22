#!/usr/bin/env python3
"""Research-grade evaluation: block metrics, contrast hypotheses, LLM-as-judge."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

from lib.api_client import load_json, save_json  # noqa: E402
from lib.course_paths import resolve  # noqa: E402
from lib.llm_judge import get_anthropic_client, judge_all_profiles, stratified_judge_sample  # noqa: E402
from lib.pathway_metrics import evaluate_gate, pairwise_similarities  # noqa: E402
from lib.research_metrics import (  # noqa: E402
    block_floor_gate,
    cluster_gate_verdict,
    cluster_similarity_analysis,
    compute_block_floors,
    evaluate_contrast_hypotheses,
    length_invariance_check,
    pairwise_block_metrics,
    required_course_gate_verdict,
    research_gate_verdict,
    role_mix_monotonic_check,
)
from lib.rule_validator import evaluate_all_rules, rule_gate_verdict  # noqa: E402


def load_pathways(pathways_dir: Path) -> dict[str, list[dict]]:
    pathways: dict[str, list[dict]] = {}
    for path in sorted(pathways_dir.glob("*.json")):
        if path.name == "pathways_index.json":
            continue
        data = load_json(path)
        pathways[path.stem] = data.get("nodes", [])
    return pathways


def missing_block_ids(pathways: dict[str, list[dict]]) -> list[str]:
    missing: list[str] = []
    for pid, nodes in pathways.items():
        if not any(n.get("syllabusBlockId") for n in nodes):
            missing.append(pid)
    return missing


def build_html_report(report: dict) -> str:
    verdict = report["verdict"]
    status = "PASS" if verdict["passed"] else "FAIL"
    color = "#059669" if verdict["passed"] else "#dc2626"

    def rows(items: list[dict], cols: list[str]) -> str:
        out = ""
        for item in items:
            out += "<tr>" + "".join(f"<td>{item.get(c, '')}</td>" for c in cols) + "</tr>"
        return out

    block = report["block_metrics"]
    cluster = report.get("cluster_metrics", {})
    title = report["title_metrics"]
    contrasts = report["contrast_hypotheses"]
    judge = report.get("llm_judge", [])

    contrast_rows = rows(
        contrasts,
        ["hypothesis_id", "profile_a", "profile_b", "passed", "value", "count_a", "count_b", "expect"],
    )

    judge_rows = ""
    for j in judge or []:
        dims = ", ".join(f"{s['dimension_id']}: {s['score']}" for s in j.get("scores", []))
        judge_rows += (
            f"<tr><td>{j['profileId']}</td><td>{j['mean_score']}</td>"
            f"<td>{j.get('is_structural_not_cosmetic')}</td><td>{dims}</td></tr>"
        )

    style_rows = rows(
        cluster.get("style_control_pairs", []),
        ["style_profile", "paired_profile", "sequence_jaccard", "multiset_jaccard"],
    )

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Research Evaluation Report</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; line-height: 1.5;">
<h1>Phase 0 — Research Evaluation</h1>
<p style="font-size: 1.4rem; color: {color};"><strong>{status}</strong></p>
<p>Profiles evaluated: {report.get('profile_count', '?')} | Pathways found: {report.get('pathway_count', '?')}</p>

<h2>Combined gate</h2>
<pre>{json.dumps(verdict, indent=2)}</pre>

<h2>Cluster analysis (similarity vs divergence)</h2>
<pre>{json.dumps(cluster, indent=2)}</pre>

<h2>Block coverage metrics</h2>
<p>Mean multiset Jaccard: <strong>{block['mean_multiset_jaccard']}</strong></p>
<p>Mean sequence Jaccard: <strong>{block['mean_sequence_jaccard']}</strong></p>

<h2>Style-control pairs (learning_1 invariance)</h2>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Style profile</th><th>Paired profile</th><th>Sequence Jaccard</th><th>Multiset Jaccard</th></tr>
{style_rows or '<tr><td colspan="4">None</td></tr>'}
</table>

<h2>Pre-registered contrast hypotheses</h2>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>ID</th><th>Profile A</th><th>Profile B</th><th>Pass</th><th>Value</th><th>Count A</th><th>Count B</th><th>Expect</th></tr>
{contrast_rows}
</table>

<h2>LLM-as-judge (rubric 1–5)</h2>
<p>Sampled: {report.get('judge_sample_ids', 'all')}</p>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Profile</th><th>Mean</th><th>Structural?</th><th>Dimensions</th></tr>
{judge_rows or '<tr><td colspan="4">Skipped</td></tr>'}
</table>

<h2>Secondary — title Jaccard</h2>
<p>Mean title Jaccard: <strong>{title['mean_jaccard']}</strong></p>
</body></html>"""


def run_required_course_evaluation(paths, args) -> int:
    """Evaluation path for required, cumulative courses (OS, Data Structures):
    fixed-floor + catch-up personalization model, distinct from AI-literacy's
    alternative-track model. See study/report_required_courses.md."""
    if not paths.profiles.exists():
        print(f"No profiles.json yet at {paths.profiles} — waiting on the external profile handoff.")
        return 1

    if not paths.pathways_dir.exists() or not any(paths.pathways_dir.glob("*.json")):
        print(f"Run: python scripts/07_generate_pathways_offline.py --course {args.course}")
        return 1

    pathways = load_pathways(paths.pathways_dir)
    missing = missing_block_ids(pathways)
    if missing:
        print("WARNING: pathways lack syllabusBlockId — regenerate with script 07:")
        for pid in missing[:5]:
            print(f"  - {pid}")
        return 1

    profiles = load_json(paths.profiles)["profiles"]
    syllabus = load_json(paths.syllabus)
    spec = load_json(paths.spec)
    rc = spec.get("requiredCourseModel", {})

    floors = compute_block_floors(syllabus, min_pathway_nodes=rc.get("floorMinPathwayNodes", 14))
    floor_result = block_floor_gate(pathways, floors)
    role_mix_result = role_mix_monotonic_check(
        pathways,
        profiles,
        foundational_block_ids=rc.get("foundationalBlockIds", []),
        tier_order=rc.get("tierOrder", []),
    )
    band = tuple(rc.get("targetNodeBand", [10, 20]))
    length_result = length_invariance_check(pathways, band=band)
    verdict = required_course_gate_verdict(floor_result, role_mix_result, length_result)

    block_metrics = pairwise_block_metrics(pathways)

    judge_results = None
    judge_sample_ids = None
    if args.with_judge:
        sample_size = 15
        judge_sample_ids = (
            [p["id"] for p in profiles]
            if len(profiles) <= sample_size
            else stratified_judge_sample(profiles, sample_size, canonical_ids=set())
        )
        print(f"Running Claude judge on {len(judge_sample_ids)} profiles...")
        client = get_anthropic_client()
        judge_results = judge_all_profiles(
            client, profiles, pathways, syllabus, profile_ids=judge_sample_ids, spec_path=paths.spec
        )

    report = {
        "course_id": args.course,
        "personalization_model": spec.get("personalizationModel"),
        "verdict": verdict,
        "profile_count": len(profiles),
        "pathway_count": len(pathways),
        "block_floors": floor_result,
        "role_mix": role_mix_result,
        "length_invariance": length_result,
        "block_metrics_diagnostic": block_metrics,
        "llm_judge": judge_results,
        "judge_sample_ids": judge_sample_ids,
    }

    paths.reports_dir.mkdir(parents=True, exist_ok=True)
    save_json(paths.reports_dir / "research_evaluation.json", report)

    label = "PASS" if verdict["passed"] else "FAIL"
    floor_status = "OK" if floor_result["passed"] else f"{len(floor_result['violations'])} violations"
    print(f"Required-course gate ({args.course}): {label}")
    print(f"  profiles/pathways: {len(profiles)}/{len(pathways)}")
    print(f"  coverage floor: {floor_status}")
    print(f"  role-mix monotonic: {role_mix_result['passed']} (tier means: {role_mix_result['tier_means']})")
    print(f"  length invariance (band {band}): {length_result['passed']}")
    print(f"Report: {paths.reports_dir}/research_evaluation.json")
    return 0 if verdict["passed"] else 2


def main() -> int:
    parser = argparse.ArgumentParser(description="Research-grade pathway evaluation")
    parser.add_argument(
        "--with-judge",
        action="store_true",
        help="Include Claude LLM judge (supplementary; not required for primary pass)",
    )
    parser.add_argument(
        "--course",
        default=None,
        help="Course id under data/courses/<id>/ — uses the fixed-floor/catch-up evaluation model "
        "(omit for the default AI-literacy alternative-track evaluation)",
    )
    args = parser.parse_args()

    if args.course:
        return run_required_course_evaluation(resolve(args.course), args)

    config = yaml.safe_load((STUDY_ROOT / "config" / "study_config.yaml").read_text())
    research_cfg = config.get("research", {})
    diversity_cfg = config.get("diversity", {})

    pathways_dir = STUDY_ROOT / "data" / "results" / "pathways"
    if not pathways_dir.exists() or not any(pathways_dir.glob("*.json")):
        print("Run scripts/07_generate_pathways_offline.py first")
        return 1

    pathways = load_pathways(pathways_dir)
    missing = missing_block_ids(pathways)
    if missing:
        print("WARNING: pathways lack syllabusBlockId — regenerate with script 07:")
        for pid in missing[:5]:
            print(f"  - {pid}")
        if len(missing) > 5:
            print(f"  ... and {len(missing) - 5} more")
        return 1

    min_profiles = diversity_cfg.get("min_profiles", 45)
    profiles_data = load_json(STUDY_ROOT / "data" / "profiles" / "synthetic_profiles.json")
    profiles = profiles_data["profiles"]
    if len(profiles) < min_profiles:
        print(f"Expected at least {min_profiles} profiles, found {len(profiles)}")
        print("Run: python scripts/05_generate_synthetic_profiles.py")
        return 1

    if len(pathways) < min_profiles:
        print(f"Only {len(pathways)} pathways on disk — regenerate for all {len(profiles)} profiles:")
        print("  python scripts/07_generate_pathways_offline.py")
        return 1

    syllabus = load_json(STUDY_ROOT / "data" / "syllabus" / "syllabus.json")

    contrasting_pairs = [
        tuple(pair) for pair in research_cfg.get("contrasting_cluster_pairs", [])
    ]

    block_metrics = pairwise_block_metrics(pathways)
    contrast_results = evaluate_contrast_hypotheses(pathways)
    cluster_metrics = cluster_similarity_analysis(
        pathways, profiles, contrasting_cluster_pairs=contrasting_pairs
    )
    cluster_verdict = cluster_gate_verdict(
        cluster_metrics,
        min_within_cluster_multiset_jaccard=research_cfg.get("min_within_cluster_multiset_jaccard", 0.65),
        max_contrast_cluster_multiset_jaccard=research_cfg.get("max_contrast_cluster_multiset_jaccard", 0.70),
        min_style_control_pass_rate=research_cfg.get("min_style_control_pass_rate", 0.8),
    )

    rule_results = evaluate_all_rules(profiles, pathways)
    rule_verdict = rule_gate_verdict(
        rule_results,
        min_rule_pass_rate=research_cfg.get("min_rule_pass_rate", 0.85),
        min_profile_pass_rate=research_cfg.get("min_profile_pass_rate", 0.80),
    )

    judge_results: list[dict] | None = None
    judge_sample_ids: list[str] | None = None
    if args.with_judge:
        sample_size = research_cfg.get("judge_sample_size", 15)
        judge_sample_ids = (
            [p["id"] for p in profiles]
            if getattr(args, "judge_all", False) or len(profiles) <= sample_size
            else stratified_judge_sample(profiles, sample_size)
        )
        print(f"Running Claude judge on {len(judge_sample_ids)} profiles...")
        client = get_anthropic_client()
        judge_results = judge_all_profiles(
            client, profiles, pathways, syllabus, profile_ids=judge_sample_ids
        )

    core_verdict = research_gate_verdict(
        block_metrics,
        contrast_results,
        judge_results,
        max_mean_multiset_jaccard=research_cfg.get("max_mean_multiset_jaccard", 0.92),
        min_contrast_pass_rate=research_cfg.get("min_contrast_pass_rate", 0.8),
        min_mean_judge_score=research_cfg.get("min_mean_judge_score", 3.5),
        require_judge=args.with_judge,
    )

    combined_passed = core_verdict["passed"] and cluster_verdict["passed"] and rule_verdict["passed"]
    verdict = {
        **core_verdict,
        "passed": combined_passed,
        "cluster_gate": cluster_verdict,
        "rule_gate": rule_verdict,
        "primary_gate": "deterministic",
    }

    title_gate = evaluate_gate(
        pathways,
        threshold=diversity_cfg.get("mean_jaccard_threshold", 0.85),
        contrast_pair=("low_knowledge_general", "high_knowledge_research"),
    )

    report = {
        "verdict": verdict,
        "profile_count": len(profiles),
        "pathway_count": len(pathways),
        "block_metrics": block_metrics,
        "cluster_metrics": cluster_metrics,
        "contrast_hypotheses": contrast_results,
        "rule_compliance": rule_results,
        "llm_judge": judge_results,
        "judge_sample_ids": judge_sample_ids,
        "title_metrics": {
            "mean_jaccard": title_gate["mean_jaccard"],
            "threshold": title_gate["threshold"],
            "pairwise": pairwise_similarities(pathways),
        },
    }

    reports_dir = STUDY_ROOT / "data" / "results" / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    save_json(reports_dir / "research_evaluation.json", report)
    (reports_dir / "research_evaluation.html").write_text(build_html_report(report), encoding="utf-8")

    label = "PASS" if verdict["passed"] else "FAIL"
    print(f"Research gate: {label}")
    print(f"  profiles/pathways: {len(profiles)}/{len(pathways)}")
    print(f"  mean multiset Jaccard: {verdict['mean_multiset_jaccard']}")
    print(f"  within-cluster mean: {cluster_metrics.get('mean_within_cluster_multiset_jaccard')}")
    print(f"  contrast-cluster mean: {cluster_metrics.get('mean_contrast_cluster_multiset_jaccard')}")
    print(f"  contrast hypotheses: {verdict['contrasts_passed']}/{verdict['contrasts_total']}")
    print(f"  rule compliance: {rule_verdict['rule_pass_rate']} (min {rule_verdict['min_rule_pass_rate']})")
    if verdict.get("mean_judge_score") is not None:
        print(f"  mean judge score (supplementary): {verdict['mean_judge_score']}")
    print(f"Reports: {reports_dir}/research_evaluation.json")
    return 0 if verdict["passed"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
