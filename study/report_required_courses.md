# Phase 0 Extension: Required-Course Personalization (Operating Systems & Data Structures)

**Status:** Both courses PASS on real Gemini-generated pathways (30 profiles each, 10 per tier). Operating Systems reached PASS after 2 rounds of fixes, Data Structures after 1 more (see Section 8). AI literacy's frozen Run 3 results verified byte-for-byte unaffected by all of it.
**Courses:** Operating Systems (CS-UH 3010) and Data Structures (CS-UH 1050), both NYU Abu Dhabi.
**Relationship to the original report:** this is a separate, additive document. `report.md` (AI literacy, Run 3, PASS) is untouched — its spec, data, and results are frozen and still stand as-is.

This document explains why AI literacy's definition of "personalized" does not transfer to these two courses, what we built instead, and exactly what still needs to happen before this workstream has results.

---

## 1. Why this needed a different approach, not a copy-paste

AI literacy is an elective micro-course with genuine optional tracks: block_05a (Business) and block_05b (Technical) are explicit alternatives, and a business-focused student can legitimately receive 4 nodes of one and 0 of the other. Phase 0's whole evaluation for that course — the block-overlap Jaccard score, the H1-H5 hypotheses, the cluster analysis — measures whether students end up with *different block coverage*, and treats a low-overlap result as evidence personalization is working.

Operating Systems and Data Structures are required, cumulative, exam-driven courses. Every enrolled student sits the same midterm and the same cumulative final, both keyed to specific chapters. There is no "skip trees" or "skip deadlocks" track — the syllabi themselves have no elective branches (confirmed by reading both source PDFs in full). If we reused AI literacy's definition of personalization here, a "successful" result would mean the system decided some students don't need to learn material they will be tested on in three weeks. That is not personalization. That is a correctness bug.

**The model we resolved on instead: a fixed destination, a personalized route.**

- **Floor (hard constraint):** every syllabus block appears in every generated pathway, with enough nodes to plausibly meet that block's learning objective. No block is ever fully skippable, unlike AI literacy's alternative tracks.
- **The actual personalization axis:** prior familiarity with the course's foundational technology. For Data Structures, that's prior exposure to C++ specifically (a student can have taken the CS-UH 1001 prerequisite and still have zero C++ experience). For Operating Systems, it's prior exposure to systems/C programming and OS concepts. A student with no prior exposure gets extra scaffolding nodes concentrated in the foundational block; a student with strong prior exposure gets fewer scaffolding nodes there and more enrichment/advanced nodes instead.
- **Fixed budget:** the reallocation happens within roughly the same total pathway length. The point is to help a student catch up to their classmates *faster*, not to give them a longer or shorter course.
- **Explicitly out of scope:** practice-problem volume or repetition preference. Phase 0 only validates the generated pathway (the sequence of nodes), not practice-set design.
- **Sample size:** this is a single-axis design (one familiarity trait, three tiers), not AI literacy's multi-axis field/goal design. The combinatorial space is small, so a handful of profiles is enough for a pilot — see Section 4.

---

## 2. The two syllabi

Both syllabus JSON files follow the same schema as AI literacy's (`courseTitle`, `blocks[]` with `id`/`lessons`/`objectives`, etc.), validated with the existing `scripts/01_build_syllabus_json.py` validator (both pass with zero errors). Neither syllabus had pre-existing "unit" labels in the source PDF — block boundaries were drawn along natural topic/textbook-chapter seams.

### Operating Systems (CS-UH 3010) — 7 blocks, 26 lessons, 17 weeks

| Block | Title | Lessons |
|---|---|---|
| block_01 | OS Foundations & System Structure | 4 |
| block_02 | Processes & Inter-Process Communication | 3 |
| block_03 | Threads & CPU Scheduling | 5 (incl. midterm-review checkpoint) |
| block_04 | Process Synchronization | 4 |
| block_05 | Deadlocks | 2 |
| block_06 | Memory Management (Physical & Virtual) | 4 |
| block_07 | I/O Systems & File Storage | 4 (incl. final-review checkpoint) |

3-credit course, 43.25 contact hours. Grading: 5% homework, 35% programming projects (4 deliveries), 20% midterm, 40% final — 60% of the grade is exam-based on material every student must know.

### Data Structures (CS-UH 1050) — 8 blocks, 27 lessons, 16 weeks

| Block | Title | Lessons |
|---|---|---|
| block_01 | C++ Foundations & Object-Oriented Design | 3 |
| block_02 | Arrays, Linked Lists & Recursion | 4 (incl. Quiz 1) |
| block_03 | Stacks, Queues & Sequence-Based Structures | 6 (incl. Quiz 2, midterm review) |
| block_04 | Trees & Tree Traversal | 3 |
| block_05 | Priority Queues & Heaps | 2 |
| block_06 | Maps, Hash Tables & Dictionaries | 2 (incl. Quiz 3) |
| block_07 | Balanced & Search Trees (BST, AVL, Red-Black) | 3 |
| block_08 | Sorting Algorithms & Course Capstone | 4 (incl. Quiz 4, final review) |

4-credit course, taught in C++. Grading: 15% quizzes, 20% assignments, 10% lab, 25% midterm, 30% final — 55% of the grade is exam-based. Course policy explicitly disallows AI-assisted code generation (idea generation only), which is why we did not lean on "practice volume" as a personalization axis — practice/drilling isn't even the same activity this course wants AI help with.

Files: `study/data/courses/os/syllabus.json`, `study/data/courses/datastructures/syllabus.json`.

---

## 3. Syllabus-derived survey questions

Rather than reusing AI literacy's fixed 8-question survey, we replicated the real SynapsEd product's own survey-generation feature: `app/api/surveys/generate/route.ts` already derives 10-15 onboarding questions from a syllabus, in 5 categories (prerequisite assessment, learning-objectives readiness, assessment preparation, course-specific goals, learning preferences/challenges), via a Gemini function call with schema `{id, text, type, options?, required, order}`.

We ported that exact prompt and schema into a new offline script, `study/scripts/11_generate_survey_questions.py`, and ran it against both new syllabi. One addition beyond the faithful copy: we explicitly asked the prerequisite-assessment category to surface prior familiarity with the course's specific foundational technology (C++ for Data Structures, systems/C for OS), with multiple-choice options mapped to three tiers, since that's the one axis this whole pilot depends on.

**Result:** both runs produced exactly what we needed. The first question in each survey is:

- **OS** (`prereq_c_experience`): *"Which of the following best describes your prior exposure to C programming and systems-level development?"* — options map cleanly to no/some/strong prior exposure.
- **Data Structures** (`prereq_cpp_tier`): *"Which of the following best describes your prior experience with the C++ programming language?"* — same three-tier mapping, and it correctly distinguishes "general programming from CS-UH 1001" from "C++ specifically."

13 questions were generated for OS, 12 for Data Structures, covering all 5 categories faithfully (e.g. OS asks about pair-programming comfort given the paired programming projects; Data Structures asks about debugging strategy given the no-AI-code-generation policy). Full question sets: `study/data/courses/os/survey_questions.json`, `study/data/courses/datastructures/survey_questions.json`.

---

## 4. Synthetic profile design (handoff to an external model)

### Why a small pilot is enough here

AI literacy's 50-profile design exists to cover many *independent* axes (field of study, prior knowledge, goal orientation, learning preference) crossed against each other. Here there is one primary axis — prior-technology-familiarity tier — with three discrete levels. There is no large combinatorial space to sample from, so a handful of profiles per tier is sufficient to see whether the pattern holds, and a full power analysis (appropriate for AI literacy's eventual scale-up to ~200) doesn't apply to a three-level discrete design the same way.

**Revised:** the original plan was a 6-9 profile pilot handed off from an external model. That was superseded — realistic class size is closer to 30 students/course, and rather than a manual handoff, `study/scripts/12_generate_required_course_profiles.py` generates the full batch systematically in-pipeline: **3 tiers × 10 profiles = 30 profiles/course**, one Gemini call per profile, each profile's tier-defining answer set *deterministically* (not left to the model) by auto-detecting the tier question from `survey_questions.json`'s phrasing pattern, while every other answer is generated for realistic, diverse variation (goals, career interest, anticipated challenges) consistent with that tier. This is a methodological choice worth calling out: the independent variable (tier) must not be left to chance for a result to be trustworthy, so it is fixed programmatically; only the surrounding realism is left to the model.

### Profile schema (produced by script 12)

```json
{
  "course_id": "os",
  "profiles": [
    {
      "id": "os_no_prior_1",
      "tier": "no_prior_exposure",
      "description": "Short free-text description of this synthetic student",
      "answers": {
        "prereq_c_experience": "No prior exposure: I have never programmed in C or worked with systems-level code.",
        "prereq_knowledge_check": "...",
        "prereq_confidence_rating": "2",
        "...": "one answer per question id in survey_questions.json"
      }
    }
  ]
}
```

Run for either course with:

```bash
python scripts/12_generate_required_course_profiles.py --course os --profiles-per-tier 10
python scripts/12_generate_required_course_profiles.py --course datastructures --profiles-per-tier 10
```

The script is generic — it works from whatever `survey_questions.json` a course has, with no hardcoded question ids, so it runs unchanged for any future course as long as `scripts/11_generate_survey_questions.py` produced the expected "No/Some/Strong prior exposure" phrasing for the tier question.

---

## 5. Personalization spec per course

Each course gets its own `pathway_generation_spec.json` (`study/data/courses/<course_id>/pathway_generation_spec.json`), following AI literacy's spec schema but with content built around the floor + catch-up model instead of alternative tracks. Both specs declare a `requiredCourseModel` block with the parameters the evaluation code reads directly (no hardcoded per-course numbers in Python):

| Parameter | OS | Data Structures |
|---|---|---|
| Target node band | 14-18 | 16-20 |
| Floor basis (min pathway nodes) | 14 | 16 |
| Foundational block(s) | block_01 | block_01 |
| Tiers | no / some / strong prior exposure | no / some / strong prior exposure |

**Per-block floor formula** (computed from the syllabus, not hand-picked):

```
floor(block) = max(1, round(min_pathway_nodes * lessons_in_block / total_lessons))
```

For OS this yields floors of `{block_01: 2, block_02: 2, block_03: 3, block_04: 2, block_05: 1, block_06: 2, block_07: 2}`, summing to exactly 14 — a pathway made of floor-only nodes already matches the band's lower bound, leaving room for scaffolding or enrichment nodes on top.

**Node metadata:** every node in these two courses' pathways must carry two fields AI literacy's nodes don't have: `nodeRole` (`core_required` / `scaffolding_catchup` / `enrichment_advanced` / `assessment`) and a one-sentence `personalizationRationale`. This is only possible because Phase 0 generates pathways as plain JSON files via a direct Gemini call — it never touches the production database, whose `PathwayNode` table has no metadata column at all (confirmed by reading `prisma/schema.prisma`; `syllabusBlockId` itself isn't even a real column in production, it's string-prefixed into `description` as a workaround). The metadata schema is spec-driven (`pathway_generator.py` only adds these fields to the Gemini function-call schema when a course's spec declares them via `nodeMetadataFields`), so AI literacy's schema and output are completely unaffected.

**New hypotheses**, distinct IDs from AI literacy's H1-H5 so nothing there is renamed or overwritten:

| ID | Claim |
|---|---|
| OS-C1 / DS-C1 | Every block appears at least its computed floor count in every pathway |
| OS-C2 / DS-C2 | scaffolding_catchup node count in the foundational block decreases monotonically as familiarity tier increases |
| OS-C3 / DS-C3 | Total pathway length stays within the target node band across all tiers |

---

## 6. New metrics (additive — nothing in AI literacy's evaluation code was changed)

Three new functions were added to `study/lib/research_metrics.py`, alongside (not replacing) the existing Jaccard/cluster/rule-compliance functions AI literacy still uses unchanged:

- **`block_floor_gate`** — hard check: every block must be at or above its floor in every generated pathway. This is a correctness gate, not a personalization signal.
- **`role_mix_monotonic_check`** — checks that `scaffolding_catchup` node counts in the foundational block go no_prior_exposure ≥ some_prior_exposure ≥ strong_prior_exposure (mean per tier, since the pilot is a small discrete grid rather than a continuous distribution — a full statistical power test doesn't fit this design, see Section 4).
- **`length_invariance_check`** — every pathway's total node count must land inside the declared band, so a generator can't "personalize" by just making some students' courses longer or shorter.

All three were unit-tested against synthetic fake pathways before relying on them: a correctly-personalized case (scaffolding counts 4/2/0 across tiers, lengths 17-18) passes all three; a deliberately broken case (a block entirely missing, a pathway with 25 nodes) is correctly flagged by both the floor gate and the length check.

**Not built yet, and intentionally deferred:** the embedding-based node-content metric discussed earlier (checking that a `scaffolding_catchup` node is actually simpler/more scaffolded in wording than a `core_required` node on the same concept, using local sentence embeddings instead of an LLM judge) needs real generated pathways to validate against — there's no point tuning it against synthetic placeholder data. It's the next thing to build once profiles arrive and real pathways exist (see Section 8).

---

## 7. Pipeline changes (all additive, verified against AI literacy)

Every script involved gained an optional `--course <id>` flag. Omitting it reproduces AI literacy's exact existing behavior — verified by re-running `scripts/09_research_evaluation.py` with no flag after all changes and diffing the output against the previously-committed `research_evaluation.json` byte-for-byte: **identical**.

| Script | Change |
|---|---|
| `scripts/01_build_syllabus_json.py` | `--course` flag; both new syllabi validate with zero errors |
| `scripts/11_generate_survey_questions.py` | New. Replicates the real product's survey generator |
| `scripts/12_generate_required_course_profiles.py` | New. Generates tier-balanced, realistic profiles (30/course) via Gemini, with the tier-defining answer set deterministically, not left to the model |
| `scripts/07_generate_pathways_offline.py` | `--course` flag; writes to `data/courses/<id>/results/`; computes and passes exact per-tier scaffold targets and per-block floors into the prompt for required courses |
| `scripts/09_research_evaluation.py` | `--course` flag routes to a separate required-course evaluation path (floor/role-mix/length-invariance) instead of AI literacy's Jaccard/cluster/rule-compliance gates |
| `scripts/13_power_analysis.py` | New. Real-data power analysis for AI literacy (Cohen's d and required-N per contrast, computed from every profile matching each contrast's real criteria, not just the 2 named anchors; bootstrap precision analysis for the diversity gate) |
| `scripts/14_required_course_power_analysis.py` | New. Same idea for OS/Data Structures — reports the Jonckheere-Terpstra trend test and, honestly, why a power analysis stops being the right question once role-mix counts are explicitly enforced (Section 8) |
| `lib/course_paths.py` | New. Resolves syllabus/spec/profiles/results paths per course, defaulting to AI literacy's original paths |
| `lib/syllabus_context.py` | The one hardcoded AI-literacy-specific sentence (referencing "Blocks 5a/5b") now falls back only when a syllabus doesn't define its own `assessmentMethods` — AI literacy's output is unchanged since its syllabus still has no such field |
| `lib/personalization_prompt.py` | The `OUTPUT REQUIREMENTS` framing and two new explicit injections (`SCAFFOLD TARGET`, `BLOCK FLOORS`) are spec-driven — only active when a course's spec declares `requiredCourseModel`, which AI literacy's spec doesn't. AI literacy's rendered prompt is unchanged, verified by direct string comparison, not just by not-noticing a difference |
| `lib/pathway_generator.py`, `lib/research_metrics.py`, `lib/llm_judge.py` | All spec-loading and judge-sampling functions now accept an optional path/parameter, defaulting to AI literacy's existing values; `research_metrics.py` also gained `compute_block_floors`, `block_floor_gate`, `role_mix_monotonic_check`, `length_invariance_check`, `jonckheere_terpstra_test` |

---

## 8a. Operating Systems: 3 rounds to a real PASS

The first full run against real Gemini-generated pathways failed, in a way that turned out to be genuinely informative rather than a dead end. Recording it here because it mirrors AI literacy's own Run 1→3 journey (Section 6 of `report.md`) and the same lesson applies: prose personalization rules are not reliably followed without an explicit, checkable mechanism.

**Round 1 — the generic prompt template was still AI-literacy's.** `lib/personalization_prompt.py`'s `OUTPUT REQUIREMENTS` section was hardcoded to elective-course language ("Call generate_learning_pathway with 10-14 nodes," "block coverage must differ") that had never been updated when the required-course spec was built. Gemini was correctly following instructions that directly contradicted the floor + catch-up model. Result: 68 coverage-floor violations across 30 profiles, and essentially no scaffolding differentiation by tier (means 0.6 / 0.6 / 0.4 — noise).

**Round 2 — fixed the hardcoded prompt section**, making it spec-driven (branches on whether the loaded spec declares a `requiredCourseModel`; AI literacy's spec doesn't, so its prompt is unaffected — verified byte-for-byte). Coverage floor violations dropped to 1, and the node-count band was respected. But the role-mix trend inverted: strong-prior-exposure students averaged *more* scaffolding_catchup nodes (1.3) than no-prior-exposure students (1.1). Inspecting the actual generated content showed why: a `strong_prior_exposure` student's pathway contained a `scaffolding_catchup` node whose `personalizationRationale` read *"...for students without prior systems exposure"* — contradicting that student's own stated background. The model wasn't reliably connecting the tier signal to its per-node role decisions from prose rules alone, even when the rules were correct.

**Round 3 — explicit numeric injection.** Added a `SCAFFOLD TARGET` block to the prompt (mirroring AI literacy's own `STRUCTURE LOCK` mechanism for twin-profile invariance): given a profile's tier, the prompt now states the exact required count of `scaffolding_catchup` nodes in the foundational block, computed from `requiredCourseModel.tierScaffoldTargets` in the spec (3 / 1 / 0 for no / some / strong prior exposure). Result: **PASS.**

### Real results (30 profiles, 30 pathways, `--course os`)

| Check | Result |
|---|---|
| Coverage floor | OK — every block at or above its floor in all 30 pathways |
| Role-mix monotonic | True — tier means exactly 3.0 / 1.0 / 0.0 |
| Length invariance (band 14-18) | True |
| Jonckheere-Terpstra trend test | z = 5.70, p ≈ 0, highly significant |

**Read this result carefully — it's not quite what it looks like.** Every single one of the 10 profiles per tier hit its target exactly (std = 0 within every tier). That's because the scaffold count is now an *enforced constraint* from the explicit injection, not an *emergent signal* the model inferred from the survey text on its own. This is methodologically the same technique as AI literacy's structure lock, applied here for the same reason — but it means a "how many profiles are needed to detect this" power analysis doesn't really apply anymore: with zero variance, any Cohen's-d-based calculation degenerates (the effect is deterministic by construction). `scripts/14_required_course_power_analysis.py` computes and reports this honestly rather than presenting a misleadingly large effect size as if it were newly discovered.

**What's still a genuinely open, uninjected question:** whether the *content* of a `scaffolding_catchup` node is actually simpler and more supportive than a `core_required` or `enrichment_advanced` node covering the same concept — that's not enforced by anything above, and is exactly what the deferred embedding-based content metric (Section 6) is for. That remains the next real thing to build and check.

## 8b. Data Structures: one more round, a different bug in the same family

Data Structures started from the Round-3 (fixed) prompt, since the fix is spec-driven and course-agnostic — no repeat of Round 1/2's specific bugs. But the first full run still failed, on coverage floor: **41 violations**, concentrated almost entirely in two blocks — block_03 was short by exactly 1 node in **all 30 profiles**, block_04 in 11.

The cause was the same *family* of bug as Round 2's, just in a different part of the prompt: the `OUTPUT REQUIREMENTS` text said blocks must stay "at or above the floor implied by the personalization rules above" — but no floor number was ever actually stated anywhere in the prompt. Floors were only ever computed in Python, at evaluation time, for grading — never told to Gemini at generation time. A sample pathway confirmed the mechanism: total length was 18 (comfortably inside the 16-20 band), but the model had implicitly under-allocated two specific blocks while staying within budget overall, because it had no explicit number to hit for either one.

**Fix:** added a second explicit injection, `BLOCK FLOORS`, listing the exact computed minimum for every block (e.g. `block_03 >= 4`), the same treatment as the scaffold target. Regenerated all 30 pathways.

### Real results (30 profiles, 30 pathways, `--course datastructures`)

| Check | Result |
|---|---|
| Coverage floor | OK — every block at or above its floor in all 30 pathways |
| Role-mix monotonic | True — tier means exactly 3.0 / 1.0 / 0.0 |
| Length invariance (band 16-20) | True |
| Jonckheere-Terpstra trend test | z = 5.70, p ≈ 0 |

Same shape of result as OS, same caveat applies: zero within-tier variance, because the scaffold count is enforced, not inferred. See Section 8a's caveat — it applies here unchanged.

## 8c. What this two-course extension actually demonstrates

Put together, OS and Data Structures ran into two distinct instances of the same underlying lesson, in two different parts of the prompt (node-role mix, then block floors): **stating a personalization requirement in prose is not enough to make Gemini follow it reliably — it has to be paired with an explicit, checkable, numeric instruction**, verified against real generated output, not assumed from the rules text looking correct. This is exactly the lesson AI literacy's own Run 1→3 history already taught (Section 6 of `report.md`, structure lock for twin-profile invariance) — this extension is independent evidence the same failure mode and the same fix generalize to a structurally different course archetype (required/cumulative vs. elective) and a different personalization mechanism (node-role mix vs. block presence).

Both courses now pass every deterministic gate we defined for the fixed-floor/catch-up model, on real Gemini output, with AI literacy's own frozen Run 3 results confirmed byte-for-byte unaffected throughout.

## 9. Content quality: does the role tag mean anything, or just count correctly?

Every gate above verifies *tags* — `nodeRole` is a label Gemini attaches to its own output, and until now nothing checked whether a `scaffolding_catchup` label was actually true of the node's content, only that the count of that label matched the target. Built `lib/content_quality.py` + `scripts/15_content_quality_metrics.py` to check this, using a local sentence-embedding model (`all-MiniLM-L6-v2`, no API cost, deterministic, scales freely) plus a lightweight readability proxy — no LLM judge involved. Three checks, run on the real 60 pathways (30 OS + 30 Data Structures):

1. **Cross-profile diversity** — are `scaffolding_catchup` nodes for different students in the same tier textually distinct (genuinely personalized), or near-duplicates (templated)? Compared against `core_required` as a baseline, since required content is *expected* to be more uniform across students than personalized content.
2. **Within-pathway separability** — for one student, is their `scaffolding_catchup` node actually different in content from their `core_required`/`enrichment_advanced` node in the same block, or a relabeled duplicate?
3. **Readability** — do `scaffolding_catchup` nodes read as simpler (higher Flesch Reading Ease) than `core_required`/`enrichment_advanced` nodes? This is the one check that speaks to "simpler," since embeddings measure similarity, not difficulty.

**Operating Systems: clean positive signal on all three.** Scaffolding content is meaningfully more diverse across profiles than core content (0.48-0.75 similarity vs. 0.77-0.86), scaffolding is more distinct from core/enrichment within a pathway (0.43 similarity) than core and enrichment are from *each other* (0.54), and readability runs in the expected direction: scaffolding (27.8) easier than core (15.2), easier than enrichment (0.02, i.e. dense and technical, as expected).

**Data Structures: mixed.** Cross-profile diversity holds for the `no_prior_exposure` tier but not `some_prior_exposure` (scaffolding *less* diverse than core there — closer to templated). Within-pathway separability is nearly flat (0.47 vs. 0.48 — scaffolding isn't clearly more distinct from core/enrichment than core/enrichment are from each other). Readability actually **inverts**: core_required (34.9) reads easier than scaffolding_catchup (23.9).

**Before concluding Data Structures' content quality is worse, a manual read of the actual node text is worth doing** — and it changes the picture. Real scaffolding nodes from this data: *"C++ Pointers and Memory Model Refresher,"* *"C++ Syntax for Python/Java Programmers,"* *"Memory Management & Pointers Primer"* — these use exactly the framing you'd want (refresher, primer, transitioning-from-X language), while the paired core nodes use standard lecture phrasing (*"C++ Templates and Object-Oriented Design," "Object-Oriented Design in C++"*). Qualitatively, the content looks appropriate. Two likely explanations for the metric disagreeing with that read:

- **Flesch Reading Ease is built for prose, not short technical blurbs.** It rewards longer sentences with common words and punishes short, jargon-dense phrases regardless of whether the underlying concept is introductory — "C++ Pointers and Memory Model Refresher" scores worse than a longer, more jargon-packed core-content sentence purely on syllable/sentence-length arithmetic, not conceptual difficulty.
- **The separability check doesn't control for topic vs. depth.** It compares *any* scaffolding node against *any* core/enrichment node in the same block, which conflates "different topic, similar difficulty" with "same topic, different depth" — the real question we care about. A scaffolding node about pointers and a core node about templates are both legitimately different *topics* within block_01, not necessarily comparable as "same content, different depth."

**Bottom line:** the embedding-based diversity check is a real, working signal (and it's the strongest of the three — genuinely reading content, not gameable by phrase length). The readability and separability checks as built have real limitations for short technical curriculum text, surfaced by exactly the kind of manual-vs-automatic-metric disagreement this whole project has run into before (title-Jaccard's paraphrase blindness, the two node-tag injection bugs). This is precisely why Phase 1 human review still matters — no automatic proxy fully replaces it, only narrows what needs checking. Full numbers: `data/courses/<course_id>/results/reports/content_quality.json`.

## 10. Reproduce this

```bash
cd study && source .venv/bin/activate
python scripts/11_generate_survey_questions.py --course os
python scripts/12_generate_required_course_profiles.py --course os --profiles-per-tier 10
python scripts/07_generate_pathways_offline.py --course os
python scripts/09_research_evaluation.py --course os
python scripts/14_required_course_power_analysis.py --course os
python scripts/15_content_quality_metrics.py --course os
# repeat with --course datastructures
```

**What's next:** decide whether to refine the separability/readability checks (control for topic vs. depth; try a technical-text-appropriate complexity proxy instead of Flesch) or treat the diversity signal as sufficient and move to Phase 1 human review, which was always going to be needed regardless. Then fold a summary of both courses' results into the AAAI paper draft alongside AI literacy's Run 3 findings.
