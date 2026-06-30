"""Offline pathway generation via Gemini (no database)."""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types

STUDY_ROOT = Path(__file__).resolve().parent.parent

# Mirrors app/api/study/seed/route.ts STANDARD_SURVEY_QUESTIONS
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

GENERATE_PATHWAY_FUNCTION = types.FunctionDeclaration(
    name="generate_learning_pathway",
    description="Generate a learning pathway of structured nodes for a student",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "nodes": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "id": types.Schema(type=types.Type.STRING),
                        "title": types.Schema(type=types.Type.STRING),
                        "description": types.Schema(type=types.Type.STRING),
                        "type": types.Schema(
                            type=types.Type.STRING,
                            enum=["topic", "subtopic", "resource", "assessment"],
                        ),
                        "difficulty": types.Schema(
                            type=types.Type.STRING,
                            enum=["beginner", "intermediate", "advanced"],
                        ),
                        "duration": types.Schema(type=types.Type.STRING),
                        "dependsOn": types.Schema(
                            type=types.Type.ARRAY,
                            items=types.Schema(type=types.Type.STRING),
                        ),
                    },
                    required=["id", "title", "description", "type", "difficulty", "duration", "dependsOn"],
                ),
            ),
        },
        required=["nodes"],
    ),
)


def _load_env() -> None:
    load_dotenv(STUDY_ROOT / ".env")
    root_env = STUDY_ROOT.parent / ".env"
    if root_env.exists():
        load_dotenv(root_env, override=False)


def get_gemini_client() -> genai.Client:
    _load_env()
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in study/.env or repo root .env")
    return genai.Client(api_key=api_key)


def get_gemini_model() -> str:
    _load_env()
    return os.getenv("GEMINI_MODEL", "gemini-3-flash-preview").strip()


def build_prompt(syllabus_context: dict[str, str], answers: dict[str, str]) -> str:
    qa_lines: list[str] = []
    for q in SURVEY_QUESTIONS:
        qid = q["id"]
        answer = answers.get(qid, "")
        qa_lines.append(f"Q: {q['text']}\nA: {answer}")

    ctx = syllabus_context
    return f"""Course Information:
Description: {ctx.get('courseDescription', '')}
Prerequisites: {ctx.get('prerequisites', '')}
Learning Objectives: {ctx.get('learningObjectives', '')}
Course Schedule: {ctx.get('courseSchedule', '')}
Assessment Methods: {ctx.get('assessmentMethods', '')}

Student Survey Responses:
{chr(10).join(qa_lines)}

Based on the course information and the student's survey responses, generate a personalized learning pathway that:
1. Aligns with the course learning objectives and schedule
2. Considers the student's learning preferences, prior knowledge, and interests
3. Takes into account any prerequisites or background knowledge gaps
4. Incorporates the assessment methods and grading structure
5. Provides a structured progression through the course material with clear dependencies

Create 10-14 pathway nodes that form a coherent learning journey."""


def generate_pathway_nodes(
    client: genai.Client,
    syllabus_context: dict[str, str],
    answers: dict[str, str],
    *,
    model: str | None = None,
) -> list[dict[str, Any]]:
    prompt = build_prompt(syllabus_context, answers)
    model_name = model or get_gemini_model()

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[types.Tool(function_declarations=[GENERATE_PATHWAY_FUNCTION])],
        ),
    )

    if not response.function_calls:
        raise RuntimeError("Gemini did not return a function call for pathway generation")

    args = response.function_calls[0].args
    nodes = args.get("nodes") if isinstance(args, dict) else None
    if not nodes or not isinstance(nodes, list):
        raise RuntimeError("Failed to parse pathway nodes from Gemini response")

    return nodes


def generate_pathway_with_retry(
    client: genai.Client,
    syllabus_context: dict[str, str],
    answers: dict[str, str],
    *,
    retries: int = 2,
    delay_sec: float = 2.0,
) -> list[dict[str, Any]]:
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return generate_pathway_nodes(client, syllabus_context, answers)
        except Exception as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(delay_sec * (attempt + 1))
    raise last_error or RuntimeError("Pathway generation failed")
