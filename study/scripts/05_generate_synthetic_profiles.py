#!/usr/bin/env python3
"""Generate ~50 synthetic profiles with intentional cluster structure.

Similar profiles share a cluster (expect similar pathways).
Contrasting clusters (e.g. foundation_low vs research_technical) expect divergence.
Canonical 10 anchor profiles are preserved for pre-registered hypotheses H1–H5.
"""

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

CANONICAL = [
    {
        "id": "low_knowledge_general",
        "cluster": "foundation_low",
        "description": "Very low prior knowledge, general literacy goal",
        "answers": {
            "goals_1": "Understand what AI is and how it affects daily life",
            "goals_2": "Personal interest in the subject",
            "prereq_1": "Very uncertain",
            "learning_1": "Visual (diagrams, charts, videos)",
            "bloom_remember": "I have not taken any AI courses before",
            "bloom_understand": "I want to learn basic AI vocabulary and concepts",
            "bloom_apply": "Use AI tools responsibly in everyday tasks",
            "bloom_analyze": "I worry about keeping up with technical jargon",
        },
    },
    {
        "id": "high_knowledge_research",
        "cluster": "research_technical",
        "description": "Strong ML background, research-oriented goals",
        "answers": {
            "goals_1": "Deepen understanding of generative AI for academic research",
            "goals_2": "Career advancement",
            "prereq_1": "Very confident",
            "learning_1": "Reading/Writing (texts, notes)",
            "bloom_remember": "Supervised learning, neural networks, gradient descent",
            "bloom_understand": "How LLMs differ from traditional ML pipelines",
            "bloom_apply": "Design research workflows using generative AI tools",
            "bloom_analyze": "Evaluating model limitations and hallucination risks",
        },
    },
    {
        "id": "low_knowledge_business",
        "cluster": "business_track",
        "description": "Low confidence, business application focus",
        "answers": {
            "goals_1": "Apply AI and prompting in a business context",
            "goals_2": "Career advancement",
            "prereq_1": "Somewhat uncertain",
            "learning_1": "Mixed approach",
            "bloom_remember": "Basic spreadsheet and email tools",
            "bloom_understand": "How generative AI can support business decisions",
            "bloom_apply": "Draft reports and customer communications with AI",
            "bloom_analyze": "Choosing appropriate AI tools for business tasks",
        },
    },
    {
        "id": "high_knowledge_business",
        "cluster": "business_track",
        "description": "Knows classic AI, wants gen AI for business",
        "answers": {
            "goals_1": "Lead AI transformation initiatives in my organization",
            "goals_2": "Career advancement",
            "prereq_1": "Very confident",
            "learning_1": "Auditory (lectures, discussions)",
            "bloom_remember": "ML project workflow, data science basics, AI strategy terms",
            "bloom_understand": "Generative AI opportunities in business units",
            "bloom_apply": "Scope and prioritize gen AI pilot projects",
            "bloom_analyze": "ROI and risk tradeoffs for gen AI adoption",
        },
    },
    {
        "id": "medium_knowledge_mixed",
        "cluster": "balanced_general",
        "description": "Neutral confidence, mixed goals",
        "answers": {
            "goals_1": "Build a well-rounded understanding of AI literacy topics",
            "goals_2": "Personal interest in the subject",
            "prereq_1": "Neutral",
            "learning_1": "Mixed approach",
            "bloom_remember": "Heard of machine learning and ChatGPT",
            "bloom_understand": "Both traditional AI and generative AI concepts",
            "bloom_apply": "Experiment with prompts and AI tools at work",
            "bloom_analyze": "Balancing hype with realistic AI capabilities",
        },
    },
    {
        "id": "gen_ai_familiar_prompting_new",
        "cluster": "prompting_first",
        "description": "Comfortable with gen AI concepts, new to structured prompting",
        "answers": {
            "goals_1": "Master structured prompting techniques",
            "goals_2": "Personal interest in the subject",
            "prereq_1": "Somewhat confident",
            "learning_1": "Kinesthetic (hands-on activities)",
            "bloom_remember": "LLMs, transformers, generative AI use cases",
            "bloom_understand": "Few-shot and chain-of-thought prompting",
            "bloom_apply": "Build reusable prompt templates for work",
            "bloom_analyze": "When advanced prompting techniques are worth the effort",
        },
    },
    {
        "id": "prompting_expert_ai_novice",
        "cluster": "prompting_first",
        "description": "Uses prompts daily but weak on AI foundations",
        "answers": {
            "goals_1": "Fill gaps in AI and ML fundamentals",
            "goals_2": "Prerequisite for other courses",
            "prereq_1": "Somewhat uncertain",
            "learning_1": "Reading/Writing (texts, notes)",
            "bloom_remember": "ChatGPT, prompt templates, few-shot examples",
            "bloom_understand": "What machine learning and data mean in AI systems",
            "bloom_apply": "Connect prompting skills to underlying AI concepts",
            "bloom_analyze": "Why models fail and how data affects outcomes",
        },
    },
    {
        "id": "business_leader",
        "cluster": "business_track",
        "description": "Executive focus on org strategy and gen AI business impact",
        "answers": {
            "goals_1": "Develop an AI strategy for my team or company",
            "goals_2": "Career advancement",
            "prereq_1": "Somewhat confident",
            "learning_1": "Auditory (lectures, discussions)",
            "bloom_remember": "Digital transformation, product management basics",
            "bloom_understand": "AI transformation playbook and organizational change",
            "bloom_apply": "Identify high-value gen AI use cases in the workplace",
            "bloom_analyze": "Workforce impact and change management for AI adoption",
        },
    },
    {
        "id": "ethics_focused",
        "cluster": "ethics_society",
        "description": "Motivated by responsible AI and societal impact",
        "answers": {
            "goals_1": "Understand ethical risks and responsible AI practices",
            "goals_2": "Personal interest in the subject",
            "prereq_1": "Neutral",
            "learning_1": "Reading/Writing (texts, notes)",
            "bloom_remember": "Bias, fairness, privacy as general concepts",
            "bloom_understand": "How hallucinations and adversarial attacks affect AI systems",
            "bloom_apply": "Evaluate AI tools for ethical use in my context",
            "bloom_analyze": "Tradeoffs between AI benefits and societal harms",
        },
    },
    {
        "id": "learning_style_control",
        "cluster": "style_control",
        "paired_with": "medium_knowledge_mixed",
        "description": "Same as medium profile but kinesthetic — interaction-only control",
        "answers": {
            "goals_1": "Build a well-rounded understanding of AI literacy topics",
            "goals_2": "Personal interest in the subject",
            "prereq_1": "Neutral",
            "learning_1": "Kinesthetic (hands-on activities)",
            "bloom_remember": "Heard of machine learning and ChatGPT",
            "bloom_understand": "Both traditional AI and generative AI concepts",
            "bloom_apply": "Experiment with prompts and AI tools at work",
            "bloom_analyze": "Balancing hype with realistic AI capabilities",
        },
    },
]


def _clone(base: dict, profile_id: str, cluster: str, description: str, **answer_overrides) -> dict:
    answers = deepcopy(base)
    answers.update(answer_overrides)
    return {
        "id": profile_id,
        "cluster": cluster,
        "description": description,
        "answers": answers,
    }


def generate_extensions() -> list[dict]:
    profiles: list[dict] = []

    foundation_base = {
        "goals_1": "Understand what AI is and how it affects daily life",
        "goals_2": "Personal interest in the subject",
        "prereq_1": "Very uncertain",
        "learning_1": "Visual (diagrams, charts, videos)",
        "bloom_remember": "I have not taken any AI courses before",
        "bloom_understand": "I want to learn basic AI vocabulary and concepts",
        "bloom_apply": "Use AI tools responsibly in everyday tasks",
        "bloom_analyze": "I worry about keeping up with technical jargon",
    }
    foundation_tweaks = [
        ("foundation_low_02", "First-year student with no STEM background", {"learning_1": LEARNING_STYLES[3], "bloom_analyze": "Math and technical terms feel intimidating"}),
        ("foundation_low_03", "Career switcher starting from zero AI knowledge", {"goals_2": "Career advancement", "learning_1": LEARNING_STYLES[2], "bloom_apply": "Use AI assistants in a new job search"}),
        ("foundation_low_04", "Community college learner, very uncertain prerequisites", {"prereq_1": "Somewhat uncertain", "bloom_remember": "Only heard the word artificial intelligence on the news"}),
        ("foundation_low_05", "Senior adult learner exploring AI literacy", {"goals_2": "Personal interest in the subject", "learning_1": LEARNING_STYLES[0], "bloom_analyze": "Keeping pace with younger classmates"}),
        ("foundation_low_06", "Humanities major with no prior AI coursework", {"bloom_remember": "No formal AI or programming courses", "bloom_understand": "How AI relates to society and media"}),
        ("foundation_low_07", "International student, uncertain about English technical terms", {"bloom_analyze": "Understanding jargon in a second language"}),
        ("foundation_low_08", "Part-time worker seeking basic AI literacy", {"goals_2": "Career advancement", "learning_1": LEARNING_STYLES[4]}),
    ]
    for pid, desc, overrides in foundation_tweaks:
        profiles.append(_clone(foundation_base, pid, "foundation_low", desc, **overrides))

    business_base = {
        "goals_1": "Apply AI and prompting in a business context",
        "goals_2": "Career advancement",
        "prereq_1": "Somewhat confident",
        "learning_1": "Mixed approach",
        "bloom_remember": "Basic spreadsheet and email tools",
        "bloom_understand": "How generative AI can support business decisions",
        "bloom_apply": "Draft reports and customer communications with AI",
        "bloom_analyze": "Choosing appropriate AI tools for business tasks",
    }
    business_tweaks = [
        ("business_track_04", "Marketing manager exploring gen AI for campaigns", {"goals_1": "Use generative AI for marketing and customer engagement in my organization"}),
        ("business_track_05", "Operations lead focused on workplace productivity", {"goals_1": "Improve workplace productivity with AI transformation initiatives", "bloom_apply": "Automate routine operational reports"}),
        ("business_track_06", "Startup founder scoping gen AI pilots", {"prereq_1": "Neutral", "goals_1": "Scope gen AI pilot projects for a small business"}),
        ("business_track_07", "HR professional evaluating AI for hiring workflows", {"goals_1": "Evaluate responsible AI use in HR and workplace policies"}),
        ("business_track_08", "Consultant building client AI strategy decks", {"prereq_1": "Very confident", "goals_1": "Lead AI strategy workshops for client organizations"}),
        ("business_track_09", "Retail manager adopting AI for customer service", {"learning_1": LEARNING_STYLES[1], "bloom_apply": "Deploy chatbots for customer support"}),
    ]
    for pid, desc, overrides in business_tweaks:
        profiles.append(_clone(business_base, pid, "business_track", desc, **overrides))

    research_base = {
        "goals_1": "Deepen understanding of generative AI for academic research",
        "goals_2": "Career advancement",
        "prereq_1": "Very confident",
        "learning_1": "Reading/Writing (texts, notes)",
        "bloom_remember": "Supervised learning, neural networks, gradient descent",
        "bloom_understand": "How LLMs differ from traditional ML pipelines",
        "bloom_apply": "Design research workflows using generative AI tools",
        "bloom_analyze": "Evaluating model limitations and hallucination risks",
    }
    research_tweaks = [
        ("research_technical_02", "PhD student focused on RAG pipelines", {"goals_1": "Build RAG and fine-tuning workflows for academic research", "bloom_apply": "Implement retrieval-augmented generation for literature review"}),
        ("research_technical_03", "ML engineer deepening LLM project lifecycle skills", {"goals_1": "Master ML/DS project workflows with generative AI", "bloom_apply": "Ship fine-tuned models in production research tools"}),
        ("research_technical_04", "Data scientist comparing traditional ML vs LLMs", {"bloom_understand": "Technical tradeoffs between classical ML and LLM pipelines"}),
        ("research_technical_05", "Graduate researcher studying hallucination mitigation", {"bloom_analyze": "Systematic evaluation of hallucination in research assistants"}),
        ("research_technical_06", "Lab technician learning gen AI experiment design", {"learning_1": LEARNING_STYLES[2], "bloom_apply": "Automate repetitive lab documentation with LLMs"}),
        ("research_technical_07", "Computer science undergrad with strong ML background", {"goals_2": "Prerequisite for other courses", "bloom_remember": "Backpropagation, CNNs, scikit-learn, PyTorch basics"}),
        ("research_technical_08", "Postdoc exploring agentic research workflows", {"goals_1": "Design technical agent workflows for research automation", "bloom_apply": "Chain multi-step research tools with LLM agents"}),
        ("research_technical_09", "Bioinformatics researcher applying gen AI", {"goals_1": "Apply academic research methods with generative AI in bioinformatics"}),
    ]
    for pid, desc, overrides in research_tweaks:
        profiles.append(_clone(research_base, pid, "research_technical", desc, **overrides))

    ethics_base = {
        "goals_1": "Understand ethical risks and responsible AI practices",
        "goals_2": "Personal interest in the subject",
        "prereq_1": "Neutral",
        "learning_1": "Reading/Writing (texts, notes)",
        "bloom_remember": "Bias, fairness, privacy as general concepts",
        "bloom_understand": "How hallucinations and adversarial attacks affect AI systems",
        "bloom_apply": "Evaluate AI tools for ethical use in my context",
        "bloom_analyze": "Tradeoffs between AI benefits and societal harms",
    }
    ethics_tweaks = [
        ("ethics_society_02", "Policy student focused on AI governance", {"goals_1": "Understand societal impact and responsible AI governance"}),
        ("ethics_society_03", "Journalist investigating AI bias stories", {"bloom_analyze": "How bias and fairness issues appear in real-world AI systems"}),
        ("ethics_society_04", "Teacher concerned about AI in classrooms", {"bloom_apply": "Develop responsible AI guidelines for students"}),
        ("ethics_society_05", "Nonprofit worker evaluating AI for social good", {"goals_1": "Evaluate ethical risks of AI in nonprofit programs"}),
        ("ethics_society_06", "Law student studying AI regulation", {"bloom_understand": "Legal and ethical frameworks for responsible AI deployment"}),
    ]
    for pid, desc, overrides in ethics_tweaks:
        profiles.append(_clone(ethics_base, pid, "ethics_society", desc, **overrides))

    prompting_base = {
        "goals_1": "Master structured prompting techniques",
        "goals_2": "Personal interest in the subject",
        "prereq_1": "Somewhat confident",
        "learning_1": "Kinesthetic (hands-on activities)",
        "bloom_remember": "LLMs, transformers, generative AI use cases",
        "bloom_understand": "Few-shot and chain-of-thought prompting",
        "bloom_apply": "Build reusable prompt templates for work",
        "bloom_analyze": "When advanced prompting techniques are worth the effort",
    }
    prompting_tweaks = [
        ("prompting_first_03", "Content creator using ChatGPT daily", {"bloom_remember": "ChatGPT, prompt templates, daily prompting habits", "prereq_1": "Somewhat uncertain", "goals_1": "Improve daily prompting skills without deep ML theory"}),
        ("prompting_first_04", "Support agent relying on copilot prompts", {"bloom_remember": "Copilot prompts and few-shot examples at work", "goals_1": "Fill gaps in AI fundamentals while keeping prompt skills"}),
        ("prompting_first_05", "Designer using gen AI for mockups", {"learning_1": LEARNING_STYLES[0], "bloom_apply": "Create design mockups with structured prompts"}),
        ("prompting_first_06", "Teacher experimenting with classroom prompts", {"bloom_remember": "ChatGPT for lesson planning, basic prompt templates", "goals_1": "Master prompting techniques for education"}),
    ]
    for pid, desc, overrides in prompting_tweaks:
        profiles.append(_clone(prompting_base, pid, "prompting_first", desc, **overrides))

    balanced_base = {
        "goals_1": "Build a well-rounded understanding of AI literacy topics",
        "goals_2": "Personal interest in the subject",
        "prereq_1": "Neutral",
        "learning_1": "Mixed approach",
        "bloom_remember": "Heard of machine learning and ChatGPT",
        "bloom_understand": "Both traditional AI and generative AI concepts",
        "bloom_apply": "Experiment with prompts and AI tools at work",
        "bloom_analyze": "Balancing hype with realistic AI capabilities",
    }
    balanced_tweaks = [
        ("balanced_general_02", "Working professional seeking balanced AI literacy", {"goals_2": "Career advancement"}),
        ("balanced_general_03", "Undergraduate exploring AI as a general elective", {"bloom_remember": "Intro programming and heard of ChatGPT"}),
        ("balanced_general_04", "Entrepreneur wanting broad AI overview", {"goals_2": "Career advancement", "bloom_apply": "Explore AI tools for a side business"}),
        ("balanced_general_05", "Retiree curious about AI news and tools", {"learning_1": LEARNING_STYLES[1]}),
        ("balanced_general_06", "Freelancer seeking well-rounded AI skills", {"bloom_apply": "Use AI across writing, design, and admin tasks"}),
        ("balanced_general_07", "Team lead wanting neutral baseline literacy", {"prereq_1": "Somewhat confident", "goals_1": "Build organizational AI literacy across mixed skill levels"}),
    ]
    for pid, desc, overrides in balanced_tweaks:
        profiles.append(_clone(balanced_base, pid, "balanced_general", desc, **overrides))

    # Style controls: same survey core as balanced peers, only learning_1 changes
    style_pairs = [
        ("style_control_02", "balanced_general_02", LEARNING_STYLES[0]),
        ("style_control_03", "balanced_general_03", LEARNING_STYLES[1]),
        ("style_control_04", "balanced_general_04", LEARNING_STYLES[3]),
        ("style_control_05", "balanced_general_05", LEARNING_STYLES[2]),
    ]
    balanced_by_id = {p["id"]: p for p in profiles if p["cluster"] == "balanced_general"}
    balanced_by_id["medium_knowledge_mixed"] = next(c for c in CANONICAL if c["id"] == "medium_knowledge_mixed")

    for sc_id, paired_id, style in style_pairs:
        peer = balanced_by_id[paired_id]
        answers = deepcopy(peer["answers"])
        answers["learning_1"] = style
        profiles.append({
            "id": sc_id,
            "cluster": "style_control",
            "paired_with": paired_id,
            "description": f"Learning-style control for {paired_id} — only learning_1 differs",
            "answers": answers,
        })

    return profiles


def main() -> int:
    extensions = generate_extensions()
    all_profiles = CANONICAL + extensions

    if len(all_profiles) != 50:
        print(f"Expected 50 profiles, got {len(all_profiles)}", file=sys.stderr)
        return 1

    clusters: dict[str, int] = {}
    for p in all_profiles:
        clusters[p["cluster"]] = clusters.get(p["cluster"], 0) + 1

    payload = {
        "version": "2.0",
        "profile_count": len(all_profiles),
        "clusters": clusters,
        "profiles": all_profiles,
    }
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(all_profiles)} profiles to {OUT_PATH}")
    print("Clusters:", json.dumps(clusters, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
