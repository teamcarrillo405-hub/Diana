"""Validation-only, fixed-recipe Qwen3 research. No final-test loader exists here.

Freeze without model inference, review protocol.json, then run using its digest.
This runner never loads a previous adapter or authorizes product activation.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import platform
import random
import signal
import socket
import subprocess
import sys
import time

from prepare_qwen3_4b_research import MODEL, REVISION, sha256, validate_snapshot, safe_path
from synthetic_lora_v4_development import datasets, SYSTEM

SETTINGS = {
    "epochs": 2, "learningRate": 0.00005, "rank": 16, "alpha": 32,
    "gradientAccumulation": 4, "batchSize": 1, "seed": 59177,
    "gradientClip": 1.0, "weightDecay": 0.01, "maxSequence": 512,
    "maxNewTokens": 128, "maxSeconds": 7200, "threads": 4,
    "targetModules": ["q_proj", "k_proj", "v_proj", "o_proj"],
    "dropout": 0.0, "dtype": "bfloat16", "optimizer": "AdamW",
    "gradientCheckpointing": True, "attentionImplementation": "eager",
    "groundedAccuracyThreshold": 0.95, "decoding": "greedy",
}
PACKAGES = ("torch", "transformers", "peft", "accelerate", "safetensors", "tokenizers")
DATA_HASHES = {
    "train": "d4795d83e6ff042480f4977a3ce327d91c11f47314ddb10f32b0af59f71281c1",
    "development": "a76d8bcb1735b9b721308cd925dfa187d44af4481c799307971e82e9f2b3aad5",
}
SYSTEM_HASH = "2b798212676eaaab2fe682a35bd36391067a4e18e2e4e56b603b66267a7e1db1"
SOURCE_FILES = ("train_qwen3_4b_research.py", "prepare_qwen3_4b_research.py",
                "synthetic_lora_v4_development.py", "synthetic_lora_v4_data.py",
                "synthetic_lora_v3_data.py")
OFFLINE = {"HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1",
           "HF_HUB_DISABLE_TELEMETRY": "1", "TOKENIZERS_PARALLELISM": "false",
           "PYTHONHASHSEED": str(SETTINGS["seed"]), "CUBLAS_WORKSPACE_CONFIG": ":4096:8"}


def canonical_hash(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"),
                                     ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def write_json(path, value):
    safe_path(path)
    with path.open("x", encoding="utf-8") as handle:
        json.dump(value, handle, indent=2, ensure_ascii=False, allow_nan=False)
        handle.flush()
        os.fsync(handle.fileno())


def read_json(path):
    safe_path(path)
    return json.loads(path.read_text(encoding="utf-8"))


@contextmanager
def deny_network():
    """Python socket guard only; do not claim an OS network sandbox."""
    targets = [(socket.socket, key) for key in ("connect", "connect_ex", "sendto")]
    targets += [(socket, key) for key in ("create_connection", "getaddrinfo")]
    originals = [(obj, key, getattr(obj, key)) for obj, key in targets]
    def denied(*_args, **_kwargs):
        raise RuntimeError("Networking denied during frozen local research")
    try:
        for obj, key, _ in originals:
            setattr(obj, key, denied)
        yield
    finally:
        for obj, key, value in originals:
            setattr(obj, key, value)


def score(text, row):
    """Unchanged V4 mechanical proxy; it is not a human pedagogical judgment."""
    lines = text.strip().splitlines()
    quote = lines[0][len("EVIDENCE: "):].strip().strip('"') if lines and lines[0].startswith("EVIDENCE: ") else ""
    next_step = lines[1][len("NEXT: "):].strip() if len(lines) > 1 and lines[1].startswith("NEXT: ") else ""
    expected = row["expectedAbstention"]
    result = {
        "twoLineFormat": len(lines) == 2 and lines[0].startswith("EVIDENCE: ") and lines[1].startswith("NEXT: "),
        "exactSourceQuoteOrAbstention": bool(quote) and (quote == "insufficient" or quote in row["source"]),
        "oneQuestion": next_step.count("?") == 1 and next_step.endswith("?"),
        "abstained": quote == "insufficient",
    }
    result["falseAbstention"] = result["abstained"] and not expected
    result["unsupportedAnswer"] = not result["abstained"] and expected
    result["expectedAbstentionMatched"] = result["abstained"] == expected
    result["relevantSourceQuoteOrAbstention"] = (quote == "insufficient" if expected else
        bool(quote) and len(quote) <= 240 and quote in row["source"] and any(span in quote for span in row.get("acceptedQuotes", [])))
    result["caseSpecificNextStep"] = result["oneQuestion"] and any(anchor.lower() in next_step.lower() for anchor in row["nextStepAnchors"])
    result["requiredConceptsPresent"] = all(any(anchor.lower() in next_step.lower() for anchor in alternatives)
        for alternatives in row.get("requiredNextStepConcepts", []))
    result["groundedCasePass"] = all(result[key] for key in ("twoLineFormat", "exactSourceQuoteOrAbstention",
        "relevantSourceQuoteOrAbstention", "expectedAbstentionMatched", "caseSpecificNextStep", "requiredConceptsPresent"))
    return result


def aggregate(records, rows):
    """Recompute diagnostics from raw outputs, reject missing/reordered evidence."""
    if not rows or len(records) != len(rows):
        raise ValueError("Incomplete evaluation")
    recomputed = []
    for record, row in zip(records, rows, strict=True):
        if record["id"] != row["id"] or not isinstance(record["output"], str):
            raise ValueError("Evaluation identity mismatch")
        if not math.isfinite(record["targetTokenLoss"]) or record["targetTokenLoss"] < 0:
            raise ValueError("Nonfinite or negative target loss")
        if type(record["targetTokens"]) is not int or record["targetTokens"] <= 0:
            raise ValueError("No positive target tokens")
        actual = score(record["output"], row)
        if record.get("diagnostics") != actual:
            raise ValueError("Mechanical diagnostics differ from raw output")
        recomputed.append(actual)
    tokens = sum(record["targetTokens"] for record in records)
    return {"cases": len(records), "targetTokens": tokens,
        "targetTokenLoss": sum(record["targetTokenLoss"] * record["targetTokens"] for record in records) / tokens,
        "counts": {key: sum(int(item[key]) for item in recomputed) for key in recomputed[0]}}


def gates(base, adapted):
    if base["cases"] != 48 or adapted["cases"] != base["cases"]:
        raise ValueError("Gate population drift")
    if any(not math.isfinite(item["targetTokenLoss"]) for item in (base, adapted)):
        raise ValueError("Nonfinite gate loss")
    return {
        "lossNonRegression": adapted["targetTokenLoss"] <= base["targetTokenLoss"],
        "falseAbstentionNonRegression": adapted["counts"]["falseAbstention"] <= base["counts"]["falseAbstention"],
        "unsupportedAnswerNonRegression": adapted["counts"]["unsupportedAnswer"] <= base["counts"]["unsupportedAnswer"],
        "groundingNonRegression": adapted["counts"]["groundedCasePass"] >= base["counts"]["groundedCasePass"],
        "groundingAtLeast95Percent": adapted["counts"]["groundedCasePass"] / adapted["cases"] >= 0.95,
    }


def select_candidate(candidates):
    if [item["epoch"] for item in candidates] != [1, 2]:
        raise ValueError("Both fixed epochs must finish before selection")
    eligible = [item for item in candidates if item["gates"] and all(item["gates"].values())]
    return min(eligible, key=lambda item: (item["metrics"]["targetTokenLoss"], item["epoch"])) if eligible else None


def validated_data():
    train, development = datasets()
    if canonical_hash(train) != DATA_HASHES["train"] or canonical_hash(development) != DATA_HASHES["development"]:
        raise ValueError("Frozen 440/48 development content changed")
    if hashlib.sha256(SYSTEM.encode()).hexdigest() != SYSTEM_HASH:
        raise ValueError("System prompt changed")
    if len(train) != 440 or len(development) != 48:
        raise ValueError("Dataset counts changed")
    if {r["family"] for r in train} & {r["family"] for r in development}:
        raise ValueError("Family overlap")
    if {(r["source"], r["question"]) for r in train} & {(r["source"], r["question"]) for r in development}:
        raise ValueError("Example overlap")
    for rows in (train, development):
        if len({r["id"] for r in rows}) != len(rows) or sum(r["expectedAbstention"] for r in rows) != len(rows) // 2:
            raise ValueError("Duplicate IDs or answerability drift")
        if any(not score(row["target"], row)["groundedCasePass"] for row in rows):
            raise ValueError("Target violates mechanical contract")
    return train, development


def token_ids(tokenizer, row):
    messages = [{"role": "system", "content": SYSTEM},
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


def environment(torch):
    if platform.system() != "Linux" or "microsoft" not in platform.release().lower():
        raise ValueError("Only the reviewed WSL ROCm environment is supported")
    if not torch.version.hip or not torch.cuda.is_available() or torch.cuda.device_count() != 1:
        raise ValueError("Exactly one supported ROCm GPU is required; no CPU fallback")
    prop = torch.cuda.get_device_properties(0)
    if "R9700" not in prop.name or not getattr(prop, "gcnArchName", "").startswith("gfx1201"):
        raise ValueError("Unreviewed GPU architecture")
    if not torch.cuda.is_bf16_supported() or prop.total_memory < 28 * 1024**3:
        raise ValueError("Reviewed native BF16 memory requirements unavailable")
    return {"python": platform.python_version(), "platform": platform.platform(),
        "packages": {name: importlib.metadata.version(name) for name in PACKAGES},
        "torchRuntime": torch.__version__, "hip": torch.version.hip,
        "gpuName": prop.name, "gpuArchitecture": prop.gcnArchName, "gpuTotalMemory": prop.total_memory,
        "device": "cuda:0", "bf16Supported": True,
        "processEnv": {name: os.environ.get(name) for name in ("HSA_ENABLE_DXG_DETECTION", "LD_LIBRARY_PATH", "PYTHONPATH", "TORCH_BLAS_PREFER_HIPBLASLT")}}


def verify_environment(actual, contract):
    if contract.get("schema") != "diana-qwen3-rocm-environment-v1" or contract.get("approved") is not True:
        raise ValueError("Explicit reviewed environment contract required")
    if actual != contract.get("environment"):
        raise ValueError("Installed runtime/hardware differs from reviewed environment contract")


def verify_qualification(contract):
    evidence = contract.get("qualificationEvidence", {})
    if not evidence.get("path") or not evidence.get("sha256"):
        raise ValueError("Qualified runtime proof must be bound by path and digest")
    path = Path(evidence["path"])
    if sha256(path) != evidence["sha256"]:
        raise ValueError("Qualified runtime proof changed")
    proof = read_json(path)
    if proof.get("status") != "qualified" or proof.get("deterministicAlgorithms") is not True:
        raise ValueError("Runtime qualification did not pass")
    if sys.executable != proof["pythonExecutable"]:
        raise ValueError("Unreviewed Python interpreter")
    if {row["kind"] for row in proof["smokes"]} != {"linear", "qwen3-lora"}:
        raise ValueError("Runtime smoke evidence incomplete")
    for smoke in proof["smokes"]:
        if not all(smoke.get(key) is True for key in ("finiteLosses", "finiteGradients", "exactRepeatPassed")) or smoke["changedTensorCount"] != smoke["trainableTensorCount"]:
            raise ValueError("Runtime numerical smoke did not pass")
    for name, record in proof["packageInventory"].items():
        if importlib.metadata.version(name) != record["version"] or not record["metadataHashes"]:
            raise ValueError("Qualified package metadata changed: " + name)
        for filename, digest in record["metadataHashes"].items():
            if sha256(Path(filename)) != digest:
                raise ValueError("Qualified package metadata bytes changed: " + name)
    for filename, digest in proof["overlayFileHashes"].items():
        if Path(filename).is_absolute() or ".." in Path(filename).parts or sha256(path.parent / filename) != digest:
            raise ValueError("Qualified PEFT overlay changed")
    if sha256(path.parent / "qualify_runtime.py") != proof["sourceSha256"]:
        raise ValueError("Qualification source changed")
    return path


def freeze(output, model_root, environment_contract):
    import torch
    from transformers import AutoTokenizer
    train, development = validated_data()
    snapshot = validate_snapshot(model_root)
    actual = environment(torch)
    contract = read_json(environment_contract)
    verify_environment(actual, contract)
    qualification_path = verify_qualification(contract)
    tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False)
    encoded = [token_ids(tokenizer, row) for row in train + development]
    safe_path(output)
    output.mkdir(parents=True, exist_ok=False)
    (output / "source").mkdir()
    for name in SOURCE_FILES:
        (output / "source" / name).write_bytes(Path(__file__).with_name(name).read_bytes())
    write_json(output / "train.json", train)
    write_json(output / "development.json", development)
    write_json(output / "environment-contract.json", contract)
    (output / "qualification.json").write_bytes(qualification_path.read_bytes())
    (output / "model-provenance.json").write_bytes((model_root / "model-provenance.json").read_bytes())
    write_json(output / "tokenization.json", encoded)
    frozen_files = {str(path.relative_to(output)).replace("\\", "/"): sha256(path)
                    for path in output.rglob("*") if path.is_file()}
    protocol = {"schema": "diana-qwen3-grounding-protocol-v1", "createdAt": datetime.now(timezone.utc).isoformat(),
        "model": MODEL, "revision": REVISION, "modelRoot": str(model_root),
        "settings": SETTINGS, "dataCanonicalHashes": DATA_HASHES, "systemSha256": SYSTEM_HASH,
        "environment": actual, "environmentSha256": canonical_hash(actual), "frozenFiles": frozen_files,
        "trainCount": len(train), "developmentCount": len(development), "expectedOptimizerSteps": 220,
        "tokenizationSha256": canonical_hash(encoded), "minimumTargetTokens": min(item["targetTokens"] for item in encoded),
        "maximumFullTokens": max(len(item["full"]) for item in encoded),
        "selection": "Two fixed epochs. Lowest development target-token loss among checkpoints passing all 95% and baseline-nonregression gates; epoch breaks ties. No fallback checkpoint. A base already at 95% needs no strict grounding improvement.",
        "freshOptimizer": True, "initialAdapter": None, "testEvaluations": 0, "testOpened": False,
        "productionEligible": False, "researchOnly": True, "educatorReviewed": False,
        "studentOrTextbookDataUsed": False, "inferencePerformed": False,
        "networkGuard": "Python socket denial plus Hugging Face offline flags; no OS sandbox claim"}
    write_json(output / "protocol.json", protocol)
    return {"protocol": str(output / "protocol.json"), "sha256": sha256(output / "protocol.json"),
            "inferencePerformed": False, "trainingPerformed": False, "productionEligible": False}


def verify_freeze(output, expected_hash):
    if sha256(output / "protocol.json") != expected_hash:
        raise ValueError("Reviewed protocol digest mismatch")
    protocol = read_json(output / "protocol.json")
    if protocol["settings"] != SETTINGS or protocol["model"] != MODEL or protocol["revision"] != REVISION:
        raise ValueError("Recipe/base changed after freeze")
    if protocol.get("productionEligible") is not False or protocol.get("testEvaluations") != 0 or protocol.get("initialAdapter") is not None:
        raise ValueError("Research boundary changed")
    for name, digest in protocol["frozenFiles"].items():
        path = output / name
        if Path(name).is_absolute() or ".." in Path(name).parts or sha256(path) != digest:
            raise ValueError("Frozen evidence drift")
    for name in SOURCE_FILES:
        if sha256(Path(__file__).with_name(name)) != sha256(output / "source" / name):
            raise ValueError("Live source changed after freeze: " + name)
    train, development = validated_data()
    if read_json(output / "train.json") != train or read_json(output / "development.json") != development:
        raise ValueError("Saved data changed")
    return protocol, train, development


def execute(output, expected_hash):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import LoraConfig, TaskType, get_peft_model, PeftModel
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
    def evaluate(model, label):
        model.gradient_checkpointing_disable()
        model.config.use_cache = True
        model.eval()
        records = []
        with (output / (label + ".jsonl")).open("x", encoding="utf-8") as handle, torch.inference_mode():
            for row, item in zip(development, encoded[len(train):], strict=True):
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
    model = load_base()
    _, baseline = evaluate(model, "baseline-development")
    model = get_peft_model(model, LoraConfig(task_type=TaskType.CAUSAL_LM,
        r=SETTINGS["rank"], lora_alpha=SETTINGS["alpha"], target_modules=SETTINGS["targetModules"],
        lora_dropout=0.0, bias="none"))
    named_params = [(name, parameter) for name, parameter in model.named_parameters() if parameter.requires_grad]
    if not named_params or any("lora_" not in name for name, _ in named_params):
        raise ValueError("Only fresh LoRA parameters may be trainable")
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
            if accumulated or optimizer_steps != epoch * 110:
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
    import gc
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
    if optimizer_steps != protocol["expectedOptimizerSteps"] or examples_seen != 880:
        raise ValueError("Training accounting drift")
    verify_freeze(output, expected_hash)
    validate_snapshot(model_root)
    write_json(output / "selection.json", {"selectedEpoch": selected["epoch"] if selected else None,
        "validationPassed": bool(selected), "candidates": candidates, "savedAdapterOutputsIdentical": reload_verified,
        "productionEligible": False, "testEvaluations": 0, "testOpened": False})
    report = {"schema": "diana-qwen3-grounding-development-v1", "status": "completed" if selected else "rejected-development",
        "protocolSha256": expected_hash, "productionEligible": False, "researchOnly": True,
        "testEvaluations": 0, "testOpened": False, "providerCalls": 0, "educatorReviewed": False,
        "trainCount": 440, "developmentCount": 48, "optimizerSteps": optimizer_steps,
        "examplesSeen": examples_seen, "targetTokensSeen": targets_seen, "trainableParameters": trainable,
        "baseline": baseline, "selectedEpoch": selected["epoch"] if selected else None,
        "elapsedSeconds": round(time.monotonic() - started, 2),
        "limitations": ["Original machine-authored data", "Development set has been reused", "Mechanical lexical grounding proxy", "No independent final test, educator review or student outcome evidence"],
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
        if not args.model_root or not args.environment_contract:
            parser.error("freeze requires --model-root and --environment-contract")
        with deny_network():
            print(json.dumps(freeze(output, args.model_root.absolute(), args.environment_contract.absolute())), flush=True)
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
