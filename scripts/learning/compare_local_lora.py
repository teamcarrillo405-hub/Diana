"""Paired, offline baseline/adapter inference on held-out engineering cases."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from local_lora_common import (MODEL_ID, dependency_status, file_sha256, force_offline,
                               read_jsonl, require_dependencies, snapshot_digest, text_fingerprints,
                               validate_local_model, validate_training_export, verify_adapter_integrity,
                               verify_export_attestation, verify_private_path, verify_train_holdout_separation,
                               verify_current_revocations)


def validate_evaluation(eval_dir: Path, train_manifest: dict) -> list[dict]:
    manifest = json.loads((eval_dir / "manifest.json").read_text(encoding="utf-8"))
    path = eval_dir / "heldout.jsonl"
    cases = read_jsonl(path)
    if manifest.get("version") != "diana-local-lora-evaluation-v1" or manifest.get("dataSha256") != file_sha256(path) or manifest.get("caseCount") != len(cases):
        raise ValueError("Held-out cases no longer match their manifest")
    if (manifest.get("dataSha256") != train_manifest.get("heldOutEvaluationSha256")
            or manifest.get("corpusSha256") != train_manifest.get("heldOutCorpusSha256")):
        raise ValueError("Held-out cases differ from the trusted corpus pinned at export signing")
    if not cases or len({case.get("id") for case in cases}) != len(cases):
        raise ValueError("Held-out case IDs are empty or repeated")
    train_documents = set(train_manifest["documentFamilies"])
    train_templates = set(train_manifest["templateFamilies"])
    prompt_hashes = {value[k] for value in train_manifest["trainingPromptFingerprints"] for k in ("exact", "template")}
    source_hashes = {value[k] for value in train_manifest["trainingSourceFingerprints"] for k in ("exact", "template")}
    for case in cases:
        if case.get("documentFamily") in train_documents or case.get("templateFamily") in train_templates:
            raise ValueError("Training and held-out document/template family overlap")
        if case.get("provenance") != "authored_engineering_fixture" or not isinstance(case.get("messages"), list) or case["messages"][-1].get("role") != "user":
            raise ValueError("Only authored held-out engineering cases are accepted by this comparison")
        for field in ("prompt", "source"):
            fingerprints = case.get(field + "Fingerprints")
            if (not isinstance(case.get(field), str) or not isinstance(fingerprints, dict) or
                    set(fingerprints) != {"exact", "template"} or
                    any(not isinstance(value, str) or not re.fullmatch(r"[a-f0-9]{64}", value) for value in fingerprints.values()) or
                    fingerprints != text_fingerprints(case[field])):
                raise ValueError("Held-out prompt/source fingerprints differ from actual content")
        if (not isinstance(case.get("promptFingerprints"), dict) or not isinstance(case.get("sourceFingerprints"), dict)
                or any(case["promptFingerprints"].get(key) in prompt_hashes for key in ("exact", "template"))
                or any(case["sourceFingerprints"].get(key) in source_hashes for key in ("exact", "template"))):
            raise ValueError("Training and held-out prompt/source fingerprint overlap or missing fingerprints")
    return cases


def engineering_checks(output: str, case: dict) -> dict:
    try:
        result = json.loads(output)
    except json.JSONDecodeError:
        return {"validJson": False, "abstentionMatchesFixture": None,
                "allQuotesInSource": None, "mathAnswerExact": None}
    if (not isinstance(result, dict) or not isinstance(result.get("abstain"), bool)
            or not isinstance(result.get("quotes"), list)
            or not isinstance(result.get("feedback"), str)
            or not (result.get("answer") is None or isinstance(result.get("answer"), str))):
        return {"validJson": False, "abstentionMatchesFixture": None,
                "allQuotesInSource": None, "mathAnswerExact": None}
    expected_answer = case["expected"]["answer"]
    return {"validJson": True, "abstentionMatchesFixture": result["abstain"] == case["expected"]["abstain"],
            "allQuotesInSource": all(isinstance(quote, str) and quote in case["source"] for quote in result["quotes"]) if result["quotes"] else None,
            "mathAnswerExact": str(result.get("answer", "")).strip() == expected_answer if expected_answer is not None else None}


def main() -> int:
    force_offline()
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", required=True, type=Path)
    parser.add_argument("--eval", required=True, type=Path)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--adapter", required=True, type=Path)
    parser.add_argument("--trusted-public-key", required=True, type=Path)
    parser.add_argument("--trusted-key-sha256", required=True)
    parser.add_argument("--revocations", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--max-cases", type=int, default=12)
    parser.add_argument("--max-new-tokens", type=int, default=256)
    args = parser.parse_args()
    if args.max_cases < 1 or args.max_cases > 480 or args.max_new_tokens < 16 or args.max_new_tokens > 512:
        parser.error("Comparison limits must remain within the bounded research ranges")
    if args.output.exists():
        verify_private_path(args.output, Path.cwd(), directory=True)
        if any(args.output.iterdir()):
            raise ValueError("Comparison output must be an empty private operator-prepared directory")
    else:
        raise ValueError("Comparison output must be an empty private operator-prepared directory")
    verify_private_path(args.dataset, Path.cwd(), directory=True)
    for name in ("train.jsonl", "manifest.json", "attestation.json"):
        verify_private_path(args.dataset / name, Path.cwd(), directory=False)
    verify_private_path(args.revocations, Path.cwd(), directory=False)
    verify_private_path(args.adapter, Path.cwd(), directory=True)
    for name in ("adapter_config.json", "adapter_model.safetensors", "diana-run.json"):
        verify_private_path(args.adapter / name, Path.cwd(), directory=False)
    train_manifest, train_rows = validate_training_export(args.dataset)
    attestation = verify_export_attestation(args.dataset, args.trusted_public_key, args.trusted_key_sha256)
    verify_current_revocations(args.revocations, train_manifest["dataSha256"], args.trusted_public_key, args.trusted_key_sha256)
    heldout_cases = validate_evaluation(args.eval, train_manifest)
    verify_train_holdout_separation(train_rows, heldout_cases)
    cases = heldout_cases[:args.max_cases]
    model = validate_local_model(args.model)
    run = json.loads((args.adapter / "diana-run.json").read_text(encoding="utf-8"))
    if run.get("version") != "diana-local-lora-run-v1" or run.get("modelId") != MODEL_ID or run.get("datasetSha256") != train_manifest["dataSha256"]:
        raise ValueError("Adapter run provenance differs from the gated training export")
    verify_adapter_integrity(args.adapter, run)
    if (run.get("exportAttestationSha256") != file_sha256(args.dataset / "attestation.json")
            or run.get("trustedKeyFingerprintSha256") != attestation["keyFingerprintSha256"]):
        raise ValueError("Adapter bytes or signed export attestation changed since training")
    if (run.get("datasetManifestSha256") != file_sha256(args.dataset / "manifest.json")
            or run.get("baseConfigSha256") != model["configSha256"]
            or run.get("baseTokenizerSha256") != model["tokenizerSha256"]
            or run.get("baseWeightsSha256") != snapshot_digest(args.model)):
        raise ValueError("Base model or training manifest changed since adapter training")
    require_dependencies()
    verify_current_revocations(args.revocations, train_manifest["dataSha256"], args.trusted_public_key, args.trusted_key_sha256)
    import torch
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    if not torch.cuda.is_available() or not torch.cuda.is_bf16_supported():
        raise ValueError("A BF16-capable CUDA GPU is required for the paired 4B comparison")
    dtype = torch.bfloat16
    tokenizer = AutoTokenizer.from_pretrained(str(args.model), local_files_only=True, trust_remote_code=False)
    base = AutoModelForCausalLM.from_pretrained(str(args.model), local_files_only=True, trust_remote_code=False,
                                               use_safetensors=True, dtype=dtype, device_map="cuda:0", attn_implementation="eager")
    base.eval()
    paired = PeftModel.from_pretrained(base, str(args.adapter), is_trainable=False, local_files_only=True)
    paired.eval()
    output_path = args.output / "paired.jsonl"

    def generate(messages: list[dict], enabled: bool) -> tuple[str, int]:
        encoded = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True, return_tensors="pt")
        if encoded.shape[1] > 4096:
            raise ValueError("Held-out prompt exceeds bounded inference length")
        encoded = encoded.to("cuda")
        with torch.inference_mode():
            if enabled:
                result = paired.generate(encoded, max_new_tokens=args.max_new_tokens, do_sample=False,
                                         pad_token_id=tokenizer.eos_token_id)
            else:
                with paired.disable_adapter():
                    result = paired.generate(encoded, max_new_tokens=args.max_new_tokens, do_sample=False,
                                             pad_token_id=tokenizer.eos_token_id)
        tokens = result[0, encoded.shape[1]:]
        return tokenizer.decode(tokens, skip_special_tokens=True), len(tokens)

    rows = []
    with output_path.open("x", encoding="utf-8") as stream:
        for case in cases:
            base_output, base_tokens = generate(case["messages"], False)
            adapter_output, adapter_tokens = generate(case["messages"], True)
            row = {"caseId": case["id"], "promptSha256": __import__("hashlib").sha256(
                json.dumps(case["messages"], sort_keys=True).encode()).hexdigest(),
                "baseline": {"output": base_output, "tokens": base_tokens, "checks": engineering_checks(base_output, case)},
                "adapter": {"output": adapter_output, "tokens": adapter_tokens, "checks": engineering_checks(adapter_output, case)}}
            stream.write(json.dumps(row, ensure_ascii=False) + "\n")
            stream.flush()
            rows.append(row)
    try:
        verify_export_attestation(args.dataset, args.trusted_public_key, args.trusted_key_sha256)
        verify_current_revocations(args.revocations, train_manifest["dataSha256"], args.trusted_public_key, args.trusted_key_sha256)
    except ValueError as error:
        invalid = {"version": "diana-local-lora-comparison-v1", "status": "invalid_authorization",
                   "reason": str(error), "casesGenerated": len(rows), "pairedOutputSha256": file_sha256(output_path),
                   "studentFacingActivation": False}
        (args.output / "report.json").write_text(json.dumps(invalid, indent=2) + "\n", encoding="utf-8")
        verify_private_path(args.output / "report.json", Path.cwd(), directory=False)
        raise ValueError("Comparison authorization expired or was revoked; paired output is invalid") from error
    report = {"version": "diana-local-lora-comparison-v1",
              "status": "bounded_smoke_complete" if len(rows) < len(heldout_cases) else "engineering_complete",
              "modelId": MODEL_ID, "baseWeightsSha256": run["baseWeightsSha256"],
              "adapterRunSha256": file_sha256(args.adapter / "diana-run.json"),
              "trainingDatasetSha256": train_manifest["dataSha256"],
              "evaluationSha256": file_sha256(args.eval / "heldout.jsonl"),
              "cases": len(rows), "ofAvailableCases": len(heldout_cases),
              "maxNewTokens": args.max_new_tokens, "decoding": "greedy",
              "pairedOutputSha256": file_sha256(output_path), "dependencies": dependency_status(),
              "createdAt": datetime.now(timezone.utc).isoformat(),
              "humanQualityReview": "pending", "qualityRankingEstablished": False,
              "learningGainsEstablished": False, "studentFacingActivation": False,
              "qualification": "Automated format/source checks are diagnostics; qualified educators must score tutoring quality blind."}
    (args.output / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    verify_private_path(output_path, Path.cwd(), directory=False)
    verify_private_path(args.output / "report.json", Path.cwd(), directory=False)
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, FileNotFoundError, json.JSONDecodeError) as error:
        print(f"Local comparison blocked: {error}", file=sys.stderr)
        sys.exit(1)
