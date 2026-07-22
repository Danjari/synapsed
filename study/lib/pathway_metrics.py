"""Pathway diversity metrics for synthetic validation."""

from __future__ import annotations

import re
from itertools import combinations
from typing import Any


def normalize_title(title: str) -> str:
    cleaned = re.sub(r"[^a-z0-9\s]", "", title.lower())
    return " ".join(cleaned.split())


def jaccard_similarity(titles_a: list[str], titles_b: list[str]) -> float:
    set_a = {normalize_title(t) for t in titles_a if t.strip()}
    set_b = {normalize_title(t) for t in titles_b if t.strip()}
    if not set_a and not set_b:
        return 1.0
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)


def difficulty_distribution(nodes: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {"beginner": 0, "intermediate": 0, "advanced": 0}
    for node in nodes:
        level = (node.get("difficulty") or "beginner").lower()
        counts[level] = counts.get(level, 0) + 1
    return counts


def has_foundation_nodes(nodes: list[dict[str, Any]]) -> bool:
    keywords = ("foundation", "basic", "intro", "prerequisite", "fundamental", "overview")
    for node in nodes:
        text = f"{node.get('title', '')} {node.get('description', '')}".lower()
        if any(kw in text for kw in keywords):
            return True
    return False


def pairwise_similarities(pathways: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    pairs: list[dict[str, Any]] = []
    for id_a, id_b in combinations(pathways.keys(), 2):
        titles_a = [n.get("title", "") for n in pathways[id_a]]
        titles_b = [n.get("title", "") for n in pathways[id_b]]
        pairs.append({"profile_a": id_a, "profile_b": id_b, "jaccard": jaccard_similarity(titles_a, titles_b)})
    return pairs


def evaluate_gate(
    pathways: dict[str, list[dict[str, Any]]],
    *,
    threshold: float = 0.85,
    contrast_pair: tuple[str, str] | None = None,
) -> dict[str, Any]:
    pairs = pairwise_similarities(pathways)
    mean_jaccard = sum(p["jaccard"] for p in pairs) / len(pairs) if pairs else 1.0

    contrast_ok = True
    contrast_detail: dict[str, Any] = {}
    if contrast_pair and contrast_pair[0] in pathways and contrast_pair[1] in pathways:
        low_id, high_id = contrast_pair
        contrast_detail = {
            "low_profile": low_id,
            "high_profile": high_id,
            "low_has_foundation": has_foundation_nodes(pathways[low_id]),
            "high_has_foundation": has_foundation_nodes(pathways[high_id]),
            "jaccard": jaccard_similarity(
                [n.get("title", "") for n in pathways[low_id]],
                [n.get("title", "") for n in pathways[high_id]],
            ),
        }
        contrast_ok = contrast_detail["low_has_foundation"] or contrast_detail["jaccard"] < threshold

    passed = mean_jaccard < threshold and contrast_ok
    return {
        "passed": passed,
        "mean_jaccard": round(mean_jaccard, 4),
        "threshold": threshold,
        "pairwise": pairs,
        "contrast": contrast_detail,
        "profile_summaries": {
            pid: {
                "node_count": len(nodes),
                "difficulty": difficulty_distribution(nodes),
                "has_foundation": has_foundation_nodes(nodes),
            }
            for pid, nodes in pathways.items()
        },
    }
