#!/usr/bin/env python3
"""Analyze pathway diversity and produce pass/fail gate report."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

STUDY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(STUDY_ROOT))

from lib.api_client import load_json, save_json  # noqa: E402
from lib.pathway_metrics import evaluate_gate  # noqa: E402


def build_html_report(evaluation: dict) -> str:
    status = "PASS" if evaluation["passed"] else "FAIL"
    color = "#059669" if evaluation["passed"] else "#dc2626"
    rows = "".join(
        f"<tr><td>{p['profile_a']}</td><td>{p['profile_b']}</td><td>{p['jaccard']:.3f}</td></tr>"
        for p in evaluation["pairwise"]
    )
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Pathway Diversity Report</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto;">
<h1>Pathway Diversity Report</h1>
<p style="font-size: 1.5rem; color: {color};"><strong>{status}</strong> — mean Jaccard: {evaluation['mean_jaccard']} (threshold &lt; {evaluation['threshold']})</p>
<h2>Pairwise similarity</h2>
<table border="1" cellpadding="6" cellspacing="0"><tr><th>Profile A</th><th>Profile B</th><th>Jaccard</th></tr>{rows}</table>
<h2>Contrast pair</h2>
<pre>{json.dumps(evaluation.get('contrast', {}), indent=2)}</pre>
<h2>Profile summaries</h2>
<pre>{json.dumps(evaluation.get('profile_summaries', {}), indent=2)}</pre>
</body></html>"""


def main() -> int:
    config = yaml.safe_load((STUDY_ROOT / "config" / "study_config.yaml").read_text())
    threshold = config.get("diversity", {}).get("mean_jaccard_threshold", 0.85)

    pathways_dir = STUDY_ROOT / "data" / "results" / "pathways"
    if not pathways_dir.exists() or not any(pathways_dir.glob("*.json")):
        print("Run 07_generate_pathways.py first")
        return 1

    pathways: dict = {}
    for path in sorted(pathways_dir.glob("*.json")):
        data = load_json(path)
        pathways[path.stem] = data.get("nodes", [])

    evaluation = evaluate_gate(
        pathways,
        threshold=threshold,
        contrast_pair=("low_knowledge_general", "high_knowledge_research"),
    )

    reports_dir = STUDY_ROOT / "data" / "results" / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    save_json(reports_dir / "diversity_report.json", evaluation)
    (reports_dir / "diversity_report.html").write_text(build_html_report(evaluation), encoding="utf-8")

    verdict = "PASS" if evaluation["passed"] else "FAIL"
    print(f"Gate verdict: {verdict} (mean Jaccard={evaluation['mean_jaccard']})")
    print(f"Reports: {reports_dir}/diversity_report.json")
    return 0 if evaluation["passed"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
