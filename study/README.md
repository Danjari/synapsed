# Phase 0 — Synthetic Pathway Validation

Python pipeline: syllabus → synthetic profiles → generate pathways → **research-grade evaluation**.

## Setup

```bash
cd study
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env
```

Ensure `GEMINI_API_KEY` (pathway generation) and `ANTHROPIC_API_KEY` (Claude judge) are set in `study/.env` or repo root `.env`.

## Recommended pipeline (offline — no database)

```bash
python scripts/01_build_syllabus_json.py
python scripts/02_generate_syllabus_pdf.py          # optional
python scripts/05_generate_synthetic_profiles.py  # 50 clustered profiles
python scripts/07_generate_pathways_offline.py      # Gemini → local JSON (~1 min/profile)
python scripts/09_research_evaluation.py            # primary gate
python scripts/10_generate_team_report.py           # team HTML → Print to PDF
python scripts/08_analyze_pathway_diversity.py      # secondary title-Jaccard report
```

## Evaluation framework (for paper)

| Layer | Metric | Script | Role |
|-------|--------|--------|------|
| **Primary** | Multiset Jaccard on `syllabusBlockId` | 09 | Block *coverage* similarity (lower = more diverse) |
| **Primary** | Pre-registered contrast hypotheses H1–H5 | 09 | Structural personalization checks |
| **Primary** | Within/between cluster multiset Jaccard | 09 | Similar profiles → similar paths; contrasting clusters diverge |
| **Primary** | LLM-as-judge via **Anthropic Claude** (5-dimension rubric) | 09 | Independent from Gemini generator |
| Secondary | Title Jaccard | 08 | Can miss shared structural spine |
| Secondary | Sequence Jaccard (position-aware blocks) | 09 | Diagnostic only |

Prompt spec and rubric: `data/prompts/pathway_generation_spec.json`

### Gate criteria (script 09)

- Mean pairwise **multiset Jaccard** on block ids **< 0.92**
- **≥ 80%** of contrast hypotheses pass (see spec for H1–H5)
- Mean Claude judge score **≥ 3.5** (unless `--skip-judge`)
- Within-cluster similarity **≥ 0.65**; contrasting-cluster divergence **≤ 0.70**

Exit code `2` = gate failed → **fix the prompt or generator**; thresholds are not tuned to force a pass.

## Optional pipeline (platform / DB-backed)

```bash
python scripts/03_upload_materials.py
python scripts/04_process_syllabus.py
python scripts/06_seed_study_class.py
python scripts/07_generate_pathways.py
```

App pathway generation uses the same prompt spec via `lib/learning-paths/pathwayPrompt.ts`.

## Branch

All study work lives on the `study` branch.
