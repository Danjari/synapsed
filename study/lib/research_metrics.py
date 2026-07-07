"""Research metrics: block sequences, contrast hypotheses, title vs block comparison."""

from __future__ import annotations

from collections import Counter
from itertools import combinations
from typing import Any

from lib.personalization_prompt import load_generation_spec


def block_sequence(nodes: list[dict[str, Any]]) -> list[str]:
    """Ordered block ids (collapse consecutive duplicates)."""
    seq: list[str] = []
    for node in nodes:
        bid = node.get("syllabusBlockId")
        if not bid:
            continue
        if not seq or seq[-1] != bid:
            seq.append(bid)
    return seq


def block_multiset(nodes: list[dict[str, Any]]) -> Counter[str]:
    return Counter(n.get("syllabusBlockId") for n in nodes if n.get("syllabusBlockId"))


def block_count(nodes: list[dict[str, Any]], block_id: str) -> int:
    return block_multiset(nodes).get(block_id, 0)


def sequence_jaccard(seq_a: list[str], seq_b: list[str]) -> float:
    """Jaccard on ordered block sequences treated as sets of (position, block) pairs."""
    set_a = set(enumerate(seq_a))
    set_b = set(enumerate(seq_b))
    if not set_a and not set_b:
        return 1.0
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)


def multiset_jaccard(nodes_a: list[dict], nodes_b: list[dict]) -> float:
    """Jaccard on block id counts (ignores order — captures coverage similarity)."""
    ca, cb = block_multiset(nodes_a), block_multiset(nodes_b)
    keys = set(ca) | set(cb)
    if not keys:
        return 1.0
    num = sum(min(ca[k], cb[k]) for k in keys)
    den = sum(max(ca[k], cb[k]) for k in keys)
    return num / den if den else 1.0


def pairwise_block_metrics(pathways: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    seq_pairs: list[dict[str, Any]] = []
    multi_pairs: list[dict[str, Any]] = []
    for id_a, id_b in combinations(pathways.keys(), 2):
        na, nb = pathways[id_a], pathways[id_b]
        seq_pairs.append({
            "profile_a": id_a,
            "profile_b": id_b,
            "sequence_jaccard": round(sequence_jaccard(block_sequence(na), block_sequence(nb)), 4),
            "multiset_jaccard": round(multiset_jaccard(na, nb), 4),
        })
    mean_seq = sum(p["sequence_jaccard"] for p in seq_pairs) / len(seq_pairs) if seq_pairs else 1.0
    mean_multi = sum(p["multiset_jaccard"] for p in seq_pairs) / len(seq_pairs) if seq_pairs else 1.0
    return {
        "pairwise": seq_pairs,
        "mean_sequence_jaccard": round(mean_seq, 4),
        "mean_multiset_jaccard": round(mean_multi, 4),
        "profile_block_summaries": {
            pid: {
                "block_sequence": block_sequence(nodes),
                "block_counts": dict(block_multiset(nodes)),
                "node_count": len(nodes),
            }
            for pid, nodes in pathways.items()
        },
    }


def evaluate_contrast_hypotheses(
    pathways: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    spec = load_generation_spec()
    results: list[dict[str, Any]] = []

    for hyp in spec.get("contrastHypotheses", []):
        a_id = hyp["profile_a"]
        b_id = hyp["profile_b"]
        metric = hyp["metric"]
        passed = False
        detail: dict[str, Any] = {
            "hypothesis_id": hyp["id"],
            "description": hyp.get("description", hyp["id"]),
        }

        if a_id not in pathways or b_id not in pathways:
            results.append({**detail, "passed": False, "error": "profile not found"})
            continue

        na, nb = pathways[a_id], pathways[b_id]

        if metric == "block_sequence_similarity":
            sim = sequence_jaccard(block_sequence(na), block_sequence(nb))
            threshold = hyp.get("threshold", 0.85)
            passed = sim >= threshold
            detail.update({"value": sim, "threshold": threshold, "expect": f">= {threshold}"})
        elif metric.endswith("_node_count"):
            block_id = metric.replace("_node_count", "")
            va = block_count(na, block_id)
            vb = block_count(nb, block_id)
            expect = hyp.get("expect", "")
            if expect == "a_greater_than_b":
                passed = va > vb
            detail.update({"block_id": block_id, "count_a": va, "count_b": vb, "expect": expect})

        results.append({**detail, "passed": passed, "profile_a": a_id, "profile_b": b_id})

    return results


def research_gate_verdict(
    block_metrics: dict[str, Any],
    contrast_results: list[dict[str, Any]],
    judge_results: list[dict[str, Any]] | None,
    *,
    max_mean_multiset_jaccard: float = 0.92,
    min_contrast_pass_rate: float = 0.8,
    min_mean_judge_score: float = 3.5,
    require_judge: bool = False,
) -> dict[str, Any]:
    contrasts_passed = sum(1 for c in contrast_results if c.get("passed"))
    contrast_rate = contrasts_passed / len(contrast_results) if contrast_results else 0.0

    mean_judge = None
    if judge_results:
        scores = [j["mean_score"] for j in judge_results if "mean_score" in j]
        mean_judge = sum(scores) / len(scores) if scores else 0.0

    mean_multi = block_metrics.get("mean_multiset_jaccard", 1.0)

    # Pathways should differ in block coverage (not identical) but not be absurdly low on all pairs
    coverage_diverse = mean_multi < max_mean_multiset_jaccard
    contrasts_ok = contrast_rate >= min_contrast_pass_rate
    if require_judge and judge_results:
        judge_ok = mean_judge is not None and mean_judge >= min_mean_judge_score
    else:
        judge_ok = True  # supplementary only unless --with-judge

    passed = coverage_diverse and contrasts_ok and judge_ok

    return {
        "passed": passed,
        "mean_multiset_jaccard": mean_multi,
        "max_mean_multiset_jaccard": max_mean_multiset_jaccard,
        "contrast_pass_rate": round(contrast_rate, 4),
        "min_contrast_pass_rate": min_contrast_pass_rate,
        "contrasts_passed": contrasts_passed,
        "contrasts_total": len(contrast_results),
        "mean_judge_score": round(mean_judge, 3) if mean_judge is not None else None,
        "min_mean_judge_score": min_mean_judge_score,
        "judge_required_for_pass": require_judge,
        "checks": {
            "block_coverage_diverse": coverage_diverse,
            "contrast_hypotheses": contrasts_ok,
            "llm_judge": judge_ok if require_judge else None,
            "llm_judge_supplementary": not require_judge,
        },
    }


def _profile_clusters(profiles: list[dict[str, Any]]) -> dict[str, str]:
    return {p["id"]: p.get("cluster", "unknown") for p in profiles}


def cluster_similarity_analysis(
    pathways: dict[str, list[dict[str, Any]]],
    profiles: list[dict[str, Any]],
    *,
    contrasting_cluster_pairs: list[tuple[str, str]] | None = None,
) -> dict[str, Any]:
    """Within-cluster vs between-cluster block multiset Jaccard."""
    clusters = _profile_clusters(profiles)
    ids = [pid for pid in pathways if pid in clusters]

    within: list[float] = []
    between: list[float] = []
    within_pairs: list[dict[str, Any]] = []
    between_pairs: list[dict[str, Any]] = []

    for i, id_a in enumerate(ids):
        for id_b in ids[i + 1 :]:
            sim = multiset_jaccard(pathways[id_a], pathways[id_b])
            entry = {
                "profile_a": id_a,
                "profile_b": id_b,
                "cluster_a": clusters[id_a],
                "cluster_b": clusters[id_b],
                "multiset_jaccard": round(sim, 4),
            }
            if clusters[id_a] == clusters[id_b]:
                within.append(sim)
                within_pairs.append(entry)
            else:
                between.append(sim)
                between_pairs.append(entry)

    contrast_sims: list[float] = []
    contrast_pairs: list[dict[str, Any]] = []
    if contrasting_cluster_pairs:
        for ca, cb in contrasting_cluster_pairs:
            for id_a in ids:
                if clusters[id_a] != ca:
                    continue
                for id_b in ids:
                    if clusters[id_b] != cb:
                        continue
                    if id_a >= id_b:
                        continue
                    sim = multiset_jaccard(pathways[id_a], pathways[id_b])
                    contrast_sims.append(sim)
                    contrast_pairs.append({
                        "profile_a": id_a,
                        "profile_b": id_b,
                        "cluster_a": ca,
                        "cluster_b": cb,
                        "multiset_jaccard": round(sim, 4),
                    })

    style_pairs: list[dict[str, Any]] = []
    for p in profiles:
        paired = p.get("paired_with")
        if not paired or p["id"] not in pathways or paired not in pathways:
            continue
        seq_sim = sequence_jaccard(
            block_sequence(pathways[p["id"]]),
            block_sequence(pathways[paired]),
        )
        style_pairs.append({
            "style_profile": p["id"],
            "paired_profile": paired,
            "sequence_jaccard": round(seq_sim, 4),
            "multiset_jaccard": round(multiset_jaccard(pathways[p["id"]], pathways[paired]), 4),
        })

    mean_within = sum(within) / len(within) if within else None
    mean_between = sum(between) / len(between) if between else None
    mean_contrast = sum(contrast_sims) / len(contrast_sims) if contrast_sims else None
    style_pass = sum(1 for s in style_pairs if s["sequence_jaccard"] >= 0.85)
    style_rate = style_pass / len(style_pairs) if style_pairs else None

    return {
        "mean_within_cluster_multiset_jaccard": round(mean_within, 4) if mean_within is not None else None,
        "mean_between_cluster_multiset_jaccard": round(mean_between, 4) if mean_between is not None else None,
        "mean_contrast_cluster_multiset_jaccard": round(mean_contrast, 4) if mean_contrast is not None else None,
        "within_pair_count": len(within_pairs),
        "between_pair_count": len(between_pairs),
        "contrasting_cluster_pairs": contrasting_cluster_pairs or [],
        "style_control_pairs": style_pairs,
        "style_control_pass_rate": round(style_rate, 4) if style_rate is not None else None,
        "sample_within_pairs": sorted(within_pairs, key=lambda x: -x["multiset_jaccard"])[:10],
        "sample_between_pairs": sorted(between_pairs, key=lambda x: x["multiset_jaccard"])[:10],
    }


def cluster_gate_verdict(
    cluster_metrics: dict[str, Any],
    *,
    min_within_cluster_multiset_jaccard: float = 0.65,
    max_contrast_cluster_multiset_jaccard: float = 0.70,
    min_style_control_pass_rate: float = 0.8,
) -> dict[str, Any]:
    within = cluster_metrics.get("mean_within_cluster_multiset_jaccard")
    contrast = cluster_metrics.get("mean_contrast_cluster_multiset_jaccard")
    style_rate = cluster_metrics.get("style_control_pass_rate")

    within_ok = within is not None and within >= min_within_cluster_multiset_jaccard
    contrast_ok = contrast is not None and contrast <= max_contrast_cluster_multiset_jaccard
    style_ok = style_rate is None or style_rate >= min_style_control_pass_rate

    return {
        "passed": within_ok and contrast_ok and style_ok,
        "min_within_cluster_multiset_jaccard": min_within_cluster_multiset_jaccard,
        "max_contrast_cluster_multiset_jaccard": max_contrast_cluster_multiset_jaccard,
        "min_style_control_pass_rate": min_style_control_pass_rate,
        "checks": {
            "within_cluster_similarity": within_ok,
            "contrasting_cluster_divergence": contrast_ok,
            "style_control_invariance": style_ok,
        },
    }
