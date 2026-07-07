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


def load_generation_spec(spec_path: Path | None = None) -> dict[str, Any]:
    path = spec_path or SPEC_PATH
    return json.loads(path.read_text(encoding="utf-8"))


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
    spec_path: Path | None = None,
    tier: str | None = None,
    block_floors: dict[str, int] | None = None,
) -> str:
    spec = load_generation_spec(spec_path)
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

    # Required-course model: prose rules alone weren't enough (verified against real
    # generated pathways — Gemini produced plausible-sounding but tier-inconsistent
    # scaffolding_catchup counts, including rationale text contradicting the actual
    # student). Inject an explicit, numeric target per tier, the same fix that made
    # AI literacy's structure lock reliable for its own invariance requirement.
    rc = spec.get("requiredCourseModel")
    if rc and tier:
        target = rc.get("tierScaffoldTargets", {}).get(tier)
        foundational = rc.get("foundationalBlockIds", [])
        if target is not None and foundational:
            structure_lock_text += f"""
=== SCAFFOLD TARGET (mandatory, exact count — not a suggestion) ===
This student's stated prior-exposure tier is: {tier}.
You MUST include EXACTLY {target} nodes with nodeRole="scaffolding_catchup" across the block(s) {foundational}, combined.
Not one more, not one less. Do not reuse generic rationale text — every personalizationRationale must
correctly describe THIS student's actual tier ({tier}), not a different tier.
"""

    # Same lesson as the scaffold target above, discovered one course later: "at or above
    # the floor implied by the personalization rules" (prose only) was not precise enough —
    # real generated pathways under-shot specific blocks (e.g. consistently 3 nodes in a
    # 4-node-floor block) while staying within the total node band. Inject the exact
    # per-block numbers computed from the syllabus, not just describe them abstractly.
    if rc and block_floors:
        floors_text = ", ".join(f"{bid} >= {n}" for bid, n in sorted(block_floors.items()))
        structure_lock_text += f"""
=== BLOCK FLOORS (mandatory minimums, exact — not a suggestion) ===
{floors_text}
Every block must independently satisfy its own minimum above. Staying within the total node band is
not sufficient if an individual block falls short of its minimum.
"""

    ctx = syllabus_context

    # AI literacy (no requiredCourseModel in its spec) keeps the original elective-course
    # framing byte-for-byte. Required, cumulative courses (OS, Data Structures) need the
    # opposite framing: block presence is fixed, only the node-ROLE mix personalizes.
    rc = spec.get("requiredCourseModel")
    if rc:
        band = rc.get("targetNodeBand", [10, 14])
        low, high = band[0], band[1]
        intro = (
            "You are generating a personalized learning pathway for a REQUIRED, cumulative course.\n"
            "Every block in the catalog below MUST appear in the pathway at or above its floor — this "
            "is a hard requirement, not a suggestion, since every student is examined on all of it.\n"
            "Personalization here means varying the MIX of node roles within each block (more "
            "scaffolding_catchup nodes for less-prepared students, more enrichment_advanced nodes for "
            "well-prepared students), never which blocks appear or dropping a block near zero."
        )
        output_requirements = f"""- Call generate_learning_pathway with {low}-{high} nodes total. This range is a hard requirement — do not default to fewer nodes than {low}.
- Every block in the catalog MUST appear, at or above the floor implied by the personalization rules above. Never omit a block or reduce it near zero — that would mean a student skips required, examined material.
- Each node MUST include syllabusBlockId, nodeRole, and personalizationRationale.
- The scaffolding_catchup vs. enrichment_advanced MIX inside the foundational block(s) is what must vary by the student's stated prior-exposure tier — block presence must NOT vary.
- Before finalizing, verify: does this student's scaffolding_catchup node count in the foundational block actually reflect their stated prior-exposure tier? A student with no prior exposure who ends up with zero scaffolding_catchup nodes is WRONG — revise before responding."""
    else:
        intro = (
            "You are generating a STRUCTURALLY personalized learning pathway for a synthetic validation study.\n"
            "The same syllabus must produce DIFFERENT block coverage — not just different node titles."
        )
        output_requirements = """- Call generate_learning_pathway with 10-14 nodes.
- Each node MUST include syllabusBlockId (one of the valid block ids).
- Vary block coverage based on survey — a confident CS researcher and an uncertain history major must NOT receive the same block sequence or block counts.
- learning_1 (learning style) affects ONLY the wording of descriptions — NEVER which blocks appear, how many nodes per block, difficulty, or order.
- Before finalizing, verify: would this pathway differ in block counts from a generic student? If not, revise block emphasis."""

    return f"""{intro}
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
{output_requirements}

Generate the pathway now."""
