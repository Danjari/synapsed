# `study/data/` — Study inputs and outputs

Data artifacts for Phase 0. Large or sensitive outputs may be gitignored — check `study/.gitignore`.

Parent: [`../README.md`](../README.md).

---

## Layout

| Path | Purpose |
|---|---|
| `prompts/` | **Critical** — `pathway_generation_spec.json` shared with the Next.js app |
| `profiles/` | Synthetic learner profiles (e.g. `synthetic_profiles.json`) |
| `courses/` | Course / syllabus source materials for study runs |
| `syllabus/` | Built syllabus JSON / intermediates |
| `results/` | Generated pathways and evaluation outputs |

---

## Do not break the app bridge

`prompts/pathway_generation_spec.json` is imported by:

```text
lib/learning-paths/pathwayPrompt.ts
```

Any change to block IDs, hypotheses, or generation rules affects **both** offline evaluation and live pathway generation. Update study gates and app behavior together, and record the change in `reports/ITERATION_JOURNAL.md` when relevant.
