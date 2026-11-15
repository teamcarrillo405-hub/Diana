"""Verify preserved v2 evidence without executing models or promoting artifacts."""
import argparse
import json
from pathlib import Path
from prepare_synthetic_lora import sha
from train_synthetic_lora_v2 import score, aggregate, gates


def verify(root):
    report = json.loads((root/"report.json").read_text(encoding="utf-8"))
    if report.get("status") != "completed" or report.get("productionEligible") is not False or report.get("educatorReviewed") is not False:
        raise ValueError("Invalid research-only status")
    for name, digest in report["artifactHashes"].items():
        path = (root/name).resolve()
        if not path.is_relative_to(root.resolve()) or not path.is_file() or sha(path) != digest:
            raise ValueError(f"Missing, escaping or modified evidence: {name}")
    preregistration = json.loads((root/"preregistration.json").read_text(encoding="utf-8"))
    if preregistration["productionEligible"] is not False or preregistration["freshTestEvaluations"] != 1:
        raise ValueError("Preregistration drift")
    if set(preregistration["dataSha256"]) != {"train", "validation", "test"}:
        raise ValueError("Unexpected data partitions")
    for name, digest in preregistration["dataSha256"].items():
        if sha(root/(name+".json")) != digest:
            raise ValueError("Dataset drift")
    for name, digest in preregistration["sourceSha256"].items():
        path = (root/"source"/name).resolve()
        if not path.is_relative_to((root/"source").resolve()) or sha(path) != digest:
            raise ValueError("Archived source drift")
    rows = json.loads((root/"test.json").read_text(encoding="utf-8"))
    evaluations = {}
    for label in ("baseline-test", "adapter-test", "reload-test"):
        records = json.loads((root/(label+".json")).read_text(encoding="utf-8"))
        for row, entry in zip(rows, records, strict=True):
            if row["id"] != entry["id"] or score(entry["output"],row) != entry["diagnostics"]:
                raise ValueError("Evaluation diagnostics do not match outputs")
        evaluations[label] = records
    baseline, adapter = aggregate(evaluations["baseline-test"]), aggregate(evaluations["adapter-test"])
    if baseline != report["baseline"] or adapter != report["adapter"] or gates(baseline,adapter) != report["testGates"]:
        raise ValueError("Reported metrics do not match evidence")
    identical = all(a["output"] == b["output"] for a,b in zip(evaluations["adapter-test"],evaluations["reload-test"],strict=True))
    if identical is not True or report["savedAdapterOutputsIdentical"] is not True:
        raise ValueError("Reload differs from selected adapter")
    selection = json.loads((root/"selection.json").read_text(encoding="utf-8"))
    validation_rows = json.loads((root/"validation.json").read_text(encoding="utf-8"))
    validation_baseline = aggregate(json.loads((root/"baseline-validation.json").read_text(encoding="utf-8")))
    for candidate in selection["candidates"]:
        records = json.loads((root/f"epoch-{candidate['epoch']}-validation.json").read_text(encoding="utf-8"))
        for row, entry in zip(validation_rows, records, strict=True):
            if row["id"] != entry["id"] or score(entry["output"],row) != entry["diagnostics"]:
                raise ValueError("Validation diagnostics do not match outputs")
        metrics = aggregate(records)
        if metrics != candidate["metrics"] or gates(validation_baseline,metrics) != candidate["gates"]:
            raise ValueError("Checkpoint selection metrics are inconsistent")
    eligible = [c for c in selection["candidates"] if all(c["gates"].values())]
    selected = min(eligible or selection["candidates"], key=lambda c:c["metrics"]["targetTokenLoss"])
    if selected["epoch"] != report["selectedEpoch"] or selected["epoch"] != selection["selectedEpoch"] or bool(eligible) != selection["validationPassed"]:
        raise ValueError("Checkpoint differs from declared validation choice")
    passed = bool(eligible) and all(gates(baseline,adapter).values()) and identical
    if passed != report["syntheticQualityGatePassed"]:
        raise ValueError("Unsubstantiated quality pass")
    return {"verified": True, "reportSha256": sha(root/"report.json"), "syntheticQualityGatePassed": passed,
            "productionEligible": False, "baseline":baseline,"adapter":adapter,"testGates":gates(baseline,adapter)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    print(json.dumps(verify(parser.parse_args().run.resolve()),indent=2))
