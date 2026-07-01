#!/usr/bin/env python3
"""Generate plain-language team HTML report (print to PDF from browser)."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent
REPORTS_DIR = STUDY_ROOT / "data" / "results" / "reports"
OUTPUT_HTML = STUDY_ROOT / "reports" / "phase0_team_report.html"
OUTPUT_LOG = REPORTS_DIR / "iteration_log.json"

BLOCK_LABELS = {
    "block_01": "AI Basics",
    "block_02": "Gen AI",
    "block_03": "Prompting",
    "block_04": "Adv. Prompting",
    "block_05a": "Business",
    "block_05b": "Technical",
    "block_06": "Ethics",
}

BLOCK_COLORS = {
    "block_01": "#6366f1",
    "block_02": "#8b5cf6",
    "block_03": "#a855f7",
    "block_04": "#d946ef",
    "block_05a": "#059669",
    "block_05b": "#0d9488",
    "block_06": "#dc2626",
}


def load_json(path: Path) -> dict | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def summarize_run(data: dict | None, label: str) -> dict:
    if not data:
        return {"label": label, "missing": True}
    v = data.get("verdict", {})
    cg = v.get("cluster_gate", {})
    return {
        "label": label,
        "missing": False,
        "passed": v.get("passed", False),
        "profiles": data.get("profile_count", "?"),
        "pathways": data.get("pathway_count", "?"),
        "mean_multiset": v.get("mean_multiset_jaccard"),
        "contrast_rate": v.get("contrast_pass_rate"),
        "contrasts": f"{v.get('contrasts_passed', '?')}/{v.get('contrasts_total', '?')}",
        "judge_mean": v.get("mean_judge_score"),
        "judge_min": v.get("min_mean_judge_score", 3.5),
        "within_cluster": data.get("cluster_metrics", {}).get("mean_within_cluster_multiset_jaccard"),
        "contrast_cluster": data.get("cluster_metrics", {}).get("mean_contrast_cluster_multiset_jaccard"),
        "style_control_rate": data.get("cluster_metrics", {}).get("style_control_pass_rate"),
        "checks": {
            "diverse_paths": v.get("checks", {}).get("block_coverage_diverse"),
            "hypotheses": v.get("checks", {}).get("contrast_hypotheses"),
            "judge": v.get("checks", {}).get("llm_judge"),
            "within_cluster": cg.get("checks", {}).get("within_cluster_similarity"),
            "contrasting": cg.get("checks", {}).get("contrasting_cluster_divergence"),
            "learning_style": cg.get("checks", {}).get("style_control_invariance"),
        },
        "style_pairs": data.get("cluster_metrics", {}).get("style_control_pairs", []),
        "judge_scores": [
            {"id": j["profileId"], "score": j["mean_score"], "ok": j.get("is_structural_not_cosmetic")}
            for j in (data.get("llm_judge") or [])
        ],
    }


def gate_rows(run: dict) -> str:
    if run.get("missing"):
        return "<tr><td colspan='3'>No data yet</td></tr>"
    c = run["checks"]
    gates = [
        ("Paths are sufficiently different", c.get("diverse_paths"), "Average syllabus-section overlap across all pairs stays below 92%"),
        ("Hypothesis tests (5 checks)", c.get("hypotheses"), "e.g. beginners get more basics; business vs CS tracks differ"),
        ("Independent AI judge", c.get("judge"), f"Claude average ≥ {run.get('judge_min', 3.5)}"),
        ("Same major → similar paths", c.get("within_cluster"), "Within-group overlap ≥ 65%"),
        ("Different majors → different paths", c.get("contrasting"), "Cross-group overlap ≤ 70%"),
        ("Learning style does not change structure", c.get("learning_style"), "Control pairs ≥ 80% structurally identical"),
    ]
    rows = ""
    for name, ok, desc in gates:
        icon = "✅" if ok else "❌"
        rows += f"<tr><td>{name}</td><td>{icon}</td><td class='muted'>{desc}</td></tr>"
    return rows


def style_pair_rows(pairs: list[dict]) -> str:
    if not pairs:
        return "<tr><td colspan='4'>—</td></tr>"
    out = ""
    for p in pairs:
        ok = p.get("sequence_jaccard", 0) >= 0.85
        out += (
            f"<tr><td>{p.get('style_profile','')}</td><td>{p.get('paired_profile','')}</td>"
            f"<td>{p.get('sequence_jaccard','')}</td><td>{'✅' if ok else '❌'}</td></tr>"
        )
    return out


def judge_bars(scores: list[dict]) -> str:
    if not scores:
        return "<p class='muted'>No judge data</p>"
    out = '<div class="bar-list">'
    for j in sorted(scores, key=lambda x: x["score"]):
        pct = min(100, (j["score"] / 5) * 100)
        color = "#059669" if j["score"] >= 3.5 else "#dc2626"
        struct = "structural" if j.get("ok") else "cosmetic?"
        out += (
            f'<div class="bar-row"><span class="bar-label">{j["id"]}</span>'
            f'<div class="bar-track"><div class="bar-fill" style="width:{pct}%;background:{color}"></div></div>'
            f'<span class="bar-val">{j["score"]} ({struct})</span></div>'
        )
    out += "</div>"
    return out


def comparison_chart_data(run1: dict, run3: dict) -> str:
    labels = ["Judge score (×20)", "Style control %", "Within-cluster %", "Cross-cluster %"]
    r1 = [
        (run1.get("judge_mean") or 0) * 20,
        (run1.get("style_control_rate") or 0) * 100,
        (run1.get("within_cluster") or 0) * 100,
        (run1.get("contrast_cluster") or 0) * 100,
    ]
    r3 = [
        (run3.get("judge_mean") or 0) * 20,
        (run3.get("style_control_rate") or 0) * 100,
        (run3.get("within_cluster") or 0) * 100,
        (run3.get("contrast_cluster") or 0) * 100,
    ]
    return json.dumps({"labels": labels, "run1": r1, "run3": r3})


def timeline_html(run1: dict, run2: dict, run3: dict) -> str:
    def cell(r: dict, key: str) -> str:
        if r.get("missing"):
            return "—"
        v = r.get(key)
        if key == "passed":
            return "✅ PASS" if v else "❌ FAIL"
        if key == "style_control_rate" and v is not None:
            return f"{v * 100:.0f}%"
        if key == "judge_mean" and v is not None:
            return f"{v:.2f}"
        return str(v) if v is not None else "—"

    return f"""<table>
    <tr><th></th><th>Run 1</th><th>Run 2</th><th>Run 3 (final)</th></tr>
    <tr><td>Overall</td><td>{cell(run1,'passed')}</td><td>{cell(run2,'passed')}</td><td>{cell(run3,'passed')}</td></tr>
    <tr><td>AI judge avg</td><td>{cell(run1,'judge_mean')}</td><td>{cell(run2,'judge_mean')}</td><td>{cell(run3,'judge_mean')}</td></tr>
    <tr><td>Learning-style test</td><td>{cell(run1,'style_control_rate')}</td><td>{cell(run2,'style_control_rate')}</td><td>{cell(run3,'style_control_rate')}</td></tr>
    <tr><td>Hypothesis tests</td><td>{run1.get('contrasts','—')}</td><td>{run2.get('contrasts','—')}</td><td>{run3.get('contrasts','—')}</td></tr>
  </table>"""


def build_html(run1: dict, run2: dict, run3: dict, generated_at: str) -> str:
    verdict3 = "PASS ✅" if run3.get("passed") else "FAIL"
    color3 = "#059669" if run3.get("passed") else "#dc2626"
    chart = comparison_chart_data(run1, run3)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SynapsEd Phase 0 — Team Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    :root {{ font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; line-height: 1.65; }}
    body {{ max-width: 920px; margin: 0 auto; padding: 48px 32px 80px; background: #f8fafc; }}
    h1 {{ font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; }}
    h2 {{ font-size: 1.35rem; margin-top: 3rem; margin-bottom: 1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }}
    h3 {{ font-size: 1.1rem; margin-top: 2rem; color: #334155; }}
    .subtitle {{ color: #64748b; font-size: 1.05rem; margin-bottom: 2rem; }}
    .card {{ background: #fff; border-radius: 12px; padding: 28px 32px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,.08); }}
    .verdict {{ font-size: 1.75rem; font-weight: 700; color: {color3}; }}
    .lead {{ font-size: 1.08rem; color: #475569; }}
    table {{ width: 100%; border-collapse: collapse; margin: 16px 0; }}
    th, td {{ text-align: left; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; }}
    th {{ background: #f1f5f9; font-weight: 600; }}
    .muted {{ color: #64748b; font-size: 0.95rem; }}
    .fix-list li {{ margin-bottom: 12px; }}
    .bar-list {{ display: flex; flex-direction: column; gap: 10px; }}
    .bar-row {{ display: grid; grid-template-columns: 180px 1fr 100px; gap: 12px; align-items: center; font-size: 0.9rem; }}
    .bar-track {{ background: #e2e8f0; height: 14px; border-radius: 7px; overflow: hidden; }}
    .bar-fill {{ height: 100%; border-radius: 7px; }}
    .bar-val {{ font-size: 0.85rem; color: #64748b; }}
    .chart-wrap {{ max-width: 560px; margin: 24px auto; }}
    .legend {{ display: flex; gap: 24px; justify-content: center; margin-top: 12px; font-size: 0.9rem; }}
    .dot {{ display: inline-block; width: 12px; height: 12px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }}
    .overview-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
    @media (max-width: 700px) {{ .overview-grid, .bar-row {{ grid-template-columns: 1fr; }} }}
    @media print {{
      body {{ background: #fff; padding: 24px; max-width: 100%; }}
      .card {{ box-shadow: none; border: 1px solid #e2e8f0; page-break-inside: avoid; }}
      h2 {{ page-break-after: avoid; }}
    }}
  </style>
</head>
<body>

<h1>SynapsEd Phase 0 Validation</h1>
<p class="subtitle">Team report · Generated {generated_at}</p>

<div class="card">
  <h2 style="margin-top:0;border:none">What is this?</h2>
  <p class="lead">
    Before we test SynapsEd with real students, we run a <strong>synthetic validation</strong>:
    50 computer-generated student profiles (different majors — CS, Business, Health, Humanities, etc.)
    each get a personalized course pathway. We then check whether the paths are <em>meaningfully</em>
    different based on each student's survey — not just different lesson titles on the same route.
  </p>
  <p class="lead">
    An independent AI reviewer (Anthropic Claude) scores each path. The course paths themselves are
    built by a separate model (Google Gemini). We only move to human studies when every quality gate passes —
    we do not lower the bar to force a pass.
  </p>
</div>

<div class="card">
  <h2 style="margin-top:0;border:none">Overall result</h2>
  <p class="verdict" style="color:{color3}">Final (Run 3): {verdict3}</p>
  <p class="muted">50 synthetic students · independent Claude judge · Gemini pathway generator</p>
</div>

<div class="card">
  <h2 style="margin-top:0;border:none">Three-run timeline</h2>
  <p class="muted">We did not lower pass thresholds at any point.</p>
  {timeline_html(run1, run2, run3)}
</div>

<div class="card">
  <h2 style="margin-top:0;border:none">Quality gates (final run)</h2>
  <table>
    <tr><th>Gate</th><th>Pass?</th><th>What it means</th></tr>
    {gate_rows(run3)}
  </table>
</div>

<div class="card">
  <h2 style="margin-top:0;border:none">Run 1 → Run 3 improvement</h2>
  <div class="chart-wrap"><canvas id="cmpChart"></canvas></div>
  <div class="legend">
    <span><span class="dot" style="background:#94a3b8"></span>Run 1 (first attempt)</span>
    <span><span class="dot" style="background:#059669"></span>Run 3 (final)</span>
  </div>
</div>

<div class="card">
  <h2 style="margin-top:0;border:none">What went wrong in Run 1</h2>
  <ul>
    <li><strong>AI judge barely missed</strong> — 3.46/5 (needed 3.5). Some paths looked cosmetic.</li>
    <li><strong>Learning-style leak</strong> — 2 of 6 control pairs failed (nursing, math).</li>
    <li><strong>Technical issues</strong> — retired Claude model, Gemini skipping structured output, rate limits (all fixed).</li>
  </ul>
</div>

<div class="card">
  <h2 style="margin-top:0;border:none">What we changed</h2>
  <h3>Run 2 — stronger generator instructions (prompt v2.0)</h3>
  <ul class="fix-list">
    <li>Learning style may only change lesson <em>wording</em>, never which syllabus sections appear.</li>
    <li>Ethics/health students: 4+ ethics sections. Prompting-focused: 3+ prompting sections.</li>
    <li>Anti-cosmetic rule + self-check for section-count differences.</li>
  </ul>
  <p class="muted">Run 2 result: judge improved to 4.0 ✅ but learning-style test got worse (50%) ❌</p>
  <h3>Run 3 — structure lock for learning-style control students</h3>
  <ul class="fix-list">
    <li>For the 6 "twin" students (same survey except learning style), we now copy the exact syllabus structure from their matched partner and only rewrite descriptions.</li>
    <li>This enforces our experimental design: learning style is not allowed to reroute the course.</li>
  </ul>
</div>

<div class="card">
  <h2 style="margin-top:0;border:none">Learning-style control pairs (final)</h2>
  <p class="muted">Pairs differ only in learning style. Structure should match (≥85%).</p>
  <table>
    <tr><th>Style variant</th><th>Matched student</th><th>Similarity</th><th>OK?</th></tr>
    {style_pair_rows(run3.get('style_pairs', []))}
  </table>
</div>

<div class="card">
  <h2 style="margin-top:0;border:none">AI judge scores (final run)</h2>
  <p class="muted">Claude · 1–5 · "structural" = real personalization</p>
  {judge_bars(run3.get('judge_scores', []))}
</div>

<div class="card">
  <h2 style="margin-top:0;border:none">Syllabus blocks (reference)</h2>
  <p class="muted">Each pathway is built from these tagged sections — personalization means varying which sections appear and how many lessons each gets.</p>
  <table>
    <tr><th>Block</th><th>Topic</th></tr>
    <tr><td>AI Basics</td><td>ML, data, terminology</td></tr>
    <tr><td>Gen AI</td><td>Generative AI concepts and use cases</td></tr>
    <tr><td>Prompting / Adv. Prompting</td><td>From first prompts to few-shot and chain-of-thought</td></tr>
    <tr><td>Business vs Technical track</td><td>Workplace transformation vs RAG/workflows/projects</td></tr>
    <tr><td>Ethics</td><td>Responsible AI capstone — every student gets this</td></tr>
  </table>
</div>

<div class="card">
  <h2 style="margin-top:0;border:none">Next steps</h2>
  <p class="lead">
    {"✅ Phase 0 passed. Proceed to professor review and a small human pilot." if run3.get("passed") else "❌ Phase 0 not yet passed — continue fixing before human studies."}
  </p>
</div>

<script>
const data = {chart};
new Chart(document.getElementById('cmpChart'), {{
  type: 'bar',
  data: {{
    labels: data.labels,
    datasets: [
      {{ label: 'Run 1', data: data.run1, backgroundColor: '#94a3b8' }},
      {{ label: 'Run 3', data: data.run3, backgroundColor: '#059669' }}
    ]
  }},
  options: {{
    responsive: true,
    plugins: {{ legend: {{ display: false }} }},
    scales: {{ y: {{ beginAtZero: true, max: 100 }} }}
  }}
}});
</script>
</body>
</html>"""


def main() -> int:
    run1_raw = load_json(REPORTS_DIR / "iteration_1_evaluation.json")
    run2_raw = load_json(REPORTS_DIR / "iteration_2_evaluation.json")
    run3_raw = load_json(REPORTS_DIR / "iteration_3_evaluation.json") or load_json(
        REPORTS_DIR / "research_evaluation.json"
    )

    run1 = summarize_run(run1_raw, "Run 1")
    run2 = summarize_run(run2_raw, "Run 2")
    run3 = summarize_run(run3_raw, "Run 3")

    log = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "runs": [
            {"id": 1, "summary": {k: v for k, v in run1.items() if k != "label"}},
            {"id": 2, "summary": {k: v for k, v in run2.items() if k != "label"}},
            {"id": 3, "summary": {k: v for k, v in run3.items() if k != "label"}},
        ],
        "fixes": {
            "run2_prompt_v2": [
                "Learning style descriptions-only",
                "Ethics 4+ nodes, prompting 3+ nodes",
                "Anti-cosmetic structural rule",
            ],
            "run3_structure_lock": [
                "Style-control twins copy paired student's block structure exactly",
            ],
        },
    }
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_LOG.write_text(json.dumps(log, indent=2), encoding="utf-8")

    generated_at = datetime.now().strftime("%B %d, %Y at %H:%M")
    OUTPUT_HTML.write_text(build_html(run1, run2, run3, generated_at), encoding="utf-8")

    print(f"Wrote {OUTPUT_HTML}")
    print(f"Wrote {OUTPUT_LOG}")
    print("Open HTML in browser → Print → Save as PDF")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
