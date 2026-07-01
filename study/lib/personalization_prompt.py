"""Build research-grade pathway generation prompts from syllabus + spec."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

STUDY_ROOT = Path(__file__).resolve().parent.parent
SPEC_PATH = STUDY_ROOT / "data" / "prompts" / "pathway_generation_spec.json"

SURVEY_QUESTIONS: list[dict[str, Any]] = [
    {"id": "goals_1", "text": "What are your primary learning goals for this course?"},
    {"id": "goals_2", "text": "What motivated you to enroll in this course?"},
    {"id": "prereq_1", "text": "Rate your current understanding of prerequisite topics for this course"},
    {"id": "learning_1", "text": "What is your preferred learning style?"},
    {"id": "bloom_remember", "text": "List key concepts you remember from previous related courses"},
    {"id": "bloom_understand", "text": "What do you expect to learn in this course?"},
    {"id": "bloom_apply", "text": "How do you plan to apply what you learn in this course?"},
    {"id": "bloom_analyze", "text": "What challenges do you anticipate in this course?"},
]


def load_generation_spec() -> dict[str, Any]:
    return json.loads(SPEC_PATH.read_text(encoding="utf-8"))


def format_block_catalog(spec: dict[str, Any], syllabus: dict[str, Any]) -> str:
    lines: list[str] = []
    descriptions = spec.get("blockDescriptions", {})
    for block in syllabus.get("blocks", []):
        bid = block["id"]
        desc = descriptions.get(bid, block.get("title", ""))
        lesson_count = len(block.get("lessons", []))
        lines.append(
            f"- {bid}: {block['title']} ({lesson_count} syllabus lessons, ~{block.get('estimatedMinutes', '?')} min). {desc}"
        )
        if block.get("pathwayNote"):
            lines.append(f"  Note: {block['pathwayNote']}")
    return "\n".join(lines)


def build_personalization_prompt(
    syllabus: dict[str, Any],
    syllabus_context: dict[str, str],
    answers: dict[str, str],
    *,
    structure_lock: dict[str, Any] | None = None,
) -> str:
    spec = load_generation_spec()
    qa_lines = []
    for q in SURVEY_QUESTIONS:
        qa_lines.append(f"Q: {q['text']}\nA: {answers.get(q['id'], '')}")

    rules = spec.get("personalizationRules", [])
    rules_text = "\n".join(f"{i + 1}. {rule}" for i, rule in enumerate(rules))
    block_catalog = format_block_catalog(spec, syllabus)
    block_ids = ", ".join(spec.get("blockIds", []))

    structure_lock_text = ""
    if structure_lock:
        seq = structure_lock.get("block_sequence", [])
        counts = structure_lock.get("block_counts", {})
        seq_str = " → ".join(seq) if seq else "(see counts)"
        counts_str = ", ".join(f"{k}×{v}" for k, v in sorted(counts.items()))
        structure_lock_text = f"""
=== STRUCTURE LOCK (mandatory — learning-style control profile) ===
This student differs from their paired profile ONLY in learning_1 (learning style).
You MUST produce the IDENTICAL syllabusBlockId sequence and IDENTICAL per-block node counts.
Paired block sequence: {seq_str}
Paired block counts: {counts_str}
Change ONLY description wording to reflect learning style — never add, remove, or reorder blocks.
"""

    ctx = syllabus_context
    return f"""You are generating a STRUCTURALLY personalized learning pathway for a synthetic validation study.
The same syllabus must produce DIFFERENT block coverage — not just different node titles.
{structure_lock_text}
=== COURSE CONTEXT ===
Description: {ctx.get('courseDescription', '')}
Prerequisites: {ctx.get('prerequisites', '')}
Learning Objectives:
{ctx.get('learningObjectives', '')}
Course Schedule:
{ctx.get('courseSchedule', '')}
Assessment Methods: {ctx.get('assessmentMethods', '')}

=== SYLLABUS BLOCK CATALOG (you MUST tag every node with syllabusBlockId) ===
{block_catalog}

Valid syllabusBlockId values: {block_ids}

=== STUDENT SURVEY RESPONSES ===
{chr(10).join(qa_lines)}

=== PERSONALIZATION RULES (mandatory) ===
{rules_text}

=== OUTPUT REQUIREMENTS ===
- Call generate_learning_pathway with 10-14 nodes.
- Each node MUST include syllabusBlockId (one of the valid block ids).
- Vary block coverage based on survey — a confident CS researcher and an uncertain history major must NOT receive the same block sequence or block counts.
- learning_1 (learning style) affects ONLY the wording of descriptions — NEVER which blocks appear, how many nodes per block, difficulty, or order.
- Before finalizing, verify: would this pathway differ in block counts from a generic student? If not, revise block emphasis.

Generate the pathway now."""
