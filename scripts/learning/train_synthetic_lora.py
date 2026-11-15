"""Real, bounded CPU LoRA research on code-pinned original synthetic fixtures.

No user-supplied training examples, provider calls, signed review fabrication,
production activation, or replacement of the permissioned-data runner.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import random
import socket
import time
from datetime import datetime, timezone

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from prepare_synthetic_lora import MODEL, REVISION, final_rows, rows, sha

VERSIONS = {"torch": "2.12.0", "transformers": "5.17.0", "peft": "0.21.0", "accelerate": "1.15.0", "safetensors": "0.8.0", "tokenizers": "0.23.2"}
MAX_SEQUENCE = 256
MAX_SECONDS = 2700
SEED = 1729
MODEL_FILE_HASHES = {
    "LICENSE": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
    "README.md": "b19c806a904db6dc878a0462e70b551f6b7ac78dfbb88c2eb966ca2b9109ae15",
    "config.json": "18e18afcaccafade98daf13a54092927904649e1dd4eba8299ab717d5d94ff45",
    "generation_config.json": "e558847a8b4402616f1273797b015104dc266fe4b520056fca88823ba8f8ebe6",
    "merges.txt": "599bab54075088774b1733fde865d5bd747cbcc7a547c5bc12610e874e26f5e3",
    "model.safetensors": "fdf756fa7fcbe7404d5c60e26bff1a0c8b8aa1f72ced49e7dd0210fe288fb7fe",
    "tokenizer.json": "c0382117ea329cdf097041132f6d735924b697924d6f6fc3945713e96ce87539",
    "tokenizer_config.json": "5b5d4f65d0acd3b2d56a35b56d374a36cbc1c8fa5cf3b3febbbfabf22f359583",
    "vocab.json": "ca10d7e9fb3ed18575dd1e277a2579c16d108e32f27439684afa0e10b1440910",
}


@contextmanager
def deny_network():
    original_connect, original_connect_ex, original_create = socket.socket.connect, socket.socket.connect_ex, socket.create_connection
    def denied(*_args, **_kwargs):
        raise RuntimeError("Networking is disabled during local synthetic training")
    socket.socket.connect = denied
    socket.socket.connect_ex = denied
    socket.create_connection = denied
    try:
        yield
    finally:
        socket.socket.connect, socket.socket.connect_ex, socket.create_connection = original_connect, original_connect_ex, original_create


def validate_data(root):
    manifest = json.loads((root / "dataset-manifest.json").read_text(encoding="utf-8"))
    if manifest.get("researchOnly") is not True or manifest.get("productionEligible") is not False or manifest.get("educatorReviewed") is not False:
        raise ValueError("Synthetic research status must be explicit")
    expected = list(rows())
    if manifest.get("partition", "development") == "subsequent-test":
        expected[1] = final_rows()
    elif manifest.get("partition", "development") != "development":
        raise ValueError("Unrecognized research partition")
    result = []
    for name, original in zip(("train.jsonl", "heldout.jsonl"), expected):
        path = root / name
        actual = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]
        if actual != original or manifest["files"].get(name) != sha(path):
            raise ValueError("Only unchanged code-pinned original synthetic fixtures may be used")
        result.append(actual)
    if {row["family"] for row in result[0]} & {row["family"] for row in result[1]}:
        raise ValueError("Held-out family overlap")
    return result


def validate_model(root):
    provenance = json.loads((root / "model-provenance.json").read_text(encoding="utf-8"))
    if provenance["model"] != MODEL or provenance["license"] != "apache-2.0":
        raise ValueError("Only the explicit Qwen research candidate is permitted")
    revision = provenance["revision"]
    if revision != REVISION:
        raise ValueError("Model revision must be an immutable commit")
    snapshot = root / "model" / revision
    required = {"config.json", "generation_config.json", "model.safetensors", "tokenizer.json", "tokenizer_config.json", "vocab.json", "merges.txt", "LICENSE", "README.md"}
    if set(provenance["files"]) != required:
        raise ValueError("Incomplete model provenance")
    if {name: value["sha256"] for name, value in provenance["files"].items()} != MODEL_FILE_HASHES:
        raise ValueError("Unrecognized publisher model or tokenizer bytes")
    for name, record in provenance["files"].items():
        path = snapshot / name
        if path.is_symlink() or not path.is_file() or path.stat().st_size != record["bytes"] or sha(path) != record["sha256"]:
            raise ValueError(f"Model file drift: {name}")
    config = json.loads((snapshot / "config.json").read_text())
    if config.get("model_type") != "qwen2" or config.get("num_hidden_layers") != 24 or config.get("hidden_size") != 896:
        raise ValueError("Unexpected model architecture")
    return snapshot, provenance


def diagnostics(text, source):
    lines = text.strip().splitlines()
    valid = len(lines) == 2 and lines[0].startswith("EVIDENCE: ") and lines[1].startswith("NEXT: ")
    quote = lines[0][len("EVIDENCE: "):].strip().strip('"') if lines and lines[0].startswith("EVIDENCE: ") else ""
    next_step = lines[1][len("NEXT: "):].strip() if len(lines) > 1 and lines[1].startswith("NEXT: ") else ""
    return {"twoLineFormat": valid, "exactSourceQuoteOrAbstention": bool(quote) and (quote == "insufficient" or quote in source), "oneQuestion": next_step.count("?") == 1 and next_step.endswith("?"), "abstained": quote == "insufficient"}


def execute(root: Path, recipe="initial"):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import LoraConfig, TaskType, get_peft_model
    import psutil

    started = time.monotonic()
    installed = {name: importlib.metadata.version(name) for name in VERSIONS}
    if installed != VERSIONS:
        raise ValueError(f"Dependency drift: {installed}")
    train, heldout = validate_data(root)
    snapshot, provenance = validate_model(root)
    partition = json.loads((root / "dataset-manifest.json").read_text()).get("partition", "development")
    if recipe not in ("initial", "conservative") or (recipe == "conservative") != (partition == "subsequent-test"):
        raise ValueError("Recipe does not match its declared research partition")
    epochs, learning_rate = (3, 0.0003) if recipe == "initial" else (1, 0.0001)
    output = root / "execution"
    output.mkdir(exist_ok=False)
    source = output / "source"
    source.mkdir()
    for script in (Path(__file__), Path(__file__).with_name("prepare_synthetic_lora.py")):
        (source / script.name).write_bytes(script.read_bytes())
    def write(name, value):
        (output / name).write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")
    def bounded():
        if time.monotonic() - started > MAX_SECONDS:
            raise TimeoutError("CPU research wall-time budget reached")
    torch.set_num_threads(4)
    torch.set_num_interop_threads(1)
    torch.manual_seed(SEED)
    random.seed(SEED)
    report = {"schema": "diana-original-synthetic-lora-execution-v1", "status": "running", "researchOnly": True, "productionEligible": False, "educatorReviewed": False, "studentDataUsed": False, "textbookDataUsed": False, "networkDisabledDuringExecution": True, "providerCalls": 0, "model": MODEL, "revision": provenance["revision"], "hardware": {"device": "cpu", "cudaAvailable": torch.cuda.is_available(), "ramBytes": psutil.virtual_memory().total, "logicalCpus": psutil.cpu_count(), "threads": 4}, "python": platform.python_version(), "dependencies": installed, "allInstalledPackages": sorted({dist.metadata["Name"]: dist.version for dist in importlib.metadata.distributions()}.items()), "dataManifestSha256": sha(root / "dataset-manifest.json"), "modelProvenanceSha256": sha(root / "model-provenance.json"), "runnerSha256": sha(Path(__file__)), "dataGeneratorSha256": sha(Path(__file__).with_name("prepare_synthetic_lora.py")), "settings": {"rank": 8, "alpha": 16, "targetModules": ["q_proj", "v_proj"], "dropout": 0, "epochs": 3, "learningRate": 0.0003, "gradientAccumulation": 2, "maxSequence": MAX_SEQUENCE, "seed": SEED, "maxSeconds": MAX_SECONDS, "optimizer": "AdamW", "dtype": "float32", "generationMaxNewTokens": 80, "decoding": "greedy"}, "limitations": ["32 original machine-authored training fixtures and eight held-out cases only", "Family labels are disjoint but semantic independence is not proven", "Training changes a generic licensed base model; LoRA itself is not proprietary", "No qualified educator review, student outcome study, production approval, or general tutoring-quality claim"]}
    write("report.json", report)
    report["torchRuntimeVersion"] = torch.__version__
    report["allInstalledPackages"] = sorted(
        [{"name": dist.metadata["Name"], "version": dist.version, "location": str(dist.locate_file(""))} for dist in importlib.metadata.distributions()],
        key=lambda dist: (dist["name"].lower(), dist["version"], dist["location"]),
    )
    report["settings"].update({"epochs": epochs, "learningRate": learning_rate})
    report["recipe"] = recipe
    report["partition"] = partition
    report["testAuthoredAfterInitialDevelopmentResult"] = partition == "subsequent-test"
    preregistration = {"createdAt": datetime.now(timezone.utc).isoformat(), "recipe": recipe, "partition": partition, "datasetManifestSha256": report["dataManifestSha256"], "dataFiles": {name: sha(root / name) for name in ("train.jsonl", "heldout.jsonl")}, "modelProvenanceSha256": report["modelProvenanceSha256"], "runnerSha256": report["runnerSha256"], "dataGeneratorSha256": report["dataGeneratorSha256"], "settings": report["settings"], "plannedSelectionRule": "Report every case and reject any adapter with worse target-token loss or more false abstentions than baseline; no automatic production promotion", "furtherTuningOnThisTest": False}
    write("preregistration.json", preregistration)
    try:
        tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False)
        model = AutoModelForCausalLM.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False, dtype=torch.float32, attn_implementation="eager")
        model.generation_config.do_sample = False
        model.generation_config.temperature = None
        model.generation_config.top_p = None
        model.generation_config.top_k = None
        model.config.use_cache = False
        def encode(row):
            prefix = tokenizer.apply_chat_template(row["messages"][:-1], tokenize=True, add_generation_prompt=True, return_dict=False)
            full = tokenizer.apply_chat_template(row["messages"], tokenize=True, add_generation_prompt=False, return_dict=False)
            if full[:len(prefix)] != prefix or len(full) > MAX_SEQUENCE:
                raise ValueError("Chat template mismatch or sequence exceeds explicit bound")
            inputs = torch.tensor([full], dtype=torch.long)
            labels = inputs.clone()
            labels[:, :len(prefix)] = -100
            return {"input_ids": inputs, "attention_mask": torch.ones_like(inputs), "labels": labels}, len(full) - len(prefix)
        encoded = [encode(row) for row in train]
        eval_encoded = [encode(row) for row in heldout]
        def evaluate(label):
            model.eval()
            records = []
            with torch.no_grad():
                for row, (example, tokens) in zip(heldout, eval_encoded):
                    bounded()
                    loss = float(model(**example).loss)
                    text = tokenizer.apply_chat_template(row["messages"][:-1], tokenize=False, add_generation_prompt=True)
                    inputs = tokenizer(text, return_tensors="pt")
                    generated = model.generate(**inputs, max_new_tokens=80, do_sample=False, use_cache=True, pad_token_id=tokenizer.eos_token_id)
                    response = tokenizer.decode(generated[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
                    score = diagnostics(response, row["source"])
                    score["expectedAbstentionMatched"] = score["abstained"] == (row["messages"][-1]["content"].startswith("EVIDENCE: insufficient"))
                    records.append({"id": row["id"], "family": row["family"], "output": response, "targetTokenLoss": loss, "targetTokens": tokens, "diagnostics": score})
                    print(json.dumps({"phase": label, "case": row["id"], "loss": loss, "diagnostics": score}), flush=True)
            write(f"{label}.json", records)
            return records
        baseline = evaluate("baseline")
        model = get_peft_model(model, LoraConfig(r=8, lora_alpha=16, target_modules=["q_proj", "v_proj"], lora_dropout=0, bias="none", task_type=TaskType.CAUSAL_LM))
        trainable = [param for param in model.parameters() if param.requires_grad]
        report["trainableParameters"] = sum(param.numel() for param in trainable)
        report["totalParameters"] = sum(param.numel() for param in model.parameters())
        optimizer = torch.optim.AdamW(trainable, lr=learning_rate, weight_decay=0.01)
        model.train()
        optimizer.zero_grad(set_to_none=True)
        history = []
        for epoch in range(epochs):
            order = list(range(len(encoded)))
            random.Random(SEED + epoch).shuffle(order)
            for position, index in enumerate(order):
                bounded()
                example, _ = encoded[index]
                loss = model(**example).loss
                if not torch.isfinite(loss):
                    raise ValueError("Nonfinite training loss")
                (loss / 2).backward()
                if (position + 1) % 2 == 0:
                    norm = torch.nn.utils.clip_grad_norm_(trainable, 1.0)
                    if not torch.isfinite(norm):
                        raise ValueError("Nonfinite gradient")
                    optimizer.step()
                    optimizer.zero_grad(set_to_none=True)
                    history.append({"step": len(history) + 1, "epoch": epoch + 1, "lastExampleLoss": float(loss.detach()), "elapsedSeconds": round(time.monotonic() - started, 2)})
                    print(json.dumps(history[-1]), flush=True)
            write("training-history.json", history)
        model.save_pretrained(output / "adapter", safe_serialization=True)
        adapted = evaluate("adapter")
        def aggregate(records):
            total = sum(row["targetTokens"] for row in records)
            return {"targetTokenLoss": sum(row["targetTokenLoss"] * row["targetTokens"] for row in records) / total, "diagnosticCounts": {key: sum(int(row["diagnostics"][key]) for row in records) for key in records[0]["diagnostics"]}}
        report.update({"status": "completed", "elapsedSeconds": round(time.monotonic() - started, 2), "optimizerSteps": len(history), "trainingExamplePasses": len(encoded) * epochs, "heldoutCases": len(heldout), "baseline": aggregate(baseline), "adapter": aggregate(adapted), "artifactHashes": {str(path.relative_to(output)): sha(path) for path in sorted(output.rglob("*")) if path.is_file() and path.name != "report.json"}})
        # Confirm base model and datasets were not changed by training.
        validate_model(root)
        validate_data(root)
        write("report.json", report)
        print(json.dumps({"status": "completed", "baseline": report["baseline"], "adapter": report["adapter"], "elapsedSeconds": report["elapsedSeconds"]}), flush=True)
    except BaseException as exc:
        report.update({"status": "incomplete", "errorType": type(exc).__name__, "error": str(exc), "elapsedSeconds": round(time.monotonic() - started, 2)})
        write("report.json", report)
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--allow-original-synthetic-research", action="store_true", required=True)
    parser.add_argument("--recipe", choices=["initial", "conservative"], default="initial")
    args = parser.parse_args()
    with deny_network():
        execute(args.dataset.resolve(), args.recipe)
