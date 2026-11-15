"""Continuation verifier contracts using synthetic evidence, no model calls."""
import copy
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import test_synthetic_lora_v3_verifier as v3_fixtures
from verify_synthetic_lora_v3 import digest, read
from verify_synthetic_lora_v4 import verify, verify_development_scope


class ContinuationEvidence(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.container = Path(self.temp.name)
        self.parent_root = self.container / "run-004-v3"
        self.root = self.container / "run-005-v4"
        self.parent_root.mkdir()
        self.root.mkdir()

        def fixture_at(root):
            helper = v3_fixtures.RejectedRunEvidence("test_valid_rejection_does_not_open_test")
            location = SimpleNamespace(name=str(root), cleanup=lambda: None)
            with patch("test_synthetic_lora_v3_verifier.tempfile.TemporaryDirectory", return_value=location):
                helper.setUp()
            self.addCleanup(helper.doCleanups)
            return helper

        self.parent = fixture_at(self.parent_root)
        parent_selection = read(self.parent_root / "selection.json")
        self.parent.write("validation-candidates.json", parent_selection["candidates"])
        self.parent.rehash()
        from synthetic_lora_v4_development import datasets
        from train_synthetic_lora_v4 import SETTINGS
        rows = datasets()
        with patch("synthetic_lora_v3_data.datasets", return_value=rows), patch("train_synthetic_lora_v3.SETTINGS", SETTINGS):
            self.child = fixture_at(self.root)
        source = Path(__file__).parent
        for name in ("train_synthetic_lora_v4.py", "synthetic_lora_v4_development.py",
                     "synthetic_lora_v4_data.py", "verify_synthetic_lora_v3.py"):
            (self.root / "source" / name).write_bytes((source / name).read_bytes())
        self.child.prereg["sourceSha256"] = {p.name: digest(p) for p in (self.root / "source").iterdir()}
        self.parent_identity = {
            "runName": "run-004-v3", "selectedEpoch": 1, "selectedBeforeCurrentTraining": True,
            "reportSha256": digest(self.parent_root / "report.json"),
            "candidatesSha256": digest(self.parent_root / "validation-candidates.json"),
            "adapterSha256": digest(self.parent_root / "epoch-1/adapter_model.safetensors"),
            "configSha256": digest(self.parent_root / "epoch-1/adapter_config.json"),
        }
        self.child.prereg["parent"] = copy.deepcopy(self.parent_identity)
        self.child.report["parent"] = copy.deepcopy(self.parent_identity)
        self.child.report["schema"] = "diana-original-synthetic-lora-v4"
        from train_synthetic_lora_v3 import aggregate
        parent_records = read(self.root / "epoch-1-validation.json")
        self.child.write("parent-validation.json", parent_records)
        self.child.report["parentValidation"] = aggregate(parent_records)
        self.child.write("preregistration.json", self.child.prereg)
        self.child.rehash()

    def update_parent_claim(self, **values):
        self.child.prereg["parent"].update(values)
        self.child.report["parent"].update(values)
        self.child.write("preregistration.json", self.child.prereg)
        self.child.rehash()

    def test_valid_rejected_continuation_keeps_holdout_sealed(self):
        result = verify(self.root)
        self.assertTrue(result["verified"])
        self.assertFalse(result["testOpened"])
        self.assertFalse(result["productionEligible"])

    def test_parent_reselection_rejected(self):
        self.update_parent_claim(selectedEpoch=2)
        with self.assertRaisesRegex(ValueError, "checkpoint differs"):
            verify(self.root)

    def test_parent_hash_tamper_rejected(self):
        self.update_parent_claim(adapterSha256="a" * 64)
        with self.assertRaisesRegex(ValueError, "Parent evidence drift"):
            verify(self.root)

    def test_parent_path_escape_rejected(self):
        self.update_parent_claim(runName="../run-004-v3")
        with self.assertRaisesRegex(ValueError, "frozen parent"):
            verify(self.root)

    def test_parent_selection_must_precede_training(self):
        self.update_parent_claim(selectedBeforeCurrentTraining=False)
        with self.assertRaisesRegex(ValueError, "frozen parent"):
            verify(self.root)

    def test_parent_test_exposure_rejected(self):
        self.parent.write("test.json", [])
        self.parent.rehash()
        self.update_parent_claim(reportSha256=digest(self.parent_root / "report.json"))
        with self.assertRaisesRegex(ValueError, "despite validation rejection"):
            verify(self.root)

    def test_parent_candidate_list_cannot_diverge(self):
        candidates = read(self.parent_root / "validation-candidates.json")
        candidates[0]["metrics"]["counts"]["groundedCasePass"] = 47
        self.parent.write("validation-candidates.json", candidates)
        self.parent.rehash()
        self.update_parent_claim(reportSha256=digest(self.parent_root / "report.json"),
                                 candidatesSha256=digest(self.parent_root / "validation-candidates.json"))
        with self.assertRaisesRegex(ValueError, "candidate inventory"):
            verify(self.root)

    def test_parent_and_child_base_provenance_must_match(self):
        self.child.prereg["baseProvenanceSha256"] = "b" * 64
        self.child.write("preregistration.json", self.child.prereg)
        self.child.rehash()
        with self.assertRaisesRegex(ValueError, "Continuation base differs"):
            verify(self.root)

    def test_report_and_preregistration_parent_must_match(self):
        self.child.report["parent"]["selectedEpoch"] = 2
        self.child.rehash()
        with self.assertRaisesRegex(ValueError, "Reported parent differs"):
            verify(self.root)

    def test_additional_validation_relaxation_rejected(self):
        train, validation = read(self.root / "train.json"), read(self.root / "validation.json")
        validation[0]["acceptedQuotes"].append("trapezoid")
        with self.assertRaisesRegex(ValueError, "three pre-result"):
            verify_development_scope(self.root, train, validation)

    def test_undeclared_parent_target_edit_rejected(self):
        train, validation = read(self.root / "train.json"), read(self.root / "validation.json")
        train[0]["target"] = "EVIDENCE: insufficient\nNEXT: What is supplied?"
        with self.assertRaisesRegex(ValueError, "exponent scope"):
            verify_development_scope(self.root, train, validation)

    def test_rehashed_parent_reload_output_drift_rejected(self):
        from train_synthetic_lora_v3 import score, aggregate
        rows = read(self.root / "validation.json")
        records = read(self.root / "parent-validation.json")
        records[0]["output"] = "EVIDENCE: insufficient\nNEXT: Which perpendicular base is supplied?"
        records[0]["diagnostics"] = score(records[0]["output"], rows[0])
        self.child.write("parent-validation.json", records)
        self.child.report["parentValidation"] = aggregate(records)
        self.child.rehash()
        with self.assertRaisesRegex(ValueError, "Reloaded parent responses differ"):
            verify(self.root)


if __name__ == "__main__":
    unittest.main()
