"""Frozen development-only Qwen3 revision; formal gates are not semantic acceptance.

Continue the verified run-006 epoch-one research adapter with new independently
reviewed original examples. Never import or evaluate final cases in this runner.
"""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import datetime, timezone
import gc
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import random
import signal
import subprocess
import sys
import time

import train_qwen3_4b_research as initial
from train_qwen3_4b_research import (canonical_hash, write_json, read_json, deny_network,
    environment, verify_environment, verify_qualification)
from prepare_qwen3_4b_research import MODEL, REVISION, sha256, validate_snapshot, safe_path
from synthetic_lora_v4_development import datasets as original_datasets, SYSTEM as ORIGINAL_SYSTEM

SYSTEM = ORIGINAL_SYSTEM + (
    " Do not imply that an instance, violation, result, or resolving record exists unless SOURCE establishes it. "
    "Use conditional language when appropriate. Attend to the specific question asked about SOURCE; "
    "a stated action or limitation can be supported even when an outcome is unknown. "
    "When evidence is missing, ask for a specific way to obtain or check it without merely repeating the learner's question."
)
SETTINGS = {"epochs": 2, "learningRate": 0.00002, "rank": 16, "alpha": 32,
    "gradientAccumulation": 4, "batchSize": 1, "seed": 69177, "gradientClip": 1.0,
    "weightDecay": 0.01, "maxSequence": 768, "maxNewTokens": 128, "maxSeconds": 7200,
    "threads": 4, "targetModules": ["q_proj", "k_proj", "v_proj", "o_proj"],
    "dropout": 0.0, "dtype": "bfloat16", "optimizer": "AdamW",
    "gradientCheckpointing": True, "attentionImplementation": "eager", "decoding": "greedy",
    "formalEligibilityThreshold": 0.95, "semanticAcceptanceTarget": 0.95}
SYSTEM_HASH = hashlib.sha256(SYSTEM.encode()).hexdigest()
DEVELOPMENT_HASH = "a76d8bcb1735b9b721308cd925dfa187d44af4481c799307971e82e9f2b3aad5"
PARENT_REPORT_HASH = "cfa06bdc14f8c9041a364f0612cae13eade9c462e231492197bf66e886e25943"
PARENT_PROTOCOL_HASH = "2ff6ce808c9e8bcf1d133831e37e20d90c6d5dff5535bd6ef014fbf160f9d6f8"
DATA_MODULES = ("qwen3_grounding_revision_a.py", "qwen3_grounding_revision_b.py")
SOURCE_FILES = ("train_qwen3_grounding_revision.py", "train_qwen3_4b_research.py",
    "verify_qwen3_4b_research.py", "prepare_qwen3_4b_research.py", "synthetic_lora_v4_development.py",
    "synthetic_lora_v4_data.py", "synthetic_lora_v3_data.py", *DATA_MODULES)
OFFLINE = {**initial.OFFLINE, "PYTHONHASHSEED": str(SETTINGS["seed"])}
score = initial.score


def aggregate(records, rows):
    result = initial.aggregate(records, rows)
    diagnostics = [score(record["output"], row) for record, row in zip(records, rows, strict=True)]
    result["formalCounts"] = {
        "correctAnswerability": sum(int(d["expectedAbstentionMatched"]) for d in diagnostics),
        "exactQuoteOrWarrantedAbstention": sum(int(d["exactSourceQuoteOrAbstention"] and d["expectedAbstentionMatched"]) for d in diagnostics),
        "twoLinesAndOneQuestion": sum(int(d["twoLineFormat"] and d["oneQuestion"]) for d in diagnostics),
        "unsupportedAnswer": sum(int(d["unsupportedAnswer"]) for d in diagnostics),
    }
    result["formalRates"] = {key: value / len(rows) for key, value in result["formalCounts"].items()}
    result["slices"] = {}
    for label, expected in (("supported", False), ("insufficient", True)):
        indices = [index for index, row in enumerate(rows) if row["expectedAbstention"] is expected]
        if not indices:
            raise ValueError("Both answerability slices are required")
        result["slices"][label] = initial.aggregate([records[i] for i in indices], [rows[i] for i in indices])
    return result


def gates(base, candidate):
    if base["cases"] != 48 or candidate["cases"] != 48:
        raise ValueError("Development population drift")
    if any(not math.isfinite(item["targetTokenLoss"]) or item["targetTokenLoss"] < 0 for item in (base, candidate)):
        raise ValueError("Invalid target loss")
    counts = candidate["formalCounts"]
    return {"answerabilityAtLeast95Percent": counts["correctAnswerability"] / 48 >= .95,
        "exactQuoteOrWarrantedAbstentionAtLeast95Percent": counts["exactQuoteOrWarrantedAbstention"] / 48 >= .95,
        "formatAtLeast95Percent": counts["twoLinesAndOneQuestion"] / 48 >= .95,
        "zeroUnsupportedAnswers": counts["unsupportedAnswer"] == 0,
        "lossNonRegressionAgainstUntouchedBase": candidate["targetTokenLoss"] <= base["targetTokenLoss"]}


def select_candidate(candidates):
    if [item["epoch"] for item in candidates] != [1, 2]:
        raise ValueError("Both fixed epochs must complete")
    eligible = [item for item in candidates if item["gates"] and all(item["gates"].values())]
    return min(eligible, key=lambda item: (item["metrics"]["targetTokenLoss"], item["epoch"])) if eligible else None


def development_rows():
    _, rows = original_datasets()
    if len(rows) != 48 or canonical_hash(rows) != DEVELOPMENT_HASH:
        raise ValueError("Original development annotations changed")
    return rows


def validate_training(rows, development):
    if len(rows) != 600 or len({row["id"] for row in rows}) != 600:
        raise ValueError("Exactly 600 unique original records required")
    if Counter(row["expectedAbstention"] for row in rows) != {True: 300, False: 300}:
        raise ValueError("Training answerability balance changed")
    contexts = Counter(row["source"] for row in rows)
    if len(contexts) != 200 or set(contexts.values()) != {3}:
        raise ValueError("Require 200 distinct contexts with three questions each")
    if len(Counter(row["subject"] for row in rows)) != 5 or set(Counter(row["subject"] for row in rows).values()) != {120}:
        raise ValueError("Five equally represented subjects required")
    for subject in {row["subject"] for row in rows}:
        if Counter(row["expectedAbstention"] for row in rows if row["subject"] == subject) != {True: 60, False: 60}:
            raise ValueError("Subject answerability imbalance")
    if {row["source"] for row in rows} & {row["source"] for row in development}:
        raise ValueError("Training/development context overlap")
    if len({(row["source"], row["question"]) for row in rows}) != 600:
        raise ValueError("Question contrast duplicated")
    for row in rows:
        if type(row["expectedAbstention"]) is not bool or not row["acceptedQuotes"] and not row["expectedAbstention"]:
            raise ValueError("Incomplete answerability annotation")
        if not score(row["target"], row)["groundedCasePass"]:
            raise ValueError("Target violates existing diagnostic contract: " + row["id"])
    return rows, development


def validated_data():
    from qwen3_grounding_revision_a import rows as authored_a
    from qwen3_grounding_revision_b import rows as authored_b
    first, second = authored_a(), authored_b()
    if len(first) != 300 or len(second) != 300:
        raise ValueError("Both independent authored partitions must contain 300 rows")
    for partition in (first, second):
        contexts = Counter(row["source"] for row in partition)
        if len(contexts) != 100 or set(contexts.values()) != {3} or Counter(row["expectedAbstention"] for row in partition) != {True: 150, False: 150}:
            raise ValueError("Each independent partition requires 100 contexts and 150/150 answerability")
    return validate_training(first + second, development_rows())


def validate_audit(audit, train):
    if audit.get("schema") != "diana-qwen3-training-revision-audit-v1" or audit.get("approvedForTraining") is not True or audit.get("independentReviewer") is not True:
        raise ValueError("Independent full training audit approval required")
    if audit.get("educatorReviewed") is not False or audit.get("unresolvedFindings") != []:
        raise ValueError("Audit must retain machine review limits and resolve findings")
    if audit.get("trainingCanonicalSha256") != canonical_hash(train):
        raise ValueError("Audit does not cover current training rows")
    reviews = audit.get("caseReviews", [])
    if len(reviews) != 600 or {r["id"] for r in reviews} != {r["id"] for r in train} or any(r.get("passed") is not True for r in reviews):
        raise ValueError("Every training record requires an independent passing review")
    if audit.get("sourceSha256") != {name: sha256(Path(__file__).with_name(name)) for name in DATA_MODULES}:
        raise ValueError("Authored source changed after audit")
    if not audit.get("evidenceFiles"):
        raise ValueError("Independent audit evidence is missing")
    for name, digest in audit["evidenceFiles"].items():
        path = Path(name)
        safe_path(path)
        if not path.is_absolute() or sha256(path) != digest:
            raise ValueError("Independent audit evidence changed")


def parent_evidence(root):
    from verify_qwen3_4b_research import verify
    if root.name != "qwen3-run-006" or sha256(root / "report.json") != PARENT_REPORT_HASH or sha256(root / "protocol.json") != PARENT_PROTOCOL_HASH:
        raise ValueError("Only the immutable run-006 parent is permitted")
    verified = verify(root)
    candidates = verified["candidates"]
    if not verified["verified"] or verified["testOpened"] is not False or verified["productionEligible"] is not False:
        raise ValueError("Parent research evidence did not verify")
    if [c["epoch"] for c in candidates] != [1, 2] or candidates[0]["metrics"]["counts"]["groundedCasePass"] <= candidates[1]["metrics"]["counts"]["groundedCasePass"]:
        raise ValueError("Prespecified epoch-one stronger diagnostic parent rule not satisfied")
    report = read_json(root / "report.json")
    if report["schema"] != "diana-qwen3-grounding-development-v1" or report["status"] != "rejected-development":
        raise ValueError("Only preserved rejected run-006 research parent is permitted")
    names = ("report.json", "protocol.json", "selection.json", "completion.json", "supervisor-artifact-manifest.json",
        "model-provenance.json", "epoch-1/adapter_model.safetensors", "epoch-1/adapter_config.json", "epoch-1-development.jsonl")
    return {"root": str(root), "epoch": 1, "selectionRule": "Prespecified stronger original groundedCasePass count; research parent only",
        "files": {name: sha256(root / name) for name in names}, "verified": verified}


def assert_identical_outputs(original, reproduced):
    if len(original) != 48 or len(reproduced) != 48 or any(a["id"] != b["id"] or a["output"] != b["output"] or a["generatedTokenIds"] != b["generatedTokenIds"] for a, b in zip(original, reproduced, strict=True)):
        raise ValueError("Preserved parent original-prompt output reproduction differs")


def token_ids(tokenizer, row, system=SYSTEM):
    messages = [{"role": "system", "content": system},
                {"role": "user", "content": f"SOURCE: {row['source']}\nQUESTION: {row['question']}"}]
    prefix = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True, return_dict=False)
    full = tokenizer.apply_chat_template(messages + [{"role": "assistant", "content": row["target"]}],
                                         tokenize=True, add_generation_prompt=False, return_dict=False)
    if not prefix or full[:len(prefix)] != prefix or len(full) <= len(prefix):
        raise ValueError("Template prefix or positive target token contract violated: " + row["id"])
    if len(full) > SETTINGS["maxSequence"] or len(prefix) + SETTINGS["maxNewTokens"] > SETTINGS["maxSequence"]:
        raise ValueError("Truncation would be required: " + row["id"])
    labels = [-100] * len(prefix) + full[len(prefix):]
    return {"prefix": prefix, "full": full, "labels": labels, "targetTokens": len(full) - len(prefix)}

def freeze(output, model_root, environment_contract, parent_root, audit_path):
    import torch
    from transformers import AutoTokenizer
    train, development = validated_data()
    audit = read_json(audit_path)
    validate_audit(audit, train)
    parent = parent_evidence(parent_root)
    snapshot = validate_snapshot(model_root)
    if parent["files"]["model-provenance.json"] != sha256(model_root / "model-provenance.json"):
        raise ValueError("Parent and untouched base provenance differ")
    actual = environment(torch)
    contract = read_json(environment_contract)
    verify_environment(actual, contract)
    qualification_path = verify_qualification(contract)
    tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False)
    encoded = [token_ids(tokenizer, row) for row in train + development]
    original_encoded = [token_ids(tokenizer, row, ORIGINAL_SYSTEM) for row in development]
    safe_path(output)
    output.mkdir(parents=True, exist_ok=False)
    (output / "source").mkdir()
    for name in SOURCE_FILES:
        (output / "source" / name).write_bytes(Path(__file__).with_name(name).read_bytes())
    (output / "design.md").write_bytes((Path(__file__).resolve().parents[2] / "docs/engineering/qwen3-grounding-revision-design.md").read_bytes())
    write_json(output / "train.json", train)
    write_json(output / "development.json", development)
    write_json(output / "training-audit.json", audit)
    (output / "audit-evidence").mkdir()
    audit_files = {}
    for index, (filename, digest) in enumerate(sorted(audit["evidenceFiles"].items())):
        name = f"audit-evidence/{index}-{Path(filename).name}"
        (output / name).write_bytes(Path(filename).read_bytes())
        audit_files[name] = {"originalPath": filename, "sha256": digest}
    write_json(output / "audit-evidence-manifest.json", audit_files)
    write_json(output / "environment-contract.json", contract)
    write_json(output / "parent-evidence.json", parent)
    (output / "qualification.json").write_bytes(qualification_path.read_bytes())
    (output / "model-provenance.json").write_bytes((model_root / "model-provenance.json").read_bytes())
    write_json(output / "tokenization.json", encoded)
    write_json(output / "parent-original-tokenization.json", original_encoded)
    protocol = {"schema": "diana-qwen3-grounding-revision-protocol-v1", "createdAt": datetime.now(timezone.utc).isoformat(),
        "model": MODEL, "revision": REVISION, "modelRoot": str(model_root), "parent": parent,
        "settings": SETTINGS, "dataCanonicalHashes": {"train": canonical_hash(train), "development": DEVELOPMENT_HASH},
        "system": SYSTEM, "systemSha256": SYSTEM_HASH, "originalSystemSha256": initial.SYSTEM_HASH,
        "environment": actual, "environmentSha256": canonical_hash(actual),
        "frozenFiles": {p.relative_to(output).as_posix(): sha256(p) for p in output.rglob("*") if p.is_file()},
        "trainCount": 600, "developmentCount": 48, "expectedOptimizerSteps": 300,
        "tokenizationSha256": canonical_hash(encoded), "parentOriginalTokenizationSha256": canonical_hash(original_encoded),
        "minimumTargetTokens": min(item["targetTokens"] for item in encoded), "maximumFullTokens": max(len(item["full"]) for item in encoded),
        "selection": "Two fixed epochs; lowest target-token loss among formal-eligible checkpoints, epoch breaks ties. No fallback. Original lexical grounding remains diagnostic only; 95% semantic acceptance requires subsequent independent blinded review.",
        "freshOptimizer": True, "initialAdapter": {"epoch": 1, "root": str(parent_root)},
        "testEvaluations": 0, "testOpened": False, "productionEligible": False,
        "semanticQualityValidated": False, "researchOnly": True, "educatorReviewed": False,
        "studentOrTextbookDataUsed": False, "inferencePerformed": False,
        "networkGuard": "Python socket denial and offline flags; no OS sandbox claim"}
    write_json(output / "protocol.json", protocol)
    return {"protocol": str(output / "protocol.json"), "sha256": sha256(output / "protocol.json"),
            "inferencePerformed": False, "trainingPerformed": False, "productionEligible": False}


def verify_freeze(output, expected_hash):
    if sha256(output / "protocol.json") != expected_hash:
        raise ValueError("Reviewed protocol digest mismatch")
    protocol = read_json(output / "protocol.json")
    if protocol["settings"] != SETTINGS or protocol["model"] != MODEL or protocol["revision"] != REVISION or protocol["system"] != SYSTEM:
        raise ValueError("Recipe/base/prompt changed after freeze")
    if protocol.get("productionEligible") is not False or protocol.get("testEvaluations") != 0 or protocol.get("semanticQualityValidated") is not False:
        raise ValueError("Research boundary changed")
    for name, digest in protocol["frozenFiles"].items():
        if Path(name).is_absolute() or ".." in Path(name).parts or sha256(output / name) != digest:
            raise ValueError("Frozen evidence drift")
    for name in SOURCE_FILES:
        if sha256(Path(__file__).with_name(name)) != sha256(output / "source" / name):
            raise ValueError("Live source changed after freeze: " + name)
    train, development = validated_data()
    if read_json(output / "train.json") != train or read_json(output / "development.json") != development:
        raise ValueError("Saved training or development data changed")
    validate_audit(read_json(output / "training-audit.json"), train)
    parent = protocol["parent"]
    if parent["epoch"] != 1 or protocol["initialAdapter"] != {"epoch": 1, "root": parent["root"]}:
        raise ValueError("Parent choice changed after freeze")
    for name, digest in parent["files"].items():
        if sha256(Path(parent["root"]) / name) != digest:
            raise ValueError("Preserved parent evidence changed")
    return protocol, train, development


def execute(output, expected_hash):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    protocol, train, development = verify_freeze(output, expected_hash)
    contract = read_json(output / "environment-contract.json")
    verify_environment(environment(torch), contract)
    verify_qualification(contract)
    model_root = Path(protocol["modelRoot"])
    snapshot = validate_snapshot(model_root)
    if sha256(model_root / "model-provenance.json") != sha256(output / "model-provenance.json"):
        raise ValueError("Base provenance drift")
    write_json(output / "started.json", {"at": datetime.now(timezone.utc).isoformat(), "protocolSha256": expected_hash})
    started = time.monotonic()
    torch.set_num_threads(SETTINGS["threads"])
    torch.set_num_interop_threads(1)
    random.seed(SETTINGS["seed"])
    torch.manual_seed(SETTINGS["seed"])
    torch.cuda.manual_seed_all(SETTINGS["seed"])
    torch.use_deterministic_algorithms(True)
    torch.backends.cudnn.benchmark = False
    torch.backends.cudnn.deterministic = True
    tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False)
    encoded = [token_ids(tokenizer, row) for row in train + development]
    if canonical_hash(encoded) != protocol["tokenizationSha256"]:
        raise ValueError("Tokenization changed after freeze")
    def bounded():
        if time.monotonic() - started > SETTINGS["maxSeconds"]:
            raise TimeoutError("Fixed wall-time budget exhausted")
    def batch(item):
        inputs = torch.tensor([item["full"]], dtype=torch.long, device="cuda:0")
        return {"input_ids": inputs, "attention_mask": torch.ones_like(inputs),
                "labels": torch.tensor([item["labels"]], dtype=torch.long, device="cuda:0")}
    def load_base():
        bounded()
        model = AutoModelForCausalLM.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False,
            dtype=torch.bfloat16, attn_implementation=SETTINGS["attentionImplementation"]).to("cuda:0")
        model.generation_config.do_sample = False
        model.generation_config.temperature = None
        model.generation_config.top_p = None
        model.generation_config.top_k = None
        return model
    def evaluate(model, label, items=None):
        items = encoded[len(train):] if items is None else items
        model.gradient_checkpointing_disable()
        model.config.use_cache = True
        model.eval()
        records = []
        with (output / (label + ".jsonl")).open("x", encoding="utf-8") as handle, torch.inference_mode():
            for row, item in zip(development, items, strict=True):
                bounded()
                loss = float(model(**batch(item)).loss)
                if not math.isfinite(loss) or item["targetTokens"] <= 0:
                    raise ValueError("Invalid evaluation target loss/tokens")
                inputs = torch.tensor([item["prefix"]], dtype=torch.long, device="cuda:0")
                generated = model.generate(input_ids=inputs, attention_mask=torch.ones_like(inputs),
                    max_new_tokens=SETTINGS["maxNewTokens"], do_sample=False, use_cache=True,
                    pad_token_id=tokenizer.eos_token_id)
                response = tokenizer.decode(generated[0][len(item["prefix"]):], skip_special_tokens=True)
                record = {"id": row["id"], "output": response, "targetTokenLoss": loss,
                    "targetTokens": item["targetTokens"], "diagnostics": score(response, row),
                    "generatedTokenIds": generated[0][len(item["prefix"]):].tolist()}
                handle.write(json.dumps(record, ensure_ascii=False, allow_nan=False) + "\n")
                handle.flush()
                os.fsync(handle.fileno())
                records.append(record)
        # Read back durable outputs; never aggregate an unpersisted summary claim.
        saved = [json.loads(line) for line in (output / (label + ".jsonl")).read_text(encoding="utf-8").splitlines()]
        metrics = aggregate(saved, development)
        write_json(output / (label + "-metrics.json"), metrics)
        print(json.dumps({"phase": label, **metrics}), flush=True)
        return records, metrics
    parent_root = Path(protocol["parent"]["root"])
    model = PeftModel.from_pretrained(load_base(), parent_root / "epoch-1", local_files_only=True, is_trainable=False)
    original_encoded = [token_ids(tokenizer, row, ORIGINAL_SYSTEM) for row in development]
    if original_encoded != read_json(output / "parent-original-tokenization.json"):
        raise ValueError("Original-prompt tokenization changed")
    reproduced, original_parent_metrics = evaluate(model, "parent-original-reproduction", original_encoded)
    original = [json.loads(line) for line in (parent_root / "epoch-1-development.jsonl").read_text(encoding="utf-8").splitlines()]
    assert_identical_outputs(original, reproduced)
    write_json(output / "parent-reproduction.json", {"identicalOutputs": True, "cases": 48, "parentEpoch": 1})
    del model
    gc.collect()
    torch.cuda.empty_cache()
    model = load_base()
    _, baseline = evaluate(model, "baseline-development")
    model = PeftModel.from_pretrained(model, parent_root / "epoch-1", local_files_only=True, is_trainable=True)
    _, parent_metrics = evaluate(model, "parent-development")
    named_params = [(name, parameter) for name, parameter in model.named_parameters() if parameter.requires_grad]
    if not named_params or any("lora_" not in name for name, _ in named_params):
        raise ValueError("Only verified parent LoRA parameters may be trainable")
    params = [parameter for _, parameter in named_params]
    trainable = sum(parameter.numel() for parameter in params)
    write_json(output / "parameters.json", {"trainable": trainable,
        "total": sum(parameter.numel() for parameter in model.parameters()),
        "names": {name: {"elements": parameter.numel(), "dtype": str(parameter.dtype)} for name, parameter in named_params}})
    optimizer = torch.optim.AdamW(params, lr=SETTINGS["learningRate"], weight_decay=SETTINGS["weightDecay"])
    if optimizer.state:
        raise ValueError("Optimizer must start fresh")
    candidates, optimizer_steps, examples_seen, targets_seen = [], 0, 0, 0
    with (output / "training-history.jsonl").open("x", encoding="utf-8") as history:
        for epoch in range(1, 3):
            model.train()
            model.config.use_cache = False
            model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
            optimizer.zero_grad(set_to_none=True)
            order = list(range(len(train)))
            random.Random(SETTINGS["seed"] + epoch).shuffle(order)
            accumulated = []
            for position, index in enumerate(order):
                bounded()
                loss = model(**batch(encoded[index])).loss
                if not torch.isfinite(loss):
                    raise ValueError("Nonfinite training loss")
                value = float(loss.detach())
                (loss / SETTINGS["gradientAccumulation"]).backward()
                examples_seen += 1
                targets_seen += encoded[index]["targetTokens"]
                accumulated.append({"id": train[index]["id"], "loss": value, "targetTokens": encoded[index]["targetTokens"]})
                if (position + 1) % SETTINGS["gradientAccumulation"] == 0:
                    norm = torch.nn.utils.clip_grad_norm_(params, SETTINGS["gradientClip"], error_if_nonfinite=True)
                    optimizer.step()
                    optimizer.zero_grad(set_to_none=True)
                    optimizer_steps += 1
                    event = {"epoch": epoch, "optimizerStep": optimizer_steps, "gradientNorm": float(norm),
                        "examples": accumulated, "examplesSeen": examples_seen, "targetTokensSeen": targets_seen}
                    history.write(json.dumps(event, allow_nan=False) + "\n")
                    history.flush()
                    os.fsync(history.fileno())
                    accumulated = []
                    if optimizer_steps % 10 == 0:
                        print(json.dumps({"phase": "training", "epoch": epoch, "step": optimizer_steps}), flush=True)
            if accumulated or optimizer_steps != epoch * 150:
                raise ValueError("Exact optimizer step accounting violated")
            checkpoint = output / f"epoch-{epoch}"
            model.save_pretrained(checkpoint, safe_serialization=True)
            _, metrics = evaluate(model, f"epoch-{epoch}-development")
            candidate = {"epoch": epoch, "metrics": metrics, "gates": gates(baseline, metrics),
                "optimizerSteps": optimizer_steps, "artifactHashes": {p.name: sha256(p) for p in checkpoint.iterdir() if p.is_file()}}
            candidates.append(candidate)
            write_json(output / f"epoch-{epoch}-candidate.json", candidate)
    selected = select_candidate(candidates)
    del optimizer, params, named_params, model
    gc.collect()
    torch.cuda.empty_cache()
    reload_verified = False
    if selected:
        model = PeftModel.from_pretrained(load_base(), output / f"epoch-{selected['epoch']}", local_files_only=True, is_trainable=False)
        reloaded, metrics = evaluate(model, "selected-reload-development")
        original = [json.loads(line) for line in (output / f"epoch-{selected['epoch']}-development.jsonl").read_text(encoding="utf-8").splitlines()]
        reload_verified = all(a["id"] == b["id"] and a["output"] == b["output"] and a["generatedTokenIds"] == b["generatedTokenIds"] for a, b in zip(original, reloaded, strict=True))
        if not reload_verified or not all(gates(baseline, metrics).values()):
            raise ValueError("Saved adapter reload fails identity or eligibility; no fallback")
        del model
    if optimizer_steps != protocol["expectedOptimizerSteps"] or examples_seen != 1200:
        raise ValueError("Training accounting drift")
    verify_freeze(output, expected_hash)
    validate_snapshot(model_root)
    write_json(output / "selection.json", {"selectedEpoch": selected["epoch"] if selected else None,
        "automaticEligibilityPassed": bool(selected), "validationPassed": False, "semanticQualityValidated": False, "candidates": candidates, "savedAdapterOutputsIdentical": reload_verified,
        "productionEligible": False, "testEvaluations": 0, "testOpened": False})
    report = {"schema": "diana-qwen3-grounding-revision-development-v1", "status": "awaiting-semantic-review" if selected else "rejected-automatic-eligibility",
        "protocolSha256": expected_hash, "productionEligible": False, "researchOnly": True, "validationPassed": False,
        "testEvaluations": 0, "testOpened": False, "providerCalls": 0, "educatorReviewed": False,
        "trainCount": 600, "developmentCount": 48, "optimizerSteps": optimizer_steps,
        "examplesSeen": examples_seen, "targetTokensSeen": targets_seen, "trainableParameters": trainable,
        "baseline": baseline, "parent": parent_metrics, "parentOriginal": original_parent_metrics, "semanticQualityValidated": False, "automaticEligibilityPassed": bool(selected), "selectedEpoch": selected["epoch"] if selected else None,
        "elapsedSeconds": round(time.monotonic() - started, 2),
        "limitations": ["Original machine-authored data", "Development set has been reused", "Formal eligibility cannot establish 95% semantic quality", "Legacy lexical grounding is diagnostic only", "No independent final test, educator review or student outcome evidence"],
        "artifactHashes": {str(p.relative_to(output)).replace("\\", "/"): sha256(p) for p in output.rglob("*") if p.is_file() and p.name != "execution.log"}}
    write_json(output / "report.json", report)
    write_json(output / "completion.json", {"reportSha256": sha256(output / "report.json"), "productionEligible": False})
    print(json.dumps(report), flush=True)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("freeze", "run", "_worker", "environment"))
    parser.add_argument("--output", type=Path)
    parser.add_argument("--model-root", type=Path)
    parser.add_argument("--environment-contract", type=Path)
    parser.add_argument("--protocol-sha256")
    parser.add_argument("--parent-run", type=Path)
    parser.add_argument("--training-audit", type=Path)
    args = parser.parse_args()
    os.environ.update(OFFLINE)
    if args.action == "environment":
        import torch
        print(json.dumps({"schema": "diana-qwen3-rocm-environment-v1", "approved": False, "environment": environment(torch)}, indent=2))
        return
    if args.output is None:
        parser.error("--output is required")
    output = args.output.absolute()
    safe_path(output)
    if args.action == "freeze":
        if not args.model_root or not args.environment_contract or not args.parent_run or not args.training_audit:
            parser.error("freeze requires --model-root, --environment-contract, --parent-run and --training-audit")
        with deny_network():
            print(json.dumps(freeze(output, args.model_root.absolute(), args.environment_contract.absolute(), args.parent_run.absolute(), args.training_audit.absolute())), flush=True)
    elif args.action == "run":
        if not args.protocol_sha256:
            parser.error("run requires the reviewed --protocol-sha256")
        verify_freeze(output, args.protocol_sha256)
        if (output / "started.json").exists() or (output / "execution.log").exists():
            raise ValueError("Frozen run already attempted; preserve partial evidence")
        if platform.system() != "Linux":
            raise ValueError("The bounded supervisor requires the reviewed Linux environment")
        command = [sys.executable, str(Path(__file__).resolve()), "_worker", "--output", str(output), "--protocol-sha256", args.protocol_sha256]
        with (output / "execution.log").open("x", encoding="utf-8") as log:
            worker_env = {**os.environ, "DIANA_QWEN_RESEARCH_SUPERVISED": "1"}
            process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT, env=worker_env, start_new_session=True)
            try:
                result = process.wait(timeout=SETTINGS["maxSeconds"])
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
                write_json(output / "interrupted.json", {"status": "runtime-limit", "productionEligible": False, "testOpened": False})
                raise TimeoutError("Research worker exceeded frozen wall-time budget")
        if result:
            write_json(output / "interrupted.json", {"status": "worker-error", "exitCode": result, "productionEligible": False, "testOpened": False})
            raise RuntimeError("Research worker stopped; inspect preserved execution.log")
        write_json(output / "supervisor-artifact-manifest.json", {"productionEligible": False,
            "files": {str(p.relative_to(output)).replace("\\", "/"): sha256(p) for p in output.rglob("*") if p.is_file()}})
    else:
        if os.environ.get("DIANA_QWEN_RESEARCH_SUPERVISED") != "1":
            raise ValueError("Use run so the hard wall-time supervisor remains active")
        with deny_network():
            execute(output, args.protocol_sha256)


if __name__ == "__main__":
    main()
