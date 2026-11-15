"""Offline DPO plus chosen-response SFT; formal gates are not semantic acceptance.

Continue the verified run-008 epoch-two research adapter with new independently
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
import train_qwen3_grounding_revision as prior
import train_qwen3_preference as preference_parent
from train_qwen3_preference import SYSTEM as ORIGINAL_SYSTEM
from qwen3_evidence_integrity_metrics import score, aggregate, gates
from qwen3_evidence_integrity_contract import SYSTEM, SYSTEM_HASH

SETTINGS = {"epochs": 3, "learningRate": 0.00001, "beta": 0.1, "chosenSFTWeight": 0.5,
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
SOURCE_FILES = tuple(dict.fromkeys((*preference_parent.SOURCE_FILES,
    "verify_qwen3_preference_v2.py", "train_qwen3_evidence_integrity.py",
    "qwen3_evidence_integrity_contract.py", "qwen3_evidence_integrity_metrics.py",
    "verify_qwen3_evidence_integrity.py", *DATA_MODULES)))
OFFLINE = {**initial.OFFLINE, "PYTHONHASHSEED": str(SETTINGS["seed"])}
CATEGORIES = {name: 60 for name in ("evidence-mutation", "task-scope", "missing-procedure", "missing-inputs", "source-instruction")}
SELECTION = "All three fixed epochs retained. Only final epoch three can be selected if strict formal gates pass. No earlier-epoch fallback. The 95% complete semantic and zero-fabrication gate requires subsequent independent blinded review."
REFERENCE_POLICY = "verified run-008 epoch-two cached before fitting; never refreshed"
OBJECTIVE = "-logsigmoid(beta*((chosen_sum-rejected_sum)-(reference_chosen_sum-reference_rejected_sum))) + chosenSFTWeight*(-chosen_sum/chosen_tokens)"
PRIOR_TRAINING_COUNTS = {"qwen3-run-008": 200, "qwen3-run-007": 600, "qwen3-run-006": 440}
assert_identical_outputs = prior.assert_identical_outputs


def objective_terms(chosen, rejected, reference_chosen, reference_rejected, chosen_tokens):
    values = (chosen, rejected, reference_chosen, reference_rejected)
    if any(type(value) not in (int, float) or not math.isfinite(value) or value > 0 for value in values):
        raise ValueError("Log probabilities must be finite and nonpositive")
    if type(chosen_tokens) is not int or chosen_tokens <= 0:
        raise ValueError("Positive chosen target token count required")
    margin = (chosen - rejected) - (reference_chosen - reference_rejected)
    scaled = SETTINGS["beta"] * margin
    dpo = max(-scaled, 0.0) + math.log1p(math.exp(-abs(scaled)))
    chosen_ce = -chosen / chosen_tokens
    return {"preferenceMargin": margin, "scaledPreferenceMargin": scaled, "dpoLoss": dpo,
            "chosenTokenMeanCE": chosen_ce, "combinedLoss": dpo + SETTINGS["chosenSFTWeight"] * chosen_ce}


def tensor_objective(chosen, rejected, reference_chosen, reference_rejected, chosen_tokens):
    import torch.nn.functional as functional
    margin = (chosen - rejected) - (reference_chosen - reference_rejected)
    dpo = -functional.logsigmoid(SETTINGS["beta"] * margin)
    ce = -chosen / chosen_tokens
    return dpo + SETTINGS["chosenSFTWeight"] * ce, dpo, ce, margin


def sequence_logps(model, item, device="cuda:0"):
    import torch
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


def validated_data():
    from qwen3_evidence_integrity_data_a import rows as authored_a
    from qwen3_evidence_integrity_data_b import rows as authored_b
    first, second = authored_a(), authored_b()
    development = prior.development_rows()
    return validate_training(first, second, development), development


def validate_training(first, second, development):
    for partition in (first, second):
        if len(partition) != 150 or len({row["source"] for row in partition}) != 75 or Counter(row["expectedAbstention"] for row in partition) != {True: 75, False: 75}:
            raise ValueError("Each preference author must supply 150 pairs from 75 balanced contexts")
    rows = first + second
    if len({row["id"] for row in rows}) != 300 or len({row["source"] for row in rows}) != 150:
        raise ValueError("Exactly 300 distinct pairs and 150 contexts required")
    if Counter(row["preferenceCategory"] for row in rows) != CATEGORIES:
        raise ValueError("Preference defect category distribution changed")
    if Counter(row["subject"] for row in rows) != {name: 60 for name in ("math", "reading", "English", "science", "history")}:
        raise ValueError("Preference subject balance changed")
    for source in {row["source"] for row in rows}:
        group = [row for row in rows if row["source"] == source]
        if len(group) != 2 or Counter(row["expectedAbstention"] for row in group) != {True: 1, False: 1} or len({row["question"] for row in group}) != 2:
            raise ValueError("Every context needs distinct supported and insufficient questions")
        if any(len({row.get(flag) for row in group}) != 1 for flag in ("conflictingContext", "sourceInstructionPresent")):
            raise ValueError("Context conflict/instruction annotations disagree")
    conflicts = {row["source"] for row in rows if row.get("conflictingContext") is True}
    if len(conflicts) < 30:
        raise ValueError("At least 30 independently audited conflicting contexts required")
    injections = {row["source"] for row in rows if row.get("sourceInstructionPresent") is True}
    if len(injections) < 30:
        raise ValueError("At least 30 independently audited source-instruction contexts required")
    if {row["source"] for row in rows} & {row["source"] for row in development} or {row["id"] for row in rows} & {row["id"] for row in development}:
        raise ValueError("Preference/development overlap")
    for row in rows:
        if any(type(row.get(flag)) is not bool for flag in ("expectedAbstention", "conflictingContext", "sourceInstructionPresent")) or any(not isinstance(row.get(key), str) or not row[key].strip() for key in ("id", "family", "subject", "level", "source", "question", "target", "rejected", "preferenceReason")):
            raise ValueError("Missing preference annotations")
        if row["target"] == row["rejected"] or len(row["preferenceReason"].strip()) < 20:
            raise ValueError("A distinct rejected response and concrete rationale are required")
        if not score(row["target"], row)["groundedCasePass"]:
            raise ValueError("Preferred response violates strict evidence-integrity contract: " + row["id"])
    return rows


def validate_audit(audit, train):
    if audit.get("schema") != "diana-qwen3-evidence-integrity-audit-v1" or audit.get("approvedForTraining") is not True or audit.get("independentReviewer") is not True:
        raise ValueError("Full independent preference-pair audit required")
    if audit.get("educatorReviewed") is not False or audit.get("unresolvedFindings") != [] or audit.get("trainingCanonicalSha256") != canonical_hash(train):
        raise ValueError("Audit limits, unresolved findings, or pair hashes differ")
    if audit.get("sourceSha256") != {name: sha256(Path(__file__).with_name(name)) for name in DATA_MODULES}:
        raise ValueError("Preference author source changed after audit")
    reviews = audit.get("caseReviews", [])
    mapping = {row["id"]: row for row in train}
    if len(reviews) != 300 or {row["id"] for row in reviews} != set(mapping):
        raise ValueError("All 300 preference pairs require individual audit")
    for review in reviews:
        if any(review.get(key) is not True for key in ("passed", "chosenPass", "rejectedIsInferior")) or review.get("pairHash") != canonical_hash(mapping[review["id"]]) or not isinstance(review.get("notes"), str) or len(review["notes"].strip()) < 20:
            raise ValueError("Preferred/rejected audit judgment, pair binding or notes missing")
    if not isinstance(audit.get("evidenceFiles"), dict) or len(audit["evidenceFiles"]) != 2:
        raise ValueError("Both independent partition audit evidence files are required")
    reviewer_ids, reviewed_ids = set(), set()
    for name, value in audit["evidenceFiles"].items():
        path = Path(name)
        safe_path(path)
        if not path.is_absolute() or sha256(path) != value:
            raise ValueError("Independent preference audit evidence changed")
        proof = read_json(path)
        reviewer = proof.get("reviewerId")
        if not isinstance(reviewer, str) or not reviewer.strip() or reviewer in reviewer_ids:
            raise ValueError("Independent reviewer identities must be present and distinct")
        reviewer_ids.add(reviewer)
        if proof.get("approvedForTraining") is not True or proof.get("independentReviewer") is not True or proof.get("educatorReviewed") is not False or proof.get("unresolvedFindings") != []:
            raise ValueError("Independent partition audit approval or boundaries changed")
        cases = proof.get("caseReviews", [])
        ids = {case["id"] for case in cases}
        partitions = [(train[:150], DATA_MODULES[0]), (train[150:], DATA_MODULES[1])]
        matched = [(rows, module) for rows, module in partitions if ids == {row["id"] for row in rows}]
        if len(cases) != 150 or len(ids) != 150 or len(matched) != 1 or ids & reviewed_ids:
            raise ValueError("Independent partition audit coverage changed")
        rows, module = matched[0]
        if proof.get("sourceSha256") != audit["sourceSha256"][module] or proof.get("canonicalRowsSha256") != canonical_hash(rows):
            raise ValueError("Independent partition audit source or row binding changed")
        for case in cases:
            if any(case.get(key) is not True for key in ("passed", "chosenPass", "rejectedIsInferior")) or case.get("pairHash") != canonical_hash(mapping[case["id"]]) or not isinstance(case.get("notes"), str) or len(case["notes"].strip()) < 20:
                raise ValueError("Independent individual pair audit judgment or binding missing")
        reviewed_ids.update(ids)
    if reviewed_ids != set(mapping):
        raise ValueError("Independent audit union is incomplete")


def parent_evidence(root):
    from verify_qwen3_preference_v2 import verify
    if root.name != "qwen3-run-008" or sha256(root / "report.json") != PARENT_REPORT_HASH or sha256(root / "protocol.json") != PARENT_PROTOCOL_HASH:
        raise ValueError("Only immutable run-008 epoch two is the allowed research parent")
    checked = verify(root)
    if checked.get("verified") is not True or checked.get("selectedEpoch") != 2 or checked.get("automaticEligibilityPassed") is not True or checked.get("testOpened") is not False:
        raise ValueError("Selected parent research evidence did not verify")
    names = ("report.json", "protocol.json", "selection.json", "completion.json", "supervisor-artifact-manifest.json",
        "model-provenance.json", "epoch-2/adapter_model.safetensors", "epoch-2/adapter_config.json", "epoch-2-development.jsonl")
    return {"root": str(root), "epoch": 2, "selectionRule": "Previously selected run-008 epoch two; verified research parent without a semantic acceptance claim",
        "files": {name: sha256(root / name) for name in names}, "verified": checked}


def prior_training_overlap(train, parent_root):
    """Check only the verified development-training ancestry, never final cases.

    Call after parent_evidence has verified the complete parent chain. The
    durable receipt contains identities/counts/hashes, never prior case text.
    """
    new_ids = {row["id"] for row in train}
    new_sources = {row["source"] for row in train}
    new_questions = {(row["source"], row["question"]) for row in train}
    ancestors = []
    root = Path(parent_root).resolve()
    expected = list(PRIOR_TRAINING_COUNTS.items())
    for index, (name, count) in enumerate(expected):
        if root.name != name:
            raise ValueError("Unexpected prior-training ancestry order")
        for filename in ("protocol.json", "train.json"):
            safe_path(root / filename)
        protocol = read_json(root / "protocol.json")
        rows = read_json(root / "train.json")
        if not isinstance(rows, list) or len(rows) != count or any(not isinstance(row, dict) or any(not isinstance(row.get(key), str) or not row[key] for key in ("id", "source", "question")) for row in rows):
            raise ValueError("Prior-training population or annotations changed")
        overlaps = {"ids": len(new_ids & {row["id"] for row in rows}),
            "sources": len(new_sources & {row["source"] for row in rows}),
            "sourceQuestions": len(new_questions & {(row["source"], row["question"]) for row in rows})}
        if any(overlaps.values()):
            raise ValueError("New training overlaps verified ancestor by ID, source, or source/question")
        ancestors.append({"name": name, "root": str(root), "trainCount": count,
            "protocolSha256": sha256(root / "protocol.json"), "trainingSha256": sha256(root / "train.json"),
            "trainingCanonicalSha256": canonical_hash(rows), "overlapCounts": overlaps})
        if index + 1 < len(expected):
            recorded = protocol.get("parent", {}).get("root")
            if not isinstance(recorded, str) or not Path(recorded).is_absolute():
                raise ValueError("Prior-training parent path is missing or relative")
            next_root = Path(recorded).resolve()
            if next_root != root.parent / expected[index + 1][0]:
                raise ValueError("Prior-training chain left the verified sibling ancestry")
            root = next_root
    return {"schema": "diana-qwen3-evidence-integrity-prior-training-overlap-v1",
        "newTrainingCanonicalSha256": canonical_hash(train), "ancestors": ancestors,
        "priorTrainingPairs": sum(PRIOR_TRAINING_COUNTS.values()), "zeroOverlap": True}


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
def pair_tokens(tokenizer, row):
    chosen = token_ids(tokenizer, row)
    rejected = token_ids(tokenizer, {**row, "target": row["rejected"]})
    if chosen["prefix"] != rejected["prefix"]:
        raise ValueError("Chosen/rejected prompt prefixes differ")
    return {"id": row["id"], "chosen": chosen, "rejected": rejected}


def validate_reference_cache(cache, pairs, parent_hash, protocol_hash):
    if cache.get("schema") != "diana-qwen3-frozen-preference-reference-v1" or cache.get("parentAdapterSha256") != parent_hash or cache.get("protocolSha256") != protocol_hash or cache.get("pairTokenizationSha256") != canonical_hash(pairs) or cache.get("systemSha256") != SYSTEM_HASH or cache.get("createdBeforeOptimizer") is not True:
        raise ValueError("Reference cache binding changed")
    records = cache.get("pairs", [])
    if len(records) != len(pairs) or len(records) != 300:
        raise ValueError("Incomplete frozen reference pairs")
    for record, pair in zip(records, pairs, strict=True):
        if record.get("id") != pair["id"]:
            raise ValueError("Reference pair identity drift")
        for label in ("chosen", "rejected"):
            values = record.get(label + "TokenLogps", [])
            tokens = pair[label]["targetTokens"]
            total = record.get(label + "SumLogp")
            if record.get(label + "Tokens") != tokens or len(values) != tokens or not values or any(type(value) not in (int, float) or not math.isfinite(value) or value > 0 for value in values) or type(total) not in (int, float) or not math.isfinite(total) or not math.isclose(sum(values), total, rel_tol=1e-6, abs_tol=SETTINGS["objectiveAuditTolerance"]):
                raise ValueError("Reference target log probability accounting drift")
    return records


def qualify_objective(output, contract_path):
    """Tiny randomly initialized Qwen3 fixture only; no real model or cases."""
    import torch
    from transformers import Qwen3Config, Qwen3ForCausalLM
    from peft import LoraConfig, TaskType, get_peft_model
    actual = environment(torch)
    contract = read_json(contract_path)
    verify_environment(actual, contract)
    verify_qualification(contract)
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
    prefix = [1, 3, 4, 5, 6, 7]
    def item(target):
        return {"prefix": prefix, "full": prefix + target, "labels": [-100] * len(prefix) + target, "targetTokens": len(target)}
    chosen, rejected = item([9, 10, 11, 2]), item([12, 13, 14, 15, 2])
    model.eval()
    model.config.use_cache = False
    with torch.inference_mode():
        reference_chosen, _ = sequence_logps(model, chosen)
        reference_rejected, _ = sequence_logps(model, rejected)
        references = [float(reference_chosen), float(reference_rejected)]
    reference_hash = canonical_hash(references)
    params = [parameter for parameter in model.parameters() if parameter.requires_grad]
    before = [parameter.detach().clone() for parameter in params]
    optimizer = torch.optim.AdamW(params, lr=SETTINGS["learningRate"], weight_decay=SETTINGS["weightDecay"])
    model.train()
    model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
    events = []
    for step in range(2):
        optimizer.zero_grad(set_to_none=True)
        chosen_sum, _ = sequence_logps(model, chosen)
        rejected_sum, _ = sequence_logps(model, rejected)
        loss, dpo, ce, _ = tensor_objective(chosen_sum, rejected_sum, *references, chosen["targetTokens"])
        expected = objective_terms(float(chosen_sum.detach()), float(rejected_sum.detach()), *references, chosen["targetTokens"])
        if not math.isclose(float(loss.detach()), expected["combinedLoss"], rel_tol=1e-5, abs_tol=SETTINGS["objectiveAuditTolerance"]):
            raise ValueError("Tiny objective differs from standard reference")
        if step == 0 and not math.isclose(float(dpo.detach()), math.log(2), abs_tol=1e-5):
            raise ValueError("Initial policy and frozen reference disagree")
        loss.backward()
        if any(parameter.grad is None or not torch.isfinite(parameter.grad).all() for parameter in params):
            raise ValueError("Tiny-model DPO gradients are missing or nonfinite")
        norm = torch.nn.utils.clip_grad_norm_(params, SETTINGS["gradientClip"], error_if_nonfinite=True)
        optimizer.step()
        events.append({"step": step + 1, **expected, "gradientNorm": float(norm)})
    changed = sum(not torch.equal(old, parameter.detach()) for old, parameter in zip(before, params, strict=True))
    if changed != len(params) or canonical_hash(references) != reference_hash:
        raise ValueError("Tiny DPO adapter did not update or frozen reference changed")
    scalar_chosen = torch.tensor(-5.0, requires_grad=True)
    scalar_rejected = torch.tensor(-6.0, requires_grad=True)
    scalar_loss, _, _, _ = tensor_objective(scalar_chosen, scalar_rejected, -5., -6., 4)
    scalar_loss.backward()
    if not (float(scalar_chosen.grad) < 0 < float(scalar_rejected.grad)):
        raise ValueError("DPO preference gradient direction is reversed")
    proof = {"schema": "diana-qwen3-dpo-objective-qualification-v1", "status": "qualified",
        "sourceSha256": sha256(Path(__file__)), "settingsSha256": canonical_hash(SETTINGS),
        "environment": actual, "environmentSha256": canonical_hash(actual), "runtimeContractSha256": sha256(contract_path),
        "randomTinyModelOnly": True, "realModelOrTrainingDataLoaded": False,
        "initialDPOLossEqualsLog2": True, "finiteGradients": True, "gradientDirectionPassed": True,
        "referenceUnchanged": True, "referenceSha256": reference_hash, "trainableTensors": len(params),
        "changedTensors": changed, "events": events, "productionEligible": False}
    write_json(output, proof)
    return proof


def validate_objective_qualification(path, actual):
    proof = read_json(path)
    if proof.get("schema") != "diana-qwen3-dpo-objective-qualification-v1" or proof.get("status") != "qualified" or proof.get("sourceSha256") != sha256(Path(__file__)) or proof.get("settingsSha256") != canonical_hash(SETTINGS):
        raise ValueError("DPO objective source/recipe qualification changed")
    if proof.get("environment") != actual or proof.get("environmentSha256") != canonical_hash(actual):
        raise ValueError("DPO objective qualified environment differs")
    if any(proof.get(key) is not True for key in ("randomTinyModelOnly", "initialDPOLossEqualsLog2", "finiteGradients", "gradientDirectionPassed", "referenceUnchanged")) or proof.get("realModelOrTrainingDataLoaded") is not False:
        raise ValueError("DPO numerical qualification incomplete")
    if proof.get("trainableTensors") != 16 or proof.get("changedTensors") != 16 or len(proof.get("events", [])) != 2:
        raise ValueError("Tiny DPO adapter update evidence incomplete")
    return proof


def copy_runtime_contract(source, destination):
    """Preserve the approved file's raw identity, including whitespace and newline."""
    raw = source.read_bytes()
    destination.write_bytes(raw)
    if destination.read_bytes() != raw:
        raise ValueError("Runtime contract byte copy differs")


def freeze(output, model_root, environment_contract, parent_root, audit_path, objective_qualification):
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
    pairs = [pair_tokens(tokenizer, row) for row in train]
    qualification = validate_objective_qualification(objective_qualification, actual)
    if qualification["runtimeContractSha256"] != sha256(environment_contract):
        raise ValueError("DPO objective runtime contract differs")
    original_encoded = [token_ids(tokenizer, row, ORIGINAL_SYSTEM) for row in development]
    safe_path(output)
    output.mkdir(parents=True, exist_ok=False)
    (output / "source").mkdir()
    for name in SOURCE_FILES:
        (output / "source" / name).write_bytes(Path(__file__).with_name(name).read_bytes())
    (output / "design.md").write_bytes((Path(__file__).resolve().parents[2] / "docs/engineering/qwen3-evidence-integrity-design.md").read_bytes())
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
    copy_runtime_contract(environment_contract, output / "environment-contract.json")
    write_json(output / "parent-evidence.json", parent)
    write_json(output / "prior-training-overlap.json", overlap_audit)
    (output / "qualification.json").write_bytes(qualification_path.read_bytes())
    (output / "model-provenance.json").write_bytes((model_root / "model-provenance.json").read_bytes())
    write_json(output / "tokenization.json", encoded)
    write_json(output / "pair-tokenization.json", pairs)
    write_json(output / "objective-qualification.json", qualification)
    write_json(output / "parent-original-tokenization.json", original_encoded)
    protocol = {"schema": "diana-qwen3-evidence-integrity-protocol-v1", "createdAt": datetime.now(timezone.utc).isoformat(),
        "model": MODEL, "revision": REVISION, "modelRoot": str(model_root), "parent": parent,
        "settings": SETTINGS, "dataCanonicalHashes": {"train": canonical_hash(train), "development": DEVELOPMENT_HASH},
        "system": SYSTEM, "systemSha256": SYSTEM_HASH, "originalSystemSha256": preference_parent.SYSTEM_HASH,
        "environment": actual, "environmentSha256": canonical_hash(actual),
        "priorTrainingOverlapAuditSha256": sha256(output / "prior-training-overlap.json"),
        "frozenFiles": {p.relative_to(output).as_posix(): sha256(p) for p in output.rglob("*") if p.is_file()},
        "trainCount": 300, "developmentCount": 48, "expectedOptimizerSteps": 225,
        "tokenizationSha256": canonical_hash(encoded), "pairTokenizationSha256": canonical_hash(pairs), "parentOriginalTokenizationSha256": canonical_hash(original_encoded),
        "minimumTargetTokens": min(item["targetTokens"] for item in encoded), "maximumFullTokens": max(len(item["full"]) for item in encoded),
        "selection": SELECTION,
        "objective": OBJECTIVE, "referencePolicy": REFERENCE_POLICY, "freshOptimizer": True, "initialAdapter": {"epoch": 2, "root": str(parent_root)},
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
    if protocol.get("schema") != "diana-qwen3-evidence-integrity-protocol-v1":
        raise ValueError("Unexpected evidence-integrity protocol schema")
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
    if protocol.get("originalSystemSha256") != preference_parent.SYSTEM_HASH or protocol.get("selection") != SELECTION or protocol.get("referencePolicy") != REFERENCE_POLICY or protocol.get("objective") != OBJECTIVE:
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
    pairs = [pair_tokens(tokenizer, row) for row in train]
    if pairs != read_json(output / "pair-tokenization.json") or canonical_hash(pairs) != protocol["pairTokenizationSha256"]:
        raise ValueError("Preference tokenization changed after freeze")
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
    _, baseline = evaluate(model, "baseline-development")
    model = PeftModel.from_pretrained(model, parent_root / "epoch-2", local_files_only=True, is_trainable=True)
    _, parent_metrics = evaluate(model, "parent-development")
    named_params = [(name, parameter) for name, parameter in model.named_parameters() if parameter.requires_grad]
    if not named_params or any("lora_" not in name for name, _ in named_params):
        raise ValueError("Only verified parent LoRA parameters may be trainable")
    params = [parameter for _, parameter in named_params]
    trainable = sum(parameter.numel() for parameter in params)
    write_json(output / "parameters.json", {"trainable": trainable,
        "total": sum(parameter.numel() for parameter in model.parameters()),
        "names": {name: {"elements": parameter.numel(), "dtype": str(parameter.dtype)} for name, parameter in named_params}})
    parent_hash = protocol["parent"]["files"]["epoch-2/adapter_model.safetensors"]
    reference_pairs = []
    model.eval()
    model.gradient_checkpointing_disable()
    model.config.use_cache = False
    with (output / "reference-cache-progress.jsonl").open("x", encoding="utf-8") as progress, torch.inference_mode():
        for pair in pairs:
            bounded()
            record = {"id": pair["id"]}
            for label in ("chosen", "rejected"):
                total, per_token = sequence_logps(model, pair[label])
                record.update({label + "SumLogp": float(total), label + "Tokens": pair[label]["targetTokens"],
                               label + "TokenLogps": per_token.tolist()})
            reference_pairs.append(record)
            progress.write(json.dumps(record, allow_nan=False) + "\n")
            progress.flush()
            os.fsync(progress.fileno())
    cache = {"schema": "diana-qwen3-frozen-preference-reference-v1", "parentAdapterSha256": parent_hash,
        "protocolSha256": expected_hash, "pairTokenizationSha256": canonical_hash(pairs), "systemSha256": SYSTEM_HASH,
        "createdBeforeOptimizer": True, "pairs": reference_pairs}
    write_json(output / "reference-cache.json", cache)
    reference_hash = sha256(output / "reference-cache.json")
    references = validate_reference_cache(read_json(output / "reference-cache.json"), pairs, parent_hash, expected_hash)
    optimizer = torch.optim.AdamW(params, lr=SETTINGS["learningRate"], weight_decay=SETTINGS["weightDecay"])
    if optimizer.state:
        raise ValueError("Optimizer must start fresh after the frozen reference cache")
    write_json(output / "optimizer-start.json", {"referenceCacheSha256": reference_hash,
        "referencePairCount": 300, "optimizerStateInitiallyEmpty": True, "optimizerSteps": 0})
    candidates, optimizer_steps, examples_seen, targets_seen, rejected_targets_seen = [], 0, 0, 0, 0
    with (output / "training-history.jsonl").open("x", encoding="utf-8") as history:
        for epoch in range(1, 4):
            if sha256(output / "reference-cache.json") != reference_hash:
                raise ValueError("Frozen reference cache changed during fitting")
            model.train()
            model.config.use_cache = False
            model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
            optimizer.zero_grad(set_to_none=True)
            order = list(range(len(train)))
            random.Random(SETTINGS["seed"] + epoch).shuffle(order)
            accumulated = []
            for position, index in enumerate(order):
                bounded()
                pair, reference = pairs[index], references[index]
                chosen_sum, chosen_values = sequence_logps(model, pair["chosen"])
                rejected_sum, rejected_values = sequence_logps(model, pair["rejected"])
                loss, dpo, chosen_ce, margin = tensor_objective(chosen_sum, rejected_sum,
                    reference["chosenSumLogp"], reference["rejectedSumLogp"], pair["chosen"]["targetTokens"])
                if not all(bool(torch.isfinite(value)) for value in (loss, dpo, chosen_ce, margin)):
                    raise ValueError("Nonfinite preference objective")
                audited = objective_terms(float(chosen_sum.detach()), float(rejected_sum.detach()),
                    reference["chosenSumLogp"], reference["rejectedSumLogp"], pair["chosen"]["targetTokens"])
                if not math.isclose(float(loss.detach()), audited["combinedLoss"], rel_tol=1e-5, abs_tol=SETTINGS["objectiveAuditTolerance"]):
                    raise ValueError("Tensor DPO objective differs from standard scalar reference")
                (loss / SETTINGS["gradientAccumulation"]).backward()
                examples_seen += 1
                targets_seen += pair["chosen"]["targetTokens"]
                rejected_targets_seen += pair["rejected"]["targetTokens"]
                accumulated.append({"id": train[index]["id"], "chosenSumLogp": float(chosen_sum.detach()),
                    "rejectedSumLogp": float(rejected_sum.detach()), "referenceChosenSumLogp": reference["chosenSumLogp"],
                    "referenceRejectedSumLogp": reference["rejectedSumLogp"], "chosenTokens": pair["chosen"]["targetTokens"],
                    "rejectedTokens": pair["rejected"]["targetTokens"], "chosenTokenLogps": chosen_values.detach().tolist(),
                    "rejectedTokenLogps": rejected_values.detach().tolist(), **audited,
                    "tensorCombinedLoss": float(loss.detach()), "tensorDPOLoss": float(dpo.detach()),
                    "tensorChosenTokenMeanCE": float(chosen_ce.detach())})
                if (position + 1) % SETTINGS["gradientAccumulation"] == 0:
                    norm = torch.nn.utils.clip_grad_norm_(params, SETTINGS["gradientClip"], error_if_nonfinite=True)
                    optimizer.step()
                    optimizer.zero_grad(set_to_none=True)
                    optimizer_steps += 1
                    event = {"epoch": epoch, "optimizerStep": optimizer_steps, "gradientNorm": float(norm),
                        "examples": accumulated, "examplesSeen": examples_seen, "targetTokensSeen": targets_seen, "rejectedTargetTokensSeen": rejected_targets_seen, "referenceCacheSha256": reference_hash}
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
    if sha256(output / "reference-cache.json") != reference_hash:
        raise ValueError("Reference cache changed after fitting")
    validate_reference_cache(read_json(output / "reference-cache.json"), pairs, parent_hash, expected_hash)
    verify_freeze(output, expected_hash)
    validate_snapshot(model_root)
    write_json(output / "selection.json", {"selectedEpoch": selected["epoch"] if selected else None,
        "automaticEligibilityPassed": bool(selected), "validationPassed": False, "semanticQualityValidated": False, "candidates": candidates, "savedAdapterOutputsIdentical": reload_verified,
        "productionEligible": False, "testEvaluations": 0, "testOpened": False})
    report = {"schema": "diana-qwen3-evidence-integrity-development-v1", "status": "awaiting-semantic-review" if selected else "rejected-automatic-eligibility",
        "protocolSha256": expected_hash, "productionEligible": False, "researchOnly": True, "validationPassed": False,
        "testEvaluations": 0, "testOpened": False, "providerCalls": 0, "educatorReviewed": False,
        "trainCount": 300, "developmentCount": 48, "optimizerSteps": optimizer_steps,
        "examplesSeen": examples_seen, "targetTokensSeen": targets_seen, "rejectedTargetTokensSeen": rejected_targets_seen,
        "referenceCacheSha256": reference_hash, "trainableParameters": trainable, "method": "standard DPO plus chosen-response supervised loss",
        "baseline": baseline, "parent": parent_metrics, "parentOriginal": original_parent_metrics, "semanticQualityValidated": False, "automaticEligibilityPassed": bool(selected), "selectedEpoch": selected["epoch"] if selected else None,
        "elapsedSeconds": round(time.monotonic() - started, 2),
        "limitations": ["Original machine-authored data", "Development set has been reused", "Formal eligibility cannot establish 95% semantic quality", "Legacy lexical grounding is diagnostic only", "No independent final test, educator review or student outcome evidence"],
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
            raise RuntimeError("Preference research worker exited unsuccessfully")
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
                "initialDPOLoss": proof["events"][0]["dpoLoss"], "productionEligible": False}))
    elif args.action == "freeze":
        if not args.model_root or not args.environment_contract or not args.parent_run or not args.training_audit or not args.objective_qualification:
            parser.error("freeze requires --model-root, --environment-contract, --parent-run, --training-audit and --objective-qualification")
        with deny_network():
            print(json.dumps(freeze(output, args.model_root.absolute(), args.environment_contract.absolute(), args.parent_run.absolute(), args.training_audit.absolute(), args.objective_qualification.absolute())), flush=True)
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
