# Phase 0 — Synthetic Pathway Validation

Python pipeline for the study paper: build syllabus → seed synthetic profiles → generate pathways → check diversity.

## Setup

```bash
cd study
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env
```

Edit `study/.env`:

- `SYNAPSED_BASE_URL` — e.g. `http://localhost:3000`
- `STUDY_API_KEY` — must match `STUDY_API_KEY` in the app root `.env`
- `STUDY_CLASS_ID` — existing test class **or** `STUDY_PROFESSOR_ID` to create one via seed

Add to app `.env`:

```
STUDY_API_KEY=your-secret-key
```

## Pipeline (run in order)

```bash
python scripts/01_build_syllabus_json.py
python scripts/02_generate_syllabus_pdf.py
python scripts/03_upload_materials.py      # requires dev server + STUDY_CLASS_ID
python scripts/04_process_syllabus.py
python scripts/06_seed_study_class.py
python scripts/07_generate_pathways.py     # calls Gemini per profile
python scripts/08_analyze_pathway_diversity.py
```

## Gate criteria

- Mean pairwise Jaccard similarity on node titles **< 0.85**
- Contrast pair (`low_knowledge_general` vs `high_knowledge_research`) shows foundation nodes or sufficient divergence

Reports: `data/results/reports/diversity_report.json` and `.html`

Exit code `2` from script 08 = gate failed → fix survey or generation prompt before human studies.

## Branch

All study work lives on the `study` branch.
