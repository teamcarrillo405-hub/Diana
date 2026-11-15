"""Verify fixed v4 continuation without modifying or consuming parent evidence."""
from __future__ import annotations
import argparse
from copy import deepcopy
import hashlib
import json
import math
from pathlib import Path

from verify_synthetic_lora_v3 import (
    SHA256, TEST_MANIFEST_SHA256, TEST_MODULE_SHA256, TEST_ROWS_SHA256,
    require, digest, read, evidence_path, verify_manifest, checked_rows,
    distinct_partitions, checked_records, checked_weights, verify as verify_v3,
)


def verify_parent_evidence(root, preregistration):
    parent = preregistration.get("parent")
    require(isinstance(parent, dict) and parent.get("runName") == "run-004-v3"
            and parent.get("selectedBeforeCurrentTraining") is True,
            "Missing frozen parent identity or selection")
    parent_root = root.parent / parent["runName"]
    require(not parent_root.is_symlink() and parent_root.resolve().parent == root.parent.resolve()
            and parent_root.resolve() != root.resolve(), "Parent must be a preserved sibling run")
    verified = verify_v3(parent_root)
    require(verified["validationPassed"] is False and verified["testOpened"] is False,
            "Continuation requires rejected parent with unopened holdout")
    report = read(parent_root / "report.json")
    require(report["status"] == "rejected-validation" and report["testEvaluations"] == 0,
            "Parent did not preserve sealed test")
    selection = read(parent_root / "selection.json")
    candidates = read(evidence_path(parent_root, "validation-candidates.json"))
    require(candidates == selection["candidates"], "Parent candidate inventory differs from verified selection")
    chosen = min(candidates, key=lambda item: (-item["metrics"]["counts"]["groundedCasePass"],
                                              item["metrics"]["targetTokenLoss"]))
    require(type(parent.get("selectedEpoch")) is int and parent["selectedEpoch"] == chosen["epoch"],
            "Parent checkpoint differs from frozen validation-only rule")
    for key, name in (("reportSha256", "report.json"),
                      ("candidatesSha256", "validation-candidates.json"),
                      ("adapterSha256", f"epoch-{chosen['epoch']}/adapter_model.safetensors"),
                      ("configSha256", f"epoch-{chosen['epoch']}/adapter_config.json")):
        require(parent.get(key) == digest(evidence_path(parent_root, name)), f"Parent evidence drift: {key}")
    parent_prereg = read(parent_root / "preregistration.json")
    require(preregistration.get("baseProvenanceSha256") == parent_prereg["baseProvenanceSha256"],
            "Continuation base differs from verified parent")


def verify_development_scope(root, train, validation):
    parent = root.parent / "run-004-v3"
    expected_validation = deepcopy(read(parent / "validation.json"))
    allowed_spans = {
        "validation-v3-13-present": "Enzymes speed up chemical reactions",
        "validation-v3-7-present": "the controlling idea that the paragraph develops",
        "validation-v3-10-present": "explains why its own claim remains supported",
    }
    for row in expected_validation:
        if row["id"] in allowed_spans:
            row["acceptedQuotes"].append(allowed_spans[row["id"]])
    require(validation == expected_validation, "Validation changes exceed the three pre-result audited spans")
    old_train = deepcopy(read(parent / "train.json"))
    for row in old_train:
        if row["family"] == "train-v3-topic-6":
            row["source"] = row["source"].replace("An exponent tells", "A positive integer exponent tells")
            row["messages"][1]["content"] = f"SOURCE: {row['source']}\nQUESTION: {row['question']}"
    require(len(train) == len(old_train) + 200 and train[:len(old_train)] == old_train,
            "Parent training changes exceed the declared exponent scope correction")


def verify_parent_reload(root, preregistration, records):
    parent = preregistration["parent"]
    original = read(root.parent / parent["runName"] / f"epoch-{parent['selectedEpoch']}-validation.json")
    # v4 changes accepted quotation annotations only. Source, question, target,
    # tokenizer, greedy generation and CPU inference settings remain identical.
    # Corrected diagnostics may legitimately differ; raw responses must not.
    require(len(records) == len(original) and all(
        current["id"] == preserved["id"]
        and current["output"] == preserved["output"]
        and current["targetTokens"] == preserved["targetTokens"]
        for current, preserved in zip(records, original, strict=True)),
        "Reloaded parent responses differ from the preserved v3 checkpoint")


def verify(root):
    from train_synthetic_lora_v4 import SETTINGS
    from train_synthetic_lora_v3 import score, aggregate, gates
    from synthetic_lora_v4_development import datasets
    from prepare_synthetic_lora import MODEL, REVISION

    root = Path(root).resolve()
    report = read(root / "report.json")
    require(report.get("schema") == "diana-original-synthetic-lora-v4", "Unexpected research schema")
    require(report.get("status") in ("completed", "rejected-validation"), "Incomplete research run")
    require(report.get("productionEligible") is False and report.get("educatorReviewed") is False
            and report.get("researchOnly") is True, "Invalid research-only status")
    require(report.get("providerCalls") == 0 and report.get("networkDeniedAtPythonSocketLayer") is True
            and report.get("osNetworkSandboxClaimed") is False, "Unexpected execution provenance")
    files = {path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file()
             and path.relative_to(root).as_posix() != "report.json"}
    verify_manifest(root, report.get("artifactHashes"), files)
    preregistration = read(evidence_path(root, "preregistration.json"))
    require(report.get("parent") == preregistration.get("parent"), "Reported parent differs from preregistered parent")
    verify_parent_evidence(root, preregistration)
    require(preregistration.get("settings") == SETTINGS, "Preregistered settings drift")
    require(preregistration.get("model") == MODEL and preregistration.get("revision") == REVISION,
            "Preregistered base model identity drift")
    require(preregistration.get("minimumGroundingAccuracy") == 0.95
            and preregistration.get("testCases") == 100
            and preregistration.get("maximumFreshTestEvaluations") == 1,
            "The 95 percent gate and fresh test contract must remain fixed")
    require(preregistration.get("productionEligible") is False
            and preregistration.get("educatorReviewed") is False, "Preregistration research-only status drift")
    for key in ("testModuleSha256", "testManifestSha256", "baseProvenanceSha256"):
        require(isinstance(preregistration.get(key), str) and SHA256.fullmatch(preregistration[key]),
                f"Missing preregistered {key}")
    require(digest(evidence_path(root, "test-manifest.json")) == preregistration["testManifestSha256"] == TEST_MANIFEST_SHA256,
            "Test manifest seal drift")
    manifest = read(root / "test-manifest.json")
    require(manifest.get("moduleSha256") == preregistration["testModuleSha256"] == TEST_MODULE_SHA256
            and manifest.get("testRowsSha256") == TEST_ROWS_SHA256
            and manifest.get("testCases") == 100 and manifest.get("minimumGroundingAccuracy") == 0.95,
            "Independently sealed test contract drift")
    source = preregistration.get("sourceSha256")
    required_source = {"train_synthetic_lora_v4.py", "synthetic_lora_v4_development.py", "synthetic_lora_v4_data.py", "verify_synthetic_lora_v3.py",
                       "train_synthetic_lora_v3.py", "synthetic_lora_v3_data.py",
                       "train_synthetic_lora.py", "prepare_synthetic_lora.py"}
    require(isinstance(source, dict) and required_source <= set(source), "Incomplete archived source")
    archived = {path.relative_to(root / "source").as_posix() for path in (root / "source").rglob("*") if path.is_file()}
    sealed_name = "synthetic_lora_v3_evaluation.py"
    require(archived == set(source) | ({sealed_name} if report.get("testOpened") is True else set()),
            "Unexpected archived source inventory")
    verify_manifest(root / "source", source)
    for name in required_source:
        require(digest(Path(__file__).with_name(name)) == source[name], "Current scoring or training source differs from archived source")
    data_hashes = preregistration.get("dataSha256")
    require(isinstance(data_hashes, dict) and set(data_hashes) == {"train", "validation"},
            "Unexpected development data partitions")
    parts = []
    originals = datasets()
    for index, label in enumerate(("train", "validation")):
        path = evidence_path(root, label + ".json")
        require(digest(path) == data_hashes[label], "Development data hash drift")
        rows = checked_rows(read(path), label)
        require(rows == originals[index], "Development data differs from original synthetic fixtures")
        require(report.get(label + "Count") == len(rows), "Reported development count differs")
        parts.append(rows)
    distinct_partitions(parts)
    train, validation = parts
    verify_development_scope(root, train, validation)

    def evaluation(label, rows):
        records = read(evidence_path(root, label + ".json"))
        return records, checked_records(rows, records, score, aggregate, label)

    _, baseline_validation = evaluation("baseline-validation", validation)
    require(baseline_validation == report.get("baselineValidation"), "Baseline validation metric drift")
    parent_records, parent_validation = evaluation("parent-validation", validation)
    require(parent_validation == report.get("parentValidation"), "Parent validation metric drift")
    verify_parent_reload(root, preregistration, parent_records)
    selection = read(evidence_path(root, "selection.json"))
    candidates = selection.get("candidates")
    require(isinstance(candidates, list) and len(candidates) == SETTINGS["epochs"], "Missing validation checkpoints")
    for epoch, candidate in enumerate(candidates, 1):
        require(candidate.get("epoch") == epoch, "Duplicate or misordered checkpoints")
        _, metrics = evaluation(f"epoch-{epoch}-validation", validation)
        require(metrics == candidate.get("metrics") and gates(baseline_validation, metrics) == candidate.get("gates"),
                "Validation checkpoint metric or gate drift")
        checked_weights(root, epoch, SETTINGS)
    eligible = [candidate for candidate in candidates if all(candidate["gates"].values())]
    selected = min(eligible, key=lambda item: item["metrics"]["targetTokenLoss"]) if eligible else None
    selected_epoch = selected["epoch"] if selected else None
    require(selection.get("selectedBeforeTest") is True
            and selection.get("validationPassed") is bool(eligible)
            and report.get("validationPassed") is bool(eligible)
            and selection.get("selectedEpoch") == selected_epoch
            and report.get("selectedEpoch") == selected_epoch, "Checkpoint selection differs from validation-only rule")
    if selected:
        metrics = selected["metrics"]
        require(metrics["counts"]["groundedCasePass"] * 100 >= 95 * metrics["cases"],
                "Selected validation checkpoint does not reach 95 percent")
    history = read(evidence_path(root, "training-history.json"))
    expected_steps = SETTINGS["epochs"] * len(train) // SETTINGS["gradientAccumulation"]
    require(isinstance(history, list) and len(history) == expected_steps
            and report.get("optimizerSteps") == expected_steps, "Incomplete optimizer history")
    for step, record in enumerate(history, 1):
        require(record.get("step") == step and record.get("epoch") == 1 + (step - 1) // (len(train) // SETTINGS["gradientAccumulation"]),
                "Training steps or epochs are misaligned")
        require(type(record.get("loss")) in (int, float) and math.isfinite(record["loss"]) and record["loss"] >= 0,
                "Invalid training loss")
    if not eligible:
        require(report["status"] == "rejected-validation" and report.get("testOpened") is False
                and report.get("testEvaluations") == 0 and report.get("syntheticQualityGatePassed") is False,
                "Validation rejection must leave test unopened")
        require(not ({"test.json", "baseline-test.json", "adapter-test.json", "reload-test.json"} & files),
                "Test evidence exists despite validation rejection")
        return {"verified": True, "reportSha256": digest(root / "report.json"),
                "validationPassed": False, "testOpened": False, "syntheticQualityGatePassed": False,
                "productionEligible": False, "baselineValidation": baseline_validation}
    require(report["status"] == "completed" and report.get("testOpened") is True
            and report.get("testEvaluations") == 1, "Invalid fresh-test execution count")
    test = checked_rows(read(evidence_path(root, "test.json")), "test")
    serialized_test = json.dumps(test, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")
    require(hashlib.sha256(serialized_test).hexdigest() == TEST_ROWS_SHA256, "Evaluated test differs from independently sealed cases")
    require(digest(evidence_path(root, "source/" + sealed_name)) == preregistration["testModuleSha256"],
            "Archived heldout module differs from preregistered seal")
    require(len(test) == 100 and report.get("testCount") == 100, "Final evaluation requires all 100 sealed cases")
    distinct_partitions([train, validation, test])
    baseline_records, baseline = evaluation("baseline-test", test)
    adapter_records, adapter = evaluation("adapter-test", test)
    reload_records, reload_metrics = evaluation("reload-test", test)
    require(baseline == report.get("baseline") and adapter == report.get("adapter")
            and gates(baseline, adapter) == report.get("testGates"), "Final metrics or gates differ from raw evidence")
    identical = adapter_records == reload_records
    require(identical and adapter == reload_metrics and report.get("savedAdapterOutputsIdentical") is True,
            "Saved adapter reload differs from evaluated checkpoint")
    passed = all(gates(baseline, adapter).values())
    require(not passed or adapter["counts"]["groundedCasePass"] * 100 >= 95 * adapter["cases"],
            "Final raw-model grounding is below 95 percent")
    require(report.get("syntheticQualityGatePassed") is passed, "Unsubstantiated synthetic quality claim")
    return {"verified": True, "reportSha256": digest(root / "report.json"),
            "validationPassed": True, "testOpened": True, "syntheticQualityGatePassed": passed,
            "productionEligible": False, "baseline": baseline, "adapter": adapter}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    print(json.dumps(verify(parser.parse_args().run.resolve()), indent=2))
