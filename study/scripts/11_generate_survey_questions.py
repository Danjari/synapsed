#!/usr/bin/env python3
"""Generate syllabus-derived onboarding survey questions, offline.

Replicates the real SynapsEd product's survey-generation flow
(app/api/surveys/generate/route.ts -> generateContextualSurvey), which
derives 10-15 onboarding questions from a syllabus in 5 fixed categories
(prerequisite assessment, learning-objectives readiness, assessment
preparation, course-specific goals, learning preferences/challenges),
via a Gemini function call. Output matches the real product's question
schema exactly: {id, text, type, options?, required, order}.

This is for required, cumulative courses (OS, Data Structures) where
Phase 0's personalization axis is prior familiarity with the course's
foundational technology/prerequisite concepts — the prompt below adds
one explicit nudge (beyond the faithful copy of the real prompt) asking
the prerequisite-assessment category to surface that specifically.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

from google.genai import types  # noqa: E402

from lib.api_client import load_json, save_json  # noqa: E402
from lib.course_paths import resolve  # noqa: E402
from lib.pathway_generator import get_gemini_client, get_gemini_model  # noqa: E402
from lib.rate_limit import call_with_rate_limit_retry  # noqa: E402
from lib.syllabus_context import syllabus_to_context  # noqa: E402

QUESTION_SCHEMA = types.FunctionDeclaration(
    name="generate_survey_questions",
    description="Generate survey questions for student assessment",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "questions": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "id": types.Schema(type=types.Type.STRING, description="Unique question identifier"),
                        "text": types.Schema(type=types.Type.STRING, description="Question text"),
                        "type": types.Schema(
                            type=types.Type.STRING,
                            enum=["multiple_choice", "text", "rating", "ranking"],
                            description="Question type",
                        ),
                        "options": types.Schema(
                            type=types.Type.ARRAY,
                            items=types.Schema(type=types.Type.STRING),
                            description="Options for multiple choice or ranking questions",
                        ),
                        "required": types.Schema(type=types.Type.BOOLEAN, description="Whether question is required"),
                        "order": types.Schema(type=types.Type.NUMBER, description="Display order"),
                    },
                    required=["id", "text", "type", "required", "order"],
                ),
            ),
        },
        required=["questions"],
    ),
)


def build_survey_prompt(
    ctx: dict[str, str],
    *,
    course_name: str,
    level: str = "undergraduate",
    subject: str = "Computer Science",
    familiarity_focus: str,
) -> str:
    return f"""You are an expert educational assessment specialist. Generate a comprehensive student survey for personalized learning path creation based on the following course information:

COURSE DETAILS:
- Course Name: {course_name}
- Description: {ctx.get('courseDescription', 'Not provided')}
- Academic Level: {level}
- Subject Area: {subject}

SYLLABUS INFORMATION:
- Prerequisites: {ctx.get('prerequisites', 'No prerequisites specified')}
- Learning Objectives: {ctx.get('learningObjectives', 'No learning objectives specified')}
- Assessment Methods: {ctx.get('assessmentMethods', 'No assessment methods specified')}
- Course Schedule: {ctx.get('courseSchedule', 'No schedule specified')}

Generate 10-15 survey questions that are specifically tailored to this course. Focus on:

1. PREREQUISITE ASSESSMENT (3-4 questions):
   - Based on the actual prerequisites: {ctx.get('prerequisites', 'general course background')}
   - Assess specific knowledge areas mentioned in prerequisites
   - Evaluate confidence in prerequisite skills
   - Identify knowledge gaps in required background

2. LEARNING OBJECTIVES READINESS (3-4 questions):
   - Based on the course learning objectives: {ctx.get('learningObjectives', 'course goals')}
   - Assess readiness for specific learning outcomes
   - Evaluate prior experience with course topics
   - Understand student expectations for course content

3. ASSESSMENT PREPARATION (2-3 questions):
   - Based on assessment methods: {ctx.get('assessmentMethods', 'general assessment preferences')}
   - Understand student preferences for evaluation methods
   - Assess comfort with different assessment types
   - Evaluate study and preparation strategies

4. COURSE-SPECIFIC GOALS (2-3 questions):
   - Based on course description: {ctx.get('courseDescription', 'general course information')}
   - Understand student goals aligned with course content
   - Assess motivation for taking this specific course
   - Evaluate career/academic goals related to course topics

5. LEARNING PREFERENCES & CHALLENGES (2-3 questions):
   - Identify learning style and preferences
   - Understand time availability and pace preferences
   - Assess anticipated challenges specific to this course content

ADDITIONAL REQUIREMENT SPECIFIC TO THIS STUDY:
- This is a required, cumulative course — every student must learn the entire syllabus. The
  personalization signal we care about most is: {familiarity_focus}
- At least one PREREQUISITE ASSESSMENT question MUST directly ask the student to self-rate
  their prior exposure to that specific technology/concept (not general programming ability),
  with multiple_choice options that map cleanly to three tiers: no prior exposure, some prior
  exposure, strong prior exposure.

IMPORTANT REQUIREMENTS:
- Make questions SPECIFIC to this course's actual content and prerequisites
- Reference actual prerequisite topics when available
- Align with actual learning objectives when available
- Use the course description to inform goal-related questions
- Use clear, student-friendly language
- Ensure questions are actionable for creating personalized learning paths
- Questions should help identify student strengths, weaknesses, and interests

Generate the questions now."""


def generate_survey_questions(
    syllabus: dict,
    *,
    familiarity_focus: str,
    level: str = "undergraduate",
    subject: str = "Computer Science",
) -> list[dict]:
    ctx = syllabus_to_context(syllabus)
    prompt = build_survey_prompt(
        ctx,
        course_name=syllabus["courseTitle"],
        level=level,
        subject=subject,
        familiarity_focus=familiarity_focus,
    )

    client = get_gemini_client()
    model_name = get_gemini_model()

    def _call():
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(function_declarations=[QUESTION_SCHEMA])],
                tool_config=types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(
                        mode=types.FunctionCallingConfigMode.ANY,
                        allowed_function_names=["generate_survey_questions"],
                    )
                ),
            ),
        )
        if not response.function_calls:
            raise RuntimeError("Gemini did not return a function call for survey generation")
        return response

    response = call_with_rate_limit_retry(_call, label=f"Gemini survey ({model_name})")
    args = response.function_calls[0].args
    questions = args.get("questions") if isinstance(args, dict) else None
    if not questions or not isinstance(questions, list):
        raise RuntimeError("Failed to parse survey questions from Gemini response")
    return questions


FAMILIARITY_FOCUS = {
    "os": "prior exposure to systems/C programming and OS concepts before this course",
    "datastructures": "prior exposure to C++ specifically (not just general programming ability from an intro CS course)",
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate syllabus-derived survey questions")
    parser.add_argument("--course", required=True, help="Course id, e.g. os or datastructures")
    args = parser.parse_args()

    paths = resolve(args.course)
    syllabus = load_json(paths.syllabus)
    focus = FAMILIARITY_FOCUS.get(args.course, "prior exposure to the course's foundational technology")

    print(f"Generating survey questions for {syllabus['courseTitle']}...")
    questions = generate_survey_questions(syllabus, familiarity_focus=focus)

    save_json(paths.survey_questions, {"course_id": args.course, "questions": questions})
    print(f"Saved {len(questions)} questions to {paths.survey_questions}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
