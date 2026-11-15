"""Offline evaluation adapter. No downloads, listener, hosted API or automatic activation."""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import re
import socket
import sys
import time
import wave
from datetime import datetime, timezone


def deny_network(*_args, **_kwargs):
    raise RuntimeError("network_disabled_for_recognition")


def digest_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_hash(value: object) -> str:
    return digest_bytes(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))


def prepare_line_image(data: bytes):
    """Honor camera orientation and reject unsupported portrait line inputs.

    This is an input boundary, not text detection or page segmentation. A wide
    image can still contain several lines and must be checked by the student.
    """
    from PIL import Image, ImageOps
    Image.MAX_IMAGE_PIXELS = 4_000_000
    image = Image.open(io.BytesIO(data))
    if image.format not in ("PNG", "JPEG") or image.width * image.height > 4_000_000:
        raise ValueError("image_bound")
    image = ImageOps.exif_transpose(image)
    if image.width <= image.height:
        raise ValueError("image_requires_horizontal_line_or_manual_entry")
    return image.convert("RGB")


def unavailable_response(error: Exception) -> dict:
    # A fixed public code may explain supported layout without releasing traces,
    # local paths, model errors, or any recognized content.
    code = "recognition_unsupported_layout" if isinstance(error, ValueError) and str(error) == "image_requires_horizontal_line_or_manual_entry" else "recognition_unavailable"
    return {"error": code, "manualEntryAvailable": True}


def load_manifest(filename: str) -> tuple[dict, Path]:
    file_path = Path(filename).resolve(strict=True)
    if file_path.stat().st_size > 100_000:
        raise ValueError("model_manifest_bound")
    config = json.loads(file_path.read_text(encoding="utf-8"))
    if set(config) != {"model", "directory", "files"}:
        raise ValueError("model_manifest_schema")
    model = config["model"]
    required = {"version", "kind", "modelId", "revision", "fileManifestHash", "approvedBy", "approvalReference", "approvedAt", "expiresAt", "enabled"}
    if set(model) != required or model["version"] != "local-recognition-v1" or model["enabled"] is not True:
        raise ValueError("model_unavailable")
    if model["kind"] not in ("handwriting_line", "speech") or not re.fullmatch(r"[a-f0-9]{40}", model["revision"]):
        raise ValueError("model_manifest_schema")
    now = datetime.now(timezone.utc)
    approved = datetime.fromisoformat(model["approvedAt"].replace("Z", "+00:00"))
    expires = datetime.fromisoformat(model["expiresAt"].replace("Z", "+00:00"))
    if not approved <= now < expires or not model["approvedBy"] or not model["approvalReference"]:
        raise ValueError("model_approval_unavailable")
    directory = Path(config["directory"]).resolve(strict=True)
    if not directory.is_dir() or "public" in {part.casefold() for part in directory.parts} or not config["files"] or len(config["files"]) > 100:
        raise ValueError("model_directory_unavailable")
    files = config["files"]
    if canonical_hash(files) != model["fileManifestHash"]:
        raise ValueError("model_file_manifest_changed")
    total = 0
    for name, expected in files.items():
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", name) or not re.fullmatch(r"[a-f0-9]{64}", expected):
            raise ValueError("model_file_name")
        target = (directory / name).resolve(strict=True)
        if target.parent != directory or not target.is_file():
            raise ValueError("model_file_outside_directory")
        total += target.stat().st_size
        if total > 5_000_000_000:
            raise ValueError("model_size_bound")
        with target.open("rb") as stream:
            actual = hashlib.file_digest(stream, "sha256").hexdigest()
        if actual != expected:
            raise ValueError("model_file_changed")
    # Runtime libraries may read any model/config file in the directory: pin all of them.
    if {item.name for item in directory.iterdir() if item.is_file()} != set(files) or any(item.is_dir() for item in directory.iterdir()):
        raise ValueError("unlisted_model_file")
    return model, directory


def recognize(config_path: str, request: dict) -> dict:
    if set(request) != {"kind", "mime", "assetBase64", "assetHash"}:
        raise ValueError("recognition_request_schema")
    model, directory = load_manifest(config_path)
    if request["kind"] != model["kind"]:
        raise ValueError("recognition_kind_mismatch")
    data = base64.b64decode(request["assetBase64"], validate=True)
    if len(data) > 5_000_000 or digest_bytes(data) != request["assetHash"]:
        raise ValueError("recognition_asset_changed")
    started = time.monotonic()
    if request["kind"] == "speech":
        if request["mime"] != "audio/wav":
            raise ValueError("choose_pcm_wav_audio")
        with wave.open(io.BytesIO(data)) as wav:
            if wav.getnchannels() != 1 or wav.getsampwidth() != 2 or wav.getframerate() != 16000 or wav.getcomptype() != "NONE" or not 0 < wav.getnframes() <= 120 * 16000:
                raise ValueError("audio_requires_16khz_mono_pcm16_under_120_seconds")
        from faster_whisper import WhisperModel
        engine = WhisperModel(str(directory), device="cpu", compute_type="int8", cpu_threads=2, local_files_only=True)
        segments, _info = engine.transcribe(io.BytesIO(data), beam_size=5, condition_on_previous_text=False)
        text = "".join(segment.text for segment in segments).strip()
    else:
        if request["mime"] not in ("image/png", "image/jpeg"):
            raise ValueError("choose_a_line_image")
        image = prepare_line_image(data)
        import torch
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        torch.set_num_threads(2)
        processor = TrOCRProcessor.from_pretrained(str(directory), local_files_only=True, trust_remote_code=False)
        engine = VisionEncoderDecoderModel.from_pretrained(str(directory), local_files_only=True, trust_remote_code=False, use_safetensors=True).to("cpu").eval()
        pixels = processor(images=image, return_tensors="pt").pixel_values
        with torch.inference_mode():
            generated = engine.generate(pixels, max_new_tokens=256, do_sample=False)
        text = processor.batch_decode(generated, skip_special_tokens=True)[0]
    # Detect replacement of weights/configuration while the inference process was running.
    load_manifest(config_path)
    if len(text) > 4000:
        raise ValueError("recognition_output_bound")
    return {"version":"local-recognition-v1", "kind":model["kind"], "assetHash":request["assetHash"], "modelId":model["modelId"], "revision":model["revision"], "fileManifestHash":model["fileManifestHash"], "text":text, "elapsedMs":round((time.monotonic()-started)*1000), "device":"cpu", "confidence":None, "networkUsed":False}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    args = parser.parse_args()
    os.environ.update(HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", HF_HUB_DISABLE_TELEMETRY="1", TOKENIZERS_PARALLELISM="false")
    socket.create_connection = deny_network
    socket.socket.connect = deny_network
    socket.socket.connect_ex = deny_network
    socket.socket.sendto = deny_network
    raw = sys.stdin.buffer.read(7_000_001)
    if len(raw) > 7_000_000:
        raise ValueError("recognition_input_bound")
    print(json.dumps(recognize(args.manifest, json.loads(raw)), ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Do not print recognized student content or local paths in failures.
        print(json.dumps(unavailable_response(error)))
        sys.exit(1)
