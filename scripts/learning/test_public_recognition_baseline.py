"""Opaque contract fixtures only; no weights, public corpus, or provider calls."""
import importlib.util
import json
from pathlib import Path
from contextlib import contextmanager
import shutil
import uuid
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("baseline", Path(__file__).with_name("public-recognition-baseline.py"))
baseline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)


@contextmanager
def temporary_fixture():
    parent = Path(__file__).resolve().parents[2] / "artifacts/learning-engine/recognition-contract-tests"
    parent.mkdir(parents=True, exist_ok=True)
    root = parent / ("baseline-test-" + str(uuid.uuid4()))
    root.mkdir()
    try:
        yield root
    finally:
        resolved = root.resolve(strict=True)
        if resolved.parent != parent.resolve(strict=True) or not resolved.name.startswith("baseline-test-"):
            raise ValueError("test_cleanup_boundary")
        shutil.rmtree(resolved)


class BaselineTests(unittest.TestCase):
    def test_edit_distance_preserves_insertions_and_deletions(self):
        self.assertEqual(baseline.distance("abc", "ac"), 1)
        self.assertEqual(baseline.distance("a", "abcdef"), 5)
        self.assertEqual(baseline.distance("", "ab"), 2)
        self.assertEqual(baseline.distance("😀", ""), 1)

    def test_normalization_is_explicit_and_separate(self):
        self.assertEqual(baseline.normalize("ＡＢＣ, O’Neil!"), "abc o neil")
        self.assertEqual(baseline.counts("One.", "one")["characterErrors"], 2)
        self.assertEqual(baseline.counts(baseline.normalize("One."), baseline.normalize("one"))["characterErrors"], 0)

    def test_failures_remain_in_micro_denominator(self):
        rows = [{"status": "success", "raw": baseline.counts("a b", "a b"), "normalized": baseline.counts("a b", "a b")},
                {"status": "failed", "raw": baseline.counts("c d e", ""), "normalized": baseline.counts("c d e", "")}]
        report = baseline.aggregate(rows)
        self.assertEqual(report["failureCount"], 1)
        self.assertEqual(report["allCases"]["raw"]["wer"], 3 / 5)
        self.assertEqual(report["allCases"]["caseCount"], 2)
        self.assertEqual(report["successfulCases"]["raw"]["wer"], 0)

    def test_empty_success_group_does_not_claim_zero_error(self):
        report = baseline.aggregate([])
        self.assertIsNone(report["successfulCases"]["raw"]["wer"])

    def test_asset_hash_and_path_escape_rejected(self):
        with temporary_fixture() as directory:
            root = Path(directory)
            (root / "asset").write_bytes(b"opaque")
            record = {"path": "asset", "bytes": 6, "sha256": baseline.sha(b"opaque")}
            self.assertEqual(baseline.verified_file(root, record), root / "asset")
            (root / "asset").write_bytes(b"alterd")
            with self.assertRaisesRegex(ValueError, "file_hash_changed"):
                baseline.verified_file(root, record)
            with self.assertRaises(ValueError):
                baseline.contained(root, str(root / "asset"))

    def test_unavailable_case_never_invokes_adapter(self):
        case = {"caseId": "opaque", "kind": "speech", "stratum": "opaque", "acquisitionStatus": "unavailable", "reference": "a b"}
        with patch.object(baseline.subprocess, "run") as run:
            result = baseline.run_case(Path("."), case, {}, Path("."), Path("."))
        run.assert_not_called()
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["raw"]["wordErrors"], 2)

    def test_pinned_manifest_change_rejected_before_execution(self):
        with temporary_fixture() as directory:
            filename = Path(directory) / "manifest.json"
            filename.write_text(json.dumps({"version": "changed"}))
            with self.assertRaisesRegex(ValueError, "sample_manifest_changed"):
                baseline.validate_manifest(filename, "0" * 64)


if __name__ == "__main__":
    unittest.main()
