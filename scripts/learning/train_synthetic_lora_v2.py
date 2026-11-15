"""Preregistered local-only contrastive-data LoRA research, never production."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import gc
import importlib.metadata
import json
import math
from pathlib import Path
import random
import time

from prepare_synthetic_lora import MODEL, REVISION, sha
from train_synthetic_lora import deny_network, validate_model, diagnostics, VERSIONS
from synthetic_lora_v2_data import datasets

SETTINGS = {"epochs": 2, "learningRate": 0.0001, "rank": 8, "alpha": 16,
            "gradientAccumulation": 4, "seed": 27183, "maxSequence": 320,
            "maxNewTokens": 80, "threads": 4, "maxSeconds": 1800}


def score(text, row):
    result = diagnostics(text, row["source"])
    expected = row["expectedAbstention"]
    result["falseAbstention"] = result["abstained"] and not expected
    result["unsupportedAnswer"] = not result["abstained"] and expected
    result["expectedAbstentionMatched"] = result["abstained"] == expected
    next_step = text.split("NEXT:", 1)[-1].strip().lower() if "NEXT:" in text else ""
    result["caseSpecificNextStep"] = result["oneQuestion"] and any(anchor in next_step for anchor in row["nextStepAnchors"])
    # This combines source fidelity, answerability, and a task-specific question
    # check. It is explicitly a mechanical proxy, not a pedagogical judgment.
    result["groundedCasePass"] = all(result[key] for key in ("twoLineFormat", "exactSourceQuoteOrAbstention", "expectedAbstentionMatched", "caseSpecificNextStep"))
    return result


def aggregate(records):
    if not records or any(not math.isfinite(row["targetTokenLoss"]) for row in records):
        raise ValueError("Missing or nonfinite evaluation")
    tokens = sum(row["targetTokens"] for row in records)
    return {"cases": len(records), "targetTokenLoss": sum(row["targetTokenLoss"]*row["targetTokens"] for row in records)/tokens,
            "counts": {key: sum(int(row["diagnostics"][key]) for row in records) for key in records[0]["diagnostics"]}}


def gates(base, adapter):
    return {"lossNonRegression": adapter["targetTokenLoss"] <= base["targetTokenLoss"],
            "falseAbstentionNonRegression": adapter["counts"]["falseAbstention"] <= base["counts"]["falseAbstention"],
            "unsupportedAnswerNonRegression": adapter["counts"]["unsupportedAnswer"] <= base["counts"]["unsupportedAnswer"],
            "groundedCaseStrictImprovement": adapter["counts"]["groundedCasePass"] > base["counts"]["groundedCasePass"],
            "groundedCaseAtLeast80Percent": adapter["counts"]["groundedCasePass"] / adapter["cases"] >= .8}


def execute(output, model_root):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import LoraConfig, TaskType, get_peft_model, PeftModel

    if {key: importlib.metadata.version(key) for key in VERSIONS} != VERSIONS:
        raise ValueError("Dependency drift")
    train, validation, test = datasets()
    # Exact/pair separation plus explicit skill-family separation. This does
    # not prove semantic independence of machine-authored educational topics.
    parts = [train, validation, test]
    for i, left in enumerate(parts):
        for right in parts[i+1:]:
            if {row["family"] for row in left} & {row["family"] for row in right}:
                raise ValueError("Family overlap")
            if {(row["source"], row["question"]) for row in left} & {(row["source"], row["question"]) for row in right}:
                raise ValueError("Example overlap")
    snapshot, provenance = validate_model(model_root)
    output.mkdir(parents=True, exist_ok=False)
    def write(name, value):
        (output/name).write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")
    (output/"source").mkdir()
    for name in ("train_synthetic_lora_v2.py", "synthetic_lora_v2_data.py", "train_synthetic_lora.py", "prepare_synthetic_lora.py"):
        path = Path(__file__).with_name(name)
        (output/"source"/name).write_bytes(path.read_bytes())
    for name, records in zip(("train", "validation", "test"), parts):
        write(name+".json", records)
    write("preregistration.json", {"createdAt": datetime.now(timezone.utc).isoformat(), "settings": SETTINGS,
          "model": MODEL, "revision": REVISION, "baseProvenanceSha256": sha(model_root/"model-provenance.json"),
          "dataSha256": {name: sha(output/(name+".json")) for name in ("train", "validation", "test")},
          "sourceSha256": {p.name: sha(p) for p in (output/"source").iterdir()},
          "selection": "Among epochs 1 and 2, choose lowest validation loss satisfying every gate. If none passes, choose lowest validation loss for diagnostic testing and retain rejection. Never select using test outcomes.",
          "gates": "No worse target token loss, false abstentions or unsupported answers; strictly more grounded cases; at least 80% grounded cases.",
          "freshTestEvaluations": 1, "productionEligible": False, "educatorReviewed": False,
          "testAuthoredAfterV1Failures": True, "independentBenchmark": False,
          "originalMachineAuthoredOnly": True, "studentOrTextbookDataUsed": False})
    started = time.monotonic()
    torch.set_num_threads(SETTINGS["threads"])
    torch.set_num_interop_threads(1)
    torch.manual_seed(SETTINGS["seed"])
    def bounded():
        if time.monotonic()-started > SETTINGS["maxSeconds"]:
            raise TimeoutError("Research time budget exhausted")
    tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False)
    def load_base():
        result = AutoModelForCausalLM.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False, dtype=torch.float32, attn_implementation="eager")
        result.generation_config.do_sample = False
        result.generation_config.temperature = None
        result.generation_config.top_p = None
        result.generation_config.top_k = None
        result.config.use_cache = False
        return result
    def encode(row):
        prefix = tokenizer.apply_chat_template(row["messages"][:-1], tokenize=True, add_generation_prompt=True, return_dict=False)
        full = tokenizer.apply_chat_template(row["messages"], tokenize=True, return_dict=False)
        if full[:len(prefix)] != prefix or len(full)>SETTINGS["maxSequence"]:
            raise ValueError("Template mismatch or truncation required")
        inputs = torch.tensor([full], dtype=torch.long)
        labels = inputs.clone()
        labels[:, :len(prefix)] = -100
        return {"input_ids": inputs, "attention_mask": torch.ones_like(inputs), "labels": labels}, len(full)-len(prefix)
    encoded = [encode(row) for row in train]
    def evaluate(model, rows, label):
        model.eval()
        records = []
        with torch.no_grad():
            for row in rows:
                bounded()
                example, tokens = encode(row)
                loss = float(model(**example).loss)
                inputs = tokenizer(tokenizer.apply_chat_template(row["messages"][:-1], tokenize=False, add_generation_prompt=True), return_tensors="pt")
                generated = model.generate(**inputs, max_new_tokens=SETTINGS["maxNewTokens"], do_sample=False, use_cache=True, pad_token_id=tokenizer.eos_token_id)
                response = tokenizer.decode(generated[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
                records.append({"id": row["id"], "output": response, "targetTokenLoss": loss, "targetTokens": tokens, "diagnostics": score(response, row)})
        write(label+".json", records)
        print(json.dumps({"phase": label, **aggregate(records)}), flush=True)
        return records
    model = load_base()
    base_validation = aggregate(evaluate(model, validation, "baseline-validation"))
    # Test is not evaluated until checkpoint selection is fixed.
    model = get_peft_model(model, LoraConfig(r=SETTINGS["rank"], lora_alpha=SETTINGS["alpha"], target_modules=["q_proj", "v_proj"], lora_dropout=0, bias="none", task_type=TaskType.CAUSAL_LM))
    params = [p for p in model.parameters() if p.requires_grad]
    optimizer = torch.optim.AdamW(params, lr=SETTINGS["learningRate"], weight_decay=.01)
    history, candidates = [], []
    for epoch in range(1, SETTINGS["epochs"]+1):
        model.train()
        optimizer.zero_grad(set_to_none=True)
        order = list(range(len(train)))
        random.Random(SETTINGS["seed"]+epoch).shuffle(order)
        for position, index in enumerate(order):
            bounded()
            loss = model(**encoded[index][0]).loss
            if not torch.isfinite(loss):
                raise ValueError("Nonfinite training loss")
            (loss/SETTINGS["gradientAccumulation"]).backward()
            if (position+1)%SETTINGS["gradientAccumulation"] == 0:
                norm = torch.nn.utils.clip_grad_norm_(params, 1.)
                if not torch.isfinite(norm):
                    raise ValueError("Nonfinite gradient")
                optimizer.step()
                optimizer.zero_grad(set_to_none=True)
                history.append({"epoch": epoch, "step": len(history)+1, "loss": float(loss.detach())})
                print(json.dumps(history[-1]), flush=True)
        model.save_pretrained(output/f"epoch-{epoch}", safe_serialization=True)
        result = aggregate(evaluate(model, validation, f"epoch-{epoch}-validation"))
        candidates.append({"epoch": epoch, "metrics": result, "gates": gates(base_validation, result)})
        write("training-history.json", history)
    eligible = [candidate for candidate in candidates if all(candidate["gates"].values())]
    selected = min(eligible or candidates, key=lambda item: item["metrics"]["targetTokenLoss"])
    write("selection.json", {"selectedEpoch": selected["epoch"], "validationPassed": bool(eligible), "candidates": candidates,
                             "selectedBeforeTest": True, "productionEligible": False})
    del optimizer, params, model
    gc.collect()
    model = load_base()
    baseline = aggregate(evaluate(model, test, "baseline-test"))
    model = PeftModel.from_pretrained(model, output/f"epoch-{selected['epoch']}", local_files_only=True, is_trainable=False)
    adapted_rows = evaluate(model, test, "adapter-test")
    adapted = aggregate(adapted_rows)
    del model
    gc.collect()
    # A second fresh base and adapter reload verifies persisted artifact bytes,
    # not another selection or optimization pass over test data.
    model = PeftModel.from_pretrained(load_base(), output/f"epoch-{selected['epoch']}", local_files_only=True, is_trainable=False)
    reloaded = evaluate(model, test, "reload-test")
    identical = all(a["id"] == b["id"] and a["output"] == b["output"] for a,b in zip(adapted_rows,reloaded,strict=True))
    test_gates = gates(baseline, adapted)
    report = {"status": "completed", "schema": "diana-original-synthetic-lora-v2", "researchOnly": True,
              "productionEligible": False, "educatorReviewed": False, "providerCalls": 0,
              "networkDeniedAtPythonSocketLayer": True, "osNetworkSandboxClaimed": False,
              "trainCount": len(train), "validationCount": len(validation), "testCount": len(test),
              "optimizerSteps": len(history), "elapsedSeconds": round(time.monotonic()-started,2),
              "selectedEpoch": selected["epoch"], "baseline": baseline, "adapter": adapted,
              "testGates": test_gates, "savedAdapterOutputsIdentical": identical,
              "syntheticQualityGatePassed": bool(eligible) and all(test_gates.values()) and identical,
              "limitations": ["Original machine-authored fixtures only", "Repeated skill variants are not independent examples", "Mechanical keyword and quote checks do not measure teaching quality", "No educator, student learning, broad-curriculum or production validation"],
              "artifactHashes": {str(p.relative_to(output)):sha(p) for p in output.rglob("*") if p.is_file()}}
    write("report.json", report)
    validate_model(model_root)
    print(json.dumps(report), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--model-root", type=Path, required=True)
    parser.add_argument("--allow-original-synthetic-research", action="store_true", required=True)
    args = parser.parse_args()
    with deny_network():
        execute(args.output.resolve(), args.model_root.resolve())
