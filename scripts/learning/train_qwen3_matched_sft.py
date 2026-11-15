"""Offline matched chosen-target SFT; final cases remain sealed.

Initialize from verified run-008 epoch two, intentionally reuse run-009 inputs,
and remove only DPO from its objective. Research-only consistency evidence.
"""
from __future__ import annotations
import argparse
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
import train_qwen3_grounding_revision as prior
import train_qwen3_evidence_integrity as comparator_runner
import train_qwen3_preference as preference_parent
from train_qwen3_preference import SYSTEM as ORIGINAL_SYSTEM
from qwen3_evidence_integrity_metrics import score, aggregate, gates
from qwen3_evidence_integrity_contract import SYSTEM, SYSTEM_HASH

SETTINGS = {"epochs": 3, "learningRate": 0.00001, "chosenSFTWeight": 0.5,
    "rank": 16, "alpha": 32, "gradientAccumulation": 4, "batchSize": 1, "seed": 81173,
    "gradientClip": 1.0, "weightDecay": 0.01, "maxSequence": 768, "maxNewTokens": 128,
    "maxSeconds": 7200, "threads": 4, "targetModules": ["q_proj", "k_proj", "v_proj", "o_proj"],
    "dropout": 0.0, "dtype": "bfloat16", "optimizer": "AdamW", "gradientCheckpointing": True,
    "attentionImplementation": "eager", "decoding": "greedy", "formalEligibilityThreshold": 0.95,
    "semanticAcceptanceTarget": 0.95, "selectedEpochOnly": 3, "objectiveAuditTolerance": 0.0001}
DEVELOPMENT_HASH = prior.DEVELOPMENT_HASH
PARENT_REPORT_HASH = "f6dbec7623471797908c3a6ea8894b6ea0c65ac09c12d22db920bccfa3683e5c"
PARENT_PROTOCOL_HASH = "52f00147c744c0d04841876bf11349a79b624f1ee8c696d1c9830b3110f8bd7c"
DATA_MODULES = ("qwen3_evidence_integrity_data_a.py", "qwen3_evidence_integrity_data_b.py")
SOURCE_FILES = tuple(dict.fromkeys((*comparator_runner.SOURCE_FILES,
    "train_qwen3_matched_sft.py", "verify_qwen3_matched_sft.py")))
OFFLINE = {**initial.OFFLINE, "PYTHONHASHSEED": str(SETTINGS["seed"])}
SELECTION = comparator_runner.SELECTION
OBJECTIVE = "0.5 * (-chosen_sum_log_probability / chosen_target_tokens)"
COMPARATOR_REPORT_HASH = "06b9d89bdff32ccf98244fd1f8612a7bbd083cba6b43b8913f3e68c0aba3142a"
COMPARATOR_PROTOCOL_HASH = "68654384af3bfdfa641eb25c1c16efd65552360098ecd4766b5965c4d4fcbe34"
COMPARATOR_RECEIPT_HASH = "b769788f5acdb4214e922ad7ee3bf2b2fcae2370d0ba124bda2ce9d906d2a86c"
TRAINING_HASH = "73e94b7f518849cc78024b2b63571638e8569708f28c1f8ee87f08811356a760"
AUDIT_HASH = "20d4687cd24ac3bb2c19ed4284d90af59a698e09f0fd3aeb65338a1e9d219d6c"
COMPARATOR_AUDIT_HASH = "463b0c7c5bb583a1e61537a1ec3e7192805a90804e9bc8a7044f1a069870c2a7"
AUDIT_CANONICAL_HASH = "83745a29cf3480e76b7291d39f0132ad4f0fdc60cf7828eaab04bb76563ce172"
PRIOR_TRAINING_COUNTS = comparator_runner.PRIOR_TRAINING_COUNTS
assert_identical_outputs = prior.assert_identical_outputs
validated_data = comparator_runner.validated_data
validate_training = comparator_runner.validate_training
validate_audit = comparator_runner.validate_audit
parent_evidence = comparator_runner.parent_evidence
prior_training_overlap = comparator_runner.prior_training_overlap


def objective_terms(chosen, chosen_tokens):
    if type(chosen) not in (int, float) or not math.isfinite(chosen) or chosen > 0:
        raise ValueError("Chosen log probability must be finite and nonpositive")
    if type(chosen_tokens) is not int or chosen_tokens <= 0:
        raise ValueError("Positive chosen target token count required")
    ce = -chosen / chosen_tokens
    return {"chosenTokenMeanCE": ce, "combinedLoss": SETTINGS["chosenSFTWeight"] * ce}


def tensor_objective(chosen, chosen_tokens):
    if type(chosen_tokens) is not int or chosen_tokens <= 0:
        raise ValueError("Positive chosen target token count required")
    ce = -chosen / chosen_tokens
    return SETTINGS["chosenSFTWeight"] * ce, ce


def validate_mask(item):
    prefix, full, labels = item["prefix"], item["full"], item["labels"]
    if not prefix or len(full) <= len(prefix) or full[:len(prefix)] != prefix:
        raise ValueError("Positive assistant target and exact prompt prefix required")
    if len(full) > SETTINGS["maxSequence"] or len(prefix) + SETTINGS["maxNewTokens"] > SETTINGS["maxSequence"]:
        raise ValueError("Truncation is prohibited")
    if labels != [-100] * len(prefix) + full[len(prefix):] or type(item["targetTokens"]) is not int or item["targetTokens"] != len(full) - len(prefix):
        raise ValueError("Assistant-only masking, including end tokens, differs")
    if any(type(token) is not int or token < 0 for token in full):
        raise ValueError("Invalid token identifier")


def sequence_logps(model, item, device="cuda:0"):
    import torch
    validate_mask(item)
    inputs = torch.tensor([item["full"]], dtype=torch.long, device=device)
    labels = torch.tensor(item["labels"][1:], dtype=torch.long, device=device)
    mask = labels != -100
    if int(mask.sum()) != item["targetTokens"] or item["targetTokens"] <= 0:
        raise ValueError("Shifted target mask/token accounting differs")
    outputs = model(input_ids=inputs, attention_mask=torch.ones_like(inputs), use_cache=False)
    # Select only assistant prediction positions, then use FP32 log-softmax.
    target_logits = outputs.logits[0, :-1, :][mask].float()
    token_logps = torch.log_softmax(target_logits, dim=-1).gather(1, labels[mask].unsqueeze(1)).squeeze(1)
    if not torch.isfinite(token_logps).all() or (token_logps > 0).any():
        raise ValueError("Nonfinite or positive target log probability")
    return token_logps.sum(), token_logps


def select_candidate(candidates):
    if [item["epoch"] for item in candidates] != [1, 2, 3]:
        raise ValueError("All three fixed epochs must complete")
    final = candidates[2]
    values = final.get("gates")
    if not isinstance(values, dict) or not values or any(type(value) is not bool for value in values.values()):
        raise ValueError("Final strict gates must be a nonempty boolean mapping")
    return final if all(values.values()) else None


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
def qualify_objective(output, contract_path):
    """Two random-tiny-model updates, with no real training/evaluation inputs."""
    import torch
    from transformers import Qwen3Config, Qwen3ForCausalLM
    from peft import LoraConfig, TaskType, get_peft_model
    actual = environment(torch)
    contract = read_json(contract_path)
    verify_environment(actual, contract)
    verify_qualification(contract)
    torch.set_num_threads(SETTINGS["threads"])
    torch.set_num_interop_threads(1)
    torch.manual_seed(SETTINGS["seed"])
    torch.cuda.manual_seed_all(SETTINGS["seed"])
    torch.use_deterministic_algorithms(True)
    torch.backends.cudnn.benchmark = False
    torch.backends.cudnn.deterministic = True
    config = Qwen3Config(vocab_size=128, hidden_size=64, intermediate_size=128,
        num_hidden_layers=2, num_attention_heads=4, num_key_value_heads=2, head_dim=16,
        max_position_embeddings=768, attention_dropout=0.0)
    config._attn_implementation = "eager"
    base = Qwen3ForCausalLM(config).to(device="cuda:0", dtype=torch.bfloat16)
    model = get_peft_model(base, LoraConfig(task_type=TaskType.CAUSAL_LM, r=16, lora_alpha=32,
        target_modules=SETTINGS["targetModules"], lora_dropout=0.0, bias="none"))
    prefix, target = [1, 3, 4, 5, 6, 7], [9, 10, 11, 2]
    chosen = {"prefix": prefix, "full": prefix + target,
        "labels": [-100] * len(prefix) + target, "targetTokens": len(target)}
    validate_mask(chosen)
    params = [parameter for parameter in model.parameters() if parameter.requires_grad]
    before = [parameter.detach().clone() for parameter in params]
    optimizer = torch.optim.AdamW(params, lr=SETTINGS["learningRate"], weight_decay=SETTINGS["weightDecay"])
    model.train()
    model.config.use_cache = False
    model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
    events = []
    for step in range(2):
        optimizer.zero_grad(set_to_none=True)
        chosen_sum, values = sequence_logps(model, chosen)
        loss, ce = tensor_objective(chosen_sum, chosen["targetTokens"])
        expected = objective_terms(float(chosen_sum.detach()), chosen["targetTokens"])
        if not math.isclose(float(loss.detach()), expected["combinedLoss"], rel_tol=1e-5, abs_tol=SETTINGS["objectiveAuditTolerance"]):
            raise ValueError("Tiny tensor objective differs from scalar reference")
        loss.backward()
        if any(parameter.grad is None or not torch.isfinite(parameter.grad).all() for parameter in params):
            raise ValueError("Tiny-model gradients are missing or nonfinite")
        norm = torch.nn.utils.clip_grad_norm_(params, SETTINGS["gradientClip"], error_if_nonfinite=True)
        optimizer.step()
        if any(not torch.isfinite(parameter).all() for parameter in params):
            raise ValueError("Nonfinite adapter parameters")
        events.append({"step": step + 1, "chosenSumLogp": float(chosen_sum.detach()),
            "chosenTokens": chosen["targetTokens"], "chosenTokenLogps": values.detach().tolist(),
            **expected, "tensorCombinedLoss": float(loss.detach()),
            "tensorChosenTokenMeanCE": float(ce.detach()), "gradientNorm": float(norm)})
    changed = sum(not torch.equal(old, parameter.detach()) for old, parameter in zip(before, params, strict=True))
    if changed != len(params) or changed != 16:
        raise ValueError("Every one of 16 tiny adapter tensors must change")
    scalar_chosen = torch.tensor(-5.0, requires_grad=True)
    scalar_loss, _ = tensor_objective(scalar_chosen, 4)
    scalar_loss.backward()
    if float(scalar_chosen.grad) != -0.125:
        raise ValueError("Chosen objective gradient differs from -0.5/targetTokens")
    proof = {"schema": "diana-qwen3-matched-sft-objective-qualification-v1", "status": "qualified",
        "sourceSha256": sha256(Path(__file__)), "settingsSha256": canonical_hash(SETTINGS),
        "environment": actual, "environmentSha256": canonical_hash(actual), "runtimeContractSha256": sha256(contract_path),
        "randomTinyModelOnly": True, "realModelOrTrainingDataLoaded": False,
        "targetOnlyMasking": True, "finiteGradients": True, "gradientDirectionPassed": True,
        "trainableTensors": len(params), "changedTensors": changed, "fixture": chosen,
        "events": events, "productionEligible": False}
    write_json(output, proof)
    return proof


def validate_objective_qualification(path, actual):
    proof = read_json(path)
    if proof.get("schema") != "diana-qwen3-matched-sft-objective-qualification-v1" or proof.get("status") != "qualified" or proof.get("sourceSha256") != sha256(Path(__file__)) or proof.get("settingsSha256") != canonical_hash(SETTINGS):
        raise ValueError("Matched SFT source/recipe qualification changed")
    if proof.get("environment") != actual or proof.get("environmentSha256") != canonical_hash(actual):
        raise ValueError("Objective qualified environment differs")
    if any(proof.get(key) is not True for key in ("randomTinyModelOnly", "targetOnlyMasking", "finiteGradients", "gradientDirectionPassed")) or proof.get("realModelOrTrainingDataLoaded") is not False or proof.get("productionEligible") is not False:
        raise ValueError("Numerical qualification incomplete")
    if proof.get("trainableTensors") != 16 or proof.get("changedTensors") != 16 or len(proof.get("events", [])) != 2:
        raise ValueError("Tiny adapter update evidence incomplete")
    validate_mask(proof["fixture"])
    for step, event in enumerate(proof["events"], 1):
        if event.get("step") != step or event.get("chosenTokens") != proof["fixture"]["targetTokens"]:
            raise ValueError("Tiny qualification step/token count differs")
        validate_objective_event(event)
    return proof


def validate_objective_event(event):
    values = event.get("chosenTokenLogps", [])
    count = event.get("chosenTokens")
    total = event.get("chosenSumLogp")
    terms = objective_terms(total, count)
    if len(values) != count or any(type(value) not in (int, float) or not math.isfinite(value) or value > 0 for value in values) or not math.isclose(sum(values), total, rel_tol=1e-6, abs_tol=SETTINGS["objectiveAuditTolerance"]):
        raise ValueError("Per-token chosen log probability accounting differs")
    for key, expected in {**terms, "tensorCombinedLoss": terms["combinedLoss"], "tensorChosenTokenMeanCE": terms["chosenTokenMeanCE"]}.items():
        actual = event.get(key)
        if type(actual) not in (int, float) or not math.isfinite(actual) or not math.isclose(actual, expected, rel_tol=1e-5, abs_tol=SETTINGS["objectiveAuditTolerance"]):
            raise ValueError("Scalar/tensor chosen objective differs")
    if "gradientNorm" in event and (type(event["gradientNorm"]) not in (int, float) or not math.isfinite(event["gradientNorm"]) or event["gradientNorm"] < 0):
        raise ValueError("Nonfinite gradient norm")


def bound_file(root, name):
    if not isinstance(name, str) or ":" in name or Path(name).is_absolute() or ".." in Path(name).parts or "\\" in name:
        raise ValueError("Unsafe comparator manifest path")
    path = root / name
    safe_path(path)
    if path.resolve() != root.resolve() / name or path.is_symlink():
        raise ValueError("Comparator manifest path escaped its root")
    return path


def comparator_evidence(root, receipt_path, train, development, encoded=None, audit_path=None, environment_contract=None):
    """Validate immutable receipt and all committed input/output hashes, no inference."""
    if root.name != "qwen3-run-009" or sha256(root / "report.json") != COMPARATOR_REPORT_HASH or sha256(root / "protocol.json") != COMPARATOR_PROTOCOL_HASH or sha256(receipt_path) != COMPARATOR_RECEIPT_HASH:
        raise ValueError("Only the committed run-009 comparator and verification receipt are allowed")
    report, protocol, receipt = read_json(root / "report.json"), read_json(root / "protocol.json"), read_json(receipt_path)
    if receipt.get("verified") is not True or receipt.get("reportSha256") != COMPARATOR_REPORT_HASH or receipt.get("optimizerSteps") != 225 or receipt.get("pairPresentations") != 900 or receipt.get("testOpened") is not False or receipt.get("productionEligible") is not False:
        raise ValueError("Comparator verified receipt identity or research boundary changed")
    if report.get("protocolSha256") != COMPARATOR_PROTOCOL_HASH or protocol.get("settings") != comparator_runner.SETTINGS or {k:v for k,v in protocol["settings"].items() if k != "beta"} != SETTINGS or protocol.get("systemSha256") != SYSTEM_HASH or protocol.get("system") != SYSTEM:
        raise ValueError("Comparator recipe or prompt differs")
    if protocol.get("parent", {}).get("files", {}).get("report.json") != PARENT_REPORT_HASH or protocol.get("parent", {}).get("epoch") != 2:
        raise ValueError("Comparator initialization differs")
    files = dict(report["artifactHashes"])
    existing = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
    if existing != set(files) | {"report.json", "completion.json", "execution.log", "supervisor-artifact-manifest.json"}:
        raise ValueError("Comparator artifact inventory changed")
    for name, digest in protocol["frozenFiles"].items():
        if files.get(name) != digest:
            raise ValueError("Comparator report/protocol frozen bindings disagree")
    for name in ("report.json", "protocol.json", "completion.json", "supervisor-artifact-manifest.json", "execution.log"):
        files[name] = sha256(bound_file(root, name))
    for name, digest in files.items():
        if sha256(bound_file(root, name)) != digest:
            raise ValueError("Comparator committed artifact changed: " + name)
    completion = read_json(root / "completion.json")
    supervisor = read_json(root / "supervisor-artifact-manifest.json")
    if completion != {"reportSha256": COMPARATOR_REPORT_HASH, "productionEligible": False} or supervisor.get("productionEligible") is not False or supervisor.get("files") != {k:v for k,v in files.items() if k != "supervisor-artifact-manifest.json"}:
        raise ValueError("Comparator completion/supervisor bindings differ")
    if canonical_hash(train) != TRAINING_HASH or canonical_hash(development) != DEVELOPMENT_HASH or read_json(root / "train.json") != train or read_json(root / "development.json") != development:
        raise ValueError("Matched comparator training/development/audit differs")
    validate_matched_audit(root / "training-audit.json", audit_path)
    if encoded is not None:
        pairs = read_json(root / "pair-tokenization.json")
        if read_json(root / "tokenization.json") != encoded or len(pairs) != 300 or any(pair["id"] != row["id"] or pair["chosen"] != item for pair,row,item in zip(pairs,train,encoded[:300],strict=True)):
            raise ValueError("Matched chosen tokenization differs from comparator")
    if environment_contract is not None and sha256(environment_contract) != sha256(root / "environment-contract.json"):
        raise ValueError("Matched runtime contract differs from comparator")
    return {"root": str(root), "reportSha256": COMPARATOR_REPORT_HASH,
        "protocolSha256": COMPARATOR_PROTOCOL_HASH, "verificationReceiptSha256": COMPARATOR_RECEIPT_HASH,
        "files": files, "trainingCanonicalSha256": TRAINING_HASH,
        "developmentCanonicalSha256": DEVELOPMENT_HASH, "auditSha256": AUDIT_HASH,
        "comparatorAuditSha256": COMPARATOR_AUDIT_HASH, "auditCanonicalSha256": AUDIT_CANONICAL_HASH,
        "sameTrainingData": True, "initializationAncestor": False}


def validate_matched_audit(comparator_path, approved_path):
    """Run 009 serialized the approved audit; preserve both fixed byte identities."""
    comparator = read_json(comparator_path)
    if sha256(comparator_path) != COMPARATOR_AUDIT_HASH or canonical_hash(comparator) != AUDIT_CANONICAL_HASH:
        raise ValueError("Comparator serialized audit identity changed")
    if approved_path is not None:
        approved = read_json(approved_path)
        if sha256(approved_path) != AUDIT_HASH or approved != comparator or canonical_hash(approved) != AUDIT_CANONICAL_HASH:
            raise ValueError("Approved original audit bytes or parsed content changed")


def validate_matched_inputs(output, comparator_root, parent, actual):
    old = read_json(comparator_root / "protocol.json")
    if old["parent"] != parent or old["environment"] != actual or old["model"] != MODEL or old["revision"] != REVISION:
        raise ValueError("Matched parent/base/environment differs")
    same_files = {"train.json", "development.json", "tokenization.json", "parent-original-tokenization.json",
        "audit-evidence-manifest.json", "environment-contract.json", "qualification.json",
        "model-provenance.json", "parent-evidence.json", "prior-training-overlap.json"}
    same_files.update("source/" + name for name in comparator_runner.SOURCE_FILES)
    same_files.update(read_json(output / "audit-evidence-manifest.json"))
    validate_matched_audit(comparator_root / "training-audit.json", output / "training-audit.json")
    for name in same_files:
        if sha256(bound_file(output, name)) != old["frozenFiles"].get(name) or sha256(bound_file(comparator_root, name)) != old["frozenFiles"].get(name):
            raise ValueError("Matched frozen input differs: " + name)


def loss_recovery(history, parent, comparator, final):
    training = []
    for epoch in (1, 2, 3):
        examples = [item for event in history if event["epoch"] == epoch for item in event["examples"]]
        if len(examples) != 300:
            raise ValueError("Every epoch requires 300 online training CE observations")
        training.append({"epoch": epoch, "chosenTokenMeanCE": sum(item["chosenTokenMeanCE"] for item in examples) / len(examples),
            "chosenTokenWeightedCE": -sum(item["chosenSumLogp"] for item in examples) / sum(item["chosenTokens"] for item in examples)})
    def losses(metrics):
        return {"all": metrics["targetTokenLoss"], **{label: metrics["slices"][label]["targetTokenLoss"] for label in ("supported", "insufficient")}}
    return {"trainingCEByEpoch": training,
        "trainingCEMeasurement": "online pre-update chosen-target losses; not checkpoint evaluation",
        "developmentCE": {"parent": losses(parent), "comparator": losses(comparator), "epoch3": losses(final)},
        "fullParentLossRecovery": final["targetTokenLoss"] <= parent["targetTokenLoss"],
        "improvedOverComparator": final["targetTokenLoss"] < comparator["targetTokenLoss"],
        "doesNotAlterEligibility": True}


def copy_runtime_contract(source, destination):
    """Preserve the approved file's raw identity, including whitespace and newline."""
    raw = source.read_bytes()
    destination.write_bytes(raw)
    if destination.read_bytes() != raw:
        raise ValueError("Runtime contract byte copy differs")


def freeze(output, model_root, environment_contract, parent_root, audit_path, objective_qualification, comparator_root, comparator_receipt):
    import torch
    from transformers import AutoTokenizer
    train, development = validated_data()
    audit = read_json(audit_path)
    validate_audit(audit, train)
    parent = parent_evidence(parent_root)
    overlap_audit = prior_training_overlap(train, parent_root)
    snapshot = validate_snapshot(model_root)
    if parent["files"]["model-provenance.json"] != sha256(model_root / "model-provenance.json"):
        raise ValueError("Parent and untouched base provenance differ")
    actual = environment(torch)
    contract = read_json(environment_contract)
    verify_environment(actual, contract)
    qualification_path = verify_qualification(contract)
    tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False)
    encoded = [token_ids(tokenizer, row) for row in train + development]
    comparator = comparator_evidence(comparator_root, comparator_receipt, train, development, encoded, audit_path, environment_contract)
    qualification = validate_objective_qualification(objective_qualification, actual)
    if qualification["runtimeContractSha256"] != sha256(environment_contract):
        raise ValueError("Matched SFT objective runtime contract differs")
    original_encoded = [token_ids(tokenizer, row, ORIGINAL_SYSTEM) for row in development]
    safe_path(output)
    output.mkdir(parents=True, exist_ok=False)
    (output / "source").mkdir()
    for name in SOURCE_FILES:
        (output / "source" / name).write_bytes(Path(__file__).with_name(name).read_bytes())
    (output / "design.md").write_bytes((Path(__file__).resolve().parents[2] / "docs/engineering/qwen3-matched-sft-design.md").read_bytes())
    write_json(output / "train.json", train)
    write_json(output / "development.json", development)
    (output / "training-audit.json").write_bytes(audit_path.read_bytes())
    write_json(output / "comparator-evidence.json", comparator)
    (output / "comparator-verification.json").write_bytes(comparator_receipt.read_bytes())
    (output / "audit-evidence").mkdir()
    audit_files = {}
    for index, (filename, digest) in enumerate(sorted(audit["evidenceFiles"].items())):
        name = f"audit-evidence/{index}-{Path(filename).name}"
        (output / name).write_bytes(Path(filename).read_bytes())
        audit_files[name] = {"originalPath": filename, "sha256": digest}
    write_json(output / "audit-evidence-manifest.json", audit_files)
    copy_runtime_contract(environment_contract, output / "environment-contract.json")
    write_json(output / "parent-evidence.json", parent)
    write_json(output / "prior-training-overlap.json", overlap_audit)
    (output / "qualification.json").write_bytes(qualification_path.read_bytes())
    (output / "model-provenance.json").write_bytes((model_root / "model-provenance.json").read_bytes())
    write_json(output / "tokenization.json", encoded)
    write_json(output / "objective-qualification.json", qualification)
    write_json(output / "parent-original-tokenization.json", original_encoded)
    validate_matched_inputs(output, comparator_root, parent, actual)
    protocol = {"schema": "diana-qwen3-matched-sft-protocol-v1", "createdAt": datetime.now(timezone.utc).isoformat(),
        "model": MODEL, "revision": REVISION, "modelRoot": str(model_root), "parent": parent, "comparator": comparator,
        "comparatorEvidenceSha256": sha256(output / "comparator-evidence.json"),
        "rejectedTargetsUsedForOptimization": False, "dpoUsed": False,
        "settings": SETTINGS, "dataCanonicalHashes": {"train": canonical_hash(train), "development": DEVELOPMENT_HASH},
        "system": SYSTEM, "systemSha256": SYSTEM_HASH, "originalSystemSha256": preference_parent.SYSTEM_HASH,
        "environment": actual, "environmentSha256": canonical_hash(actual),
        "priorTrainingOverlapAuditSha256": sha256(output / "prior-training-overlap.json"),
        "frozenFiles": {p.relative_to(output).as_posix(): sha256(p) for p in output.rglob("*") if p.is_file()},
        "trainCount": 300, "developmentCount": 48, "expectedOptimizerSteps": 225,
        "tokenizationSha256": canonical_hash(encoded), "parentOriginalTokenizationSha256": canonical_hash(original_encoded),
        "minimumTargetTokens": min(item["targetTokens"] for item in encoded), "maximumFullTokens": max(len(item["full"]) for item in encoded),
        "selection": SELECTION,
        "objective": OBJECTIVE, "freshOptimizer": True, "initialAdapter": {"epoch": 2, "root": str(parent_root)},
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
    if protocol.get("schema") != "diana-qwen3-matched-sft-protocol-v1":
        raise ValueError("Unexpected matched SFT protocol schema")
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
    if read_json(output / "objective-qualification.json").get("runtimeContractSha256") != sha256(output / "environment-contract.json"):
        raise ValueError("Frozen runtime contract bytes differ from objective qualification")
    if protocol.get("originalSystemSha256") != preference_parent.SYSTEM_HASH or protocol.get("selection") != SELECTION or protocol.get("objective") != OBJECTIVE:
        raise ValueError("Parent prompt, selection or objective contract changed")
    train, development = validated_data()
    if read_json(output / "train.json") != train or read_json(output / "development.json") != development:
        raise ValueError("Saved training or development data changed")
    validate_audit(read_json(output / "training-audit.json"), train)
    parent = protocol["parent"]
    if parent["epoch"] != 2 or protocol["initialAdapter"] != {"epoch": 2, "root": parent["root"]}:
        raise ValueError("Parent choice changed after freeze")
    for name, digest in parent["files"].items():
        if sha256(Path(parent["root"]) / name) != digest:
            raise ValueError("Preserved parent evidence changed")
    if sha256(output / "prior-training-overlap.json") != protocol.get("priorTrainingOverlapAuditSha256") or read_json(output / "prior-training-overlap.json") != prior_training_overlap(train, Path(parent["root"])):
        raise ValueError("Prior-training overlap audit changed after freeze")
    if protocol.get("rejectedTargetsUsedForOptimization") is not False or protocol.get("dpoUsed") is not False:
        raise ValueError("Matched SFT objective boundary changed")
    comparator = comparator_evidence(Path(protocol["comparator"]["root"]), output / "comparator-verification.json", train, development,
        read_json(output / "tokenization.json"), output / "training-audit.json", output / "environment-contract.json")
    if comparator != protocol["comparator"] or read_json(output / "comparator-evidence.json") != comparator or sha256(output / "comparator-evidence.json") != protocol.get("comparatorEvidenceSha256"):
        raise ValueError("Frozen comparator evidence changed")
    validate_matched_inputs(output, Path(comparator["root"]), parent, protocol["environment"])
    return protocol, train, development

def execute(output, expected_hash):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    protocol, train, development = verify_freeze(output, expected_hash)
    contract = read_json(output / "environment-contract.json")
    verify_environment(environment(torch), contract)
    verify_qualification(contract)
    validate_objective_qualification(output / "objective-qualification.json", environment(torch))
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
    model = PeftModel.from_pretrained(load_base(), parent_root / "epoch-2", local_files_only=True, is_trainable=False)
    original_encoded = [token_ids(tokenizer, row, ORIGINAL_SYSTEM) for row in development]
    if original_encoded != read_json(output / "parent-original-tokenization.json"):
        raise ValueError("Original-prompt tokenization changed")
    reproduced, original_parent_metrics = evaluate(model, "parent-original-reproduction", original_encoded)
    original = [json.loads(line) for line in (parent_root / "epoch-2-development.jsonl").read_text(encoding="utf-8").splitlines()]
    assert_identical_outputs(original, reproduced)
    write_json(output / "parent-reproduction.json", {"identicalOutputs": True, "cases": 48, "parentEpoch": 2})
    del model
    gc.collect()
    torch.cuda.empty_cache()
    model = load_base()
    baseline_records, baseline = evaluate(model, "baseline-development")
    comparator_root = Path(protocol["comparator"]["root"])
    comparator_base = [json.loads(line) for line in (comparator_root / "baseline-development.jsonl").read_text(encoding="utf-8").splitlines()]
    assert_identical_outputs(comparator_base, baseline_records)
    model = PeftModel.from_pretrained(model, parent_root / "epoch-2", local_files_only=True, is_trainable=True)
    parent_records, parent_metrics = evaluate(model, "parent-development")
    comparator_parent = [json.loads(line) for line in (comparator_root / "parent-development.jsonl").read_text(encoding="utf-8").splitlines()]
    assert_identical_outputs(comparator_parent, parent_records)
    write_json(output / "matched-baseline-reproduction.json", {"identicalOutputs": True,
        "casesPerBaseline": 48, "labels": ["baseline-development", "parent-development"],
        "comparatorReportSha256": COMPARATOR_REPORT_HASH, "beforeOptimizer": True})
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
        raise ValueError("Optimizer must start fresh after matched baseline reproduction")
    write_json(output / "optimizer-start.json", {
        "matchedBaselineReproductionSha256": sha256(output / "matched-baseline-reproduction.json"),
        "optimizerStateInitiallyEmpty": True, "optimizerSteps": 0})
    candidates, optimizer_steps, examples_seen, targets_seen = [], 0, 0, 0
    with (output / "training-history.jsonl").open("x", encoding="utf-8") as history:
        for epoch in range(1, 4):
            model.train()
            model.config.use_cache = False
            model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
            optimizer.zero_grad(set_to_none=True)
            order = list(range(len(train)))
            random.Random(SETTINGS["seed"] + epoch).shuffle(order)
            accumulated = []
            for position, index in enumerate(order):
                bounded()
                chosen = encoded[index]
                chosen_sum, chosen_values = sequence_logps(model, chosen)
                loss, chosen_ce = tensor_objective(chosen_sum, chosen["targetTokens"])
                if not all(bool(torch.isfinite(value)) for value in (loss, chosen_ce)):
                    raise ValueError("Nonfinite chosen-target objective")
                audited = objective_terms(float(chosen_sum.detach()), chosen["targetTokens"])
                record = {"id": train[index]["id"], "chosenSumLogp": float(chosen_sum.detach()),
                    "chosenTokens": chosen["targetTokens"], "chosenTokenLogps": chosen_values.detach().tolist(),
                    **audited, "tensorCombinedLoss": float(loss.detach()),
                    "tensorChosenTokenMeanCE": float(chosen_ce.detach())}
                validate_objective_event(record)
                (loss / SETTINGS["gradientAccumulation"]).backward()
                examples_seen += 1
                targets_seen += chosen["targetTokens"]
                accumulated.append(record)
                if (position + 1) % SETTINGS["gradientAccumulation"] == 0:
                    if any(parameter.grad is None or not torch.isfinite(parameter.grad).all() for parameter in params):
                        raise ValueError("Missing or nonfinite adapter gradients")
                    norm = torch.nn.utils.clip_grad_norm_(params, SETTINGS["gradientClip"], error_if_nonfinite=True)
                    optimizer.step()
                    if any(not torch.isfinite(parameter).all() for parameter in params):
                        raise ValueError("Nonfinite adapter parameters")
                    optimizer.zero_grad(set_to_none=True)
                    optimizer_steps += 1
                    event = {"epoch": epoch, "optimizerStep": optimizer_steps, "gradientNorm": float(norm),
                        "examples": accumulated, "examplesSeen": examples_seen, "targetTokensSeen": targets_seen, "rejectedTargetTokensSeen": 0}
                    history.write(json.dumps(event, allow_nan=False) + "\n")
                    history.flush()
                    os.fsync(history.fileno())
                    accumulated = []
                    if optimizer_steps % 10 == 0:
                        print(json.dumps({"phase": "training", "epoch": epoch, "step": optimizer_steps}), flush=True)
            if accumulated or optimizer_steps != epoch * 75:
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
    if optimizer_steps != protocol["expectedOptimizerSteps"] or examples_seen != 900:
        raise ValueError("Training accounting drift")
    verify_freeze(output, expected_hash)
    validate_snapshot(model_root)
    write_json(output / "selection.json", {"selectedEpoch": selected["epoch"] if selected else None,
        "automaticEligibilityPassed": bool(selected), "validationPassed": False, "semanticQualityValidated": False, "candidates": candidates, "savedAdapterOutputsIdentical": reload_verified,
        "productionEligible": False, "testEvaluations": 0, "testOpened": False})
    history = [json.loads(line) for line in (output / "training-history.jsonl").read_text(encoding="utf-8").splitlines()]
    comparator_final = [json.loads(line) for line in (comparator_root / "epoch-3-development.jsonl").read_text(encoding="utf-8").splitlines()]
    recovery = loss_recovery(history, parent_metrics, aggregate(comparator_final, development), candidates[2]["metrics"])
    write_json(output / "loss-recovery.json", recovery)
    report = {"schema": "diana-qwen3-matched-sft-development-v1", "status": "awaiting-semantic-review" if selected else "rejected-automatic-eligibility",
        "protocolSha256": expected_hash, "productionEligible": False, "researchOnly": True, "validationPassed": False,
        "testEvaluations": 0, "testOpened": False, "providerCalls": 0, "educatorReviewed": False,
        "trainCount": 300, "developmentCount": 48, "optimizerSteps": optimizer_steps,
        "examplesSeen": examples_seen, "targetTokensSeen": targets_seen, "rejectedTargetTokensSeen": 0,
        "trainableParameters": trainable, "method": "matched chosen-target SFT (0.5 token-mean CE; no DPO)",
        "comparatorReportSha256": COMPARATOR_REPORT_HASH, "lossRecovery": recovery,
        "baseline": baseline, "parent": parent_metrics, "parentOriginal": original_parent_metrics, "semanticQualityValidated": False, "automaticEligibilityPassed": bool(selected), "selectedEpoch": selected["epoch"] if selected else None,
        "elapsedSeconds": round(time.monotonic() - started, 2),
        "limitations": ["Intentionally reuses the same 300 run-009 audited pairs; no new training examples", "One deterministic matched run cannot establish general causal effects", "Original machine-authored data", "Development set has been reused", "Formal eligibility cannot establish 95% semantic quality", "Legacy lexical grounding is diagnostic only", "No independent final test, educator review or student outcome evidence"],
        "artifactHashes": {str(p.relative_to(output)).replace("\\", "/"): sha256(p) for p in output.rglob("*") if p.is_file() and p.name != "execution.log"}}
    write_json(output / "report.json", report)
    write_json(output / "completion.json", {"reportSha256": sha256(output / "report.json"), "productionEligible": False})
    print(json.dumps(report), flush=True)
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
                env={**os.environ, "DIANA_QWEN_RESEARCH_SUPERVISED": "1"}, start_new_session=True)
            result = child.wait(timeout=SETTINGS["maxSeconds"])
        if result != 0:
            raise RuntimeError("Matched SFT research worker exited unsuccessfully")
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
    parser.add_argument("action", choices=("freeze", "run", "_worker", "environment", "qualify-objective"))
    parser.add_argument("--output", type=Path)
    parser.add_argument("--model-root", type=Path)
    parser.add_argument("--environment-contract", type=Path)
    parser.add_argument("--protocol-sha256")
    parser.add_argument("--parent-run", type=Path)
    parser.add_argument("--training-audit", type=Path)
    parser.add_argument("--objective-qualification", type=Path)
    parser.add_argument("--comparator-run", type=Path)
    parser.add_argument("--comparator-verification", type=Path)
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
    if args.action == "qualify-objective":
        if args.environment_contract is None:
            parser.error("qualify-objective requires --environment-contract")
        with deny_network():
            proof = qualify_objective(output, args.environment_contract.absolute())
            print(json.dumps({"output": str(output), "status": proof["status"],
                "sourceSha256": proof["sourceSha256"], "environmentSha256": proof["environmentSha256"],
                "changedTensors": proof["changedTensors"], "steps": len(proof["events"]),
                "initialChosenCE": proof["events"][0]["chosenTokenMeanCE"], "productionEligible": False}))
    elif args.action == "freeze":
        if not args.model_root or not args.environment_contract or not args.parent_run or not args.training_audit or not args.objective_qualification or not args.comparator_run or not args.comparator_verification:
            parser.error("freeze requires --model-root, --environment-contract, --parent-run, --training-audit, --objective-qualification, --comparator-run and --comparator-verification")
        with deny_network():
            print(json.dumps(freeze(output, args.model_root.absolute(), args.environment_contract.absolute(), args.parent_run.absolute(), args.training_audit.absolute(), args.objective_qualification.absolute(), args.comparator_run.absolute(), args.comparator_verification.absolute())), flush=True)
    elif args.action == "run":
        if not args.protocol_sha256:
            parser.error("run requires the reviewed --protocol-sha256")
        verify_freeze(output, args.protocol_sha256)
        if (output / "started.json").exists() or (output / "execution.log").exists():
            raise ValueError("Frozen run already attempted; preserve partial evidence")
        if platform.system() != "Linux":
            raise ValueError("The bounded supervisor requires the reviewed Linux environment")
        run_supervised(output, args.protocol_sha256)
    else:
        if os.environ.get("DIANA_QWEN_RESEARCH_SUPERVISED") != "1":
            raise ValueError("Use run so the hard wall-time supervisor remains active")
        with deny_network():
            execute(output, args.protocol_sha256)


if __name__ == "__main__":
    main()
