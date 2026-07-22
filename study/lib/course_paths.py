"""Resolve per-course file paths. Omitting --course keeps today's AI-literacy paths."""

from __future__ import annotations

from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent


class CoursePaths:
    def __init__(self, course: str | None = None):
        self.course = course
        if course:
            base = STUDY_ROOT / "data" / "courses" / course
            self.syllabus = base / "syllabus.json"
            self.spec = base / "pathway_generation_spec.json"
            self.profiles = base / "profiles.json"
            self.survey_questions = base / "survey_questions.json"
            self.results_dir = base / "results"
        else:
            self.syllabus = STUDY_ROOT / "data" / "syllabus" / "syllabus.json"
            self.spec = STUDY_ROOT / "data" / "prompts" / "pathway_generation_spec.json"
            self.profiles = STUDY_ROOT / "data" / "profiles" / "synthetic_profiles.json"
            self.survey_questions = STUDY_ROOT / "data" / "prompts" / "survey_questions.json"
            self.results_dir = STUDY_ROOT / "data" / "results"

        self.pathways_dir = self.results_dir / "pathways"
        self.reports_dir = self.results_dir / "reports"


def resolve(course: str | None = None) -> CoursePaths:
    return CoursePaths(course)
