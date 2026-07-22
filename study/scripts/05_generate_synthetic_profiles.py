#!/usr/bin/env python3
"""Generate 50 synthetic profiles: cross-field students in a shared AI literacy course."""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = STUDY_ROOT / "data" / "profiles" / "synthetic_profiles.json"

LEARNING_STYLES = [
    "Visual (diagrams, charts, videos)",
    "Auditory (lectures, discussions)",
    "Kinesthetic (hands-on activities)",
    "Reading/Writing (texts, notes)",
    "Mixed approach",
]

CANONICAL: list[dict] = [
    {
        "id": "low_knowledge_general",
        "cluster": "humanities_social",
        "field": "History",
        "description": "History BA sophomore — no STEM background, first AI course",
        "answers": {
            "goals_1": "Understand what AI is and how it affects society and historical research",
            "goals_2": "Required elective for my degree",
            "prereq_1": "Very uncertain",
            "learning_1": "Visual (diagrams, charts, videos)",
            "bloom_remember": "I have not taken any AI or programming courses",
            "bloom_understand": "Basic AI vocabulary and how historians might use AI tools",
            "bloom_apply": "Use AI responsibly when reviewing sources and drafting essays",
            "bloom_analyze": "I worry about technical jargon and misinformation in AI outputs",
        },
    },
    {
        "id": "high_knowledge_research",
        "cluster": "cs_technical",
        "field": "Computer Science",
        "description": "CS MS student — strong ML background, research-oriented",
        "answers": {
            "goals_1": "Deepen generative AI knowledge for academic research and technical workflows",
            "goals_2": "Career advancement",
            "prereq_1": "Very confident",
            "learning_1": "Reading/Writing (texts, notes)",
            "bloom_remember": "Supervised learning, neural networks, gradient descent, PyTorch",
            "bloom_understand": "How LLMs differ from traditional ML pipelines and RAG architectures",
            "bloom_apply": "Design research workflows using fine-tuning and retrieval-augmented generation",
            "bloom_analyze": "Evaluating hallucination, benchmark design, and model limitations",
        },
    },
    {
        "id": "low_knowledge_business",
        "cluster": "business_mba",
        "field": "Business",
        "description": "Marketing undergrad — limited technical background, workplace AI focus",
        "answers": {
            "goals_1": "Apply AI and prompting in marketing and business communications",
            "goals_2": "Career advancement",
            "prereq_1": "Somewhat uncertain",
            "learning_1": "Mixed approach",
            "bloom_remember": "Excel, CRM tools, basic analytics dashboards",
            "bloom_understand": "How generative AI supports campaign planning and customer engagement",
            "bloom_apply": "Draft marketing copy and reports with AI in a business context",
            "bloom_analyze": "Choosing appropriate AI tools for brand and customer data",
        },
    },
    {
        "id": "high_knowledge_business",
        "cluster": "business_mba",
        "field": "Business",
        "description": "MBA student with analytics exposure — org-level gen AI strategy",
        "answers": {
            "goals_1": "Lead AI transformation and gen AI strategy in my organization",
            "goals_2": "Career advancement",
            "prereq_1": "Very confident",
            "learning_1": "Auditory (lectures, discussions)",
            "bloom_remember": "ML project lifecycle, KPI dashboards, digital transformation frameworks",
            "bloom_understand": "Generative AI opportunities across business units and workplace adoption",
            "bloom_apply": "Scope gen AI pilot projects and measure ROI for leadership",
            "bloom_analyze": "Risk, compliance, and workforce impact of AI transformation",
        },
    },
    {
        "id": "medium_knowledge_mixed",
        "cluster": "economics",
        "field": "Economics",
        "description": "Economics junior — moderate quant background, balanced AI literacy goals",
        "answers": {
            "goals_1": "Build well-rounded AI literacy for policy and data-driven economics",
            "goals_2": "Personal interest in the subject",
            "prereq_1": "Neutral",
            "learning_1": "Mixed approach",
            "bloom_remember": "Regression, statistics coursework, heard of ChatGPT and machine learning",
            "bloom_understand": "Both traditional AI and generative AI in economic analysis",
            "bloom_apply": "Experiment with prompts for data summaries and policy briefs",
            "bloom_analyze": "Separating AI hype from realistic capabilities in economic forecasting",
        },
    },
    {
        "id": "gen_ai_familiar_prompting_new",
        "cluster": "math_stats",
        "field": "Mathematics",
        "description": "Applied math senior — strong quant, new to structured prompting",
        "answers": {
            "goals_1": "Master structured prompting for technical and proof-writing tasks",
            "goals_2": "Personal interest in the subject",
            "prereq_1": "Somewhat confident",
            "learning_1": "Kinesthetic (hands-on activities)",
            "bloom_remember": "Linear algebra, probability, basic Python, LLM demos",
            "bloom_understand": "Few-shot and chain-of-thought prompting for quantitative work",
            "bloom_apply": "Build prompt templates for homework and research write-ups",
            "bloom_analyze": "When advanced prompting is worth the effort vs direct computation",
        },
    },
    {
        "id": "prompting_expert_ai_novice",
        "cluster": "humanities_social",
        "field": "English",
        "description": "English major — daily ChatGPT user, weak ML foundations",
        "answers": {
            "goals_1": "Fill gaps in AI and ML fundamentals while keeping strong writing skills",
            "goals_2": "Required elective",
            "prereq_1": "Somewhat uncertain",
            "learning_1": "Reading/Writing (texts, notes)",
            "bloom_remember": "ChatGPT, prompt templates, daily writing assistance — no ML courses",
            "bloom_understand": "What machine learning and training data mean beneath the interface",
            "bloom_apply": "Connect my prompting habits to responsible academic writing",
            "bloom_analyze": "Why models hallucinate and how that affects literary analysis",
        },
    },
    {
        "id": "business_leader",
        "cluster": "business_mba",
        "field": "Business",
        "description": "Executive MBA — organizational strategy and workplace gen AI",
        "answers": {
            "goals_1": "Develop an AI strategy and transformation playbook for my organization",
            "goals_2": "Career advancement",
            "prereq_1": "Somewhat confident",
            "learning_1": "Auditory (lectures, discussions)",
            "bloom_remember": "Product management, change management, digital transformation",
            "bloom_understand": "AI transformation playbook and gen AI in business operations",
            "bloom_apply": "Identify high-value gen AI use cases and workplace pilot programs",
            "bloom_analyze": "Workforce impact, vendor selection, and responsible adoption",
        },
    },
    {
        "id": "ethics_focused",
        "cluster": "health_medicine",
        "field": "Public Health",
        "description": "MPH student — ethics, bias, and responsible AI in healthcare",
        "answers": {
            "goals_1": "Understand ethical risks, bias, and responsible AI in health systems",
            "goals_2": "Personal interest in the subject",
            "prereq_1": "Neutral",
            "learning_1": "Reading/Writing (texts, notes)",
            "bloom_remember": "Health equity, epidemiology basics, privacy and consent concepts",
            "bloom_understand": "How bias, hallucinations, and adversarial errors affect clinical AI",
            "bloom_apply": "Evaluate AI tools for ethical use in public health programs",
            "bloom_analyze": "Tradeoffs between AI efficiency and patient safety or equity",
        },
    },
    {
        "id": "learning_style_control",
        "cluster": "style_control",
        "field": "Economics",
        "paired_with": "medium_knowledge_mixed",
        "description": "Economics junior — identical to medium_knowledge_mixed except learning style",
        "answers": {
            "goals_1": "Build well-rounded AI literacy for policy and data-driven economics",
            "goals_2": "Personal interest in the subject",
            "prereq_1": "Neutral",
            "learning_1": "Kinesthetic (hands-on activities)",
            "bloom_remember": "Regression, statistics coursework, heard of ChatGPT and machine learning",
            "bloom_understand": "Both traditional AI and generative AI in economic analysis",
            "bloom_apply": "Experiment with prompts for data summaries and policy briefs",
            "bloom_analyze": "Separating AI hype from realistic capabilities in economic forecasting",
        },
    },
]


def _p(
    profile_id: str,
    cluster: str,
    field: str,
    description: str,
    answers: dict[str, str],
    *,
    paired_with: str | None = None,
) -> dict:
    out: dict = {
        "id": profile_id,
        "cluster": cluster,
        "field": field,
        "description": description,
        "answers": answers,
    }
    if paired_with:
        out["paired_with"] = paired_with
    return out


def _extend(base: dict, profile_id: str, cluster: str, field: str, desc: str, **kw: str) -> dict:
    answers = deepcopy(base)
    answers.update(kw)
    return _p(profile_id, cluster, field, desc, answers)


def generate_extensions() -> list[dict]:
    out: list[dict] = []

    cs = {
        "goals_1": "Build technical gen AI workflows for software and research projects",
        "goals_2": "Career advancement",
        "prereq_1": "Very confident",
        "learning_1": "Kinesthetic (hands-on activities)",
        "bloom_remember": "Data structures, algorithms, introductory ML, Git",
        "bloom_understand": "LLM APIs, RAG pipelines, and fine-tuning basics",
        "bloom_apply": "Integrate generative AI into coding and research tooling",
        "bloom_analyze": "Debugging model outputs and evaluating technical tradeoffs",
    }
    for pid, desc, kw in [
        ("cs_undergrad_software", "CS undergrad — software engineering focus", {"goals_1": "Use gen AI in software development workflows and code review"}),
        ("cs_undergrad_ai_elective", "CS undergrad — first dedicated AI course", {"prereq_1": "Somewhat confident", "bloom_remember": "Python, intro algorithms, one ML lecture series"}),
        ("cs_phd_nlp", "CS PhD — NLP and LLM research", {"goals_1": "Advance academic research on LLMs, RAG, and fine-tuning", "bloom_apply": "Run ablation studies and benchmark RAG retrieval quality"}),
        ("cs_industry_returning", "CS professional returning for AI literacy credential", {"bloom_remember": "Production systems, MLOps exposure, transformer basics"}),
        ("cs_security_focus", "CS senior — security and adversarial ML interest", {"bloom_analyze": "Adversarial attacks, prompt injection, and model robustness"}),
        ("cs_data_engineering", "CS junior — data engineering and LLM pipelines", {"goals_1": "Design ML/DS project workflows with generative AI components"}),
        ("cs_game_dev", "CS undergrad — interactive media, lighter ML background", {"prereq_1": "Somewhat confident", "bloom_remember": "Game engines, basic Python, online LLM tutorials"}),
    ]:
        out.append(_extend(cs, pid, "cs_technical", "Computer Science", desc, **kw))

    biz = {
        "goals_1": "Apply generative AI in business operations and strategy",
        "goals_2": "Career advancement",
        "prereq_1": "Somewhat confident",
        "learning_1": "Mixed approach",
        "bloom_remember": "Finance basics, presentations, CRM and spreadsheet tools",
        "bloom_understand": "Gen AI in business units, workplace productivity, and transformation",
        "bloom_apply": "Draft business cases and stakeholder communications with AI",
        "bloom_analyze": "Vendor evaluation and change management for AI adoption",
    }
    for pid, field, desc, kw in [
        ("biz_finance_analyst", "Finance", "Finance undergrad — AI for modeling and reporting", {"goals_1": "Use AI for financial analysis, reporting, and executive summaries"}),
        ("biz_entrepreneur", "Business", "Entrepreneurship student — startup gen AI use cases", {"goals_1": "Identify gen AI opportunities for a startup business model"}),
        ("biz_hr_track", "Business", "HR major — responsible AI in people operations", {"goals_1": "Evaluate workplace AI for hiring, training, and employee communications"}),
        ("biz_intl_student", "Business", "International business — AI for global teams", {"prereq_1": "Neutral", "bloom_remember": "Cross-cultural management coursework, email and slide tools"}),
        ("biz_consulting", "Business", "Management student targeting consulting", {"goals_1": "Lead client AI strategy assessments and transformation roadmaps"}),
    ]:
        out.append(_extend(biz, pid, "business_mba", field, desc, **kw))

    econ = {
        "goals_1": "Apply AI literacy to economic policy and empirical research",
        "goals_2": "Personal interest in the subject",
        "prereq_1": "Neutral",
        "learning_1": "Mixed approach",
        "bloom_remember": "Micro/macro, econometrics, Stata or R at introductory level",
        "bloom_understand": "AI implications for labor markets, forecasting, and policy",
        "bloom_apply": "Summarize datasets and literature with AI-assisted workflows",
        "bloom_analyze": "Causal claims and hype in AI-driven economic predictions",
    }
    for pid, desc, kw in [
        ("econ_undergrad_labor", "Econ BA — labor economics and automation", {"goals_1": "Understand AI impact on labor markets and workforce policy"}),
        ("econ_phd_empirical", "Econ PhD — empirical methods and ML overlap", {"prereq_1": "Somewhat confident", "bloom_remember": "Econometrics, causal inference, basic Python for data"}),
        ("econ_policy_masters", "Public policy master's — econ track", {"goals_2": "Career advancement", "bloom_apply": "Draft policy memos using AI with proper citations"}),
        ("econ_behavioral", "Behavioral econ senior — human-AI decision making", {"bloom_understand": "How generative AI influences consumer and firm behavior"}),
        ("econ_international", "International econ — trade and AI regulation", {"bloom_analyze": "Cross-country AI regulation and trade implications"}),
        ("econ_minor_cs", "Econ major with CS minor — mixed quant background", {"prereq_1": "Somewhat confident", "bloom_remember": "Statistics, intro programming, macro theory"}),
    ]:
        out.append(_extend(econ, pid, "economics", "Economics", desc, **kw))

    math = {
        "goals_1": "Connect rigorous mathematics to modern AI and prompting methods",
        "goals_2": "Personal interest in the subject",
        "prereq_1": "Somewhat confident",
        "learning_1": "Reading/Writing (texts, notes)",
        "bloom_remember": "Calculus, linear algebra, probability, proof-based coursework",
        "bloom_understand": "Mathematical intuition behind ML and generative models",
        "bloom_apply": "Use structured prompts for proofs, derivations, and lab write-ups",
        "bloom_analyze": "Limits of LLM reasoning on formal mathematical tasks",
    }
    for pid, field, desc, kw in [
        ("math_pure_undergrad", "Mathematics", "Pure math junior — theory-heavy, new to ML", {"bloom_remember": "Real analysis, abstract algebra, minimal programming"}),
        ("stats_masters_applied", "Statistics", "Statistics MS — applied data science focus", {"goals_1": "Bridge statistical modeling with generative AI workflows", "bloom_apply": "Build RAG-assisted analysis pipelines for datasets"}),
        ("math_cs_double_major", "Mathematics", "Math/CS double major — strong in both", {"prereq_1": "Very confident", "bloom_remember": "Linear algebra, optimization, algorithms, intro deep learning"}),
        ("stats_undergrad_biostats", "Statistics", "Biostatistics undergrad — health data angle", {"bloom_apply": "Apply prompting to biostatistics reports and visualizations"}),
        ("math_education", "Mathematics", "Math education major — teaching AI literacy", {"goals_1": "Learn AI concepts I can explain to high school students"}),
        ("stats_econ_bridge", "Statistics", "Stats major minoring in economics", {"bloom_understand": "AI forecasting methods used in policy and finance"}),
    ]:
        out.append(_extend(math, pid, "math_stats", field, desc, **kw))

    health = {
        "goals_1": "Use AI responsibly in clinical, public health, or biomedical contexts",
        "goals_2": "Career advancement",
        "prereq_1": "Neutral",
        "learning_1": "Mixed approach",
        "bloom_remember": "Anatomy basics, epidemiology, patient privacy (HIPAA) awareness",
        "bloom_understand": "How AI supports diagnosis, documentation, and population health",
        "bloom_apply": "Evaluate clinical AI tools and draft patient-facing materials safely",
        "bloom_analyze": "Bias in medical datasets and ethical risks of AI in care",
    }
    for pid, field, desc, kw in [
        ("nursing_bsn", "Nursing", "BSN student — bedside tech and documentation AI", {"goals_1": "Apply AI literacy to nursing documentation and patient education"}),
        ("pre_med_undergrad", "Pre-Medicine", "Pre-med junior — AI in diagnostics and research", {"bloom_remember": "Biology, chemistry, introductory biostatistics"}),
        ("health_informatics", "Health Informatics", "Health informatics MS — EHR and AI systems", {"goals_1": "Understand technical workflows for health data and responsible AI"}),
        ("pharmacy_student", "Pharmacy", "Pharmacy student — drug interaction and literature tools", {"bloom_apply": "Use AI to summarize pharmacology literature with verification"}),
        ("social_work_msw", "Social Work", "MSW student — AI ethics in vulnerable populations", {"goals_1": "Understand societal impact and responsible AI in social services"}),
        ("biomed_engineering", "Biomedical Engineering", "BME senior — ML for medical devices", {"prereq_1": "Somewhat confident", "bloom_remember": "Signals, MATLAB, introductory ML for biosignals"}),
    ]:
        out.append(_extend(health, pid, "health_medicine", field, desc, **kw))

    hum = {
        "goals_1": "Build AI literacy without assuming a technical background",
        "goals_2": "Required elective for my degree",
        "prereq_1": "Very uncertain",
        "learning_1": "Visual (diagrams, charts, videos)",
        "bloom_remember": "Essay writing, qualitative research methods, no programming",
        "bloom_understand": "How AI affects media, culture, and social institutions",
        "bloom_apply": "Use AI tools responsibly in papers and creative projects",
        "bloom_analyze": "Misinformation, authorship, and bias in AI-generated content",
    }
    for pid, field, desc, kw in [
        ("polisci_junior", "Political Science", "Political science junior — AI and governance", {"goals_1": "Understand AI policy, regulation, and civic implications"}),
        ("sociology_masters", "Sociology", "Sociology MA — AI and social inequality", {"prereq_1": "Somewhat uncertain", "bloom_analyze": "How AI reproduces or amplifies social bias"}),
        ("education_undergrad", "Education", "Education major — AI in K-12 classrooms", {"goals_1": "Learn AI literacy to teach students responsibly"}),
        ("philosophy_ethics", "Philosophy", "Philosophy major — ethics of AI and consciousness debates", {"goals_1": "Understand ethical risks and responsible AI from a humanities lens"}),
        ("journalism_student", "Journalism", "Journalism student — verification and AI-generated news", {"bloom_apply": "Fact-check AI outputs in investigative reporting"}),
    ]:
        out.append(_extend(hum, pid, "humanities_social", field, desc, **kw))

    # Style controls paired with non-canonical balanced peers
    style_pairs = [
        ("style_control_econ_labor", "econ_undergrad_labor", LEARNING_STYLES[0]),
        ("style_control_polisci", "polisci_junior", LEARNING_STYLES[2]),
        ("style_control_nursing", "nursing_bsn", LEARNING_STYLES[3]),
        ("style_control_math_pure", "math_pure_undergrad", LEARNING_STYLES[1]),
        ("style_control_biz_finance", "biz_finance_analyst", LEARNING_STYLES[4]),
    ]
    peers = {x["id"]: x for x in out}
    peers["medium_knowledge_mixed"] = next(c for c in CANONICAL if c["id"] == "medium_knowledge_mixed")

    for sc_id, paired_id, style in style_pairs:
        peer = peers[paired_id]
        answers = deepcopy(peer["answers"])
        answers["learning_1"] = style
        out.append(_p(
            sc_id,
            "style_control",
            peer["field"],
            f"Learning-style control for {paired_id} ({peer['field']}) — only learning_1 differs",
            answers,
            paired_with=paired_id,
        ))

    return out


def main() -> int:
    extensions = generate_extensions()
    all_profiles = CANONICAL + extensions

    if len(all_profiles) != 50:
        print(f"Expected 50 profiles, got {len(all_profiles)}", file=sys.stderr)
        return 1

    clusters: dict[str, int] = {}
    fields: dict[str, int] = {}
    for p in all_profiles:
        clusters[p["cluster"]] = clusters.get(p["cluster"], 0) + 1
        fields[p["field"]] = fields.get(p["field"], 0) + 1

    payload = {
        "version": "3.0",
        "profile_count": len(all_profiles),
        "design": "Cross-field students (CS, Business, Econ, Math/Stats, Health, Humanities) in one AI literacy course",
        "clusters": clusters,
        "fields": fields,
        "profiles": all_profiles,
    }
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(all_profiles)} profiles to {OUT_PATH}")
    print("Clusters:", json.dumps(clusters, indent=2))
    print("Fields:", json.dumps(fields, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
