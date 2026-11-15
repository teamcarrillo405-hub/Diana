"""Preregistered validation-only continuation of a rejected v3 adapter."""
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
from synthetic_lora_v4_development import datasets, SYSTEM
from train_synthetic_lora_v3 import score, aggregate, gates
from verify_synthetic_lora_v3 import verify as verify_parent

SETTINGS = {"epochs": 2, "learningRate": 0.0001, "rank": 16, "alpha": 32,
            "gradientAccumulation": 4, "seed": 49177, "maxSequence": 384,
            "maxNewTokens": 90, "threads": 4, "maxSeconds": 3600,
            "targetModules": ["q_proj", "k_proj", "v_proj", "o_proj"],
            "groundedAccuracyThreshold": 0.95}


def validate_partitions(train, validation):
    if len(train) != 440 or len(validation) != 48:
        raise ValueError("Development dataset drift")
    if {r["family"] for r in train} & {r["family"] for r in validation}:
        raise ValueError("Family overlap")
    if {(r["source"], r["question"]) for r in train} & {(r["source"], r["question"]) for r in validation}:
        raise ValueError("Example overlap")
    for rows in (train, validation):
        if len({r["id"] for r in rows}) != len(rows) or sum(r["expectedAbstention"] for r in rows) != len(rows)//2:
            raise ValueError("Duplicate IDs or answerability imbalance")
        for row in rows:
            if not score(row["target"], row)["groundedCasePass"]:
                raise ValueError("Target fails its task contract: " + row["id"])


def execute(output, model_root, parent_root):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import LoraConfig, TaskType, get_peft_model, PeftModel

    if {key: importlib.metadata.version(key) for key in VERSIONS} != VERSIONS:
        raise ValueError("Dependency drift")
    train, validation = datasets()
    validate_partitions(train, validation)
    snapshot, _ = validate_model(model_root)
    if parent_root.name != "run-004-v3" or parent_root.parent != output.parent:
        raise ValueError("Expected preserved sibling v3 parent run")
    verify_parent(parent_root)
    parent_report = json.loads((parent_root/"report.json").read_text(encoding="utf-8"))
    parent_candidates = json.loads((parent_root/"validation-candidates.json").read_text(encoding="utf-8"))
    parent_selection = json.loads((parent_root/"selection.json").read_text(encoding="utf-8"))
    parent_prereg = json.loads((parent_root/"preregistration.json").read_text(encoding="utf-8"))
    if parent_candidates != parent_selection.get("candidates") or parent_prereg["baseProvenanceSha256"] != sha(model_root/"model-provenance.json"):
        raise ValueError("Parent candidate or base provenance mismatch")
    if parent_report.get("schema") != "diana-original-synthetic-lora-v3" or parent_report.get("testOpened") is not False or parent_report.get("validationPassed") is not False:
        raise ValueError("Continuation requires completed rejected v3 with unconsumed heldout")
    # Development-only parent choice, fixed in preregistration before new fitting.
    parent = min(parent_candidates,key=lambda item:(-item["metrics"]["counts"]["groundedCasePass"],item["metrics"]["targetTokenLoss"]))
    parent_checkpoint = parent_root/f"epoch-{parent['epoch']}"
    parent_evidence = {"runName":parent_root.name,"selectedEpoch":parent["epoch"],"selectedBeforeCurrentTraining":True,
        "reportSha256":sha(parent_root/"report.json"),
        "candidatesSha256":sha(parent_root/"validation-candidates.json"),
        "adapterSha256":sha(parent_checkpoint/"adapter_model.safetensors"),
        "configSha256":sha(parent_checkpoint/"adapter_config.json"),
        "selection":"Highest v3 validation grounded-case count, then lowest validation loss; no heldout access."}

    sealed_module = Path(__file__).with_name("synthetic_lora_v3_evaluation.py")
    if not sealed_module.is_file():
        raise ValueError("Independent heldout module is not sealed")
    sealed_hash = sha(sealed_module)  # Hash opaque bytes; never import test before eligibility.
    sealed_manifest = Path(__file__).resolve().parents[2]/"docs/engineering/grounding-v3-test-manifest.json"
    manifest_hash = sha(sealed_manifest)
    if sealed_hash != "62e8c41366d1af1bb5b1b31d44ed9ad51f3248bbc85372cd44188c8b24901194" or manifest_hash != "f878878d761fac4821c5f9185af63d0c5c22caf3b4f2c68732191c7d1c47454a":
        raise ValueError("Independent seal mismatch")
    output.mkdir(parents=True, exist_ok=False)
    def write(name, value):
        (output/name).write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")
    (output/"source").mkdir()
    (output/"test-manifest.json").write_bytes(sealed_manifest.read_bytes())
    for name in ("train_synthetic_lora_v4.py", "synthetic_lora_v4_development.py", "synthetic_lora_v4_data.py", "train_synthetic_lora_v3.py", "synthetic_lora_v3_data.py", "verify_synthetic_lora_v3.py", "train_synthetic_lora.py", "prepare_synthetic_lora.py"):
        path = Path(__file__).with_name(name)
        (output/"source"/name).write_bytes(path.read_bytes())
    for name, records in (("train", train), ("validation", validation)):
        write(name+".json", records)
    write("preregistration.json", {"createdAt": datetime.now(timezone.utc).isoformat(), "settings": SETTINGS,
          "parent": parent_evidence, "model": MODEL, "revision": REVISION, "baseProvenanceSha256": sha(model_root/"model-provenance.json"),
          "dataSha256": {name: sha(output/(name+".json")) for name in ("train", "validation")},
          "sourceSha256": {p.name: sha(p) for p in (output/"source").iterdir()}, "testModuleSha256": sealed_hash,
          "testManifestSha256": manifest_hash, "minimumGroundingAccuracy": .95, "testCases": 100,
          "selection": "Run two fixed continuation epochs with fresh optimizer. Select lowest validation loss among epochs satisfying every gate. If none passes, select no checkpoint and never open the test. No tuning or selection using test outputs.",
          "gates": "No worse target token loss, false abstentions or unsupported answers; strictly more grounded cases; at least95percent relevant grounded cases on validation and heldout.",
          "maximumFreshTestEvaluations": 1, "productionEligible": False, "educatorReviewed": False,
          "testAuthoredByIndependentAgent": True, "independentHumanBenchmark": False,
          "originalMachineAuthoredOnly": True, "studentOrTextbookDataUsed": False})
    started = time.monotonic()
    torch.set_num_threads(SETTINGS["threads"])
    torch.set_num_interop_threads(1)
    torch.manual_seed(SETTINGS["seed"])
    def bounded():
        if time.monotonic()-started > SETTINGS["maxSeconds"]:
            raise TimeoutError("Research time budget exhausted; preserve all partial evidence")
    tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False)
    def load_base():
        result = AutoModelForCausalLM.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False, dtype=torch.float32, attn_implementation="eager")
        result.generation_config.do_sample = False
        result.generation_config.temperature = None
        result.generation_config.top_p = None
        result.generation_config.top_k = None
        result.config.use_cache = False
        return result
    def messages(row):
        return [{"role":"system", "content":SYSTEM}, {"role":"user", "content":f"SOURCE: {row['source']}\nQUESTION: {row['question']}"}, {"role":"assistant", "content":row["target"]}]
    def encode(row):
        chat = messages(row)
        prefix = tokenizer.apply_chat_template(chat[:-1], tokenize=True, add_generation_prompt=True, return_dict=False)
        full = tokenizer.apply_chat_template(chat, tokenize=True, return_dict=False)
        if full[:len(prefix)] != prefix or len(full)>SETTINGS["maxSequence"]:
            raise ValueError("Template mismatch or truncation required: " + row["id"])
        inputs = torch.tensor([full], dtype=torch.long)
        labels = inputs.clone()
        labels[:, :len(prefix)] = -100
        return {"input_ids": inputs, "attention_mask": torch.ones_like(inputs), "labels": labels}, len(full)-len(prefix)
    encoded = [encode(row) for row in train]
    for row in validation:
        encode(row)  # Reject any truncation before model load or optimizer work.
    def evaluate(model, rows, label):
        model.eval()
        records = []
        with torch.no_grad():
            for row in rows:
                bounded()
                example, tokens = encode(row)
                loss = float(model(**example).loss)
                inputs = tokenizer(tokenizer.apply_chat_template(messages(row)[:-1], tokenize=False, add_generation_prompt=True), return_tensors="pt")
                generated = model.generate(**inputs, max_new_tokens=SETTINGS["maxNewTokens"], do_sample=False, use_cache=True, pad_token_id=tokenizer.eos_token_id)
                response = tokenizer.decode(generated[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
                records.append({"id": row["id"], "output": response, "targetTokenLoss": loss, "targetTokens": tokens, "diagnostics": score(response,row)})
        write(label+".json", records)
        print(json.dumps({"phase": label, **aggregate(records)}), flush=True)
        return records
    model = load_base()
    base_validation = aggregate(evaluate(model, validation, "baseline-validation"))
    model = PeftModel.from_pretrained(model,parent_checkpoint,local_files_only=True,is_trainable=True)
    parent_validation = aggregate(evaluate(model,validation,"parent-validation"))
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
                norm = torch.nn.utils.clip_grad_norm_(params,1.)
                if not torch.isfinite(norm):
                    raise ValueError("Nonfinite gradient")
                optimizer.step()
                optimizer.zero_grad(set_to_none=True)
                history.append({"epoch": epoch, "step": len(history)+1, "loss": float(loss.detach())})
                if len(history)%10 == 0:
                    print(json.dumps(history[-1]), flush=True)
        model.save_pretrained(output/f"epoch-{epoch}",safe_serialization=True)
        result = aggregate(evaluate(model, validation,f"epoch-{epoch}-validation"))
        candidates.append({"epoch":epoch,"metrics":result,"gates":gates(base_validation,result)})
        write("training-history.json",history)
        write("validation-candidates.json",candidates)
    eligible = [candidate for candidate in candidates if all(candidate["gates"].values())]
    selected = min(eligible,key=lambda item:item["metrics"]["targetTokenLoss"]) if eligible else None
    write("selection.json",{"selectedEpoch":selected["epoch"] if selected else None,"validationPassed":bool(eligible),"candidates":candidates,"selectedBeforeTest":True,"productionEligible":False})
    report = {"status":"completed" if selected else "rejected-validation", "schema":"diana-original-synthetic-lora-v4",
              "researchOnly":True,"productionEligible":False,"educatorReviewed":False,"providerCalls":0,
              "networkDeniedAtPythonSocketLayer":True,"osNetworkSandboxClaimed":False,
              "trainCount":len(train),"validationCount":len(validation),"optimizerSteps":len(history),
              "parent":parent_evidence,"parentValidation":parent_validation,"baselineValidation":base_validation,"selectedEpoch":selected["epoch"] if selected else None,
              "validationPassed":bool(eligible),"testEvaluations":0,"testOpened":False,"syntheticQualityGatePassed":False,
              "limitations":["Machine-authored data and lexical relevance proxy", "Repeated variants are not independent skills", "No human educator or learner-outcome validation", "Synthetic success cannot authorize production activation"]}
    del optimizer,params,model
    gc.collect()
    if selected:
        if sha(sealed_module) != sealed_hash:
            raise ValueError("Heldout module changed after preregistration")
        # This is the only import of the heldout. Selection is already durable.
        from synthetic_lora_v3_evaluation import evaluation_cases
        test = evaluation_cases()
        if len(test) != 100 or len({r["id"] for r in test}) != len(test):
            raise ValueError("Heldout count or IDs invalid")
        if {(r["source"],r["question"]) for r in train+validation} & {(r["source"],r["question"]) for r in test}:
            raise ValueError("Heldout overlap")
        write("test.json",test)
        (output/"source"/sealed_module.name).write_bytes(sealed_module.read_bytes())
        model = load_base()
        baseline = aggregate(evaluate(model,test,"baseline-test"))
        model = PeftModel.from_pretrained(model,output/f"epoch-{selected['epoch']}",local_files_only=True,is_trainable=False)
        adapted_rows = evaluate(model,test,"adapter-test")
        adapted = aggregate(adapted_rows)
        del model
        gc.collect()
        model = PeftModel.from_pretrained(load_base(),output/f"epoch-{selected['epoch']}",local_files_only=True,is_trainable=False)
        reloaded = evaluate(model,test,"reload-test")
        identical = all(a["id"]==b["id"] and a["output"]==b["output"] for a,b in zip(adapted_rows,reloaded,strict=True))
        test_gates = gates(baseline,adapted)
        report.update({"testCount":len(test),"testEvaluations":1,"testOpened":True,"baseline":baseline,"adapter":adapted,"testGates":test_gates,"savedAdapterOutputsIdentical":identical,"syntheticQualityGatePassed":all(test_gates.values()) and identical})
    validate_model(model_root)
    report["elapsedSeconds"] = round(time.monotonic()-started,2)
    report["artifactHashes"] = {str(p.relative_to(output)).replace("\\","/"):sha(p) for p in output.rglob("*") if p.is_file()}
    write("report.json",report)
    print(json.dumps(report),flush=True)


if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",type=Path,required=True)
    parser.add_argument("--model-root",type=Path,required=True)
    parser.add_argument("--parent-run",type=Path,required=True)
    parser.add_argument("--allow-original-synthetic-research",action="store_true",required=True)
    args=parser.parse_args()
    with deny_network():
        execute(args.output.resolve(),args.model_root.resolve(),args.parent_run.resolve())
