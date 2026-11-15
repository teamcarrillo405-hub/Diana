"""Prepare one original synthetic line and a pinned TrOCR research manifest.

This is engineering smoke evidence, never human handwriting evaluation or model
approval for students. Downloads are explicit; recognition is a separate offline
command using the existing adapter. No hosted inference or student data is used.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path
import sys
import urllib.request

REVISION = "eaacaf452b06415df8f10bb6fad3a4c11e609406"
MODEL = "microsoft/trocr-base-handwritten"
WEIGHT_HASH = "25a40cddc7e6120140a3d5b9e3dd3878a92ada7b4f312953ab22edc19c2a5acc"
FILES = {
    "README.md": 2999, "config.json": 4165, "generation_config.json": 190,
    "merges.txt": 456318, "model.safetensors": 1333384464,
    "preprocessor_config.json": 224, "special_tokens_map.json": 772,
    "tokenizer_config.json": 1118, "vocab.json": 898822,
}
# Git blob identities from the official publisher API at REVISION. LFS weights
# use the publisher SHA-256 above; ordinary Git files include their blob header.
PUBLISHER_BLOBS = {
    "README.md": "242dbdaefcfc75e80aa64a069152aa9fe45b4a8e",
    "config.json": "77ca481534a03a5050a452b5e66eeb6b33655cef",
    "generation_config.json": "209d1d39a6767d115b4ebff7ba46fe9c1739e90e",
    "merges.txt": "226b0752cac7789c48f0cb3ec53eda48b7be36cc",
    "preprocessor_config.json": "f6f37e38a43eb75f83f8413557dd71ec2168185b",
    "special_tokens_map.json": "e97d1993365bb21c88f390e8703e4c1af564821f",
    "tokenizer_config.json": "8a1587ff662748498a14db272b5c3eb58ec7da95",
    "vocab.json": "0a39732b2d8be8e493cab3da68b68cc3e28221de",
}
TRANSCRIPT = "The plant grows toward the light."


def sha(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def verify_publisher_file(name: str, path: Path) -> str:
    if name not in FILES or path.stat().st_size != FILES[name]:
        raise RuntimeError(f"Publisher file size mismatch: {name}")
    if name == "model.safetensors":
        digest = sha(path)
        if digest != WEIGHT_HASH:
            raise RuntimeError("Publisher safetensors SHA256 mismatch")
        return digest
    data = path.read_bytes()
    blob = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
    if blob != PUBLISHER_BLOBS[name]:
        raise RuntimeError(f"Publisher Git blob mismatch: {name}")
    return hashlib.sha256(data).hexdigest()


def distance(left: list | str, right: list | str) -> int:
    row = list(range(len(right) + 1))
    for i, a in enumerate(left, 1):
        following = [i]
        for j, b in enumerate(right, 1):
            following.append(min(following[-1] + 1, row[j] + 1, row[j - 1] + (a != b)))
        row = following
    return row[-1]


def summarize(output: Path) -> None:
    draft = json.loads((output / "draft.json").read_text(encoding="utf-8"))
    provenance = json.loads((output / "input-provenance.json").read_text(encoding="utf-8"))
    manifest = json.loads((output / "research-manifest.json").read_text(encoding="utf-8"))
    actual = draft["text"]
    observed = draft["recognition"]
    assert provenance["synthetic"] and provenance["expectedText"] == TRANSCRIPT
    assert sha(output / "synthetic-line.png") == provenance["assetSha256"] == observed["assetHash"]
    assert sha(output / "research-manifest.json") == provenance["manifestSha256"]
    assert observed["modelId"] == MODEL and observed["revision"] == REVISION
    assert observed["fileManifestHash"] == manifest["model"]["fileManifestHash"]
    assert draft["confirmedHash"] is None and observed["networkUsed"] is False
    for name, expected in manifest["files"].items():
        assert sha(Path(manifest["directory"]) / name) == expected
    report = {
        "version": "local-handwriting-synthetic-smoke-v1", "status": "executed",
        "createdAt": datetime.now(timezone.utc).isoformat(), "sampleCount": 1,
        "synthetic": True, "humanReviewed": False, "studentData": False,
        "modelId": MODEL, "revision": REVISION,
        "modelFileManifestHash": observed["fileManifestHash"],
        "assetSha256": observed["assetHash"], "draftSha256": sha(output / "draft.json"),
        "expectedText": TRANSCRIPT, "actualText": actual,
        "rawExactMatch": actual == TRANSCRIPT,
        "characterEdits": distance(TRANSCRIPT, actual),
        "characterErrorRate": distance(TRANSCRIPT, actual) / len(TRANSCRIPT),
        "wordEditsWhitespaceTokenized": distance(TRANSCRIPT.split(), actual.split()),
        "wordErrorRateWhitespaceTokenized": distance(TRANSCRIPT.split(), actual.split()) / len(TRANSCRIPT.split()),
        "elapsedMsAdapter": observed["elapsedMs"], "device": "cpu", "torchThreads": 2,
        "confidence": None, "confirmed": False, "trainingEligible": False,
        "network": {"downloadBeforeInference": True, "inferenceNetworkUsedContract": False,
                    "boundary": "Existing adapter socket denial, offline flags, local_files_only; no OS network trace captured"},
        "runtime": {"executable": sys.executable, "python": sys.version,
                    **{name: importlib.metadata.version(name) for name in ("torch", "transformers", "Pillow", "safetensors", "tokenizers")}},
        "limitations": ["One font-rendered original line is not human handwriting or representative evaluation",
                        "Raw punctuation spacing error retained; no cleanup or fabricated exact match",
                        "No classroom, age, disability, math notation, diagram or full-page evidence",
                        "No student deployment, educator approval, model fine-tuning or app activation"],
    }
    with (output / "smoke-report.json").open("x", encoding="utf-8") as stream:
        json.dump(report, stream, indent=2)
        stream.write("\n")
    print(json.dumps({"status": "reported", "characterEdits": report["characterEdits"],
                      "rawExactMatch": report["rawExactMatch"], "elapsedMs": observed["elapsedMs"]}))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--summarize", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    output = root / "artifacts/learning-engine/research/local-handwriting-execution"
    if args.summarize:
        if args.download:
            parser.error("Summarization cannot download")
        summarize(output)
        return
    directory = output / "trocr-base-handwritten"
    directory.mkdir(parents=True, exist_ok=True)
    files = {}
    for name, size in FILES.items():
        target = directory / name
        if not target.exists():
            if not args.download:
                raise RuntimeError("Missing pinned file; downloading requires --download")
            url = f"https://huggingface.co/{MODEL}/resolve/{REVISION}/{name}"
            temporary = output / (name + ".download")
            count = 0
            with urllib.request.urlopen(url, timeout=60) as response, temporary.open("wb") as sink:
                while chunk := response.read(1024 * 1024):
                    count += len(chunk)
                    if count > size:
                        raise RuntimeError(f"Publisher size mismatch: {name}")
                    sink.write(chunk)
            if count != size:
                raise RuntimeError(f"Incomplete pinned file: {name}")
            verify_publisher_file(name, temporary)
            temporary.replace(target)
        files[name] = verify_publisher_file(name, target)
    files = dict(sorted(files.items()))
    file_map = json.dumps(files, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    now = datetime.now(timezone.utc)
    stamp = lambda value: value.isoformat(timespec="seconds").replace("+00:00", "Z")
    manifest = {
        "model": {"version": "local-recognition-v1", "kind": "handwriting_line",
            "modelId": MODEL, "revision": REVISION,
            "fileManifestHash": hashlib.sha256(file_map).hexdigest(),
            "approvedBy": "Codex engineering research agent, not human educator",
            "approvalReference": "User authorized autonomous research 2026-09-26; synthetic smoke only",
            "approvedAt": stamp(now), "expiresAt": stamp(now + timedelta(days=2)), "enabled": True},
        "directory": str(directory), "files": files,
    }
    (output / "research-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    from PIL import Image, ImageDraw, ImageFont
    font_path = Path("C:/Windows/Fonts/segoepr.ttf")
    font = ImageFont.truetype(str(font_path), 40)
    bounds = font.getbbox(TRANSCRIPT)
    image = Image.new("RGB", (bounds[2] - bounds[0] + 32, bounds[3] - bounds[1] + 32), "white")
    ImageDraw.Draw(image).text((16 - bounds[0], 16 - bounds[1]), TRANSCRIPT, fill="black", font=font)
    asset = output / "synthetic-line.png"
    image.save(asset)
    provenance = {
        "version": "synthetic-handwriting-smoke-input-v1", "synthetic": True,
        "expectedText": TRANSCRIPT, "assetSha256": sha(asset),
        "width": image.width, "height": image.height,
        "rendering": "Original text rendered locally with installed Segoe Print font; not human handwriting",
        "fontSha256": sha(font_path), "humanReviewed": False,
        "studentData": False, "trainingEligible": False,
        "source": f"https://huggingface.co/{MODEL}/tree/{REVISION}",
        "modelLicenseOnPublisherCard": "MIT", "manifestSha256": sha(output / "research-manifest.json"),
    }
    (output / "input-provenance.json").write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "prepared", "modelFiles": len(files), "synthetic": True,
                      "assetSha256": provenance["assetSha256"], "modelFileManifestHash": manifest["model"]["fileManifestHash"]}))


if __name__ == "__main__":
    main()
