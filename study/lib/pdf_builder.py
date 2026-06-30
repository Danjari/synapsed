"""Build syllabus PDF from syllabus.json."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def build_syllabus_pdf(syllabus: dict[str, Any], output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(output_path), pagesize=letter, topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    styles = getSampleStyleSheet()
    story: list[Any] = []

    story.append(Paragraph(syllabus["courseTitle"], styles["Title"]))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(f"<b>Prerequisites:</b> {syllabus.get('prerequisites', 'None')}", styles["Normal"]))
    story.append(Spacer(1, 0.15 * inch))

    story.append(Paragraph("<b>Learning Objectives</b>", styles["Heading2"]))
    for obj in syllabus.get("learningObjectives", []):
        story.append(Paragraph(f"• {obj}", styles["Normal"]))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("<b>Course Schedule</b>", styles["Heading2"]))
    for module in syllabus.get("modules", []):
        mins = module.get("estimatedMinutes", 0)
        story.append(
            Paragraph(
                f"<b>Week {module.get('week', '?')} — {module['title']}</b> "
                f"({mins} min, {module.get('sourceCourse', '')})",
                styles["Heading3"],
            )
        )
        for obj in module.get("objectives", []):
            story.append(Paragraph(f"• {obj}", styles["Normal"]))
        lessons = ", ".join(module.get("lessons", []))
        story.append(Paragraph(f"<i>Lessons:</i> {lessons}", styles["Normal"]))
        story.append(Spacer(1, 0.12 * inch))

    story.append(Paragraph("<b>Assessment Methods</b>", styles["Heading2"]))
    story.append(Paragraph("Module quizzes and practice exercises throughout the course.", styles["Normal"]))

    doc.build(story)
    return output_path
