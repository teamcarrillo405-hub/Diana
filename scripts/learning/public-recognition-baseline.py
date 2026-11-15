"""Frozen public-data engineering evaluation through the existing offline adapter.

This command cannot authorize recognition, obtain data, or download weights.
It uses a separate user-authorized preparation receipt and never confirms drafts.
"""
from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import unicodedata


def sha(data):
    return hashlib.sha256(data).hexdigest()


def normalize(text):
    folded = unicodedata.normalize("NFKC", text).casefold()
    return " ".join("".join(" " if unicodedata.category(c).startswith("P") else c for c in folded).split())


def distance(reference, hypothesis):
    previous = list(range(len(hypothesis) + 1))
    for row, left in enumerate(reference, 1):
        current = [row]
        for col, right in enumerate(hypothesis, 1):
            current.append(min(current[-1] + 1, previous[col] + 1, previous[col - 1] + (left != right)))
        previous = current
    return previous[-1]


def counts(reference, hypothesis):
    return {"characterErrors": distance(reference, hypothesis), "referenceCharacters": len(reference),
            "wordErrors": distance(reference.split(), hypothesis.split()), "referenceWords": len(reference.split())}


def aggregate(results):
    output = {}
    for scope, selected in [("allCases", results), ("successfulCases", [r for r in results if r["status"] == "success"])]:
        output[scope] = {"caseCount": len(selected)}
        for mode in ["raw", "normalized"]:
            total = {k: sum(r[mode][k] for r in selected) for k in ["characterErrors", "referenceCharacters", "wordErrors", "referenceWords"]}
            output[scope][mode] = {**total, "cer": total["characterErrors"] / total["referenceCharacters"] if total["referenceCharacters"] else None,
                                  "wer": total["wordErrors"] / total["referenceWords"] if total["referenceWords"] else None}
    output["failureCount"] = sum(r["status"] != "success" for r in results)
    return output


def contained(root, relative):
    if not isinstance(relative, str) or Path(relative).is_absolute():
        raise ValueError("relative_path_required")
    value = (root / relative).resolve(strict=True)
    if not value.is_relative_to(root.resolve(strict=True)) or not value.is_file():
        raise ValueError("file_outside_baseline")
    return value


def verified_file(root, record, bound=5_000_000):
    target = contained(root, record["path"])
    if target.stat().st_size > bound:
        raise ValueError("file_size_bound")
    data = target.read_bytes()
    if len(data) != record["bytes"] or sha(data) != record["sha256"]:
        raise ValueError("file_hash_changed")
    return target


def validate_manifest(filename, expected_sha):
    if not re.fullmatch(r"[a-f0-9]{64}", expected_sha) or filename.stat().st_size > 500_000:
        raise ValueError("manifest_bound")
    data = filename.read_bytes()
    if sha(data) != expected_sha:
        raise ValueError("sample_manifest_changed")
    manifest = json.loads(data)
    if manifest["version"] != "public-recognition-baseline-v1" or len(manifest["cases"]) != 16:
        raise ValueError("baseline_schema")
    cases = manifest["cases"]
    if len({case["caseId"] for case in cases}) != len(cases):
        raise ValueError("duplicate_case")
    root = filename.parent
    verified_file(root, manifest["protocol"], 100_000)
    verified_file(root, manifest["acquisition"], 500_000)
    for model in manifest["models"].values():
        verified_file(root, model["manifest"], 100_000)
        if not Path(model["python"]).is_absolute() or not Path(model["python"]).is_file():
            raise ValueError("installed_runtime_unavailable")
    for case in cases:
        if not isinstance(case.get("reference"), str) or not case["reference"] or sha(case["reference"].encode()) != case["referenceSha256"]:
            raise ValueError("reference_unavailable_or_changed")
        if case.get("acquisitionStatus") == "ready":
            verified_file(root, case["asset"])
        if case["kind"] not in manifest["models"]:
            raise ValueError("model_kind_unknown")
    return manifest


def run_case(root, case, model, destination, workspace):
    started = time.monotonic()
    result = {"caseId": case["caseId"], "kind": case["kind"], "stratum": case["stratum"], "status": "unavailable", "hypothesis": ""}
    if case["acquisitionStatus"] != "ready":
        result["reason"] = "acquisition_unavailable"
    else:
        verified_file(root, case["asset"])
        manifest = verified_file(root, model["manifest"], 100_000)
        env = {k: v for k, v in os.environ.items() if re.fullmatch(r"PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|USERNAME|LOCALAPPDATA|APPDATA", k, re.I)}
        env.update(DIANA_RECOGNITION_PYTHON=model["python"], PYTHONUTF8="1", HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1")
        draft_path = destination / (case["caseId"] + ".json")
        try:
            process = subprocess.run(["node", "--conditions=react-server", "--import=tsx", "scripts/learning/recognize-local.ts", str(manifest),
                                      str(root / case["asset"]["path"]), case["mime"], str(draft_path)],
                                     cwd=workspace, env=env, timeout=130, capture_output=True, shell=False, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            if process.returncode != 0:
                diagnostic = process.stderr.decode("utf-8", errors="replace")
                reason = "spawn_permission_denied" if "spawn EPERM" in diagnostic else "existing_adapter_rejected_or_unavailable"
                result.update(status="failed", reason=reason)
            else:
                draft_bytes = draft_path.read_bytes()
                draft = json.loads(draft_bytes)
                recognition = draft["recognition"]
                if draft["confirmedHash"] is not None or recognition["assetHash"] != case["asset"]["sha256"] or recognition["networkUsed"] is not False or recognition["revision"] != model["revision"] or recognition["modelId"] != model["modelId"] or recognition["fileManifestHash"] != model["fileManifestHash"] or recognition["kind"] != case["kind"] or recognition["confidence"] is not None or draft["text"] != recognition["text"]:
                    raise ValueError("draft_binding_changed")
                result.update(status="success", hypothesis=draft["text"], draftSha256=sha(draft_bytes), adapterElapsedMs=recognition["elapsedMs"])
        except subprocess.TimeoutExpired:
            result.update(status="failed", reason="case_timeout")
        except Exception as error:
            result.update(status="failed", reason=type(error).__name__)
    result["wallElapsedMs"] = round((time.monotonic() - started) * 1000)
    result["raw"] = counts(case["reference"], result["hypothesis"])
    result["normalized"] = counts(normalize(case["reference"]), normalize(result["hypothesis"]))
    return result


def evaluate(filename, expected_sha, output):
    manifest = validate_manifest(filename, expected_sha)
    workspace = Path(__file__).resolve().parents[2]
    if output.exists():
        raise ValueError("new_output_directory_required")
    output.mkdir(parents=True)
    root = filename.parent
    results = []
    started = datetime.now(timezone.utc).isoformat()
    # Append one receipt per attempted case before continuing. Interrupted cases are
    # unfinished, never omitted or counted successful by the report builder.
    with (output / "attempts.jsonl").open("x", encoding="utf-8") as journal:
        for case in manifest["cases"]:
            journal.write(json.dumps({"caseId": case["caseId"], "event": "started"}) + "\n"); journal.flush()
            result = run_case(root, case, manifest["models"][case["kind"]], output, workspace)
            results.append(result)
            journal.write(json.dumps(result) + "\n"); journal.flush()
            print(case["caseId"], result["status"], result["wallElapsedMs"], flush=True)
    if sha(filename.read_bytes()) != expected_sha:
        raise ValueError("manifest_changed_during_run")
    validate_manifest(filename, expected_sha)
    groups = defaultdict(list)
    for result in results:
        groups[result["kind"] + ":" + result["stratum"]].append(result)
    report = {"version": "public-recognition-baseline-report-v1", "startedAt": started, "completedAt": datetime.now(timezone.utc).isoformat(),
              "sampleManifestSha256": expected_sha, "expectedCases": len(manifest["cases"]), "attemptedCases": len(results),
              "executionComplete": len(results) == len(manifest["cases"]), "metrics": aggregate(results),
              "byKind": {kind: aggregate([r for r in results if r["kind"] == kind]) for kind in manifest["models"]},
              "byStratum": {name: aggregate(rows) for name, rows in groups.items()}, "results": results,
              "authority": manifest["authority"], "limitations": manifest["limitations"],
              "networkEvidence": "Existing adapter uses local_files_only, offline environment and Python socket denial; no OS-level packet capture performed.",
              "scoringFailurePolicy": "Every failed or unavailable case is an empty hypothesis in all-case micro CER/WER; successful-only scores are separate.",
              "promotionDecision": None, "weightsChanged": False, "paidProviderCalls": 0}
    with (output / "report.json").open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("expected_sha256")
    parser.add_argument("new_output_directory", type=Path)
    args = parser.parse_args()
    evaluate(args.manifest.resolve(strict=True), args.expected_sha256, args.new_output_directory.resolve())
