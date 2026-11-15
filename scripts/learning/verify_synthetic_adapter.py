"""Reload a saved research adapter and verify every held-out greedy output."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from prepare_synthetic_lora import sha
from train_synthetic_lora import deny_network, validate_data, validate_model


def verify(root):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    torch.set_num_threads(4)
    torch.set_num_interop_threads(1)
    _, heldout = validate_data(root)
    snapshot, _ = validate_model(root)
    output = root / "execution"
    report = json.loads((output / "report.json").read_text(encoding="utf-8"))
    if report["status"] != "completed" or report["productionEligible"] is not False:
        raise ValueError("Only a completed research-only experiment may be reloaded")
    for name, expected in report["artifactHashes"].items():
        if sha(output / name) != expected:
            raise ValueError(f"Artifact drift: {name}")
    expected = json.loads((output / "adapter.json").read_text(encoding="utf-8"))
    tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False)
    base = AutoModelForCausalLM.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False, dtype=torch.float32, attn_implementation="eager")
    base.generation_config.do_sample = False
    base.generation_config.temperature = None
    base.generation_config.top_p = None
    base.generation_config.top_k = None
    model = PeftModel.from_pretrained(base, output / "adapter", local_files_only=True, is_trainable=False)
    model.eval()
    comparisons = []
    with torch.no_grad():
        for row, reference in zip(heldout, expected, strict=True):
            if row["id"] != reference["id"]:
                raise ValueError("Held-out order drift")
            text = tokenizer.apply_chat_template(row["messages"][:-1], tokenize=False, add_generation_prompt=True)
            inputs = tokenizer(text, return_tensors="pt")
            generated = model.generate(**inputs, max_new_tokens=80, do_sample=False, use_cache=True, pad_token_id=tokenizer.eos_token_id)
            response = tokenizer.decode(generated[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
            comparisons.append({"id": row["id"], "identical": response == reference["output"], "outputSha256": __import__("hashlib").sha256(response.encode()).hexdigest()})
    result = {"schema": "diana-synthetic-adapter-reload-v1", "researchOnly": True, "productionEligible": False, "networkDisabled": True, "experimentReportSha256": sha(output / "report.json"), "allOutputsIdentical": all(row["identical"] for row in comparisons), "cases": comparisons}
    destination = output / "reload-verification.json"
    with destination.open("x", encoding="utf-8") as handle:
        json.dump(result, handle, indent=2)
    print(json.dumps(result), flush=True)
    if not result["allOutputsIdentical"]:
        raise ValueError("Saved adapter does not reproduce the measured outputs")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    args = parser.parse_args()
    with deny_network():
        verify(args.dataset.resolve())
