"""Build syllabus context dict from local syllabus.json (mirrors platform getSyllabusContext)."""

from __future__ import annotations

from typing import Any


def _lesson_titles(lessons: list[Any]) -> list[str]:
    titles: list[str] = []
    for lesson in lessons:
        if isinstance(lesson, dict):
            titles.append(lesson["title"])
        else:
            titles.append(str(lesson))
    return titles


def syllabus_to_context(syllabus: dict[str, Any]) -> dict[str, str]:
    blocks = syllabus.get("blocks", [])
    schedule_lines: list[str] = []

    for block in blocks:
        week = block.get("calendarWeek", "?")
        titles = _lesson_titles(block.get("lessons", []))
        note = block.get("pathwayNote", "")
        line = (
            f"Week {week} — {block['title']} ({block.get('estimatedMinutes', 0)} min): "
            + "; ".join(titles)
        )
        if note:
            line += f" [{note}]"
        schedule_lines.append(line)

    total = syllabus.get("estimatedTotalMinutes", 0)
    weeks = syllabus.get("scheduleWeeks", 2)

    default_description = (
        f"{syllabus['courseTitle']}. "
        f"{weeks}-week asynchronous micro-course (~{total} minutes total)."
    )
    default_assessment = (
        "Module quizzes and platform-based interaction across 2 calendar weeks. "
        "Blocks 5a (Business) and 5b (Projects) are pathway emphasis areas — "
        "personalized paths typically prioritize one over the other."
    )

    return {
        "courseDescription": syllabus.get("courseDescription") or default_description,
        "prerequisites": syllabus.get("prerequisites", ""),
        "learningObjectives": "\n".join(f"- {obj}" for obj in syllabus.get("learningObjectives", [])),
        "courseSchedule": "\n".join(schedule_lines),
        "assessmentMethods": syllabus.get("assessmentMethods") or default_assessment,
    }
