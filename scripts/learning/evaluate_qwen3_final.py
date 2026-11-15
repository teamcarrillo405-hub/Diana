"""One-use final evaluation after independently reviewed development acceptance.

Freeze never imports final cases. Run requires the reviewed protocol digest,
claims the dataset globally, and performs inference only. Metrics cannot grant
semantic acceptance, educator approval, or production eligibility.
"""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import datetime, timezone
import gc
import importlib.util
import json
import math
import os
from pathlib import Path
import platform
import signal
import subprocess
import sys
import time

import train_qwen3_matched_sft as research
from train_qwen3_4b_research import write_json, deny_network, environment, verify_environment, verify_qualification
from prepare_qwen3_4b_research import MODEL, REVISION, sha256, validate_snapshot, safe_path
from verify_qwen3_4b_research import read, read_lines, require
from grounding_review_v3 import DIMENSIONS, build_packet, digest, unique
from grounding_adjudication import prepare, assess, index

ROOT = Path(__file__).resolve().parents[2]
RESEARCH_ROOT = ROOT / "artifacts/learning-engine/research"
MANIFEST = ROOT / "docs/engineering/qwen3-fresh-test-manifest.json"
AUDIT = ROOT / "docs/engineering/qwen3-fresh-evaluation-content-audit.json"
FINAL_MODULE = ROOT / "scripts/learning/qwen3_fresh_evaluation.py"
MANIFEST_SHA = "6bb02f53190142d3df5a290724b0ce92143a1385a26770da0932c71c3b41ffe8"
AUDIT_SHA = "3641ad7824961bec23e07e190a9585e3aba7aa96a99940b3a7e1f14fb29690d9"
MODULE_SHA = "e5b11cb1972db7b40aa54eead763b1c6ba925c29d15ba506575ec858c4ff8efb"
ROWS_SHA = "0f167df4eebea0ac93a6074a1f2aa074d7a766ba036541665c1320dc261b88c4"
DATASET_ID = "qwen3-fresh-educational-grounding-100-v1"
CLAIM = RESEARCH_ROOT / "qwen3-final-consumption" / (ROWS_SHA + ".json")
SETTINGS = {"seed": research.SETTINGS["seed"], "dtype": "bfloat16", "device": "cuda:0",
    "maxSequence": 768, "maxNewTokens": 128, "maxSeconds": 7200, "threads": 4,
    "attentionImplementation": "eager", "decoding": "greedy", "useCache": True,
    "optimizerSteps": 0, "expectedCasesPerArm": 100, "expectedArms": 3}
SOURCE_FILES = tuple(dict.fromkeys(("evaluate_qwen3_final.py", *research.SOURCE_FILES,
    "verify_qwen3_preference_v2.py", "verify_qwen3_preference.py", "verify_qwen3_grounding_revision.py", "verify_qwen3_final.py", "grounding_review_v3.py", "grounding_adjudication.py")))
ANCESTRY_STAGES = (("diana-qwen3-matched-sft-protocol-v1", 300),
    ("diana-qwen3-preference-protocol-v1", 200),
    ("diana-qwen3-grounding-revision-protocol-v1", 600),
    ("diana-qwen3-grounding-protocol-v1", 440))
ANCESTRY_NAMES = ("qwen3-run-010", "qwen3-run-008", "qwen3-run-007", "qwen3-run-006")


def check_seal():
    for path, expected in ((MANIFEST, MANIFEST_SHA), (AUDIT, AUDIT_SHA), (FINAL_MODULE, MODULE_SHA)):
        safe_path(path)
        require(sha256(path) == expected, "Sealed final evidence changed")
    manifest = read(MANIFEST)
    require(manifest.get("dataset_id") == DATASET_ID and manifest.get("canonical_rows_sha256") == ROWS_SHA
            and manifest.get("source_sha256") == MODULE_SHA and manifest.get("counts", {}).get("total") == 100,
            "Final manifest contract changed")
    audit = manifest.get("independent_content_audit", {})
    require(audit.get("sha256") == AUDIT_SHA and audit.get("findings_open") == 0
            and audit.get("reviewed_case_count") == 100 and audit.get("acceptance_provided_before_reseal") is True,
            "Final content audit is incomplete")
    return manifest


def load_bundle(path):
    bundle = read(path)
    require(bundle.get("schema") == "diana-development-semantic-gate-bundle-v1", "Unknown review bundle")
    roles = set(bundle.get("files", {}))
    require(roles in ({"packet", "key", "first", "second"},
                      {"packet", "key", "first", "second", "disputes", "adjudication"}), "Review role inventory incomplete")
    values = {}
    for role, item in bundle["files"].items():
        filename = Path(item["path"])
        safe_path(filename)
        require(filename.is_absolute() and sha256(filename) == item["sha256"], "Review role file changed: " + role)
        values[role] = read(filename)
    return bundle, values


def check_receipts(bundle, values):
    roles = {"first", "second"} | ({"adjudication"} if "adjudication" in values else set())
    receipts = bundle.get("reviewerReceipts", [])
    require(len(receipts) == len(roles) and {r.get("role") for r in receipts} == roles, "Missing independent blinded-review receipts")
    ids = []
    saved_times = {}
    for receipt in receipts:
        role = receipt["role"]
        require(receipt.get("reviewerId") == values[role].get("reviewerId")
                and receipt.get("reviewFileSha256") == bundle["files"][role]["sha256"], "Reviewer receipt binding changed")
        require(receipt.get("independentlyAuthored") is True and receipt.get("savedBeforeUnblinding") is True,
                "Independent blinded review attestation required")
        saved = datetime.fromisoformat(receipt["savedAtUtc"].replace("Z", "+00:00"))
        require("reviewerUnblindedAtUtc" in receipt, "Declare whether the reviewer was unblinded")
        if receipt["reviewerUnblindedAtUtc"] is None:
            require(receipt.get("stillBlinded") is True, "Null unblinding time requires an explicit still-blinded receipt")
            opened = datetime.fromisoformat(receipt["receiptRecordedAtUtc"].replace("Z", "+00:00"))
        else:
            require(receipt.get("stillBlinded", False) is False, "Unblinding receipt is contradictory")
            opened = datetime.fromisoformat(receipt["reviewerUnblindedAtUtc"].replace("Z", "+00:00"))
        require(saved.utcoffset() is not None and opened.utcoffset() is not None and saved <= opened,
                "Reviewer receipt chronology invalid")
        ids.append(receipt["reviewerId"])
        saved_times[role] = saved
    require(len(set(ids)) == len(ids), "Distinct reviewer identities required")
    if "adjudication" in saved_times:
        require(saved_times["adjudication"] >= max(saved_times[role] for role in ("first", "second")),
                "Adjudication must follow both saved primary reviews")


def bind_packet(packet, key, rows, baseline, adapter, report_sha, selected_epoch):
    expected_packet, _ = build_packet(rows, baseline, adapter, report_sha, "validation", selected_epoch)
    require(packet.get("partition") == "validation" and packet.get("reportSha256") == report_sha
            and packet.get("diagnosticEpoch") == selected_epoch and packet.get("dimensions") == list(DIMENSIONS)
            and packet.get("schema") == expected_packet["schema"] and packet.get("productionEligible") is False
            and packet.get("instructions") == expected_packet["instructions"],
            "Semantic packet is not bound to the selected development run")
    cases, mappings, base, tuned, original = map(unique, (packet["cases"], key["cases"], baseline, adapter, rows))
    require(len(cases) == 48 and cases.keys() == mappings.keys() == base.keys() == tuned.keys() == original.keys(),
            "Semantic packet does not cover all development outputs")
    for identifier, case in cases.items():
        row = original[identifier]
        require(case.get("source") == row["source"] and case.get("question") == row["question"], "Semantic evidence changed")
        require(case.get("subject") == row.get("subject", "unspecified")
                and case.get("level") == row.get("level", "unspecified")
                and case.get("answerability") == row.get("answerability", "insufficient" if row["expectedAbstention"] else "answerable"),
                "Semantic case annotation changed")
        for arm in ("A", "B"):
            mapped = mappings[identifier].get(arm)
            require(mapped in ("base", "adapter"), "Unrecognized arm")
            expected = base[identifier] if mapped == "base" else tuned[identifier]
            require(case.get("response" + arm) == expected["output"], "Semantic response differs from selected checkpoint")


def semantic_gate(bundle, values, rows, baseline, adapter, report_sha, selected_epoch):
    check_receipts(bundle, values)
    packet, key, first, second = (values[name] for name in ("packet", "key", "first", "second"))
    bind_packet(packet, key, rows, baseline, adapter, report_sha, selected_epoch)
    dispute_packet, originals = prepare(packet, key, first, second)
    if dispute_packet["disputes"]:
        require("adjudication" in values and "disputes" in values, "Disputes require a third independent blinded reviewer")
        resolved = assess(packet, key, first, second, values["disputes"], values["adjudication"])
        ratings = resolved["finalRatings"]
    else:
        require("adjudication" not in values, "No adjudication permitted without disputed dimensions")
        resolved, ratings = originals[0], first["ratings"]
    first_index, second_index, final_index = (index(item) for item in (first["ratings"], second["ratings"], ratings))
    mapping = unique(key["cases"])
    passes, fabricated, agreed_failures = 0, 0, []
    dimension_counts = {name: 0 for name in DIMENSIONS}
    for row in rows:
        arm = next(arm for arm in ("A", "B") if mapping[row["id"]][arm] == "adapter")
        identity = (row["id"], arm)
        one, two, final = first_index[identity], second_index[identity], final_index[identity]
        agreed_failure = not all(one[d] for d in DIMENSIONS) and not all(two[d] for d in DIMENSIONS)
        if agreed_failure:
            agreed_failures.append(row["id"])
        # Never let adjudication erase a case both reviewers rejected overall.
        passes += int(all(final[d] for d in DIMENSIONS) and not agreed_failure)
        fabricated += int(not final["noFabricatedClaims"])
        for name in DIMENSIONS:
            dimension_counts[name] += int(final[name])
    require(passes * 100 >= 95 * 48 and fabricated == 0, "Development semantic gate below 95% or contains fabricated responses")
    return {"cases": 48, "completePasses": passes, "completePassRate": passes / 48,
        "fabricatedResponses": fabricated, "dimensionPassCounts": dimension_counts,
        "agreedFailureCaseIds": agreed_failures, "originalReviews": originals,
        "resolvedReview": resolved, "developmentSemanticGatePassed": True,
        "reviewerIndependenceVerifiedBySoftware": False, "receiptChronologyVerifiedBySoftware": False,
        "productionEligible": False, "educatorQualificationVerified": False}


def verified_development(run, bundle_path):
    from verify_qwen3_matched_sft import verify
    checked = verify(run)
    require(checked.get("verified") is True and checked.get("automaticEligibilityPassed") is True
            and type(checked.get("selectedEpoch")) is int and checked["selectedEpoch"] == 3,
            "An automatically eligible selected development adapter is required")
    selection = read(run / "selection.json")
    require(selection.get("savedAdapterOutputsIdentical") is True, "Selected development adapter reload was not verified")
    epoch = checked["selectedEpoch"]
    bundle, values = load_bundle(bundle_path)
    summary = semantic_gate(bundle, values, read(run / "development.json"), read_lines(run / "baseline-development.jsonl"),
        read_lines(run / f"epoch-{epoch}-development.jsonl"), checked["reportSha256"], epoch)
    return checked, bundle, values, summary


def training_ancestry(development_run):
    """Bind all four generations' training and development inputs, without final cases."""
    inventory, known, seen = [], [], set()
    root, expected_protocol_hash = development_run, None
    for position, (schema, train_count) in enumerate(ANCESTRY_STAGES):
        safe_path(root)
        require(root.is_absolute() and root.resolve().is_relative_to(RESEARCH_ROOT.resolve()),
                "Training ancestry must stay within this checkout's research directory")
        require(root.name == ANCESTRY_NAMES[position], "Training ancestry run identity changed")
        require(root.resolve() not in seen, "Cyclic training ancestry")
        seen.add(root.resolve())
        protocol_hash = sha256(root / "protocol.json")
        if expected_protocol_hash is not None:
            require(protocol_hash == expected_protocol_hash, "Training ancestor protocol differs from its child's binding")
        protocol = read(root / "protocol.json")
        require(protocol.get("schema") == schema, "Training ancestry schema or depth changed")
        train, development = read(root / "train.json"), read(root / "development.json")
        require(isinstance(train, list) and len(train) == train_count and protocol.get("trainCount") == train_count
                and isinstance(development, list) and len(development) == 48 and protocol.get("developmentCount") == 48,
                "Training ancestry row inventory changed")
        hashes = {name: sha256(root / name) for name in ("train.json", "development.json")}
        require(all(protocol.get("frozenFiles", {}).get(name) == value for name, value in hashes.items()),
                "Training ancestor data differs from its frozen protocol")
        inventory.append({"root": str(root), "protocolSha256": protocol_hash,
            "trainSha256": hashes["train.json"], "developmentSha256": hashes["development.json"],
            "trainRows": len(train), "developmentRows": len(development)})
        known.extend(train)
        known.extend(development)
        parent = protocol.get("parent")
        if position == len(ANCESTRY_STAGES) - 1:
            require(parent is None, "Unexpected additional training ancestor")
        else:
            require(isinstance(parent, dict) and isinstance(parent.get("root"), str)
                    and isinstance(parent.get("files", {}).get("protocol.json"), str),
                    "Missing training ancestor binding")
            root = Path(parent["root"])
            expected_protocol_hash = parent["files"]["protocol.json"]
    return inventory, known


def comparison_exposure(development_run):
    """Bind run 009's same-data comparison exposure separately from fitting parents."""
    require(development_run.is_absolute() and development_run.name == "qwen3-run-010"
            and development_run.resolve().is_relative_to(RESEARCH_ROOT.resolve()),
            "Comparison exposure requires the local matched development run")
    protocol = read(development_run / "protocol.json")
    require(protocol.get("schema") == ANCESTRY_STAGES[0][0], "Comparison development schema changed")
    copied_path = development_run / "comparator-evidence.json"
    receipt_path = development_run / "comparator-verification.json"
    copied = read(copied_path)
    require(copied == protocol.get("comparator")
            and sha256(copied_path) == protocol.get("comparatorEvidenceSha256")
            == protocol.get("frozenFiles", {}).get("comparator-evidence.json"),
            "Committed comparison evidence changed")
    require(sha256(receipt_path) == research.COMPARATOR_RECEIPT_HASH
            == protocol.get("frozenFiles", {}).get("comparator-verification.json")
            == copied.get("verificationReceiptSha256"), "Comparison verification receipt changed")
    sibling = development_run.parent / "qwen3-run-009"
    safe_path(sibling)
    require(Path(copied.get("root", "")).resolve() == sibling.resolve()
            and copied.get("sameTrainingData") is True and copied.get("initializationAncestor") is False,
            "Comparison sibling identity or exposure role changed")
    require(sha256(sibling / "protocol.json") == research.COMPARATOR_PROTOCOL_HASH
            == copied.get("protocolSha256")
            and sha256(sibling / "report.json") == research.COMPARATOR_REPORT_HASH
            == copied.get("reportSha256"), "Immutable comparison report/protocol changed")
    sibling_protocol = read(sibling / "protocol.json")
    require(sibling_protocol.get("schema") == "diana-qwen3-evidence-integrity-protocol-v1"
            and sibling_protocol.get("trainCount") == 300 and sibling_protocol.get("developmentCount") == 48,
            "Comparison population or schema changed")
    train, development = read(sibling / "train.json"), read(sibling / "development.json")
    require(isinstance(train, list) and len(train) == 300 and isinstance(development, list) and len(development) == 48,
            "Comparison row population changed")
    hashes = {name: sha256(sibling / name) for name in ("train.json", "development.json")}
    for name, value in hashes.items():
        require(value == sibling_protocol.get("frozenFiles", {}).get(name)
                == copied.get("files", {}).get(name), "Comparison data differs from committed input")
    require(train == read(development_run / "train.json")
            and development == read(development_run / "development.json")
            and research.canonical_hash(train) == research.TRAINING_HASH
            and research.canonical_hash(development) == research.DEVELOPMENT_HASH,
            "Comparison no longer reuses the exact matched training and development rows")
    exposure = {"schema": "diana-qwen3-final-comparison-exposure-v1", "root": str(sibling),
        "reportSha256": research.COMPARATOR_REPORT_HASH, "protocolSha256": research.COMPARATOR_PROTOCOL_HASH,
        "verificationReceiptSha256": research.COMPARATOR_RECEIPT_HASH,
        "trainSha256": hashes["train.json"], "developmentSha256": hashes["development.json"],
        "trainRows": 300, "developmentRows": 48, "trainingCanonicalSha256": research.TRAINING_HASH,
        "developmentCanonicalSha256": research.DEVELOPMENT_HASH,
        "sameTrainingData": True, "initializationAncestor": False}
    return exposure, train + development


def freeze(output, run, bundle_path):
    import torch
    checked, bundle, values, summary = verified_development(run, bundle_path)
    check_seal()  # Opaque module hashing only; never import final rows here.
    protocol = read(run / "protocol.json")
    contract = read(run / "environment-contract.json")
    verify_environment(environment(torch), contract)
    verify_qualification(contract)
    model_root = Path(protocol["modelRoot"])
    validate_snapshot(model_root)
    require(protocol["system"] == research.SYSTEM and protocol["systemSha256"] == research.SYSTEM_HASH,
            "Final evaluation must retain selected development prompt")
    ancestry, _ = training_ancestry(run)
    exposure, _ = comparison_exposure(run)
    require(not CLAIM.exists(), "This final dataset was already claimed for model evaluation")
    safe_path(output)
    require(output.resolve().is_relative_to(RESEARCH_ROOT.resolve())
            and all(not output.resolve().is_relative_to(Path(item["root"]).resolve()) for item in [*ancestry, exposure]),
            "Final output must be a new research directory outside preserved training ancestry")
    output.mkdir(parents=True, exist_ok=False)
    (output / "source").mkdir()
    for name in SOURCE_FILES:
        (output / "source" / name).write_bytes(Path(__file__).with_name(name).read_bytes())
    for name, source in (("environment-contract.json", run / "environment-contract.json"),
                         ("qualification.json", run / "qualification.json"), ("model-provenance.json", run / "model-provenance.json"),
                         ("final-manifest.json", MANIFEST), ("final-content-audit.json", AUDIT),
                         ("development-review-bundle.json", bundle_path)):
        (output / name).write_bytes(source.read_bytes())
    (output / "gate-inputs").mkdir()
    for role, item in bundle["files"].items():
        (output / "gate-inputs" / (role + ".json")).write_bytes(Path(item["path"]).read_bytes())
    write_json(output / "development-semantic-gate.json", summary)
    write_json(output / "comparison-exposure.json", exposure)
    epoch = checked["selectedEpoch"]
    names = ("report.json", "protocol.json", "selection.json", "supervisor-artifact-manifest.json",
             "comparator-evidence.json", "comparator-verification.json",
             f"epoch-{epoch}/adapter_config.json", f"epoch-{epoch}/adapter_model.safetensors")
    frozen = {p.relative_to(output).as_posix(): sha256(p) for p in output.rglob("*") if p.is_file()}
    final = {"schema": "diana-qwen3-final-protocol-v1", "createdAt": datetime.now(timezone.utc).isoformat(),
        "model": MODEL, "revision": REVISION, "modelRoot": str(model_root), "settings": SETTINGS,
        "system": research.SYSTEM, "systemSha256": research.SYSTEM_HASH,
        "developmentRun": str(run), "selectedEpoch": epoch, "reviewBundle": str(bundle_path),
        "developmentFiles": {name: sha256(run / name) for name in names},
        "trainingAncestry": ancestry,
        "comparisonExposure": exposure, "comparisonExposureSha256": sha256(output / "comparison-exposure.json"),
        "frozenFiles": frozen, "environment": environment(torch), "datasetId": DATASET_ID,
        "finalModuleSha256": MODULE_SHA, "finalRowsSha256": ROWS_SHA,
        "finalManifestSha256": MANIFEST_SHA, "finalContentAuditSha256": AUDIT_SHA,
        "globalConsumptionClaim": str(CLAIM), "testOpened": False, "testEvaluations": 0,
        "developmentSemanticGatePassed": True, "finalSemanticQualityValidated": False,
        "productionEligible": False, "educatorReviewed": False, "researchOnly": True,
        "limitations": ["Final content audit is machine review with disclosed historical development exposure",
            "Blinding and independence rely on recorded reviewer attestations and external coordination evidence"]}
    write_json(output / "protocol.json", final)
    return {"protocolSha256": sha256(output / "protocol.json"), "testOpened": False, "productionEligible": False}


def verify_frozen(output, expected_hash):
    require(sha256(output / "protocol.json") == expected_hash, "Reviewed final protocol changed")
    protocol = read(output / "protocol.json")
    require(protocol.get("schema") == "diana-qwen3-final-protocol-v1" and protocol.get("settings") == SETTINGS
            and protocol.get("system") == research.SYSTEM and protocol.get("systemSha256") == research.SYSTEM_HASH
            and type(protocol.get("selectedEpoch")) is int and protocol.get("selectedEpoch") == 3
            and protocol.get("productionEligible") is False
            and protocol.get("finalSemanticQualityValidated") is False, "Frozen evaluation contract changed")
    for name, value in protocol["frozenFiles"].items():
        require(not Path(name).is_absolute() and ".." not in Path(name).parts, "Escaping frozen artifact")
        require(sha256(output / name) == value, "Frozen evaluation input changed: " + name)
    for name in SOURCE_FILES:
        require(sha256(Path(__file__).with_name(name)) == sha256(output / "source" / name), "Evaluator dependency changed")
    run = Path(protocol["developmentRun"])
    for name, value in protocol["developmentFiles"].items():
        require(sha256(run / name) == value, "Selected development evidence changed")
    ancestry, _ = training_ancestry(run)
    require(ancestry == protocol.get("trainingAncestry"), "Frozen training ancestry changed")
    exposure, _ = comparison_exposure(run)
    require(exposure == protocol.get("comparisonExposure") == read(output / "comparison-exposure.json")
            and sha256(output / "comparison-exposure.json") == protocol.get("comparisonExposureSha256"),
            "Frozen comparison exposure changed")
    require(sha256(Path(protocol["reviewBundle"])) == sha256(output / "development-review-bundle.json"), "Review bundle changed")
    checked, _, _, summary = verified_development(run, Path(protocol["reviewBundle"]))
    require(checked["selectedEpoch"] == protocol["selectedEpoch"] and summary == read(output / "development-semantic-gate.json"),
            "Recomputed development acceptance changed")
    check_seal()
    return protocol


def claim_once(output, expected_hash):
    safe_path(CLAIM)
    CLAIM.parent.mkdir(parents=True, exist_ok=True)
    claim = {"datasetId": DATASET_ID, "rowsSha256": ROWS_SHA, "output": str(output),
        "protocolSha256": expected_hash, "claimedAt": datetime.now(timezone.utc).isoformat(),
        "claimedBeforeFinalImport": True, "productionEligible": False}
    write_json(CLAIM, claim)  # Exclusive creation enforces one attempt across output directories.
    write_json(output / "started.json", claim)


def validate_final_rows(rows, development_run):
    require(isinstance(rows, list) and len(rows) == 100 and len(unique(rows)) == 100, "Final case inventory changed")
    require(digest(rows) == ROWS_SHA, "Final canonical rows changed")
    require(Counter(row["expectedAbstention"] for row in rows) == {False: 60, True: 40}, "Final answerability distribution changed")
    _, ancestry_rows = training_ancestry(development_run)
    _, comparison_rows = comparison_exposure(development_run)
    def counts(known):
        return {"ids": len({r["id"] for r in rows} & {r["id"] for r in known}),
            "sources": len({r["source"] for r in rows} & {r["source"] for r in known}),
            "sourceQuestionPairs": len({(r["source"], r["question"]) for r in rows} & {(r["source"], r["question"]) for r in known})}
    combined = counts(ancestry_rows + comparison_rows)
    require(not any(combined.values()), "Final/train/development/comparison overlap detected")
    return {**combined, "fittingAncestry": counts(ancestry_rows), "comparisonExposure": counts(comparison_rows)}


def open_final_once(output, protocol_hash):
    require(read(CLAIM).get("protocolSha256") == protocol_hash and read(CLAIM).get("output") == str(output), "Missing dataset consumption claim")
    write_json(output / "final-opened.json", {"openedAt": datetime.now(timezone.utc).isoformat(), "moduleSha256": MODULE_SHA})
    check_seal()
    spec = importlib.util.spec_from_file_location("diana_sealed_final_execution", FINAL_MODULE)
    require(spec is not None and spec.loader is not None, "Cannot load the sealed evaluation module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.rows()


def execute(output, expected_hash):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    protocol = verify_frozen(output, expected_hash)
    contract = read(output / "environment-contract.json")
    verify_environment(environment(torch), contract)
    verify_qualification(contract)
    snapshot = validate_snapshot(Path(protocol["modelRoot"]))
    require(sha256(Path(protocol["modelRoot"]) / "model-provenance.json") == sha256(output / "model-provenance.json"), "Base provenance changed")
    write_json(output / "worker-started.json", {"protocolSha256": expected_hash})
    rows = open_final_once(output, expected_hash)
    overlap = validate_final_rows(rows, Path(protocol["developmentRun"]))
    write_json(output / "overlap-counts.json", overlap)
    write_json(output / "final-rows.json", rows)
    tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False)
    encoded = [research.token_ids(tokenizer, row) for row in rows]
    write_json(output / "tokenization.json", encoded)
    torch.set_num_threads(SETTINGS["threads"])
    torch.set_num_interop_threads(1)
    torch.manual_seed(SETTINGS["seed"])
    torch.cuda.manual_seed_all(SETTINGS["seed"])
    torch.use_deterministic_algorithms(True)
    torch.backends.cudnn.benchmark = False
    torch.backends.cudnn.deterministic = True
    started = time.monotonic()
    def load_base():
        model = AutoModelForCausalLM.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False,
            dtype=torch.bfloat16, attn_implementation="eager").to("cuda:0")
        model.generation_config.do_sample = False
        model.generation_config.temperature = None
        model.generation_config.top_k = None
        model.generation_config.top_p = None
        return model
    def evaluate(model, label):
        model.eval()
        model.gradient_checkpointing_disable()
        model.config.use_cache = True
        records = []
        with (output / (label + ".jsonl")).open("x", encoding="utf-8") as stream, torch.inference_mode():
            for row, item in zip(rows, encoded, strict=True):
                require(time.monotonic() - started <= SETTINGS["maxSeconds"], "Final evaluation runtime limit")
                inputs = torch.tensor([item["full"]], dtype=torch.long, device="cuda:0")
                labels = torch.tensor([item["labels"]], dtype=torch.long, device="cuda:0")
                loss = float(model(input_ids=inputs, attention_mask=torch.ones_like(inputs), labels=labels).loss)
                require(math.isfinite(loss) and loss >= 0 and item["targetTokens"] > 0, "Nonfinite final loss or missing target tokens")
                prefix = torch.tensor([item["prefix"]], dtype=torch.long, device="cuda:0")
                generated = model.generate(input_ids=prefix, attention_mask=torch.ones_like(prefix), max_new_tokens=128,
                    do_sample=False, use_cache=True, pad_token_id=tokenizer.eos_token_id)
                token_values = generated[0][len(item["prefix"]):].tolist()
                response = tokenizer.decode(token_values, skip_special_tokens=True)
                record = {"id": row["id"], "output": response, "generatedTokenIds": token_values,
                    "targetTokenLoss": loss, "targetTokens": item["targetTokens"], "diagnostics": research.score(response, row)}
                stream.write(json.dumps(record, ensure_ascii=False, allow_nan=False) + "\n")
                stream.flush()
                os.fsync(stream.fileno())
                records.append(record)
        metrics = research.aggregate(read_lines(output / (label + ".jsonl")), rows)
        write_json(output / (label + "-metrics.json"), metrics)
        print(json.dumps({"phase": label, "completedCases": len(records)}), flush=True)
        return records, metrics
    model = load_base()
    _, base_metrics = evaluate(model, "baseline-final")
    adapter = Path(protocol["developmentRun"]) / f"epoch-{protocol['selectedEpoch']}"
    model = PeftModel.from_pretrained(model, adapter, local_files_only=True, is_trainable=False)
    adapted, adapter_metrics = evaluate(model, "adapter-final")
    del model
    gc.collect()
    torch.cuda.empty_cache()
    model = PeftModel.from_pretrained(load_base(), adapter, local_files_only=True, is_trainable=False)
    reloaded, reload_metrics = evaluate(model, "reload-final")
    require(len(adapted) == len(reloaded) == 100 and all(a["id"] == b["id"] and a["output"] == b["output"]
        and a["generatedTokenIds"] == b["generatedTokenIds"] for a, b in zip(adapted, reloaded, strict=True)), "Saved final adapter reproduction changed")
    del model
    verify_frozen(output, expected_hash)
    validate_snapshot(Path(protocol["modelRoot"]))
    report = {"schema": "diana-qwen3-final-evaluation-v1", "status": "awaiting-independent-final-semantic-review",
        "protocolSha256": expected_hash, "selectedEpoch": protocol["selectedEpoch"], "finalCases": 100,
        "testOpened": True, "testEvaluations": 1, "forwardPassArms": 3, "optimizerSteps": 0,
        "savedAdapterOutputsIdentical": True, "baseline": base_metrics, "adapter": adapter_metrics, "reload": reload_metrics,
        "mechanicalMetricsOnly": True, "finalSemanticQualityValidated": False, "productionEligible": False,
        "educatorReviewed": False, "researchOnly": True, "providerCalls": 0,
        "elapsedSeconds": time.monotonic() - started,
        "limitations": ["One authored convenience sample", "Mechanical metrics cannot establish semantic success", "No verified educator approval, population guarantee, or learner-outcome evidence"],
        "artifactHashes": {p.relative_to(output).as_posix(): sha256(p) for p in output.rglob("*") if p.is_file() and p.name != "execution.log"}}
    write_json(output / "report.json", report)
    write_json(output / "completion.json", {"reportSha256": sha256(output / "report.json"), "productionEligible": False})


class SupervisorInterrupted(RuntimeError):
    pass


def stop_owned_process(child):
    if child is None:
        return
    if child.poll() is None:
        try:
            os.killpg(child.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            child.wait(timeout=10)
    else:
        child.wait(timeout=10)


def run_supervised(output, expected_hash):
    """Reap our process group on timeout, Ctrl+C, SIGTERM, or launch failure."""
    command = [sys.executable, str(Path(__file__).resolve()), "_worker", "--output", str(output), "--protocol-sha256", expected_hash]
    previous = {sig: signal.getsignal(sig) for sig in (signal.SIGINT, signal.SIGTERM)}
    def interrupted(signum, _frame):
        raise SupervisorInterrupted("Supervisor received signal " + str(signum))
    child = None
    try:
        for sig in previous:
            signal.signal(sig, interrupted)
        with (output / "execution.log").open("x", encoding="utf-8") as log:
            child = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT,
                env={**os.environ, "DIANA_FINAL_SUPERVISED": "1"}, start_new_session=True)
            result = child.wait(timeout=SETTINGS["maxSeconds"])
        require(result == 0, "Final evaluation worker exited unsuccessfully")
        write_json(output / "supervisor-artifact-manifest.json", {"productionEligible": False,
            "files": {p.relative_to(output).as_posix(): sha256(p) for p in output.rglob("*") if p.is_file()}})
    except BaseException as error:
        for sig in previous:
            signal.signal(sig, signal.SIG_IGN)
        cleanup_error = None
        try:
            stop_owned_process(child)
        except BaseException as cleanup:
            cleanup_error = type(cleanup).__name__
        reason = ("launch-error" if child is None else "runtime-limit" if isinstance(error, subprocess.TimeoutExpired)
                  else "supervisor-interrupted" if isinstance(error, (KeyboardInterrupt, SupervisorInterrupted, SystemExit)) else "worker-error")
        if not (output / "interrupted.json").exists():
            write_json(output / "interrupted.json", {"reason": reason, "errorType": type(error).__name__,
                "cleanupErrorType": cleanup_error, "productionEligible": False, "retryPermitted": False})
        raise
    finally:
        for sig, handler in previous.items():
            signal.signal(sig, handler)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("freeze", "run", "_worker"))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--development-run", type=Path)
    parser.add_argument("--review-bundle", type=Path)
    parser.add_argument("--protocol-sha256")
    args = parser.parse_args()
    os.environ.update(research.OFFLINE)
    output = args.output.absolute()
    safe_path(output)
    if args.action == "freeze":
        if args.development_run is None or args.review_bundle is None:
            parser.error("freeze requires --development-run and --review-bundle")
        with deny_network():
            print(json.dumps(freeze(output, args.development_run.absolute(), args.review_bundle.absolute())))
    elif args.action == "run":
        require(args.protocol_sha256 and platform.system() == "Linux", "Reviewed protocol and qualified Linux supervisor required")
        with deny_network():
            verify_frozen(output, args.protocol_sha256)
        require(not (output / "execution.log").exists() and not (output / "started.json").exists(), "This frozen final run was already attempted")
        claim_once(output, args.protocol_sha256)
        run_supervised(output, args.protocol_sha256)
    else:
        require(os.environ.get("DIANA_FINAL_SUPERVISED") == "1", "Use the bounded run supervisor")
        with deny_network():
            execute(output, args.protocol_sha256)


if __name__ == "__main__":
    main()
