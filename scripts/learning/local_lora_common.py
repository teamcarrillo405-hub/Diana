"""Offline-only validation shared by Diana's local LoRA research commands."""

from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import re
import subprocess
import unicodedata

MODEL_ID = "Qwen/Qwen3-4B-Instruct-2507"
EXPECTED_HELDOUT_DATA_SHA256 = "64d9d36922ea8c41a5b2e58522f323bcb11a342bb7c35973600a360e18a634c3"
EXPECTED_HELDOUT_CORPUS_SHA256 = "eb56f6c4144f101c7af2e4641942ad29dd0054e56d5d56b73b124bcb0ca7d799"
DEPENDENCIES = {
    "torch": "2.12.0",
    "transformers": "5.17.0",
    "peft": "0.21.0",
    "accelerate": "1.15.0",
    "safetensors": "0.5.3",
    "cryptography": "46.0.7",
}


def force_offline() -> None:
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_DATASETS_OFFLINE"] = "1"
    os.environ["WANDB_DISABLED"] = "true"
    os.environ["DISABLE_TELEMETRY"] = "1"


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_jsonl(path: Path) -> list[dict]:
    rows = []
    for index, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if line.strip():
            value = json.loads(line)
            if not isinstance(value, dict):
                raise ValueError(f"Line {index} of {path} is not an object")
            rows.append(value)
    return rows


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).lower()
    return " ".join("".join(char if unicodedata.category(char)[0] in {"L", "N"} else " " for char in normalized).split())


def template_text(value: str) -> str:
    result = []
    in_number = False
    for char in normalize_text(value):
        number = unicodedata.category(char).startswith("N")
        if number:
            if not in_number:
                result.append("#")
        else:
            result.append(char)
        in_number = number
    return "".join(result)


def text_fingerprints(value: str) -> dict[str, str]:
    return {"exact": hashlib.sha256(normalize_text(value).encode()).hexdigest(),
            "template": hashlib.sha256(template_text(value).encode()).hexdigest()}


def extract_training_question(content: str) -> str:
    try:
        parsed = json.loads(content)
        if isinstance(parsed, dict) and isinstance(parsed.get("question"), str):
            return parsed["question"]
    except json.JSONDecodeError:
        pass
    return content


def near_duplicate_text(left: str, right: str) -> bool:
    def shingles(value: str) -> set[str]:
        words = template_text(value).split()
        width = 1 if len(words) < 5 else 3
        return {" ".join(words[index:index + width]) for index in range(len(words) - width + 1)}
    if template_text(left) == template_text(right):
        return True
    first, second = shingles(left), shingles(right)
    return bool(first and second and len(first & second) / len(first | second) >= 0.8)


def verify_train_holdout_separation(rows: list[dict], cases: list[dict]) -> None:
    def signature(value: str) -> tuple[str, set[str], set[str], int]:
        template = template_text(value)
        words = template.split()
        width = 1 if len(words) < 5 else 3
        shingles = {" ".join(words[index:index + width]) for index in range(len(words) - width + 1)}
        triples = {" ".join(words[index:index + 3]) for index in range(len(words) - 2)}
        return template, shingles, triples, len(words)

    heldout = [signature(value) for value in {value for case in cases for value in (case["prompt"], case["source"])}]
    for index, row in enumerate(rows):
        messages = row["messages"]
        content = [row["sourceText"]] + [message["content"] for message in messages]
        content.extend(extract_training_question(message["content"]) for message in messages if message["role"] == "user")
        def all_strings(value: object) -> list[str]:
            if isinstance(value, str):
                return [value]
            if isinstance(value, dict):
                return [item for child in value.values() for item in all_strings(child)]
            if isinstance(value, list):
                return [item for child in value for item in all_strings(child)]
            return []
        for message in messages:
            try:
                parsed = json.loads(message["content"])
                content.extend(all_strings(parsed))
            except json.JSONDecodeError:
                pass
        def overlaps(value: str) -> bool:
            candidate_template, candidate_shingles, candidate_triples, _ = signature(value)
            for target_template, target_shingles, target_triples, target_words in heldout:
                if candidate_template == target_template or (target_template and f" {target_template} " in f" {candidate_template} "):
                    return True
                shared = len(candidate_shingles & target_shingles)
                if candidate_shingles and target_shingles and shared / len(candidate_shingles | target_shingles) >= 0.8:
                    return True
                if target_words >= 5 and target_triples and len(candidate_triples & target_triples) / len(target_triples) >= 0.8:
                    return True
            return False

        if any(overlaps(value) for value in set(content)):
            raise ValueError(f"Training row {index} overlaps pinned held-out prompt/source content")


def verify_private_path(path: Path, workspace: Path, *, directory: bool) -> None:
    """Fail closed unless an operator prepared a private path outside the checkout."""
    path = path.absolute()
    if path.is_symlink() or not path.exists() or path.is_dir() != directory:
        raise ValueError("Private research path must exist with the expected type and not be a link")
    if path.resolve() != path or path.resolve().is_relative_to(workspace.resolve()):
        raise ValueError("Private research path must be outside the source checkout and not redirected")
    if os.name == "nt":
        verifier = Path(__file__).with_name("verify-private-acl.ps1")
        check = subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive", "-File", str(verifier),
                                "-LiteralPath", str(path)], capture_output=True, text=True, timeout=10, check=False)
        if check.returncode:
            raise ValueError("Private Windows ACL validation failed")
    else:
        mode = path.stat().st_mode & 0o777
        expected = 0o700 if directory else 0o600
        if mode != expected:
            raise ValueError(f"Private research path requires mode {expected:04o}")


def validate_training_export(dataset_dir: Path) -> tuple[dict, list[dict]]:
    manifest = json.loads((dataset_dir / "manifest.json").read_text(encoding="utf-8"))
    train_path = dataset_dir / "train.jsonl"
    rows = read_jsonl(train_path)
    if manifest.get("version") != "diana-local-lora-dataset-v1" or manifest.get("modelId") != MODEL_ID:
        raise ValueError("Training manifest version or research model differs")
    if manifest.get("dataSha256") != file_sha256(train_path) or manifest.get("exampleCount") != len(rows):
        raise ValueError("Training export no longer matches its gated manifest")
    if not rows:
        raise ValueError("The gated training export is empty")
    for index, row in enumerate(rows):
        messages = row.get("messages")
        if (not isinstance(messages, list) or len(messages) < 3 or
                any(not isinstance(message, dict) or message.get("role") not in {"system", "user", "assistant"}
                    or not isinstance(message.get("content"), str) for message in messages) or
                messages[0]["role"] != "system" or messages[-1]["role"] != "assistant" or
                not any(message["role"] == "user" for message in messages) or
                not isinstance(row.get("sourceText"), str) or not row["sourceText"].strip()):
            raise ValueError(f"Training conversation {index} has changed shape")
    for key in ("documentFamilies", "templateFamilies"):
        families = manifest.get(key)
        if not isinstance(families, list) or not families or len(families) != len(set(families)):
            raise ValueError(f"Training manifest {key} is missing or duplicated")
    for key in ("heldOutCorpusSha256", "heldOutEvaluationSha256"):
        if not isinstance(manifest.get(key), str) or not re.fullmatch(r"[a-f0-9]{64}", manifest[key]):
            raise ValueError(f"Training manifest {key} is missing")
    if (manifest["heldOutEvaluationSha256"] != EXPECTED_HELDOUT_DATA_SHA256
            or manifest["heldOutCorpusSha256"] != EXPECTED_HELDOUT_CORPUS_SHA256):
        raise ValueError("Training manifest's held-out corpus differs from the code-reviewed reference")
    for key in ("trainingPromptFingerprints", "trainingSourceFingerprints"):
        fingerprints = manifest.get(key)
        if not isinstance(fingerprints, list) or len(fingerprints) != len(rows) or any(
                not isinstance(value, dict) or set(value) != {"exact", "template"} or
                any(not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest) for digest in value.values())
                for value in fingerprints):
            raise ValueError(f"Training manifest {key} is missing or invalid")
    for index, row in enumerate(rows):
        user_content = next(message["content"] for message in reversed(row["messages"]) if message["role"] == "user")
        try:
            user_payload = json.loads(user_content)
        except json.JSONDecodeError as error:
            raise ValueError(f"Training row {index} has no source-bound user payload") from error
        if (not isinstance(user_payload, dict) or set(user_payload) not in ({"question", "source"}, {"question", "source", "studentResponse"})
                or not isinstance(user_payload.get("question"), str) or
                ("studentResponse" in user_payload and not isinstance(user_payload["studentResponse"], str)) or
                user_payload.get("source") != row["sourceText"]):
            raise ValueError(f"Training row {index} source differs from its user payload")
        if (manifest["trainingPromptFingerprints"][index] != text_fingerprints(extract_training_question(user_content))
                or manifest["trainingSourceFingerprints"][index] != text_fingerprints(row["sourceText"])):
            raise ValueError(f"Training row {index} fingerprints differ from its signed manifest")
    return manifest, rows


def verify_export_attestation(dataset_dir: Path, trusted_public_key: Path, expected_fingerprint: str) -> dict:
    """Require a separate operator's Ed25519 approval of exact training bytes."""
    from cryptography.exceptions import InvalidSignature
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

    if not re.fullmatch(r"[a-f0-9]{64}", expected_fingerprint):
        raise ValueError("A pinned trusted public-key SHA-256 fingerprint is required")
    public_key = serialization.load_pem_public_key(trusted_public_key.read_bytes())
    if not isinstance(public_key, Ed25519PublicKey):
        raise ValueError("Trusted export key must be Ed25519")
    public_der = public_key.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    actual_fingerprint = hashlib.sha256(public_der).hexdigest()
    if actual_fingerprint != expected_fingerprint:
        raise ValueError("Trusted export public key differs from the pinned fingerprint")
    receipt = json.loads((dataset_dir / "attestation.json").read_text(encoding="utf-8"))
    if set(receipt) != {"payload", "signatureBase64"} or not isinstance(receipt["payload"], dict):
        raise ValueError("Export attestation has an invalid shape")
    payload = receipt["payload"]
    required = {"version", "modelId", "manifestSha256", "datasetSha256", "keyFingerprintSha256",
                "issuedBy", "reviewRecordId", "issuedAt", "expiresAt"}
    if set(payload) != required or any(not isinstance(value, str) for value in payload.values()):
        raise ValueError("Export attestation payload has an invalid shape")
    if (payload["version"] != "diana-local-lora-attestation-v1" or payload["modelId"] != MODEL_ID
            or payload["manifestSha256"] != file_sha256(dataset_dir / "manifest.json")
            or payload["datasetSha256"] != file_sha256(dataset_dir / "train.jsonl")
            or payload["keyFingerprintSha256"] != actual_fingerprint):
        raise ValueError("Export attestation does not match the training bytes or trusted key")
    if not re.fullmatch(r"[A-Za-z0-9._:/-]{8,200}", payload["issuedBy"]) or not re.fullmatch(r"[A-Za-z0-9._:/-]{8,200}", payload["reviewRecordId"]):
        raise ValueError("Export attestation needs a signer and external review record")
    try:
        issued = datetime.fromisoformat(payload["issuedAt"].replace("Z", "+00:00"))
        expires = datetime.fromisoformat(payload["expiresAt"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        if issued.tzinfo is None or expires.tzinfo is None or issued > now + timedelta(minutes=5) or not issued < now < expires or expires - issued > timedelta(hours=24):
            raise ValueError("Export authorization has expired or is outside the 24-hour window")
        signature = base64.b64decode(receipt["signatureBase64"], validate=True)
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        public_key.verify(signature, canonical)
    except (ValueError, TypeError, InvalidSignature) as error:
        raise ValueError("Export attestation signature or date is invalid") from error
    return payload


def verify_current_revocations(snapshot_path: Path, dataset_hash: str, trusted_public_key: Path,
                               expected_fingerprint: str) -> dict:
    """Require a separately supplied, recent signed operator revocation snapshot."""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
    from cryptography.exceptions import InvalidSignature
    public_key = serialization.load_pem_public_key(trusted_public_key.read_bytes())
    if not isinstance(public_key, Ed25519PublicKey):
        raise ValueError("Revocation verification key must be Ed25519")
    der = public_key.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    if hashlib.sha256(der).hexdigest() != expected_fingerprint:
        raise ValueError("Revocation verification key differs from trusted key")
    receipt = json.loads(snapshot_path.read_text(encoding="utf-8"))
    if set(receipt) != {"payload", "signatureBase64"} or not isinstance(receipt["payload"], dict):
        raise ValueError("Revocation snapshot has invalid shape")
    payload = receipt["payload"]
    if set(payload) != {"version", "issuedAt", "expiresAt", "revokedDatasetSha256"} or payload["version"] != "diana-local-lora-revocations-v1":
        raise ValueError("Revocation snapshot has invalid payload")
    revoked = payload["revokedDatasetSha256"]
    if not isinstance(revoked, list) or any(not isinstance(item, str) or not re.fullmatch(r"[a-f0-9]{64}", item) for item in revoked):
        raise ValueError("Revocation snapshot dataset hashes are invalid")
    try:
        issued = datetime.fromisoformat(payload["issuedAt"].replace("Z", "+00:00"))
        expires = datetime.fromisoformat(payload["expiresAt"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        if issued.tzinfo is None or expires.tzinfo is None or issued > now + timedelta(minutes=5) or not issued < now < expires or expires - issued > timedelta(hours=24):
            raise ValueError("Revocation snapshot is stale or expired")
        signature = base64.b64decode(receipt["signatureBase64"], validate=True)
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
        public_key.verify(signature, canonical)
    except (ValueError, TypeError, InvalidSignature) as error:
        raise ValueError("Revocation snapshot signature or validity is invalid") from error
    if dataset_hash in revoked:
        raise ValueError("This training dataset has been revoked")
    return payload


def adapter_file_hashes(adapter_dir: Path) -> dict[str, str]:
    """Hash exactly the adapter config and safetensors file PEFT will load."""
    expected = ("adapter_config.json", "adapter_model.safetensors")
    if sorted(file.name for file in adapter_dir.glob("*.safetensors")) != ["adapter_model.safetensors"]:
        raise ValueError("Expected one local safetensors adapter file")
    if (adapter_dir / "adapter_model.bin").exists():
        raise ValueError("Unsafe alternate adapter weight file is present")
    for name in expected:
        file = adapter_dir / name
        if not file.is_file() or file.is_symlink():
            raise ValueError("Adapter config or weights are missing or symlinked")
    return {name: file_sha256(adapter_dir / name) for name in expected}


def verify_adapter_integrity(adapter_dir: Path, run: dict) -> dict[str, str]:
    hashes = adapter_file_hashes(adapter_dir)
    if run.get("adapterFilesSha256") != hashes:
        raise ValueError("Saved adapter config or weights differ from the training run")
    return hashes


def validate_local_model(model_dir: Path) -> dict:
    model_dir = model_dir.resolve(strict=True)
    if not model_dir.is_dir() or not (model_dir / "config.json").is_file():
        raise ValueError("Provide a local model snapshot directory with config.json")
    config = json.loads((model_dir / "config.json").read_text(encoding="utf-8"))
    fingerprint = {"model_type": "qwen3", "hidden_size": 2560, "intermediate_size": 9728,
                   "num_hidden_layers": 36, "num_attention_heads": 32,
                   "num_key_value_heads": 8, "vocab_size": 151936}
    if any(config.get(key) != value for key, value in fingerprint.items()) or config.get("architectures") != ["Qwen3ForCausalLM"]:
        raise ValueError("The local snapshot config does not match the proposed 4B Qwen3 architecture")
    if not (model_dir / "tokenizer_config.json").is_file() or not list(model_dir.glob("*.safetensors")):
        raise ValueError("Local tokenizer config and safetensors weights are required")
    tokenizer_files = sorted(file for file in model_dir.iterdir() if file.is_file() and
                             file.suffix in {".json", ".jinja", ".model", ".txt"})
    tokenizer_digest = hashlib.sha256()
    for file in tokenizer_files:
        tokenizer_digest.update(file.name.encode("utf-8"))
        tokenizer_digest.update(file_sha256(file).encode("ascii"))
    return {"path": str(model_dir), "configSha256": file_sha256(model_dir / "config.json"),
            "tokenizerSha256": tokenizer_digest.hexdigest(),
            "weightFiles": sorted(file.name for file in model_dir.glob("*.safetensors"))}


def snapshot_digest(model_dir: Path) -> str:
    """Hash the large local weights before comparison so the baseline cannot drift."""
    digest = hashlib.sha256()
    for file in sorted(model_dir.glob("*.safetensors")):
        digest.update(file.name.encode("utf-8"))
        digest.update(file_sha256(file).encode("ascii"))
    return digest.hexdigest()


def dependency_status() -> dict[str, dict[str, str | bool | None]]:
    status = {}
    for name, expected in DEPENDENCIES.items():
        try:
            actual = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            actual = None
        status[name] = {"expected": expected, "actual": actual, "ready": actual == expected}
    return status


def require_dependencies() -> dict:
    status = dependency_status()
    if not all(row["ready"] for row in status.values()):
        raise ValueError("Pinned local LoRA dependencies are missing or differ: " + json.dumps(status))
    return status


def cuda_status() -> dict:
    try:
        import torch
        available = torch.cuda.is_available()
        return {"available": available, "bf16Supported": torch.cuda.is_bf16_supported() if available else False,
                "device": torch.cuda.get_device_name(0) if available else None,
                "totalMemoryGiB": round(torch.cuda.get_device_properties(0).total_memory / 2**30, 2) if available else None}
    except (ImportError, RuntimeError, AssertionError) as error:
        return {"available": False, "bf16Supported": False, "device": None,
                "totalMemoryGiB": None, "error": type(error).__name__}
