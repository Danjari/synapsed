# `study/scripts/` — Numbered pipeline steps

Run from `study/` with the venv activated. Prefer the offline sequence in [`../README.md`](../README.md) unless you need the live app.

---

## Script map

| Script | Purpose |
|---|---|
| `01_build_syllabus_json.py` | Build structured syllabus JSON from course inputs |
| `02_generate_syllabus_pdf.py` | Optional PDF rendering of syllabus |
| `03_upload_materials.py` | **DB-backed** — upload materials to running SynapsEd |
| `04_process_syllabus.py` | **DB-backed** — process syllabus on platform |
| `05_generate_synthetic_profiles.py` | Create clustered synthetic learner profiles |
| `06_seed_study_class.py` | **DB-backed** — seed class/profiles via `/api/study/seed` |
| `07_generate_pathways.py` | **DB-backed** — generate pathways through the app API |
| `07_generate_pathways_offline.py` | **Offline** — Gemini → local JSON (recommended) |
| `08_analyze_pathway_diversity.py` | Secondary title-Jaccard diversity report |
| `09_research_evaluation.py` | **Primary gate** — Jaccard, hypotheses, Claude judge |
| `10_generate_team_report.py` | HTML team report (print to PDF) |
| `11_generate_survey_questions.py` | Survey question generation helper |
| `12_generate_required_course_profiles.py` | Required-course profile generation |
| `13_power_analysis.py` | Statistical power analysis |
| `14_required_course_power_analysis.py` | Required-course power analysis |
| `15_content_quality_metrics.py` | Content quality metrics |

Helpers live in [`../lib/`](../lib/README.md). Thresholds: [`../config/`](../config/README.md).

---

## Conventions

- Keep numbering; new steps should get the next free index and be documented here + in `study/README.md`.
- Offline scripts must not require Mongo/R2; DB-backed scripts need `SYNAPSED_BASE_URL` + keys from `env.example`.
