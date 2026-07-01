"""Offline pathway generation via Gemini (no database)."""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types

from lib.personalization_prompt import build_personalization_prompt, load_generation_spec
from lib.rate_limit import call_with_rate_limit_retry

STUDY_ROOT = Path(__file__).resolve().parent.parent


def _block_id_enum() -> list[str]:
    return load_generation_spec().get("blockIds", [])


def _pathway_function_declaration() -> types.FunctionDeclaration:
    block_ids = _block_id_enum()
    return types.FunctionDeclaration(
        name="generate_learning_pathway",
        description="Generate a structurally personalized learning pathway with syllabus block tags",
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
                            "syllabusBlockId": types.Schema(
                                type=types.Type.STRING,
                                enum=block_ids if block_ids else None,
                            ),
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
                        required=[
                            "id",
                            "title",
                            "description",
                            "syllabusBlockId",
                            "type",
                            "difficulty",
                            "duration",
                            "dependsOn",
                        ],
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


def build_prompt(
    syllabus: dict[str, Any],
    syllabus_context: dict[str, str],
    answers: dict[str, str],
) -> str:
    return build_personalization_prompt(syllabus, syllabus_context, answers)


def generate_pathway_nodes(
    client: genai.Client,
    syllabus: dict[str, Any],
    syllabus_context: dict[str, str],
    answers: dict[str, str],
    *,
    model: str | None = None,
) -> list[dict[str, Any]]:
    prompt = build_prompt(syllabus, syllabus_context, answers)
    model_name = model or get_gemini_model()

    def _call() -> Any:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(function_declarations=[_pathway_function_declaration()])],
                tool_config=types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(
                        mode=types.FunctionCallingConfigMode.ANY,
                        allowed_function_names=["generate_learning_pathway"],
                    )
                ),
            ),
        )
        if not response.function_calls:
            raise RuntimeError("Gemini did not return a function call for pathway generation")
        return response

    response = call_with_rate_limit_retry(_call, label=f"Gemini pathway ({model_name})")

    args = response.function_calls[0].args
    nodes = args.get("nodes") if isinstance(args, dict) else None
    if not nodes or not isinstance(nodes, list):
        raise RuntimeError("Failed to parse pathway nodes from Gemini response")

    valid_blocks = set(_block_id_enum())
    for node in nodes:
        block_id = node.get("syllabusBlockId")
        if block_id not in valid_blocks:
            raise RuntimeError(f"Node '{node.get('title')}' has invalid syllabusBlockId: {block_id}")

    return nodes


def generate_pathway_with_retry(
    client: genai.Client,
    syllabus: dict[str, Any],
    syllabus_context: dict[str, str],
    answers: dict[str, str],
    *,
    retries: int = 2,
    delay_sec: float = 2.0,
) -> list[dict[str, Any]]:
    """Outer retry for validation errors; rate limits handled inside generate_pathway_nodes."""
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return generate_pathway_nodes(client, syllabus, syllabus_context, answers)
        except Exception as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(delay_sec * (attempt + 1))
    raise last_error or RuntimeError("Pathway generation failed")
