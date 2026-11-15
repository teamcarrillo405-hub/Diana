"""Freeze acquired samples and renewed research-only manifests, without inference."""
from datetime import datetime, timedelta, timezone
import hashlib
import io
import json
from pathlib import Path
import sys
from PIL import Image, ImageOps


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write(root, name, value):
    data = value if isinstance(value, bytes) else (json.dumps(value, indent=2) + "\n").encode()
    target = root / name
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("xb") as stream:
        stream.write(data)
    return {"path": name, "sha256": sha(data), "bytes": len(data)}


def prepare(root):
    workspace = Path(__file__).resolve().parents[2]
    now = datetime.now(timezone.utc)
    protocol = json.loads((root / "selection-protocol.json").read_bytes())
    original_hash = sha((root / "selection-protocol.json").read_bytes())
    protocol.update(version="public-recognition-baseline-selection-v3", frozenAt=now.isoformat(), priorProtocolSha256=original_hash,
                    revisionReason="Pre-inference schema inspection found printed annotations and non-reading annotation order. Pre-inference image QA found EXIF orientation 3 in NA source; annotation coordinates refer to display orientation. Documents and speech indices unchanged. No recognition outcomes exist. Historical v1/v2 protocols and first preparation retained.")
    protocol["handwriting"]["selection"] = "Same first lexicographic test document per AF/AS/EU/NA. First two numeric line_idx groups whose words all have publisher type H, excluding groups with publisher percent-marker illegible tokens. Apply source EXIF orientation before cropping. Sort words by minimum polygon x, then minimum y; union bounding-box crop with 2px padding, clamped to image. No deskew or appearance edits. No inference-based replacement. Preserve every selected case and failure."
    protocol_record = write(root, "selection-protocol-v3.json", protocol)
    acquisition_bytes = (root / "acquisition.json").read_bytes()
    acquisition = json.loads(acquisition_bytes)
    if acquisition["protocolSha256"] != original_hash:
        raise ValueError("acquisition_protocol_changed")
    cases = acquisition["cases"][:]
    excluded = []
    for document in acquisition["handwritingDocuments"]:
        name = Path(document["annotation"]).name
        annotation_bytes = (root / "sources" / name).read_bytes()
        image_bytes = (root / "sources" / Path(document["image"]).name).read_bytes()
        if sha(annotation_bytes) != document["annotationSha256"] or sha(image_bytes) != document["imageSha256"]:
            raise ValueError("source_changed")
        annotations = json.loads(annotation_bytes)
        Image.MAX_IMAGE_PIXELS = 40_000_000
        original = Image.open(io.BytesIO(image_bytes))
        orientation = original.getexif().get(274, 1)
        image = ImageOps.exif_transpose(original).convert("RGB")
        eligible = []
        for line in sorted({item["line_idx"] for item in annotations}):
            words = [item for item in annotations if item["line_idx"] == line]
            if any(word["type"] != "H" or "%" in word["text"] or not word["text"].strip() for word in words):
                excluded.append({"document": name, "lineIndex": line, "reason": "not_all_handwritten_or_publisher_unreadable"})
                continue
            eligible.append((line, words))
        if len(eligible) < 2:
            raise ValueError("fewer_than_two_eligible_lines")
        for line, words in eligible[:2]:
            words.sort(key=lambda item: (min(item["polygon"]["x" + str(i)] for i in range(4)), min(item["polygon"]["y" + str(i)] for i in range(4))))
            reference = " ".join(word["text"] for word in words)
            xs = [word["polygon"]["x" + str(i)] for word in words for i in range(4)]
            ys = [word["polygon"]["y" + str(i)] for word in words for i in range(4)]
            box = [max(0, min(xs) - 2), max(0, min(ys) - 2), min(image.width, max(xs) + 3), min(image.height, max(ys) + 3)]
            cropped = image.crop(box)
            buffer = io.BytesIO(); cropped.save(buffer, format="PNG")
            case_id = Path(name).stem + "-line-" + str(line)
            case = {"caseId": case_id, "kind": "handwriting_line", "stratum": document["region"], "sourceDocument": name,
                    "datasetRevision": protocol["handwriting"]["revision"], "license": "CC-BY-4.0", "lineIndex": line,
                    "reference": reference, "referenceSha256": sha(reference.encode()), "sourceImageSha256": document["imageSha256"],
                    "sourceAnnotationSha256": document["annotationSha256"], "cropBox": box, "imageWidth": cropped.width,
                    "imageHeight": cropped.height, "sourceExifOrientation": orientation, "publisherWordTypes": sorted({word["type"] for word in words}),
                    "acquisitionStatus": "ready", "mime": "image/png", "asset": write(root, "assets-v3/" + case_id + ".png", buffer.getvalue())}
            if cropped.width * cropped.height > 4_000_000 or len(buffer.getvalue()) > 5_000_000:
                case.update(acquisitionStatus="unavailable", error="adapter_input_bound")
            cases.append(case)
    models = {}
    manifests = {
        "speech": ("local-speech-execution/synthetic-research-manifest.json", workspace / "artifacts/learning-engine/research/local-speech-execution/venv/Scripts/python.exe"),
        "handwriting_line": ("local-handwriting-execution/research-manifest.json", Path("C:/Python314/python.exe")),
    }
    for kind, (prior, python) in manifests.items():
        previous_path = workspace / "artifacts/learning-engine/research" / prior
        previous = previous_path.read_bytes()
        model = json.loads(previous)
        model["model"].update(approvedBy="User-authorized Codex engineering research", approvalReference="Current user request: complete outstanding recognition evidence; identical installed weights, offline public-data baseline only. No educator/student approval or production activation.", approvedAt=now.isoformat().replace("+00:00", "Z"), expiresAt=(now + timedelta(hours=12)).isoformat().replace("+00:00", "Z"))
        directory = Path(model["directory"])
        for filename, expected in model["files"].items():
            with (directory / filename).open("rb") as stream:
                if hashlib.file_digest(stream, "sha256").hexdigest() != expected:
                    raise ValueError("installed_model_changed")
        model_record = write(root, kind + "-research-manifest-v3.json", model)
        models[kind] = {"manifest": model_record, "python": str(python), "modelId": model["model"]["modelId"],
                        "revision": model["model"]["revision"], "priorManifestSha256": sha(previous),
                        "fileManifestHash": model["model"]["fileManifestHash"], "newWeightsDownloaded": False}
    manifest = {"version": "public-recognition-baseline-v1", "frozenAt": datetime.now(timezone.utc).isoformat(), "protocol": protocol_record,
                "acquisition": {"path": "acquisition.json", "sha256": sha(acquisition_bytes), "bytes": len(acquisition_bytes)},
                "cases": cases, "models": models, "preselectionExclusions": excluded, "authority": protocol["authority"],
                "limitations": protocol["limits"] + ["GNHK uses a third-party pinned mirror; no publisher binary checksum available.", "Spatial word ordering and axis-aligned crops are deterministic preprocessing, not a validated line segmentation system.", "Eight samples per modality do not estimate population accuracy. Public pretraining overlap is unknown."]}
    record = write(root, "sample-manifest-v3.json", manifest)
    print(json.dumps({"cases": len(cases), "sampleManifestSha256": record["sha256"], "protocolSha256": protocol_record["sha256"]}))


if __name__ == "__main__":
    prepare(Path(sys.argv[1]).resolve(strict=True))
