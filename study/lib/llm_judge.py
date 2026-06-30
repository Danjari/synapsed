"""LLM-as-judge for profile-pathway alignment (rubric-based, structured output)."""

from __future__ import annotations

import time
from typing import Any

from google import genai
from google.genai import types

from lib.personalization_prompt import SURVEY_QUESTIONS, format_block_catalog, load_generation_spec
from lib.pathway_generator import get_judge_model
from lib.research_metrics import block_multiset, block_sequence


JUDGE_FUNCTION = types.FunctionDeclaration(
    name="score_pathway_personalization",
    description="Score how well a pathway structurally matches a learner profile",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "scores": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "dimension_id": types.Schema(type=types.Type.STRING),
                        "score": types.Schema(type=types.Type.NUMBER),
                        "justification": types.Schema(type=types.Type.STRING),
                    },
                    required=["dimension_id", "score", "justification"],
                ),
            ),
            "overall_comment": types.Schema(type=types.Type.STRING),
            "is_structural_not_cosmetic": types.Schema(type=types.Type.BOOLEAN),
        },
        required=["scores", "overall_comment", "is_structural_not_cosmetic"],
    ),
)


def _format_profile(answers: dict[str, str]) -> str:
    lines = [f"Q: {q['text']}\nA: {answers.get(q['id'], '')}" for q in SURVEY_QUESTIONS]
    return "\n".join(lines)


def _format_pathway(nodes: list[dict[str, Any]]) -> str:
    lines = []
    for i, n in enumerate(nodes, 1):
        lines.append(
            f"{i}. [{n.get('syllabusBlockId', '?')}] {n.get('title')} "
            f"({n.get('difficulty')}, {n.get('type')}) — {n.get('description', '')[:200]}"
        )
    return "\n".join(lines)


def judge_pathway(
    client: genai.Client,
    profile_id: str,
    profile_description: str,
    answers: dict[str, str],
    nodes: list[dict[str, Any]],
    syllabus: dict[str, Any],
    *,
    model: str | None = None,
) -> dict[str, Any]:
    spec = load_generation_spec()
    rubric = spec.get("judgeRubric", {})
    dimensions = rubric.get("dimensions", [])
    dim_text = "\n".join(f"- {d['id']}: {d['description']}" for d in dimensions)
    scale = rubric.get("scale", {"min": 1, "max": 5})

    block_summary = {
        "sequence": block_sequence(nodes),
        "counts": dict(block_multiset(nodes)),
    }

    prompt = f"""You are an expert reviewer for an adaptive learning systems research paper.
Evaluate whether this pathway is STRUCTURALLY personalized to the learner profile — not merely cosmetically reworded.

IMPORTANT: Use the full {scale['min']}-{scale['max']} scale. Score 5 only for excellent alignment. Score 1 for clear mismatch.
Flag cosmetic-only personalization (same block coverage as a generic path with different titles).

=== LEARNER PROFILE ({profile_id}) ===
{profile_description}

{ _format_profile(answers) }

=== SYLLABUS BLOCK CATALOG ===
{format_block_catalog(spec, syllabus)}

=== GENERATED PATHWAY ===
Block sequence (derived): {block_summary['sequence']}
Block node counts: {block_summary['counts']}

Nodes:
{_format_pathway(nodes)}

=== RUBRIC DIMENSIONS ===
{dim_text}

Score each dimension {scale['min']}-{scale['max']} with a one-sentence justification.
Set is_structural_not_cosmetic to true ONLY if block coverage/order reflects the profile meaningfully.

You MUST respond by calling score_pathway_personalization only — no free text."""

    model_name = model or get_judge_model()
    last_error: Exception | None = None
    for attempt in range(3):
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(function_declarations=[JUDGE_FUNCTION])],
                tool_config=types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(
                        mode=types.FunctionCallingConfigMode.ANY,
                        allowed_function_names=["score_pathway_personalization"],
                    )
                ),
            ),
        )

        if response.function_calls:
            break
        last_error = RuntimeError(f"Judge returned no function call for {profile_id}")
        time.sleep(2.0 * (attempt + 1))
    else:
        raise last_error or RuntimeError(f"Judge failed for {profile_id}")

    result = response.function_calls[0].args
    if not isinstance(result, dict):
        raise RuntimeError("Invalid judge response")

    scores = result.get("scores", [])
    numeric = [s["score"] for s in scores if isinstance(s.get("score"), (int, float))]
    mean_score = sum(numeric) / len(numeric) if numeric else 0.0

    return {
        "profileId": profile_id,
        "scores": scores,
        "mean_score": round(mean_score, 3),
        "overall_comment": result.get("overall_comment", ""),
        "is_structural_not_cosmetic": result.get("is_structural_not_cosmetic", False),
    }


def judge_all_profiles(
    client: genai.Client,
    profiles: list[dict[str, Any]],
    pathways_dir_data: dict[str, list[dict[str, Any]]],
    syllabus: dict[str, Any],
    *,
    profile_ids: list[str] | None = None,
    delay_sec: float = 1.0,
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    selected = profiles
    if profile_ids is not None:
        allowed = set(profile_ids)
        selected = [p for p in profiles if p["id"] in allowed]

    for profile in selected:
        pid = profile["id"]
        if pid not in pathways_dir_data:
            continue
        print(f"  Judging {pid}...")
        results.append(
            judge_pathway(
                client,
                pid,
                profile.get("description", ""),
                profile["answers"],
                pathways_dir_data[pid],
                syllabus,
            )
        )
        time.sleep(delay_sec)
    return results


def stratified_judge_sample(profiles: list[dict[str, Any]], sample_size: int) -> list[str]:
    """Pick up to sample_size profiles, at least one per cluster, prioritizing canonical ids."""
    canonical = {
        "low_knowledge_general",
        "high_knowledge_research",
        "business_leader",
        "ethics_focused",
        "medium_knowledge_mixed",
        "learning_style_control",
    }
    chosen: list[str] = []
    seen_clusters: set[str] = set()

    for p in profiles:
        if p["id"] in canonical and p["id"] not in chosen:
            chosen.append(p["id"])
            seen_clusters.add(p.get("cluster", ""))

    for p in profiles:
        cluster = p.get("cluster", "")
        if cluster in seen_clusters:
            continue
        chosen.append(p["id"])
        seen_clusters.add(cluster)
        if len(chosen) >= sample_size:
            return chosen[:sample_size]

    for p in profiles:
        if p["id"] not in chosen:
            chosen.append(p["id"])
        if len(chosen) >= sample_size:
            break
    return chosen[:sample_size]
