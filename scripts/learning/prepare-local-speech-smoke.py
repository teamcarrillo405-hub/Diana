"""Prepare an explicit engineering-only Whisper smoke run, never an app release.

Download is a separate, network-using preparation step. Inference must use the
existing recognize-local.ts runner, which invokes the offline Python adapter.
No educator identity or human approval is manufactured by this script.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import re
import sys
from datetime import datetime, timedelta, timezone
import urllib.request

MODEL_ID = "Systran/faster-whisper-small"
REVISION = "536b0662742c02347bc0e980a01041f333bce120"
FILES = {"README.md", "config.json", "model.bin", "tokenizer.json", "vocabulary.txt"}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_new(path: Path, value: object) -> None:
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, indent=2, ensure_ascii=False)
        stream.write("\n")


def prepare(root: Path) -> None:
    metadata = json.loads((root / "publisher-metadata.json").read_text(encoding="utf-8-sig"))
    if metadata["id"] != MODEL_ID or metadata["sha"] != REVISION:
        raise ValueError("Publisher snapshot does not match the reviewed immutable revision")
    published = {entry["rfilename"]: entry for entry in metadata["siblings"]}
    directory = root / "model"
    directory.mkdir(exist_ok=True)
    hashes = {}
    for name in sorted(FILES):
        entry = published[name]
        target = directory / name
        if not target.exists():
            url = f"https://huggingface.co/{MODEL_ID}/resolve/{REVISION}/{name}"
            with urllib.request.urlopen(url, timeout=120) as response, target.open("xb") as stream:
                size = 0
                while chunk := response.read(1024 * 1024):
                    size += len(chunk)
                    if size > entry["size"]:
                        raise ValueError("Publisher file exceeds the pinned size")
                    stream.write(chunk)
        data = target.read_bytes()
        if len(data) != entry["size"]:
            raise ValueError("Publisher file length changed")
        digest = sha(data)
        if "lfs" in entry:
            if digest != entry["lfs"]["sha256"]:
                raise ValueError("Publisher weight hash changed")
        elif hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest() != entry["blobId"]:
            raise ValueError("Publisher git blob changed")
        hashes[name] = digest
        print(f"Verified {name}: {len(data)} bytes", flush=True)
    if {p.name for p in directory.iterdir()} != FILES:
        raise ValueError("Unexpected snapshot content")
    now = datetime.now(timezone.utc)
    model = {"version": "local-recognition-v1", "kind": "speech", "modelId": MODEL_ID,
             "revision": REVISION, "fileManifestHash": sha(json.dumps(hashes, sort_keys=True, separators=(",", ":")).encode()),
             "approvedBy": "Codex engineering research", "approvalReference": "User authorized autonomous local research; synthetic smoke only; no human educator or production approval",
             "approvedAt": now.isoformat().replace("+00:00", "Z"), "expiresAt": (now + timedelta(days=1)).isoformat().replace("+00:00", "Z"), "enabled": True}
    write_new(root / "synthetic-research-manifest.json", {"model": model, "directory": str(directory), "files": hashes})
    versions = {dist.metadata["Name"]: dist.version for dist in importlib.metadata.distributions()}
    write_new(root / "runtime.json", {"python": sys.version, "platform": platform.platform(), "executable": sys.executable,
                                     "packages": dict(sorted(versions.items())), "threads": 2, "device": "cpu", "computeType": "int8"})
    with (root / "requirements.lock.txt").open("x", encoding="utf-8") as stream:
        stream.write("\n".join(f"{name}=={version}" for name, version in sorted(versions.items())) + "\n")


def distance(a: list[str], b: list[str]) -> int:
    last = list(range(len(b) + 1))
    for i, left in enumerate(a, 1):
        row = [i]
        for j, right in enumerate(b, 1):
            row.append(min(row[-1] + 1, last[j] + 1, last[j - 1] + (left != right)))
        last = row
    return last[-1]


def report(root: Path) -> None:
    manifest = json.loads((root / "synthetic-research-manifest.json").read_text(encoding="utf-8"))
    model = manifest["model"]
    if (model["version"] != "local-recognition-v1" or model["kind"] != "speech"
            or model["modelId"] != MODEL_ID or model["revision"] != REVISION
            or set(manifest["files"]) != FILES
            or any(not re.fullmatch(r"[0-9a-f]{64}", digest) for digest in manifest["files"].values())
            or model["fileManifestHash"] != sha(json.dumps(manifest["files"], sort_keys=True, separators=(",", ":")).encode())):
        raise ValueError("Smoke model manifest mismatch")
    cases = json.loads((root / "synthetic-cases.json").read_text(encoding="utf-8-sig"))
    rows = []
    for case in cases:
        draft = json.loads((root / (case["id"] + "-draft.json")).read_text(encoding="utf-8"))
        expected, observed = case["text"], draft["text"]
        normalized = lambda value: re.findall(r"[a-z0-9']+", value.casefold())
        reference, actual = normalized(expected), normalized(observed)
        raw_reference, raw_actual = expected.split(), observed.split()
        audio = (root / (case["id"] + ".wav")).read_bytes()
        provenance = draft["recognition"]
        if (draft["version"] != "recognition-draft-v1" or draft["confirmedHash"] is not None
                or provenance["version"] != "local-recognition-v1" or provenance["kind"] != "speech"
                or provenance["assetHash"] != sha(audio) or provenance["modelId"] != MODEL_ID
                or provenance["revision"] != REVISION or provenance["networkUsed"] is not False
                or provenance["fileManifestHash"] != model["fileManifestHash"]
                or provenance["text"] != observed or provenance["confidence"] is not None):
            raise ValueError("Smoke output provenance mismatch")
        rows.append({"id": case["id"], "voice": case["voice"], "expectedText": expected, "observedText": observed,
                     "rawWordErrorRate": distance(raw_reference, raw_actual) / max(1, len(raw_reference)),
                     "caseAndPunctuationNormalizedWordErrorRate": distance(reference, actual) / max(1, len(reference)),
                     "assetHash": sha(audio), "elapsedMs": provenance["elapsedMs"], "confirmed": draft["confirmedHash"] is not None})
    write_new(root / "synthetic-smoke-report.json", {"version": "local-speech-synthetic-smoke-v1", "status": "synthetic_engineering_smoke_only",
              "modelId": MODEL_ID, "revision": REVISION, "caseCount": len(rows), "rows": rows,
              "networkBoundary": "Model/dependencies downloaded during preparation. Existing inference adapter used socket denial, offline flags and local_files_only. Native-library/OS network isolation was not measured.",
              "humanReviewedCases": 0, "studentCases": 0, "productionActivation": False,
              "qualification": "Windows TTS is a synthetic adult voice. This proves local execution only, not student accuracy, accents, noisy speech, math notation or educational benefit."})
    print(f"Saved {len(rows)} synthetic speech observations. Student accuracy remains unmeasured.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("prepare", "report"))
    parser.add_argument("root", type=Path)
    args = parser.parse_args()
    folder = args.root.resolve(strict=True)
    if "public" in {part.casefold() for part in folder.parts}:
        raise ValueError("Research artifacts must remain outside public")
    (prepare if args.mode == "prepare" else report)(folder)
