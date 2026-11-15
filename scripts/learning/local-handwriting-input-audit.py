"""Audit eight frozen public handwriting inputs without recognition or downloading.

Checks hashes and current image preparation, preserving all baseline denominators.
This is an input diagnostic, not line detection or a quality-improvement experiment.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import io
import json
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_pinned(path, expected, bound):
    path = Path(path).resolve(strict=True)
    if not path.is_file() or path.stat().st_size > bound:
        raise ValueError("pinned_file_bound")
    data = path.read_bytes()
    if sha(data) != expected:
        raise ValueError("pinned_file_changed")
    return data


def contained(root, name):
    if Path(name).is_absolute():
        raise ValueError("relative_path_required")
    result = (root / name).resolve(strict=True)
    if not result.is_relative_to(root.resolve(strict=True)):
        raise ValueError("input_outside_root")
    return result


def audit(manifest_path, manifest_sha, baseline_path, baseline_sha):
    from PIL import Image, ImageOps
    spec = importlib.util.spec_from_file_location("recognize_local", Path(__file__).with_name("recognize_local.py"))
    adapter = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(adapter)
    root = manifest_path.resolve(strict=True).parent
    manifest = json.loads(read_pinned(manifest_path, manifest_sha, 500_000))
    baseline = json.loads(read_pinned(baseline_path, baseline_sha, 1_000_000))
    cases = [c for c in manifest["cases"] if c["kind"] == "handwriting_line"]
    prior = [c for c in baseline["results"] if c["kind"] == "handwriting_line"]
    if len(cases) != 8 or len({c["caseId"] for c in cases}) != 8 or len(prior) != 8 or {c["caseId"] for c in prior} != {c["caseId"] for c in cases}:
        raise ValueError("eight_case_denominator_required")
    if baseline["sampleManifestSha256"] != manifest_sha:
        raise ValueError("baseline_manifest_mismatch")
    record = manifest["models"]["handwriting_line"]
    model_path = contained(root, record["manifest"]["path"])
    model = json.loads(read_pinned(model_path, record["manifest"]["sha256"], 100_000))
    if adapter.canonical_hash(model["files"]) != record["fileManifestHash"] or model["model"]["fileManifestHash"] != record["fileManifestHash"]:
        raise ValueError("model_manifest_mismatch")
    # Hash verification only: no from_pretrained, torch import or inference.
    model_dir = Path(model["directory"]).resolve(strict=True)
    for name, expected in model["files"].items():
        file = contained(model_dir, name)
        with file.open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != expected:
                raise ValueError("model_file_changed")
    processor = json.loads((model_dir / "preprocessor_config.json").read_text(encoding="utf8"))
    size = processor["size"]
    target_width, target_height = (size, size) if isinstance(size, int) else (size["width"], size["height"])
    rows = []
    for case in cases:
        asset = case["asset"]
        data = read_pinned(contained(root, asset["path"]), asset["sha256"], 5_000_000)
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        old = next(r for r in prior if r["caseId"] == case["caseId"])
        try:
            prepared = adapter.prepare_line_image(data)
            status = "supported_shape_only"
            unchanged = prepared.size == image.size and prepared.tobytes() == image.tobytes()
        except ValueError as error:
            if str(error) != "image_requires_horizontal_line_or_manual_entry":
                raise
            status, unchanged = "unsupported_layout_manual_entry", None
        rows.append({"caseId": case["caseId"], "assetSha256": asset["sha256"],
                     "width": image.width, "height": image.height, "widthHeightRatio": image.width / image.height,
                     "currentInputStatus": status, "rgbPixelsUnchanged": unchanged,
                     "processorResize": {"width": target_width, "height": target_height,
                         "xScale": target_width / image.width, "yScale": target_height / image.height},
                     "baselineStatus": old["status"], "baselineRaw": old["raw"], "baselineNormalized": old["normalized"],
                     "singleLineVerified": False})
    totals = {key: sum(r["baselineNormalized"][key] for r in rows) for key in ["characterErrors", "referenceCharacters", "wordErrors", "referenceWords"]}
    return {"schema": "local-handwriting-input-audit-v1", "createdAt": datetime.now(timezone.utc).isoformat(),
            "sampleManifestSha256": manifest_sha, "baselineReportSha256": baseline_sha,
            "modelFileManifestHash": record["fileManifestHash"], "weightsVerified": True,
            "modelManifestSha256": record["manifest"]["sha256"],
            "adapterSha256": sha(Path(adapter.__file__).read_bytes()),
            "expectedCases": 8, "auditedCases": len(rows), "cases": rows,
            "baselineNormalizedTotalsUnchanged": totals,
            "supportedShapes": sum(r["currentInputStatus"] == "supported_shape_only" for r in rows),
            "unsupportedLayouts": sum(r["currentInputStatus"] == "unsupported_layout_manual_entry" for r in rows),
            "inferenceCalls": 0, "networkCalls": 0, "weightsChanged": False, "productionActivated": False,
            "qualityImprovementClaim": False, "newScore": None,
            "limits": ["Shape acceptance does not establish one text line; wide crops can include neighboring lines.",
                       "Fixed processor resize is the pinned model contract, not proof that aspect-preserving padding is better.",
                       "Baseline counts are retained, not rescored as if the current layout guard ran inference.",
                       "No segmentation, OCR accuracy, student validation or qualification is established."]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("manifest_sha256")
    parser.add_argument("baseline", type=Path)
    parser.add_argument("baseline_sha256")
    parser.add_argument("new_report", type=Path)
    args = parser.parse_args()
    report = audit(args.manifest, args.manifest_sha256, args.baseline, args.baseline_sha256)
    with args.new_report.open("x", encoding="utf8") as stream:
        json.dump(report, stream, indent=2); stream.write("\n")
    print(json.dumps({"auditedCases": report["auditedCases"], "inferenceCalls": 0, "qualityImprovementClaim": False}))


if __name__ == "__main__":
    main()
