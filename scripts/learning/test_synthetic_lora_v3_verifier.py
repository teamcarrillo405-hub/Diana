"""Independent integrity and adversarial scoring contracts for v3 evidence."""
import json
from pathlib import Path
import tempfile
import struct
import unittest
from unittest.mock import patch
import hashlib

from verify_synthetic_lora_v3 import (
    checked_records, checked_rows, digest, distinct_partitions, evidence_path,
    read, verify_manifest,
    verify, TEST_MANIFEST_SHA256, TEST_MODULE_SHA256,
)


def sealed_manifest_fixture(source):
    """Reconstruct the historically sealed CRLF bytes from either Git checkout.

    The production verifier intentionally hashes exact evidence bytes. Its seal
    must not change to accommodate a checkout's newline conversion. These test
    fixtures restore only the known serialization and still reject content drift.
    """
    sealed = source.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
    if hashlib.sha256(sealed).hexdigest() != TEST_MANIFEST_SHA256:
        raise ValueError("Test fixture differs from the historical sealed manifest")
    return sealed


class SealedManifestFixture(unittest.TestCase):
    def test_lf_and_crlf_checkouts_reconstruct_the_same_frozen_bytes(self):
        source = (Path(__file__).parents[2] / "docs/engineering/grounding-v3-test-manifest.json").read_bytes()
        lf = source.replace(b"\r\n", b"\n")
        crlf = lf.replace(b"\n", b"\r\n")
        self.assertEqual(sealed_manifest_fixture(lf), sealed_manifest_fixture(crlf))
        self.assertEqual(hashlib.sha256(sealed_manifest_fixture(lf)).hexdigest(), TEST_MANIFEST_SHA256)

    def test_changed_manifest_content_does_not_receive_a_new_seal(self):
        source = (Path(__file__).parents[2] / "docs/engineering/grounding-v3-test-manifest.json").read_bytes()
        with self.assertRaisesRegex(ValueError, "historical sealed manifest"):
            sealed_manifest_fixture(source.replace(b'"minimumGroundingAccuracy": 0.95', b'"minimumGroundingAccuracy": 0.94'))


class ScoringBoundary(unittest.TestCase):
    def test_arbitrary_source_quote_and_false_abstention_cannot_pass(self):
        from synthetic_lora_v3_data import datasets
        from train_synthetic_lora_v3 import score
        row = datasets()[1][0]
        irrelevant = "EVIDENCE: A trapezoid has a pair of parallel sides called bases\nNEXT: Where is a perpendicular base?"
        self.assertFalse(score(irrelevant, row)["groundedCasePass"])
        self.assertFalse(score("EVIDENCE: insufficient\nNEXT: Which perpendicular base is relevant?", row)["groundedCasePass"])

    def test_fabricated_next_step_requires_semantic_rejection_despite_lexical_pass(self):
        from synthetic_lora_v3_data import datasets
        from train_synthetic_lora_v3 import score
        from grounding_review_v3 import build_packet, digest, summarize, DIMENSIONS
        row = datasets()[1][0]
        invented = "EVIDENCE: perpendicular distance between them\nNEXT: Which perpendicular base is definitely 900 meters long?"
        # Explicit negative-control evidence: lexical matching is NOT semantic
        # grounding. Independent review must reject this invented measurement.
        self.assertTrue(score(invented, row)["groundedCasePass"])
        packet, key = build_packet([row], [{"id": row["id"], "output": row["target"]}],
                                  [{"id": row["id"], "output": invented}], "a" * 64, "validation")
        ratings = []
        for item in packet["cases"]:
            for arm in ("A", "B"):
                bad = item["response" + arm] == invented
                rating = {"id": item["id"], "arm": arm, "caseHash": item["caseHash"],
                          "responseHash": digest(item["response" + arm]),
                          **{dimension: True for dimension in DIMENSIONS},
                          "notes": "The candidate invents a 900 meter measurement." if bad else "The reference asks about the stated perpendicular relationship."}
                rating["noFabricatedClaims"] = not bad
                rating["usefulNextStep"] = not bad
                ratings.append(rating)
        result = summarize(packet, key, {"packetHash": digest(packet), "reviewerKind": "ai",
                                         "reviewerId": "unit-test-negative-control", "ratings": ratings})
        self.assertFalse(result["descriptiveSemanticGatePassed"])
        self.assertFalse(result["productionEligible"])


class RejectedRunEvidence(unittest.TestCase):
    """Fabricated test fixtures exercise integrity, never claim model execution."""
    def setUp(self):
        from prepare_synthetic_lora import MODEL, REVISION
        from train_synthetic_lora_v3 import SETTINGS, score, aggregate, gates
        from synthetic_lora_v3_data import datasets
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.settings = SETTINGS
        scripts = Path(__file__).parent
        (self.root / "source").mkdir()
        for name in ("train_synthetic_lora_v3.py", "synthetic_lora_v3_data.py", "train_synthetic_lora.py", "prepare_synthetic_lora.py"):
            (self.root / "source" / name).write_bytes((scripts / name).read_bytes())
        manifest = scripts.parent.parent / "docs/engineering/grounding-v3-test-manifest.json"
        (self.root / "test-manifest.json").write_bytes(sealed_manifest_fixture(manifest.read_bytes()))
        train, validation = datasets()
        self.write("train.json", train)
        self.write("validation.json", validation)
        def records(loss):
            return [{"id": row["id"], "output": "EVIDENCE: invented\nNEXT: What now?",
                     "targetTokenLoss": loss, "targetTokens": 12,
                     "diagnostics": score("EVIDENCE: invented\nNEXT: What now?", row)} for row in validation]
        baseline, adapter = records(2.), records(1.)
        self.write("baseline-validation.json", baseline)
        base_metrics, metrics = aggregate(baseline), aggregate(adapter)
        candidates = []
        for epoch in range(1, SETTINGS["epochs"] + 1):
            self.write(f"epoch-{epoch}-validation.json", adapter)
            candidates.append({"epoch": epoch, "metrics": metrics, "gates": gates(base_metrics, metrics)})
            folder = self.root / f"epoch-{epoch}"
            folder.mkdir()
            self.write(f"epoch-{epoch}/adapter_config.json", {"peft_type": "LORA", "task_type": "CAUSAL_LM",
                       "r": SETTINGS["rank"], "lora_alpha": SETTINGS["alpha"], "target_modules": SETTINGS["targetModules"]})
            header, payload = {}, b""
            for module in SETTINGS["targetModules"]:
                for arm, shape in (("A", [SETTINGS["rank"], 1]), ("B", [1, SETTINGS["rank"]])):
                    name = f"model.layers.0.self_attn.{module}.lora_{arm}.weight"
                    start = len(payload)
                    payload += struct.pack("<f", 0.125) * SETTINGS["rank"]
                    header[name] = {"dtype": "F32", "shape": shape, "data_offsets": [start, len(payload)]}
            encoded = json.dumps(header).encode("utf-8")
            (folder / "adapter_model.safetensors").write_bytes(struct.pack("<Q", len(encoded)) + encoded + payload)
        steps = SETTINGS["epochs"] * len(train) // SETTINGS["gradientAccumulation"]
        self.write("training-history.json", [{"step": step, "epoch": 1 + (step - 1) // (len(train) // SETTINGS["gradientAccumulation"]),
                                               "loss": 1.} for step in range(1, steps + 1)])
        self.write("selection.json", {"selectedEpoch": None, "validationPassed": False,
                   "candidates": candidates, "selectedBeforeTest": True, "productionEligible": False})
        self.prereg = {"model": MODEL, "revision": REVISION, "settings": SETTINGS,
                       "minimumGroundingAccuracy": .95, "testCases": 100, "maximumFreshTestEvaluations": 1,
                       "productionEligible": False, "educatorReviewed": False,
                       "testModuleSha256": TEST_MODULE_SHA256, "testManifestSha256": TEST_MANIFEST_SHA256,
                       "baseProvenanceSha256": "a" * 64,
                       "sourceSha256": {p.name: digest(p) for p in (self.root / "source").iterdir()},
                       "dataSha256": {label: digest(self.root / (label + ".json")) for label in ("train", "validation")}}
        self.write("preregistration.json", self.prereg)
        self.report = {"schema": "diana-original-synthetic-lora-v3", "status": "rejected-validation",
                       "researchOnly": True, "productionEligible": False, "educatorReviewed": False,
                       "providerCalls": 0, "networkDeniedAtPythonSocketLayer": True, "osNetworkSandboxClaimed": False,
                       "trainCount": len(train), "validationCount": len(validation), "optimizerSteps": steps,
                       "baselineValidation": base_metrics, "selectedEpoch": None, "validationPassed": False,
                       "testOpened": False, "testEvaluations": 0, "syntheticQualityGatePassed": False}
        self.rehash()

    def write(self, name, value):
        (self.root / name).write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")

    def rehash(self):
        self.report["artifactHashes"] = {p.relative_to(self.root).as_posix(): digest(p)
                                         for p in self.root.rglob("*") if p.is_file() and p.name != "report.json"}
        self.write("report.json", self.report)

    def test_valid_rejection_does_not_open_test(self):
        result = verify(self.root)
        self.assertTrue(result["verified"])
        self.assertFalse(result["testOpened"])
        self.assertFalse(result["productionEligible"])

    def test_rehashed_baseline_false_diagnostics_rejected(self):
        records = read(self.root / "baseline-validation.json")
        records[0]["diagnostics"]["groundedCasePass"] = True
        self.write("baseline-validation.json", records)
        self.rehash()
        with self.assertRaisesRegex(ValueError, "diagnostics"):
            verify(self.root)

    def test_validation_rejection_with_opened_test_rejected(self):
        self.write("test.json", [])
        self.rehash()
        with self.assertRaisesRegex(ValueError, "despite validation rejection"):
            verify(self.root)

    def test_missing_weights_even_with_new_manifest_rejected(self):
        (self.root / "epoch-1/adapter_model.safetensors").unlink()
        self.rehash()
        with self.assertRaisesRegex(ValueError, "Missing evidence"):
            verify(self.root)

    def test_forged_production_or_quality_claim_rejected(self):
        self.report["productionEligible"] = True
        self.rehash()
        with self.assertRaisesRegex(ValueError, "research-only"):
            verify(self.root)
        self.report["productionEligible"] = False
        self.report["syntheticQualityGatePassed"] = True
        self.rehash()
        with self.assertRaisesRegex(ValueError, "Validation rejection"):
            verify(self.root)

    def test_reduced_threshold_rejected(self):
        self.prereg["minimumGroundingAccuracy"] = .8
        self.write("preregistration.json", self.prereg)
        self.rehash()
        with self.assertRaisesRegex(ValueError, "95 percent"):
            verify(self.root)

    def test_fake_safe_tensor_header_rejected(self):
        (self.root / "epoch-1/adapter_model.safetensors").write_bytes(b"claimed weights")
        self.rehash()
        with self.assertRaisesRegex(ValueError, "safetensors"):
            verify(self.root)

    def passing_test_fixture(self):
        """Use fake sealed cases; never import or read the actual holdout."""
        from train_synthetic_lora_v3 import score, aggregate, gates
        from synthetic_lora_v3_data import datasets
        validation = datasets()[1]
        def entry(row, output, loss):
            return {"id": row["id"], "output": output, "targetTokenLoss": loss,
                    "targetTokens": 12, "diagnostics": score(output, row)}
        validation_records = [entry(row, row["target"], 1.) for row in validation]
        candidate_metrics = aggregate(validation_records)
        candidates = []
        for epoch in range(1, self.settings["epochs"] + 1):
            self.write(f"epoch-{epoch}-validation.json", validation_records)
            candidates.append({"epoch": epoch, "metrics": candidate_metrics,
                               "gates": gates(self.report["baselineValidation"], candidate_metrics)})
        self.write("selection.json", {"selectedEpoch": 1, "validationPassed": True,
                   "candidates": candidates, "selectedBeforeTest": True, "productionEligible": False})
        template = validation[0]
        test = [{**template, "id": f"mock-test-{i}", "family": "mock-heldout-family",
                 "source": f"Mock fixture case {i}. " + template["source"],
                 "question": template["question"] + f" Mock case {i}."} for i in range(100)]
        self.write("test.json", test)
        raw = b"Synthetic verifier test fixture, not an executable test module."
        (self.root / "source/synthetic_lora_v3_evaluation.py").write_bytes(raw)
        module_sha = hashlib.sha256(raw).hexdigest()
        rows_sha = hashlib.sha256(json.dumps(test, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
        manifest = read(self.root / "test-manifest.json")
        manifest["moduleSha256"], manifest["testRowsSha256"] = module_sha, rows_sha
        self.write("test-manifest.json", manifest)
        manifest_sha = digest(self.root / "test-manifest.json")
        # Scoped test-only seal replacement cannot affect an actual run.
        for name, value in (("TEST_MODULE_SHA256", module_sha), ("TEST_ROWS_SHA256", rows_sha),
                            ("TEST_MANIFEST_SHA256", manifest_sha)):
            mocked = patch("verify_synthetic_lora_v3." + name, value)
            mocked.start()
            self.addCleanup(mocked.stop)
        self.prereg["testModuleSha256"], self.prereg["testManifestSha256"] = module_sha, manifest_sha
        self.write("preregistration.json", self.prereg)
        base = [entry(row, "EVIDENCE: invented\nNEXT: What now?", 2.) for row in test]
        adapter = [entry(row, row["target"], 1.) for row in test]
        for name, records in (("baseline-test", base), ("adapter-test", adapter), ("reload-test", adapter)):
            self.write(name + ".json", records)
        base_metrics, adapted_metrics = aggregate(base), aggregate(adapter)
        self.report.update({"status": "completed", "selectedEpoch": 1, "validationPassed": True,
                            "testCount": 100, "testOpened": True, "testEvaluations": 1,
                            "baseline": base_metrics, "adapter": adapted_metrics,
                            "testGates": gates(base_metrics, adapted_metrics),
                            "savedAdapterOutputsIdentical": True, "syntheticQualityGatePassed": True})
        self.rehash()

    def test_passing_synthetic_evidence_never_promotes(self):
        self.passing_test_fixture()
        result = verify(self.root)
        self.assertTrue(result["syntheticQualityGatePassed"])
        self.assertFalse(result["productionEligible"])

    def test_rehashed_reload_drift_rejected(self):
        from train_synthetic_lora_v3 import score
        self.passing_test_fixture()
        rows = read(self.root / "test.json")
        reload = read(self.root / "reload-test.json")
        reload[0]["output"] = "EVIDENCE: insufficient\nNEXT: Which base is supplied?"
        reload[0]["diagnostics"] = score(reload[0]["output"], rows[0])
        self.write("reload-test.json", reload)
        self.rehash()
        with self.assertRaisesRegex(ValueError, "reload differs"):
            verify(self.root)

    def test_rehashed_heldout_content_drift_rejected(self):
        self.passing_test_fixture()
        rows = read(self.root / "test.json")
        rows[0]["question"] = "Replacement easier question?"
        self.write("test.json", rows)
        self.rehash()
        with self.assertRaisesRegex(ValueError, "independently sealed cases"):
            verify(self.root)

    def test_repeated_fresh_test_claim_rejected(self):
        self.passing_test_fixture()
        self.report["testEvaluations"] = 2
        self.rehash()
        with self.assertRaisesRegex(ValueError, "execution count"):
            verify(self.root)


class IntegrityPrimitives(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.file = self.root / "evidence.json"
        self.file.write_text("{}", encoding="utf-8")

    def test_hash_manifest_must_be_complete(self):
        with self.assertRaisesRegex(ValueError, "Empty"):
            verify_manifest(self.root, {})
        with self.assertRaisesRegex(ValueError, "incomplete"):
            verify_manifest(self.root, {"evidence.json": digest(self.file)}, {"evidence.json", "weights"})

    def test_path_escape_and_noncanonical_paths_rejected(self):
        for name in ("../evidence.json", "/evidence.json", "C:/evidence.json", "source\\a", "./evidence.json"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                evidence_path(self.root, name)

    def test_modified_evidence_rejected(self):
        before = digest(self.file)
        self.file.write_text("[]", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Modified"):
            verify_manifest(self.root, {"evidence.json": before})

    def test_json_duplicate_keys_and_nonfinite_rejected(self):
        for source in ('{"pass": false, "pass": true}', '{"value": NaN}', '{"value": Infinity}'):
            self.file.write_text(source, encoding="utf-8")
            with self.assertRaises(ValueError):
                read(self.file)

    def test_empty_duplicate_or_invalid_rows_rejected(self):
        row = {"id": "a", "source": "source", "question": "question", "expectedAbstention": False}
        for rows in ([], [row, row], [{**row, "expectedAbstention": 0}], [{**row, "source": " "}]):
            with self.assertRaises(ValueError):
                checked_rows(rows, "test")

    def test_partition_example_overlap_ignores_case(self):
        a = {"id": "a", "source": "Source", "question": "Question"}
        b = {"id": "b", "source": "source ", "question": " question"}
        with self.assertRaisesRegex(ValueError, "example overlap"):
            distinct_partitions([[a], [b]])

    def test_baseline_diagnostics_must_be_recomputed(self):
        row = {"id": "a"}
        entry = {"id": "a", "output": "invented", "targetTokens": 4,
                 "targetTokenLoss": 1., "diagnostics": {"pass": True}}
        with self.assertRaisesRegex(ValueError, "diagnostics"):
            checked_records([row], [entry], lambda text, item: {"pass": False}, lambda r: {}, "baseline")

    def test_invalid_loss_or_tokens_rejected(self):
        row = {"id": "a"}
        entry = {"id": "a", "output": "raw", "targetTokens": 4,
                 "targetTokenLoss": 1., "diagnostics": {"pass": True}}
        for invalid in ({"targetTokens": 0}, {"targetTokens": True}, {"targetTokenLoss": float("nan")},
                        {"targetTokenLoss": -1}, {"targetTokenLoss": True}):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                checked_records([row], [{**entry, **invalid}], lambda text, item: {"pass": True}, lambda r: {}, "test")


if __name__ == "__main__":
    unittest.main()
