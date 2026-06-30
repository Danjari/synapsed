# Phase 0 Synthetic Validation — Team Report

**Branch:** `study`  
**Last updated:** June 2025  
**Audience:** SynapsEd research team

---

## 1. What we are doing

Before running professor/student human studies, we need evidence that SynapsEd’s learning-path generator **actually personalizes** — not just rephrases titles while giving everyone the same syllabus tour.

**Phase 0** is an offline synthetic validation gate:

```
syllabus (7 blocks) → 50 synthetic student profiles → generate pathways → evaluate → PASS/FAIL
```

If Phase 0 fails, we fix the prompt or survey design. We do **not** proceed to human subjects until it passes.

---

## 2. Why 50 profiles (not 10)

Ten hand-crafted personas were enough to prototype, but **not enough to defend in a paper**:

| Concern with n=10 | How n≈50 helps |
|-------------------|----------------|
| Results could look like cherry-picked examples | Many profiles per **cluster** show repeatable patterns |
| Single pairwise comparisons are fragile | Hundreds of within/between-cluster pairs |
| Reviewers ask “is this random?” | Similar inputs → similar pathways; contrasting inputs → divergent pathways |
| One failed edge case fails everything | Statistical gates use pass **rates**, not single pairs |

### Profile clusters (50 total)

Profiles are grouped into **7 clusters**. Members of the same cluster share the same *personalization-relevant* survey signal (goals, prerequisites, Bloom answers). Wording varies slightly to simulate natural survey noise.

| Cluster | Count | Personalization signal |
|---------|-------|------------------------|
| `foundation_low` | 8 | Very uncertain prereqs, no prior AI courses → heavy `block_01` |
| `business_track` | 9 | Business/org/strategy goals → emphasize `block_05a` |
| `research_technical` | 9 | Research, RAG, workflows → emphasize `block_05b` |
| `ethics_society` | 6 | Ethics/responsible AI goals → heavy `block_06` |
| `prompting_first` | 6 | Daily ChatGPT user, weak ML → compress foundations, expand prompting |
| `balanced_general` | 7 | Neutral, well-rounded literacy |
| `style_control` | 5 | **Identical** to a balanced peer except `learning_1` (learning style) |

**Canonical 10** profiles (original IDs like `low_knowledge_general`, `business_leader`) are preserved as anchors for pre-registered hypotheses H1–H5.

Regenerate profiles anytime:

```bash
python scripts/05_generate_synthetic_profiles.py
```

Output: `data/profiles/synthetic_profiles.json`

---

## 3. Key structural decisions

### 3.1 Syllabus as 7 tagged blocks

The syllabus is split into **7 blocks** over 2 calendar weeks (~600 min):

| Block | Content |
|-------|---------|
| `block_01` | Classic AI basics (ML, data, terminology) |
| `block_02` | Generative AI core |
| `block_03` | Prompting basics |
| `block_04` | Advanced prompting |
| `block_05a` | **Business & workplace** emphasis track |
| `block_05b` | **Projects & workflows** emphasis track (RAG, fine-tuning) |
| `block_06` | Ethics & responsible use (capstone in every pathway) |

**Why blocks?** Title-level comparison was misleading. Pathways shared the same spine (`B1→B2→B3→B4→B5→B6`) with different wording, yielding near-zero title Jaccard but ~70–80% structural overlap. Tagging every generated node with `syllabusBlockId` lets us measure **coverage**, not cosmetics.

### 3.2 Structural vs cosmetic personalization

The generation prompt (`data/prompts/pathway_generation_spec.json`) explicitly requires:

- Vary **which blocks appear** and **how many nodes** each block gets
- Vary difficulty and order
- Do **not** treat `learning_1` (learning style) as a structural signal — it may only change description tone

This matches our survey design: learning style is collected for UX/interaction research later, not pathway routing in Phase 0.

### 3.3 Alternative tracks `block_05a` vs `block_05b`

These are **mutually emphasized** tracks, not sequential prerequisites. Most pathways should prioritize **one** track (3+ nodes). Including both fully is reserved for profiles explicitly wanting breadth.

This mirrors the syllabus design where business and technical project content diverges in week 2.

### 3.4 Three-layer evaluation (script 09)

We use complementary metrics because no single number captures “meaningful personalization.”

#### Layer A — Block-level similarity (primary)

- **Multiset Jaccard** on `syllabusBlockId` counts: measures coverage overlap, order-agnostic
- **Sequence Jaccard**: position-aware diagnostic

**Gate:** mean pairwise multiset Jaccard **< 0.92** across all profiles (pathways should not be identical).

#### Layer B — Pre-registered contrast hypotheses (primary)

Five hypotheses (H1–H5) in `pathway_generation_spec.json`, e.g.:

- H1: Low-knowledge profile gets more `block_01` nodes than research profile
- H2/H3: Business vs research track emphasis (`block_05a` vs `block_05b`)
- H4: Ethics profile gets more `block_06` than neutral profile
- H5: Learning-style control pair shares block sequence with its twin

**Gate:** ≥ 80% of hypotheses pass.

#### Layer C — Cluster consistency (primary, new with n=50)

| Test | Expectation | Gate |
|------|-------------|------|
| **Within-cluster** pairs | Similar survey → similar block coverage | mean multiset Jaccard **≥ 0.65** |
| **Contrasting-cluster** pairs (e.g. foundation vs research) | Different archetypes → divergent coverage | mean multiset Jaccard **≤ 0.70** |
| **Style-control** pairs | Only `learning_1` differs → same structure | ≥ 80% pairs with sequence Jaccard **≥ 0.85** |

This is the main answer to “is it chance?” — we expect **high** similarity inside clusters and **lower** similarity across contrasting clusters.

#### Layer D — LLM-as-judge (primary, sampled)

A separate rubric scores each pathway on 5 dimensions (1–5):

1. Prior-knowledge alignment  
2. Goal-track alignment  
3. Structural personalization (not title paraphrase)  
4. Syllabus fidelity  
5. Internal coherence  

**Default:** stratified sample of **15 profiles** (all canonical + at least one per cluster) to manage API cost. Use `--judge-all` for full 50.

**Gate:** mean score **≥ 3.5**

**Paper limitation:** disclose if judge and generator share the same model family. Set `GEMINI_JUDGE_MODEL` to a different model for final runs.

#### Layer E — Title Jaccard (secondary only)

Script 08 remains for legacy comparison. **Do not use as primary evidence** — it overstates uniqueness when titles differ but block spines match.

---

## 4. Pipeline (what to run)

```bash
cd study
source .venv/bin/activate

# 1. Profiles (50)
python scripts/05_generate_synthetic_profiles.py

# 2. Generate pathways (~40–60 min for 50 profiles, Gemini API)
python scripts/07_generate_pathways_offline.py

# 3. Primary evaluation
python scripts/09_research_evaluation.py

# 4. Optional secondary title report
python scripts/08_analyze_pathway_diversity.py
```

Reports land in `data/results/reports/` (gitignored — copy artifacts into paper appendix manually).

---

## 5. Initial results (n=10 pilot)

A pilot run with **10 profiles** before scaling passed all primary gates:

| Metric | Result | Threshold |
|--------|--------|-----------|
| Mean multiset Jaccard | 0.60 | < 0.92 |
| Contrast hypotheses | 5/5 | ≥ 80% |
| Mean LLM judge score | 4.98 | ≥ 3.5 |
| Title Jaccard (secondary) | 0.009 | < 0.85 |

**Notable structural differences observed:**

- `low_knowledge_general`: 4× `block_01`, skips `block_05b`
- `high_knowledge_research`: 1× `block_01`, 3× `block_05b`, no `block_05a`
- `ethics_focused`: 5× `block_06`

**Next:** re-run scripts 07 + 09 with all **50 profiles** to produce paper-ready cluster statistics.

---

## 6. App integration

The same prompt spec drives production pathway generation:

- Shared spec: `study/data/prompts/pathway_generation_spec.json`
- TypeScript builder: `lib/learning-paths/pathwayPrompt.ts`
- API route: `app/api/learning-paths/generate/route.ts`

`syllabusBlockId` is embedded in node descriptions as `[block_XX] …` until the database schema adds a dedicated field.

---

## 7. What each team member should do next

| Role | Action |
|------|--------|
| **Engineering** | Run full 50-profile pipeline; set `GEMINI_JUDGE_MODEL` to a different model than generator |
| **Research / paper** | Draft methods section from §3; pre-register H1–H5 + cluster gates before viewing 50-profile results |
| **Product** | Review cluster personas — do they reflect real student populations we expect in the pilot class? |
| **Everyone** | Read `data/prompts/pathway_generation_spec.json` — this is the contract between survey and generator |

---

## 8. Open questions for the team

1. **Profile realism:** Are the 50 personas representative of the actual course intake? Should we add a cluster (e.g. healthcare, education verticals)?
2. **Judge independence:** Which model should we use as judge for the paper? (Recommend ≠ generator.)
3. **Human study gate:** What minimum Phase 0 pass criteria do we all agree on before IRB / classroom pilot?
4. **Cost vs rigor:** Full 50-profile judge run vs stratified 15 — acceptable for publication?

---

## 9. File map

```
study/
├── report.md                          ← this document
├── data/
│   ├── syllabus/syllabus.json         ← 7-block syllabus
│   ├── profiles/synthetic_profiles.json
│   └── prompts/pathway_generation_spec.json
├── lib/
│   ├── personalization_prompt.py
│   ├── pathway_generator.py
│   ├── research_metrics.py            ← block + cluster metrics
│   └── llm_judge.py
├── scripts/
│   ├── 05_generate_synthetic_profiles.py
│   ├── 07_generate_pathways_offline.py
│   └── 09_research_evaluation.py      ← primary gate
└── config/study_config.yaml           ← thresholds
```

---

## 10. Summary

We moved from “titles look different” to **evidence-backed structural personalization**:

1. **Tagged blocks** make pathways comparable at the syllabus level  
2. **50 clustered profiles** separate signal from noise  
3. **Multi-layer gates** (blocks + hypotheses + clusters + judge) are defensible in a paper  
4. **Title Jaccard is demoted** to a secondary diagnostic  

Phase 0 is the quality gate before we ask real students and professors to trust SynapsEd pathways.
