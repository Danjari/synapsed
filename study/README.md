# Phase 0 — Synthetic Pathway Validation

Python pipeline: syllabus → synthetic profiles → generate pathways → check diversity.

## Setup

```bash
cd study
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env
```

Ensure `GEMINI_API_KEY` is set in `study/.env` or the repo root `.env`.

## Recommended pipeline (offline — no database)

No dev server, no professor ID, no MongoDB writes.

```bash
python scripts/01_build_syllabus_json.py
python scripts/02_generate_syllabus_pdf.py          # optional, for human-readable PDF
python scripts/07_generate_pathways_offline.py      # Gemini → local JSON
python scripts/08_analyze_pathway_diversity.py      # PASS / FAIL report
```

## Optional pipeline (platform / DB-backed)

Use only if you want to test the full app integration later.

```bash
python scripts/03_upload_materials.py      # requires dev server + STUDY_CLASS_ID
python scripts/04_process_syllabus.py
python scripts/06_seed_study_class.py      # requires STUDY_API_KEY in app .env
python scripts/07_generate_pathways.py
python scripts/08_analyze_pathway_diversity.py
```

## Gate criteria

- Mean pairwise Jaccard similarity on node titles **< 0.85**
- Contrast pair (`low_knowledge_general` vs `high_knowledge_research`) shows foundation nodes or sufficient divergence

Reports: `data/results/reports/diversity_report.json` and `.html`

Exit code `2` from script 08 = gate failed → fix survey or generation prompt before human studies.

## Branch

All study work lives on the `study` branch.
