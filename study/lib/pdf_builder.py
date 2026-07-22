"""Build syllabus PDF from syllabus.json."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

SOURCE_LABELS = {
    "ai4e": "AI For Everyone",
    "genai4e": "Generative AI for Everyone",
    "prompt4e": "AI Prompting for Everyone",
}


def _lesson_line(lesson: dict[str, Any]) -> str:
    source = SOURCE_LABELS.get(lesson.get("source", ""), lesson.get("source", ""))
    ref = lesson.get("sourceRef", "")
    suffix = f" [{source}, {ref}]" if source else ""
    return f"• {lesson['title']}{suffix}"


def _skipped_line(item: dict[str, Any]) -> str:
    source = SOURCE_LABELS.get(item.get("source", ""), item.get("source", ""))
    reason = item.get("reason", "")
    return f"• {item['title']} ({source}) — <i>skipped:</i> {reason}"


def build_syllabus_pdf(syllabus: dict[str, Any], output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(output_path), pagesize=letter, topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    styles = getSampleStyleSheet()
    story: list[Any] = []

    weeks = syllabus.get("scheduleWeeks", 2)
    total_mins = syllabus.get("estimatedTotalMinutes", 0)

    story.append(Paragraph(syllabus["courseTitle"], styles["Title"]))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph(f"<b>Duration:</b> {weeks} weeks (~{total_mins // 60}h {total_mins % 60}m total)", styles["Normal"]))
    story.append(Paragraph(f"<b>Prerequisites:</b> {syllabus.get('prerequisites', 'None')}", styles["Normal"]))
    story.append(Spacer(1, 0.15 * inch))

    story.append(Paragraph("<b>Course Learning Objectives</b>", styles["Heading2"]))
    for obj in syllabus.get("learningObjectives", []):
        story.append(Paragraph(f"• {obj}", styles["Normal"]))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("<b>Topic Blocks</b>", styles["Heading2"]))
    story.append(
        Paragraph(
            "Blocks 5a and 5b are pathway emphasis areas — personalized paths typically prioritize one over the other.",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 0.1 * inch))

    blocks = syllabus.get("blocks", syllabus.get("modules", []))
    current_week: int | None = None

    for block in blocks:
        week = block.get("calendarWeek", block.get("week"))
        if week != current_week:
            current_week = week
            story.append(Paragraph(f"<b>Calendar Week {week}</b>", styles["Heading2"]))
            story.append(Spacer(1, 0.08 * inch))

        mins = block.get("estimatedMinutes", 0)
        story.append(
            Paragraph(
                f"<b>{block['title']}</b> ({mins} min) — {block.get('sourceCourse', '')}",
                styles["Heading3"],
            )
        )
        if block.get("pathwayNote"):
            story.append(Paragraph(f"<i>{block['pathwayNote']}</i>", styles["Normal"]))

        for obj in block.get("objectives", []):
            story.append(Paragraph(f"• {obj}", styles["Normal"]))

        story.append(Paragraph("<b>Lessons to extract:</b>", styles["Normal"]))
        for lesson in block.get("lessons", []):
            if isinstance(lesson, str):
                story.append(Paragraph(f"• {lesson}", styles["Normal"]))
            else:
                story.append(Paragraph(_lesson_line(lesson), styles["Normal"]))

        skipped = block.get("skippedLessons", [])
        if skipped:
            story.append(Paragraph("<b>Skipped from source (do not extract):</b>", styles["Normal"]))
            for item in skipped:
                story.append(Paragraph(_skipped_line(item), styles["Normal"]))

        story.append(Spacer(1, 0.12 * inch))

    story.append(Paragraph("<b>Assessment Methods</b>", styles["Heading2"]))
    story.append(Paragraph("Block quizzes and platform-based interaction throughout the 2-week study.", styles["Normal"]))

    doc.build(story)
    return output_path
