"""Train an offline Diana tutoring LoRA only from a rights-gated local export."""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

from local_lora_common import (MODEL_ID, adapter_file_hashes, cuda_status, dependency_status, file_sha256, force_offline,
                               require_dependencies, snapshot_digest, validate_local_model,
                               validate_training_export, verify_export_attestation, verify_private_path,
                               verify_train_holdout_separation, verify_current_revocations)
from compare_local_lora import validate_evaluation

MIN_REVIEWED_EXAMPLES = 32
MIN_GPU_GIB = 20  # Conservative gate for the unquantized BF16 4B experiment, not a guarantee.


def validate_accumulation_plan(example_count: int, accumulation: int) -> int:
    if example_count % accumulation:
        raise ValueError("Training example count must divide evenly by gradient accumulation; partial updates are blocked")
    return example_count // accumulation


def preflight(dataset_dir: Path, heldout_dir: Path, model_dir: Path | None, trusted_key: Path,
              key_fingerprint: str, revocations: Path, gradient_accumulation: int = 4) -> dict:
    verify_private_path(dataset_dir, Path.cwd(), directory=True)
    for name in ("train.jsonl", "manifest.json", "attestation.json"):
        verify_private_path(dataset_dir / name, Path.cwd(), directory=False)
    verify_private_path(revocations, Path.cwd(), directory=False)
    manifest, examples = validate_training_export(dataset_dir)
    attestation = verify_export_attestation(dataset_dir, trusted_key, key_fingerprint)
    verify_current_revocations(revocations, manifest["dataSha256"], trusted_key, key_fingerprint)
    cases = validate_evaluation(heldout_dir, manifest)
    verify_train_holdout_separation(examples, cases)
    model = validate_local_model(model_dir) if model_dir is not None else None
    dependencies = dependency_status()
    cuda = cuda_status()
    reasons = []
    if len(examples) < MIN_REVIEWED_EXAMPLES:
        reasons.append("at_least_32_reviewed_training_examples_required")
    if len(examples) % gradient_accumulation:
        reasons.append("training_example_count_must_divide_evenly_by_gradient_accumulation")
    if model is None:
        reasons.append("local_model_snapshot_required")
    if not all(row["ready"] for row in dependencies.values()):
        reasons.append("pinned_dependencies_missing_or_different")
    if not cuda["available"] or (cuda["totalMemoryGiB"] or 0) < MIN_GPU_GIB:
        reasons.append("qualified_cuda_gpu_with_at_least_20_gib_required")
    if not cuda["bf16Supported"]:
        reasons.append("bf16_cuda_support_required")
    return {"status": "ready_for_local_training" if not reasons else "blocked", "reasons": reasons,
            "datasetHash": manifest["dataSha256"], "examples": len(examples), "model": model,
            "attestation": {"issuedBy": attestation["issuedBy"], "reviewRecordId": attestation["reviewRecordId"],
                            "keyFingerprintSha256": attestation["keyFingerprintSha256"]},
            "dependencies": dependencies, "cuda": cuda, "studentFacingActivation": False}


def encoded_example(tokenizer, messages: list[dict], max_tokens: int) -> tuple[list[int], list[int]]:
    prefix = tokenizer.apply_chat_template(messages[:-1], tokenize=True, add_generation_prompt=True)
    full = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=False)
    if not isinstance(prefix, list) or not isinstance(full, list) or full[:len(prefix)] != prefix:
        raise ValueError("Chat template does not permit verified assistant-only loss masking")
    if len(full) > max_tokens or len(prefix) == len(full):
        raise ValueError("Reviewed conversation exceeds token limit or has no assistant target")
    return full, [-100] * len(prefix) + full[len(prefix):]


def train(args) -> dict:
    check = preflight(args.dataset, args.heldout, args.model, args.trusted_public_key, args.trusted_key_sha256,
                      args.revocations, args.gradient_accumulation)
    if check["status"] != "ready_for_local_training":
        raise ValueError("Local LoRA training preflight blocked: " + ", ".join(check["reasons"]))
    if not args.allow_local_training:
        raise ValueError("Pass --allow-local-training after inspecting the rights and hardware preflight")
    verify_private_path(args.output, Path.cwd(), directory=True)
    if any(args.output.iterdir()):
        raise ValueError("Adapter output must be an empty private operator-prepared directory")
    require_dependencies()
    import torch
    from peft import LoraConfig, TaskType, get_peft_model
    from transformers import AutoModelForCausalLM, AutoTokenizer

    torch.manual_seed(args.seed)
    torch.cuda.manual_seed_all(args.seed)
    random.seed(args.seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
    dtype = torch.bfloat16
    model_sha = snapshot_digest(args.model)
    manifest, examples = validate_training_export(args.dataset)
    attestation = verify_export_attestation(args.dataset, args.trusted_public_key, args.trusted_key_sha256)
    verify_current_revocations(args.revocations, manifest["dataSha256"], args.trusted_public_key, args.trusted_key_sha256)
    verify_train_holdout_separation(examples, validate_evaluation(args.heldout, manifest))
    validate_accumulation_plan(len(examples), args.gradient_accumulation)
    tokenizer = AutoTokenizer.from_pretrained(str(args.model), local_files_only=True, trust_remote_code=False)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token
    encoded = [encoded_example(tokenizer, row["messages"], args.max_seq_length) for row in examples]
    base = AutoModelForCausalLM.from_pretrained(
        str(args.model), local_files_only=True, trust_remote_code=False, use_safetensors=True,
        dtype=dtype, device_map="cuda:0", attn_implementation="eager")
    base.config.use_cache = False
    adapter = get_peft_model(base, LoraConfig(
        task_type=TaskType.CAUSAL_LM, r=16, lora_alpha=32, lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"], bias="none"))
    adapter.gradient_checkpointing_enable()
    if hasattr(adapter, "enable_input_require_grads"):
        adapter.enable_input_require_grads()
    adapter.train()
    params = [parameter for parameter in adapter.parameters() if parameter.requires_grad]
    optimizer = torch.optim.AdamW(params, lr=args.learning_rate, weight_decay=0.01)
    losses = []
    step = 0
    updates = 0
    optimizer.zero_grad(set_to_none=True)
    for epoch in range(args.epochs):
        indices = list(range(len(encoded)))
        random.shuffle(indices)
        for index in indices:
            input_ids, label_ids = encoded[index]
            batch = {"input_ids": torch.tensor([input_ids], device="cuda"),
                     "attention_mask": torch.ones((1, len(input_ids)), dtype=torch.long, device="cuda"),
                     "labels": torch.tensor([label_ids], device="cuda")}
            result = adapter(**batch)
            loss = result.loss
            if not torch.isfinite(loss):
                raise ValueError("Training produced a non-finite loss; adapter was not saved")
            (loss / args.gradient_accumulation).backward()
            losses.append(float(loss.detach().cpu()))
            step += 1
            if step % args.gradient_accumulation == 0:
                torch.nn.utils.clip_grad_norm_(params, 1.0)
                optimizer.step()
                optimizer.zero_grad(set_to_none=True)
                updates += 1
            if updates >= args.max_updates:
                break
        if updates >= args.max_updates:
            break
    if updates == 0 or not losses or any(not math.isfinite(value) for value in losses):
        raise ValueError("No valid optimizer update occurred")
    verify_export_attestation(args.dataset, args.trusted_public_key, args.trusted_key_sha256)
    verify_current_revocations(args.revocations, manifest["dataSha256"], args.trusted_public_key, args.trusted_key_sha256)
    verify_private_path(args.output, Path.cwd(), directory=True)
    if any(args.output.iterdir()):
        raise ValueError("Adapter output must still be an empty private directory")
    adapter.save_pretrained(str(args.output), safe_serialization=True)
    for name in ("adapter_config.json", "adapter_model.safetensors"):
        verify_private_path(args.output / name, Path.cwd(), directory=False)
    saved_adapter_hashes = adapter_file_hashes(args.output)
    report = {"version": "diana-local-lora-run-v1", "status": "trained_research_adapter",
              "modelId": MODEL_ID, "baseWeightsSha256": model_sha, "baseConfigSha256": check["model"]["configSha256"],
              "baseTokenizerSha256": check["model"]["tokenizerSha256"],
              "datasetSha256": manifest["dataSha256"], "datasetManifestSha256": __import__("hashlib").sha256(
                  (args.dataset / "manifest.json").read_bytes()).hexdigest(),
              "exportAttestationSha256": file_sha256(args.dataset / "attestation.json"),
              "exportSigner": attestation["issuedBy"], "externalReviewRecordId": attestation["reviewRecordId"],
              "trustedKeyFingerprintSha256": attestation["keyFingerprintSha256"],
              "adapterFilesSha256": saved_adapter_hashes,
              "examples": len(examples), "updates": updates, "microbatches": step,
              "lossFirst": losses[0], "lossLast": losses[-1], "lossMean": sum(losses) / len(losses),
              "seed": args.seed, "epochsLimit": args.epochs, "maxUpdates": args.max_updates,
              "maxSeqLength": args.max_seq_length, "gradientAccumulation": args.gradient_accumulation,
              "learningRate": args.learning_rate, "lora": {"r": 16, "alpha": 32, "dropout": 0.05,
                  "targets": ["q_proj", "k_proj", "v_proj", "o_proj"]},
              "dtype": str(dtype), "dependencies": dependency_status(), "cuda": check["cuda"],
              "createdAt": datetime.now(timezone.utc).isoformat(),
              "humanQualityReview": "pending", "learningGainsEstablished": False,
              "studentFacingActivation": False}
    (args.output / "diana-run.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    verify_private_path(args.output / "diana-run.json", Path.cwd(), directory=False)
    return report


def main() -> int:
    force_offline()
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["preflight", "train"])
    parser.add_argument("--dataset", required=True, type=Path, help="Directory from prepare-local-lora.ts")
    parser.add_argument("--heldout", required=True, type=Path, help="Code-pinned authored held-out evaluation directory")
    parser.add_argument("--model", type=Path, help="Existing local Qwen3 snapshot; no download occurs")
    parser.add_argument("--trusted-public-key", required=True, type=Path, help="Trusted export operator Ed25519 public PEM")
    parser.add_argument("--trusted-key-sha256", required=True, help="Public-key DER fingerprint from a trusted out-of-band record")
    parser.add_argument("--revocations", required=True, type=Path, help="Fresh signed revocation snapshot obtained outside this dataset")
    parser.add_argument("--output", type=Path, help="New, empty adapter output directory")
    parser.add_argument("--allow-local-training", action="store_true")
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--max-updates", type=int, default=100)
    parser.add_argument("--max-seq-length", type=int, default=2048)
    parser.add_argument("--gradient-accumulation", type=int, default=4)
    parser.add_argument("--learning-rate", type=float, default=0.0001)
    parser.add_argument("--seed", type=int, default=20260926)
    args = parser.parse_args()
    if args.epochs < 1 or args.epochs > 5 or args.max_updates < 1 or args.max_updates > 1000 or args.max_seq_length < 128 or args.max_seq_length > 4096 or args.gradient_accumulation < 1 or args.gradient_accumulation > 32 or not (0 < args.learning_rate <= 0.001):
        parser.error("Training limits must remain within the bounded research ranges")
    if args.command == "preflight":
        print(json.dumps(preflight(args.dataset, args.heldout, args.model, args.trusted_public_key, args.trusted_key_sha256,
                                   args.revocations, args.gradient_accumulation), indent=2))
        return 0
    if args.model is None or args.output is None:
        parser.error("Training requires --model and --output")
    print(json.dumps(train(args), indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, FileNotFoundError, json.JSONDecodeError) as error:
        print(f"Local LoRA blocked: {error}", file=sys.stderr)
        sys.exit(1)
