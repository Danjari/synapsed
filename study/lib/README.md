# `study/lib/` — Python helpers

Shared library used by `study/scripts/*`. Not imported by the Next.js app (the app has its own TypeScript `lib/`).

Parent: [`../README.md`](../README.md).

---

## Modules

| File | Purpose |
|---|---|
| `pathway_generator.py` | Call Gemini to generate pathways (offline / shared logic) |
| `personalization_prompt.py` | Prompt assembly for personalization |
| `syllabus_context.py` | Load/prepare syllabus context for generation |
| `pathway_metrics.py` | Pathway similarity / diversity metrics |
| `research_metrics.py` | Research-grade metric helpers used by evaluation |
| `llm_judge.py` | Anthropic Claude LLM-as-judge rubric scoring |
| `rule_validator.py` | Structural / rule checks on pathways |
| `api_client.py` | HTTP client for DB-backed SynapsEd API calls |
| `pdf_builder.py` | PDF construction helpers |
| `rate_limit.py` | Delays + exponential backoff on 429 |
| `content_quality.py` | Content quality scoring helpers |
| `course_paths.py` | Course filesystem path helpers |

---

## Coupling

- Prompt / block IDs should stay consistent with `../data/prompts/pathway_generation_spec.json`.
- Metrics used as **gates** must match thresholds in `../config/study_config.yaml` and script `09`.
