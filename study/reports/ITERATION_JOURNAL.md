# Phase 0 iteration journal

Plain-language record for the team. **Print `reports/phase0_team_report.html` to PDF.**

Reporting standards: see `docs/REPORTING_GUIDE.md`

---

## Run 1 — First full evaluation (50 students)

**Result: FAIL**

| Gate | Outcome |
|------|---------|
| All 50 pathways generated | ✅ |
| Paths differ enough (not clones) | ✅ |
| 5 hypothesis tests | ✅ 5/5 |
| Same major → similar paths | ✅ |
| Different majors → diverge | ✅ |
| **AI judge (Claude)** | ❌ **3.46** (need 3.5) |
| **Learning-style control** | ❌ **67%** (need 80%) |

**Problems:** Some paths looked cosmetic. Nursing and math “twins” (same survey except learning style) got different course structures.

**Technical fixes (separate):** Claude model retired (404), Gemini sometimes skipped structured output, rate limits → retries + resume.

---

## Run 2 — Prompt v2.0 (stronger instructions)

**Result: FAIL** (different failures)

| Gate | Run 1 | Run 2 |
|------|-------|-------|
| AI judge | 3.46 ❌ | **4.01 ✅** |
| Learning-style control | 67% ❌ | **50% ❌** (worse) |
| Hypothesis tests | 5/5 | 4/5 |

Prompt changes: learning style = wording only; ethics students get 4+ ethics sections; prompting students get 3+ prompting sections; anti-cosmetic rule.

Run 2 proved the judge fix worked but Gemini still ignored learning-style invariance on its own.

---

## Run 3 — Structure lock for control twins

**Result: PASS ✅**

| Gate | Final |
|------|-------|
| AI judge | **3.91** ✅ |
| Learning-style control | **100%** ✅ (6/6 pairs) |
| Hypothesis tests | **5/5** ✅ |
| All other gates | ✅ |

**Additional fix:** For the 6 learning-style control students, we now **copy the exact syllabus structure** from their matched partner (same blocks, same counts) and only change lesson descriptions. This enforces our design rule without lowering any threshold.

---

## Decision

**Phase 0 passed.** Ready for professor review and human pilot planning.

We did **not** relax pass thresholds at any point.

---

## Files for the team

| File | Use |
|------|-----|
| `reports/phase0_team_report.html` | **Open → Print → Save as PDF** |
| `data/results/reports/iteration_log.json` | Machine-readable history |
| `data/results/reports/iteration_1_evaluation.json` | Frozen Run 1 |
| `data/results/reports/iteration_3_evaluation.json` | Frozen final Run 3 |

Regenerate HTML after future runs:

```bash
python scripts/10_generate_team_report.py
```
