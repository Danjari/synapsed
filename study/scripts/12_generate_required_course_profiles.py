#!/usr/bin/env python3
"""Generate realistic, tier-balanced synthetic student profiles for a required course.

For AI literacy, profiles are hand-authored (script 05) because personalization
there spans many independent axes. For a required, cumulative course (OS, Data
Structures) there is one primary axis — prior familiarity with the course's
foundational technology — with three discrete tiers. This script:

1. Reads that course's syllabus-derived survey_questions.json (script 11).
2. Finds the tier-defining question automatically, by matching the
   "No/Some/Strong prior exposure" option phrasing script 11 requires.
3. Sets that question's answer DETERMINISTICALLY per tier (the ground-truth
   independent variable must not be left to chance for a research pipeline —
   the role-mix monotonic check in lib/research_metrics.py depends on it).
4. Asks Gemini to fill in every other answer realistically and diversely,
   consistent with a student who has that tier's actual background.

Systematic and reproducible: same schema, same procedure, same question set
for any course — a teammate can run this against a new course's
survey_questions.json without editing this file.
"""

from __future__ import annotations

import argparse
import re
import sys
import time
from pathlib import Path
from typing import Any

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

from google.genai import types  # noqa: E402

from lib.api_client import load_json, save_json  # noqa: E402
from lib.course_paths import resolve  # noqa: E402
from lib.pathway_generator import get_gemini_client, get_gemini_model  # noqa: E402
from lib.rate_limit import api_delay_sec, call_with_rate_limit_retry  # noqa: E402

TIER_PATTERNS = {
    "no_prior_exposure": re.compile(r"^\s*no prior exposure", re.I),
    "some_prior_exposure": re.compile(r"^\s*some prior exposure", re.I),
    "strong_prior_exposure": re.compile(r"^\s*strong prior exposure", re.I),
}
TIER_ORDER = ["no_prior_exposure", "some_prior_exposure", "strong_prior_exposure"]

TIER_PERSONA_HINT = {
    "no_prior_exposure": "has never worked with this course's foundational technology before — keep every other "
    "answer consistent with a genuine beginner in that specific area (not necessarily a weak student overall).",
    "some_prior_exposure": "has some basic, self-taught or coursework exposure to this course's foundational "
    "technology, but is not yet comfortable with its harder mechanics.",
    "strong_prior_exposure": "already has solid, comfortable prior experience with this course's foundational "
    "technology from before this course.",
}


def find_tier_question(questions: list[dict[str, Any]]) -> tuple[str, dict[str, str]]:
    """Find the question whose options map to the three tiers, and the exact
    option text for each tier. Raises if script 11's phrasing isn't found."""
    for q in questions:
        options = q.get("options") or []
        matched: dict[str, str] = {}
        for opt in options:
            for tier, pattern in TIER_PATTERNS.items():
                if pattern.search(opt):
                    matched[tier] = opt
        if len(matched) == 3:
            return q["id"], matched
    raise RuntimeError(
        "Could not find a tier-defining question (expected multiple_choice options starting with "
        "'No/Some/Strong prior exposure...' — regenerate with scripts/11_generate_survey_questions.py, "
        "which requires this phrasing)."
    )


def _answer_schema(question: dict[str, Any]) -> types.Schema:
    qtype = question.get("type")
    if qtype == "multiple_choice":
        return types.Schema(
            type=types.Type.STRING,
            enum=question.get("options") or None,
            description=question["text"],
        )
    if qtype == "rating":
        return types.Schema(
            type=types.Type.STRING,
            description=f"A rating from 1 to 5, as a string. Question: {question['text']}",
        )
    if qtype == "ranking":
        options = ", ".join(question.get("options") or [])
        return types.Schema(
            type=types.Type.STRING,
            description=(
                f"Ranking of these options, most-to-least, as an ordered comma-separated list: "
                f"{options}. Question: {question['text']}"
            ),
        )
    return types.Schema(type=types.Type.STRING, description=question["text"])


def build_profile_function_declaration(
    remaining_questions: list[dict[str, Any]],
) -> types.FunctionDeclaration:
    answer_props = {q["id"]: _answer_schema(q) for q in remaining_questions}
    return types.FunctionDeclaration(
        name="generate_student_profile",
        description="Generate one realistic synthetic student profile answering a course onboarding survey",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "description": types.Schema(
                    type=types.Type.STRING,
                    description="One-sentence description of this synthetic student (background, major-adjacent context)",
                ),
                "answers": types.Schema(type=types.Type.OBJECT, properties=answer_props, required=list(answer_props)),
            },
            required=["description", "answers"],
        ),
    )


def build_profile_prompt(
    course_title: str,
    tier: str,
    tier_question_text: str,
    tier_option_text: str,
    remaining_questions: list[dict[str, Any]],
    *,
    index: int,
    total_in_tier: int,
) -> str:
    q_lines = "\n".join(f"- ({q['type']}) {q['id']}: {q['text']}" for q in remaining_questions)
    return f"""You are generating ONE realistic, plausible synthetic student profile for a research study on
personalized learning pathways in a required university course: "{course_title}".

This student's answer to the key prerequisite question is FIXED (do not restate it, just keep every
other answer consistent with it):
Q: {tier_question_text}
A: {tier_option_text}

This means the student {TIER_PERSONA_HINT[tier]}

This is profile {index} of {total_in_tier} students who share this same prior-exposure tier. Make this
student's OTHER answers realistically diverse from a typical classmate in the same tier — vary their
motivation, career interest, anticipated challenges, and pacing preference — while staying internally
consistent and plausible for a real undergraduate.

Answer every one of the following questions, matching each one's required format exactly:
{q_lines}

Call generate_student_profile now with a one-sentence description and the answers object."""


def generate_one_profile(
    client,
    model_name: str,
    course_title: str,
    tier: str,
    tier_question_id: str,
    tier_question_text: str,
    tier_option_text: str,
    remaining_questions: list[dict[str, Any]],
    *,
    index: int,
    total_in_tier: int,
) -> dict[str, Any]:
    prompt = build_profile_prompt(
        course_title,
        tier,
        tier_question_text,
        tier_option_text,
        remaining_questions,
        index=index,
        total_in_tier=total_in_tier,
    )
    declaration = build_profile_function_declaration(remaining_questions)

    def _call():
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(function_declarations=[declaration])],
                tool_config=types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(
                        mode=types.FunctionCallingConfigMode.ANY,
                        allowed_function_names=["generate_student_profile"],
                    )
                ),
            ),
        )
        if not response.function_calls:
            raise RuntimeError("Gemini did not return a function call for profile generation")
        return response

    response = call_with_rate_limit_retry(_call, label=f"Gemini profile ({tier} #{index})")
    args = response.function_calls[0].args
    if not isinstance(args, dict) or "answers" not in args:
        raise RuntimeError("Failed to parse profile from Gemini response")

    answers = dict(args["answers"])
    answers[tier_question_id] = tier_option_text
    return {"description": args.get("description", ""), "answers": answers}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate tier-balanced synthetic student profiles for a required course"
    )
    parser.add_argument("--course", required=True, help="Course id, e.g. os or datastructures")
    parser.add_argument(
        "--profiles-per-tier",
        type=int,
        default=10,
        help="Profiles to generate per familiarity tier (default 10 -> 30 total, ~average class size)",
    )
    parser.add_argument("--force", action="store_true", help="Overwrite an existing profiles.json")
    args = parser.parse_args()

    paths = resolve(args.course)
    if paths.profiles.exists() and not args.force:
        print(f"{paths.profiles} already exists. Use --force to regenerate.")
        return 1

    if not paths.survey_questions.exists():
        print(f"No survey_questions.json for '{args.course}'. Run scripts/11_generate_survey_questions.py first.")
        return 1

    survey = load_json(paths.survey_questions)
    questions = survey["questions"]
    syllabus = load_json(paths.syllabus)

    tier_question_id, tier_options = find_tier_question(questions)
    tier_question_text = next(q["text"] for q in questions if q["id"] == tier_question_id)
    remaining_questions = [q for q in questions if q["id"] != tier_question_id]

    print(f"Tier-defining question: {tier_question_id}")
    for tier in TIER_ORDER:
        print(f"  {tier}: {tier_options[tier]}")

    client = get_gemini_client()
    model_name = get_gemini_model()
    delay = api_delay_sec()

    profiles: list[dict[str, Any]] = []
    for tier in TIER_ORDER:
        for i in range(1, args.profiles_per_tier + 1):
            profile_id = f"{args.course}_{tier}_{i}"
            print(f"Generating {profile_id}...")
            generated = generate_one_profile(
                client,
                model_name,
                syllabus["courseTitle"],
                tier,
                tier_question_id,
                tier_question_text,
                tier_options[tier],
                remaining_questions,
                index=i,
                total_in_tier=args.profiles_per_tier,
            )
            profiles.append(
                {
                    "id": profile_id,
                    "tier": tier,
                    "description": generated["description"],
                    "answers": generated["answers"],
                }
            )
            time.sleep(delay)

    save_json(
        paths.profiles,
        {
            "course_id": args.course,
            "design": f"{len(TIER_ORDER)} tiers x {args.profiles_per_tier} profiles, LLM-generated (script 12)",
            "tier_question_id": tier_question_id,
            "profiles": profiles,
        },
    )
    print(f"Saved {len(profiles)} profiles to {paths.profiles}")
    print(f"Next: python scripts/07_generate_pathways_offline.py --course {args.course}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
