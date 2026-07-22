# Phase 0 — Synthetic Pathway Validation

Python pipeline: syllabus → synthetic profiles → generate pathways → **research-grade evaluation**.

This folder is the **research / evaluation** companion to the SynapsEd Next.js app. Pathway prompt rules are shared with TypeScript via `data/prompts/pathway_generation_spec.json` (imported by `lib/learning-paths/pathwayPrompt.ts` in the app).

**Parent hub:** [`../README.md`](../README.md) · **Architecture:** [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

Subfolder maps: [`scripts/`](./scripts/README.md) · [`lib/`](./lib/README.md) · [`data/`](./data/README.md) · [`config/`](./config/README.md) · [`docs/`](./docs/README.md) · [`report/`](./report/README.md) · [`reports/`](./reports/README.md).

---

## Setup

```bash
cd study
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env
```

Ensure `GEMINI_API_KEY` (pathway generation) and `ANTHROPIC_API_KEY` (Claude judge) are set in `study/.env` or repo root `.env`.

See `env.example` for rate-limit knobs and optional DB-backed settings (`SYNAPSED_BASE_URL`, `STUDY_API_KEY`, …).

---

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

---

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
Gate thresholds: `config/study_config.yaml`

### Gate criteria (script 09)

- Mean pairwise **multiset Jaccard** on block ids **< 0.92**
- **≥ 80%** of contrast hypotheses pass (see spec for H1–H5)
- Mean Claude judge score **≥ 3.5** (unless `--skip-judge`)
- Within-cluster similarity **≥ 0.65**; contrasting-cluster divergence **≤ 0.70**

Exit code `2` = gate failed → **fix the prompt or generator**; thresholds are not tuned to force a pass.

---

## Optional pipeline (platform / DB-backed)

Requires the Next.js app running and study env pointed at it:

```bash
python scripts/03_upload_materials.py
python scripts/04_process_syllabus.py
python scripts/06_seed_study_class.py
python scripts/07_generate_pathways.py
```

App bridge: `POST /api/study/seed`. App pathway generation uses the same prompt spec via `lib/learning-paths/pathwayPrompt.ts`.

---

## Folder importance

| Path | Importance |
|---|---|
| `scripts/` | Numbered pipeline steps — run in order for offline eval |
| `lib/` | Shared Python helpers (metrics, judge, generator, API client) |
| `data/` | Inputs/outputs: courses, profiles, prompts, results, syllabus |
| `config/` | Gate thresholds YAML |
| `docs/` | How to write team-facing reports |
| `report/` | JSON artifacts for papers / examples |
| `reports/` | HTML team report + iteration journal |
| `report*.md/.docx` | Written study reports (course-specific) |
| `writingstyle.md` | Tone/style for human-facing study writing |

---

## Bridge to the main app (do not break casually)

| Study artifact | App consumer |
|---|---|
| `data/prompts/pathway_generation_spec.json` | `lib/learning-paths/pathwayPrompt.ts` |
| DB seed scripts + `STUDY_API_KEY` | `app/api/study/seed` |
| Offline generator behavior | Should stay aligned with live `/api/pathway/*` prompts |

---

## Branch note

Historically, study work has lived on a `study` branch. Confirm with the team which branch is canonical before merging prompt-spec changes into the app.
