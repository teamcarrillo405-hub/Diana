"""Apply the declared non-regression rule without merging distinct test sets."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from prepare_synthetic_lora import sha
from train_synthetic_lora import validate_data


def assess_research_result(baseline_loss, adapter_loss, before, after, answerable_count):
    if not all(isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0 for value in (baseline_loss, adapter_loss)):
        raise ValueError("Finite nonnegative measured losses are required")
    if not all(isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= answerable_count for value in (before, after)) or answerable_count < 1:
        raise ValueError("Valid answerable-case counts are required")
    reasons = []
    if adapter_loss > baseline_loss:
        reasons.append("Target token loss worsened")
    if after > before:
        reasons.append("False abstentions increased on answerable cases")
    return {"nonRegressionVerdict": "rejected" if reasons else "passed-limited-diagnostics", "reasons": reasons, "productionEligible": False, "productionGate": "blocked-synthetic-research-without-independent-review", "educatorReviewed": False}


def summarize(root):
    _, heldout = validate_data(root)
    output = root / "execution"
    report = json.loads((output / "report.json").read_text(encoding="utf-8"))
    if report["status"] != "completed" or report.get("researchOnly") is not True or report.get("productionEligible") is not False or report.get("educatorReviewed") is not False:
        raise ValueError("Cannot assess an incomplete run")
    baseline = json.loads((output / "baseline.json").read_text(encoding="utf-8"))
    adapted = json.loads((output / "adapter.json").read_text(encoding="utf-8"))
    for name in ("baseline.json", "adapter.json"):
        if sha(output / name) != report["artifactHashes"][name]:
            raise ValueError("Evaluation artifact changed")
    answerable = {row["id"] for row in heldout if not row["messages"][-1]["content"].startswith("EVIDENCE: insufficient")}
    def false_abstentions(arm):
        if [row["id"] for row in arm] != [row["id"] for row in heldout]:
            raise ValueError("Evaluation case order changed")
        return sum(row["id"] in answerable and row["diagnostics"]["abstained"] for row in arm)
    before, after = false_abstentions(baseline), false_abstentions(adapted)
    decision = assess_research_result(report["baseline"]["targetTokenLoss"], report["adapter"]["targetTokenLoss"], before, after, len(answerable))
    reload = json.loads((output / "reload-verification.json").read_text())
    if not reload["allOutputsIdentical"] or reload["experimentReportSha256"] != sha(output / "report.json"):
        raise ValueError("Saved adapter was not verified against this experiment")
    return {"schema": "diana-synthetic-lora-decision-v1", "run": root.name, "partition": report.get("partition", "development-after-correction-decision"), "reportSha256": sha(output / "report.json"), "reloadSha256": sha(output / "reload-verification.json"), "adapterWeightsSha256": sha(output / "adapter" / "adapter_model.safetensors"), "trainDataSha256": sha(root / "train.jsonl"), "testDataSha256": sha(root / "heldout.jsonl"), "optimizerSteps": report["optimizerSteps"], "elapsedSeconds": report["elapsedSeconds"], "answerableCases": len(answerable), "baselineFalseAbstentions": before, "adapterFalseAbstentions": after, "baseline": report["baseline"], "adapter": report["adapter"], **decision, "savedAdapterReproducedAllCases": True}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", nargs="+", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    results = {"schema": "diana-synthetic-lora-results-v1", "productionEligible": False, "resultsNotPooledAcrossDifferentTestSets": True, "runs": [summarize(root.resolve()) for root in args.runs]}
    with args.output.open("x", encoding="utf-8") as handle:
        json.dump(results, handle, indent=2)
    print(json.dumps(results), flush=True)
