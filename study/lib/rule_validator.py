"""Deterministic rule-based compliance checks for generated pathways."""

from __future__ import annotations

from typing import Any

from lib.personalization_prompt import load_generation_spec
from lib.research_metrics import block_count, block_multiset

VALID_BLOCKS = set(load_generation_spec().get("blockIds", []))

ML_KEYWORDS = (
    "neural network",
    "gradient descent",
    "pytorch",
    "supervised learning",
    "backpropagation",
    "scikit-learn",
    "deep learning",
    "ml pipeline",
)

BUSINESS_KEYWORDS = (
    "business",
    "organization",
    "strategy",
    "transformation",
    "workplace",
    "marketing",
    "roi",
    "executive",
    "mba",
)

RESEARCH_KEYWORDS = (
    "research",
    "rag",
    "fine-tuning",
    "fine tuning",
    "workflow",
    "technical",
    "academic",
    "ablation",
    "retrieval-augmented",
)

ETHICS_KEYWORDS = (
    "ethics",
    "ethical",
    "responsible ai",
    "bias",
    "societal",
    "health equity",
    "patient safety",
    "public health",
    "fairness",
)

PROMPTING_KEYWORDS = (
    "structured prompting",
    "prompt template",
    "few-shot",
    "chain-of-thought",
    "prompting technique",
    "master prompting",
)

NO_AI_BACKGROUND = (
    "no ai",
    "not taken any ai",
    "no formal ai",
    "no programming",
    "no ml",
    "never taken",
)


def _survey_text(answers: dict[str, str]) -> str:
    return " ".join(str(v) for v in answers.values()).lower()


def _has_any(text: str, phrases: tuple[str, ...]) -> bool:
    return any(p in text for p in phrases)


def _rule(rule_id: str, description: str, passed: bool, detail: str) -> dict[str, Any]:
    return {
        "rule_id": rule_id,
        "description": description,
        "passed": passed,
        "detail": detail,
    }


def _needs_foundation_depth(answers: dict[str, str], text: str) -> bool:
    prereq = answers.get("prereq_1", "")
    if prereq in ("Very uncertain", "Somewhat uncertain"):
        return True
    return _has_any(text, NO_AI_BACKGROUND)


def _needs_foundation_compress(answers: dict[str, str], text: str) -> bool:
    if answers.get("prereq_1") == "Very confident":
        return True
    return _has_any(text, ML_KEYWORDS)


def evaluate_profile_rules(
    profile: dict[str, Any],
    nodes: list[dict[str, Any]],
    pathways_by_id: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    """Return applicable rules and pass/fail for one profile-pathway pair."""
    answers = profile.get("answers", {})
    text = _survey_text(answers)
    pid = profile["id"]
    rules: list[dict[str, Any]] = []

    n_nodes = len(nodes)
    rules.append(
        _rule(
            "node_count",
            "Pathway has 10-14 nodes",
            10 <= n_nodes <= 14,
            f"{n_nodes} nodes",
        )
    )

    b06 = block_count(nodes, "block_06")
    rules.append(
        _rule(
            "ethics_capstone",
            "Every pathway includes at least 2 ethics block nodes",
            b06 >= 2,
            f"block_06 count = {b06}",
        )
    )

    if _needs_foundation_depth(answers, text) and not _needs_foundation_compress(answers, text):
        b01 = block_count(nodes, "block_01")
        rules.append(
            _rule(
                "foundation_depth",
                "Low-background students get 3+ AI Basics nodes",
                b01 >= 3,
                f"block_01 count = {b01}",
            )
        )

    if _needs_foundation_compress(answers, text):
        b01 = block_count(nodes, "block_01")
        rules.append(
            _rule(
                "foundation_compress",
                "Strong-background students get at most 1 AI Basics node",
                b01 <= 1,
                f"block_01 count = {b01}",
            )
        )

    if _has_any(text, BUSINESS_KEYWORDS) and not _has_any(text, RESEARCH_KEYWORDS):
        b05a = block_count(nodes, "block_05a")
        b05b = block_count(nodes, "block_05b")
        rules.append(
            _rule(
                "business_track",
                "Business-oriented students emphasize Business track (3+ nodes, more than Technical)",
                b05a >= 3 and b05a > b05b,
                f"block_05a={b05a}, block_05b={b05b}",
            )
        )

    if _has_any(text, RESEARCH_KEYWORDS):
        b05a = block_count(nodes, "block_05a")
        b05b = block_count(nodes, "block_05b")
        rules.append(
            _rule(
                "research_track",
                "Research/technical students emphasize Technical track (3+ nodes)",
                b05b >= 3 and b05b >= b05a,
                f"block_05a={b05a}, block_05b={b05b}",
            )
        )

    if _has_any(text, ETHICS_KEYWORDS):
        rules.append(
            _rule(
                "ethics_emphasis",
                "Ethics/health-oriented students get 4+ ethics block nodes",
                b06 >= 4,
                f"block_06 count = {b06}",
            )
        )

    if _has_any(text, PROMPTING_KEYWORDS):
        prompt_nodes = block_count(nodes, "block_03") + block_count(nodes, "block_04")
        rules.append(
            _rule(
                "prompting_emphasis",
                "Prompting-focused students get 3+ combined prompting block nodes",
                prompt_nodes >= 3,
                f"block_03 + block_04 = {prompt_nodes}",
            )
        )

    paired_id = profile.get("paired_with")
    if paired_id and paired_id in pathways_by_id:
        paired_counts = dict(block_multiset(pathways_by_id[paired_id]))
        actual_counts = dict(block_multiset(nodes))
        passed = paired_counts == actual_counts
        rules.append(
            _rule(
                "style_control_exact",
                "Learning-style twin matches partner block counts exactly",
                passed,
                f"partner={paired_counts}, actual={actual_counts}",
            )
        )

    if nodes:
        invalid = [n.get("syllabusBlockId") for n in nodes if n.get("syllabusBlockId") not in VALID_BLOCKS]
        rules.append(
            _rule(
                "valid_block_id",
                "All nodes use valid syllabus block tags",
                len(invalid) == 0 and all(n.get("syllabusBlockId") for n in nodes),
                f"invalid: {invalid}" if invalid else "all tagged",
            )
        )

    return rules


def evaluate_all_rules(
    profiles: list[dict[str, Any]],
    pathways: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    per_profile: list[dict[str, Any]] = []
    total_rules = 0
    passed_rules = 0

    for profile in profiles:
        pid = profile["id"]
        if pid not in pathways:
            continue
        rules = evaluate_profile_rules(profile, pathways[pid], pathways)
        p_pass = sum(1 for r in rules if r["passed"])
        per_profile.append({
            "profileId": pid,
            "field": profile.get("field", ""),
            "cluster": profile.get("cluster", ""),
            "rules_passed": p_pass,
            "rules_total": len(rules),
            "all_passed": p_pass == len(rules),
            "rules": rules,
        })
        total_rules += len(rules)
        passed_rules += p_pass

    profile_pass = sum(1 for p in per_profile if p["all_passed"])
    profile_total = len(per_profile)
    rule_rate = passed_rules / total_rules if total_rules else 0.0
    profile_rate = profile_pass / profile_total if profile_total else 0.0

    return {
        "per_profile": per_profile,
        "rules_passed": passed_rules,
        "rules_total": total_rules,
        "rule_pass_rate": round(rule_rate, 4),
        "profiles_all_rules_passed": profile_pass,
        "profiles_total": profile_total,
        "profile_pass_rate": round(profile_rate, 4),
        "failures": [
            {"profileId": p["profileId"], "failed_rules": [r for r in p["rules"] if not r["passed"]]}
            for p in per_profile
            if not p["all_passed"]
        ],
    }


def rule_gate_verdict(
    rule_results: dict[str, Any],
    *,
    min_rule_pass_rate: float = 0.85,
    min_profile_pass_rate: float = 0.80,
) -> dict[str, Any]:
    rate = rule_results.get("rule_pass_rate", 0.0)
    profile_rate = rule_results.get("profile_pass_rate", 0.0)
    rules_ok = rate >= min_rule_pass_rate
    profiles_ok = profile_rate >= min_profile_pass_rate
    return {
        "passed": rules_ok and profiles_ok,
        "rule_pass_rate": rate,
        "min_rule_pass_rate": min_rule_pass_rate,
        "profile_pass_rate": profile_rate,
        "min_profile_pass_rate": min_profile_pass_rate,
        "checks": {
            "aggregate_rules": rules_ok,
            "all_profiles_clean": profiles_ok,
        },
    }
