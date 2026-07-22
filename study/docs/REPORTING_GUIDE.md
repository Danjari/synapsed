# Team reporting guide (Phase 0 and beyond)

Save this file so future report generation keeps the same standards.

## Audience

- Professors, product teammates, and researchers who **do not read the codebase**
- Assume no knowledge of function names, script numbers, or API details

## Language rules

1. **Plain English first** — e.g. “AI judge” not `llm_judge.py`; “pathway generator” not `generate_pathway_with_retry`
2. **Explain acronyms once** — e.g. “block coverage score (how similar two students’ syllabi paths are)”
3. **Lead with the story** — what we tested → what broke → what we changed → what happened next
4. **Numbers with context** — always show threshold and pass/fail, not raw scores alone
5. **No code blocks in PDF-facing docs** unless the team explicitly asks

## Visual rules

1. Primary deliverable: **`study/reports/phase0_team_report.html`** — open in browser → Print → Save as PDF
2. Use **charts** for comparisons (before/after bars, gate checklist)
3. Use **block trains** (colored boxes B1→B2→B6) for pathway structure — easier than React Flow for PDF
4. Generous whitespace, 16–18px body text, clear section breaks
5. `report.md` = internal technical reference; **HTML report** = team handout

## What to document each iteration

| Section | Content |
|---------|---------|
| Overview | One paragraph: what Phase 0 is and why we run it |
| Run N results | Pass/fail table with plain labels |
| Failures | What failed in human terms and why it matters |
| Fixes | Exact prompt/rule changes (no code), not “we improved things” |
| Run N+1 results | Same table, side-by-side with previous run |
| Recommendation | Proceed to human study? Fix again? |

## File locations

| File | Purpose |
|------|---------|
| `data/results/reports/iteration_1_evaluation.json` | Frozen results after first full 50-profile run |
| `data/results/reports/research_evaluation.json` | Latest evaluation |
| `data/results/reports/iteration_log.json` | Machine-readable run history |
| `reports/phase0_team_report.html` | Team PDF source |
| `reports/ITERATION_JOURNAL.md` | Plain-language run diary |

## Regenerate team report

```bash
python scripts/10_generate_team_report.py
```

After evaluation completes, run the script above and open `reports/phase0_team_report.html`.

## Ethics

- Never lower pass thresholds to force a green result
- Document failures honestly — they inform prompt fixes
- Disclose: pathways from Gemini, judge from Claude, independent models
