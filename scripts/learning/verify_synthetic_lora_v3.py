"""Fail-closed verification of local v3 research evidence. Never enables serving.

Hashes establish local consistency, not an externally signed research attestation.
The verifier never loads model weights or calls a model or network service.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path, PurePosixPath
import re
import struct


SHA256 = re.compile(r"^[0-9a-f]{64}$")
# These independent seals were supplied before any v3 model evaluation.
TEST_MANIFEST_SHA256 = "f878878d761fac4821c5f9185af63d0c5c22caf3b4f2c68732191c7d1c47454a"
TEST_MODULE_SHA256 = "62e8c41366d1af1bb5b1b31d44ed9ad51f3248bbc85372cd44188c8b24901194"
TEST_ROWS_SHA256 = "81b996eb8385acafec93be8980dce0a99848d127e26d7ac5dfdd7563e9fea5c2"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    def reject_constant(value):
        raise ValueError(f"Nonfinite JSON value: {value}")
    def unique_keys(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, f"Duplicate JSON key: {key}")
            result[key] = value
        return result
    return json.loads(path.read_text(encoding="utf-8"), parse_constant=reject_constant,
                      object_pairs_hook=unique_keys)


def evidence_path(root, name):
    require(isinstance(name, str) and bool(name), "Invalid evidence path")
    relative = PurePosixPath(name)
    require(not relative.is_absolute() and ".." not in relative.parts and "\\" not in name
            and ":" not in name and str(relative) == name,
            "Escaping or noncanonical evidence path")
    path = root.joinpath(*relative.parts)
    require(path.resolve().is_relative_to(root.resolve()), "Escaping evidence path")
    cursor = path
    while cursor != root:
        require(not cursor.is_symlink(), "Symlink evidence is unsupported")
        cursor = cursor.parent
    require(path.is_file(), f"Missing evidence: {name}")
    return path


def verify_manifest(root, manifest, expected=None):
    require(isinstance(manifest, dict) and bool(manifest), "Empty evidence hash manifest")
    if expected is not None:
        require(set(manifest) == set(expected), "Evidence manifest is incomplete or has extra files")
    for name, hashed in manifest.items():
        require(isinstance(hashed, str) and SHA256.fullmatch(hashed), "Invalid SHA-256")
        require(digest(evidence_path(root, name)) == hashed, f"Modified evidence: {name}")


def checked_rows(rows, label):
    require(isinstance(rows, list) and bool(rows), f"Empty {label} partition")
    ids = []
    for row in rows:
        require(isinstance(row, dict), f"Invalid {label} row")
        identifier = row.get("id")
        require(isinstance(identifier, str) and bool(identifier.strip()), f"Missing {label} id")
        require(isinstance(row.get("source"), str) and bool(row["source"].strip()), f"Missing {label} source")
        require(isinstance(row.get("question"), str) and bool(row["question"].strip()), f"Missing {label} question")
        require(type(row.get("expectedAbstention")) is bool, f"Invalid {label} answerability")
        ids.append(identifier)
    require(len(set(ids)) == len(ids), f"Duplicate {label} ids")
    return rows


def distinct_partitions(parts):
    for i, left in enumerate(parts):
        for right in parts[i + 1:]:
            require(not ({r["id"] for r in left} & {r["id"] for r in right}), "Partition id overlap")
            left_families, right_families = {r.get("family") for r in left}, {r.get("family") for r in right}
            require(not ((left_families & right_families) - {None}), "Partition family overlap")
            require(not ({(r["source"].strip().casefold(), r["question"].strip().casefold()) for r in left}
                         & {(r["source"].strip().casefold(), r["question"].strip().casefold()) for r in right}),
                    "Partition example overlap")


def checked_records(rows, records, scorer, aggregator, label):
    require(isinstance(records, list) and len(records) == len(rows) and bool(records),
            f"Missing or misaligned {label} records")
    for row, record in zip(rows, records, strict=True):
        require(isinstance(record, dict) and record.get("id") == row["id"], f"Misaligned {label} ids")
        require(isinstance(record.get("output"), str), f"Invalid {label} output")
        require(type(record.get("targetTokens")) is int and record["targetTokens"] > 0,
                f"Invalid {label} target token count")
        loss = record.get("targetTokenLoss")
        require(type(loss) in (int, float) and math.isfinite(loss) and loss >= 0,
                f"Invalid {label} loss")
        require(record.get("diagnostics") == scorer(record["output"], row),
                f"Recomputed {label} diagnostics differ from raw output")
    return aggregator(records)


def checked_weights(root, epoch, settings):
    folder = root / f"epoch-{epoch}"
    config = read(evidence_path(root, f"epoch-{epoch}/adapter_config.json"))
    require(config.get("peft_type") == "LORA" and config.get("task_type") == "CAUSAL_LM",
            "Checkpoint is not a causal language-model LoRA")
    require(config.get("r") == settings["rank"] and config.get("lora_alpha") == settings["alpha"],
            "Adapter rank or alpha differs from preregistration")
    required = set(settings.get("targetModules", ["q_proj", "k_proj", "v_proj", "o_proj"]))
    require(isinstance(config.get("target_modules"), list) and set(config["target_modules"]) == required,
            "Adapter target modules differ from preregistration")
    weight_path = evidence_path(root, f"epoch-{epoch}/adapter_model.safetensors")
    with weight_path.open("rb") as handle:
        prefix = handle.read(8)
        require(len(prefix) == 8, "Missing safetensors header")
        size = struct.unpack("<Q", prefix)[0]
        require(2 <= size <= 16 * 1024 * 1024, "Invalid safetensors header size")
        header_bytes = handle.read(size)
        require(len(header_bytes) == size, "Truncated safetensors header")
        header = json.loads(header_bytes)
        length = weight_path.stat().st_size - 8 - size
        tensors = [(name, tensor) for name, tensor in header.items() if name != "__metadata__"]
        require(bool(tensors) and any("lora_A" in name for name, _ in tensors)
                and any("lora_B" in name for name, _ in tensors), "Missing LoRA tensor weights")
        spans = []
        pairs = {}
        seen_modules = set()
        dtype_bytes = {"F32": 4, "F16": 2, "BF16": 2}
        for name, tensor in tensors:
            require("lora_" in name and tensor.get("dtype") in dtype_bytes, "Unexpected adapter tensor")
            shape, offsets = tensor.get("shape"), tensor.get("data_offsets")
            require(isinstance(shape, list) and len(shape) == 2
                    and all(type(n) is int and n > 0 for n in shape), "Invalid LoRA tensor shape")
            match = re.fullmatch(r"(.+)\.lora_([AB])\.weight", name)
            require(match is not None, "Unexpected LoRA tensor name")
            module, arm = match.groups()
            require(module.rsplit(".", 1)[-1] in required, "Unexpected LoRA target module")
            seen_modules.add(module.rsplit(".", 1)[-1])
            require(shape[0 if arm == "A" else 1] == settings["rank"], "LoRA weight rank differs from configuration")
            pairs.setdefault(module, set()).add(arm)
            require(isinstance(offsets, list) and len(offsets) == 2
                    and all(type(n) is int for n in offsets), "Invalid tensor offsets")
            start, end = offsets
            require(0 <= start < end <= length and end - start == math.prod(shape) * dtype_bytes[tensor["dtype"]],
                    "Truncated or mismatched adapter tensor data")
            spans.append((start, end))
        spans.sort()
        require(seen_modules == required and all(arms == {"A", "B"} for arms in pairs.values()),
                "Missing paired LoRA module weights")
        require(spans[0][0] == 0 and spans[-1][1] == length
                and all(a[1] == b[0] for a, b in zip(spans, spans[1:])), "Unaccounted adapter weight bytes")


def verify(root):
    from train_synthetic_lora_v3 import SETTINGS, score, aggregate, gates
    from synthetic_lora_v3_data import datasets
    from prepare_synthetic_lora import MODEL, REVISION

    root = Path(root).resolve()
    report = read(root / "report.json")
    require(report.get("schema") == "diana-original-synthetic-lora-v3", "Unexpected research schema")
    require(report.get("status") in ("completed", "rejected-validation"), "Incomplete research run")
    require(report.get("productionEligible") is False and report.get("educatorReviewed") is False
            and report.get("researchOnly") is True, "Invalid research-only status")
    require(report.get("providerCalls") == 0 and report.get("networkDeniedAtPythonSocketLayer") is True
            and report.get("osNetworkSandboxClaimed") is False, "Unexpected execution provenance")
    files = {path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file()
             and path.relative_to(root).as_posix() != "report.json"}
    verify_manifest(root, report.get("artifactHashes"), files)
    preregistration = read(evidence_path(root, "preregistration.json"))
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
    required_source = {"train_synthetic_lora_v3.py", "synthetic_lora_v3_data.py",
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

    def evaluation(label, rows):
        records = read(evidence_path(root, label + ".json"))
        return records, checked_records(rows, records, score, aggregate, label)

    _, baseline_validation = evaluation("baseline-validation", validation)
    require(baseline_validation == report.get("baselineValidation"), "Baseline validation metric drift")
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
