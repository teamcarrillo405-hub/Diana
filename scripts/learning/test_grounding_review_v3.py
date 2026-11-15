import copy
import io
import itertools
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import Mock, patch

from grounding_review_v3 import DIMENSIONS, build_packet, digest, summarize, wilson, review_destination, main


class GroundingReviewTests(unittest.TestCase):
    def fixture(self, n=20):
        cases = [{"id": str(i), "source": "An original test source.", "question": "What evidence?",
                  "expectedAbstention": False, "subject": "math", "level": "high-school"} for i in range(n)]
        base = [{"id": r["id"], "output": "base output"} for r in cases]
        tuned = [{"id": r["id"], "output": "adapter output"} for r in cases]
        packet, key = build_packet(cases, base, tuned, "a" * 64, "validation")
        ratings = [{"id": row["id"], "arm": arm, "caseHash": row["caseHash"],
                    "responseHash": digest(row["response" + arm]), **{d: True for d in DIMENSIONS},
                    "notes": "Fixture rating only, not a real review."} for row in packet["cases"] for arm in ("A", "B")]
        return packet, key, {"packetHash": digest(packet), "reviewerId": "fixture", "reviewerKind": "ai", "ratings": ratings}

    def test_95_percent_requires_19_of_20_but_never_promotes(self):
        packet, key, review = self.fixture()
        adapter = next(r for r in review["ratings"] if r["responseHash"] == digest("adapter output"))
        adapter["usefulNextStep"] = False
        result = summarize(packet, key, review)
        self.assertTrue(result["pointTargetMet"])
        self.assertEqual(result["arms"]["adapter"]["rate"], .95)
        self.assertEqual(result["arms"]["adapter"]["dimensions"]["usefulNextStep"],
                         {"passed": 19, "cases": 20, "rate": .95})
        self.assertEqual(result["arms"]["adapter"]["dimensions"]["sourceSupported"]["passed"], 20)
        self.assertLess(result["arms"]["adapter"]["wilson95"][0], .95)
        self.assertFalse(result["productionEligible"])
        self.assertFalse(result["educatorQualificationVerified"])

    def test_a_fabrication_rejects_even_95_percent_pass_rate(self):
        packet, key, review = self.fixture()
        next(r for r in review["ratings"] if r["responseHash"] == digest("adapter output"))["noFabricatedClaims"] = False
        result = summarize(packet, key, review)
        self.assertTrue(result["pointTargetMet"])
        self.assertFalse(result["descriptiveSemanticGatePassed"])

    def test_missing_duplicate_unknown_and_incomplete_dimension_rejected(self):
        for mode in ("missing", "duplicate", "unknown", "dimension"):
            packet, key, review = self.fixture()
            if mode == "missing": review["ratings"].pop()
            if mode == "duplicate": review["ratings"].append(copy.deepcopy(review["ratings"][0]))
            if mode == "unknown": review["ratings"][0]["id"] = "absent"
            if mode == "dimension": review["ratings"][0]["sourceSupported"] = 1
            with self.subTest(mode=mode), self.assertRaises(ValueError): summarize(packet, key, review)

    def test_replaced_response_source_or_rating_hash_rejected(self):
        for mode in ("response", "source", "rating"):
            packet, key, review = self.fixture()
            if mode == "response": packet["cases"][0]["responseA"] = "different"
            if mode == "source": packet["cases"][0]["source"] = "different"
            if mode == "rating": review["ratings"][0]["responseHash"] = "b" * 64
            with self.subTest(mode=mode), self.assertRaises(ValueError): summarize(packet, key, review)

    def test_unknown_arm_pair_rejected(self):
        packet, key, review = self.fixture()
        key["cases"][0]["A"] = key["cases"][0]["B"]
        with self.assertRaises(ValueError): summarize(packet, key, review)

    def test_swapping_valid_arm_labels_after_ratings_is_rejected(self):
        packet, key, review = self.fixture()
        row = key["cases"][0]
        row["A"], row["B"] = row["B"], row["A"]
        with self.assertRaisesRegex(ValueError, "prereview commitment"):
            summarize(packet, key, review)

    def test_invalid_report_hash_and_diagnostic_epoch_rejected(self):
        for report_hash, epoch in (("x" * 64, None), ("a" * 64, True), ("a" * 64, 5)):
            with self.assertRaises(ValueError): build_packet([], [], [], report_hash, "validation", epoch)

    def test_unpaired_outputs_and_duplicate_cases_rejected(self):
        case = {"id": "a", "source": "source", "question": "question", "expectedAbstention": False}
        with self.assertRaises(ValueError): build_packet([case], [{"id": "b", "output": "x"}], [{"id": "a", "output": "y"}], "a"*64, "test")
        with self.assertRaises(ValueError): build_packet([case, case], [], [], "a"*64, "test")

    def test_wilson_zero_perfect_and_invalid(self):
        self.assertAlmostEqual(wilson(0, 100)[0], 0.)
        self.assertLess(wilson(100, 100)[0], 1.)
        for pair in ((0, 0), (2, 1), (True, 1), (1, float("nan"))):
            with self.assertRaises(ValueError): wilson(*pair)

    def test_review_does_not_change_immutable_run_inventory(self):
        with self.assertRaises(ValueError): review_destination(Path("run"), Path("run/audit"))
        with self.assertRaises(ValueError): review_destination(Path("run"), Path("run/../run/audit"))
        self.assertEqual(review_destination(Path("run"), Path("separate-audit")), Path("separate-audit"))

    def test_qwen3_jsonl_review_requires_verifier_and_rejects_final_test(self):
        schemas = (("diana-qwen3-grounding-development-v1", "verify_qwen3_4b_research"),
                   ("diana-qwen3-grounding-revision-development-v1", "verify_qwen3_grounding_revision"),
                   ("diana-qwen3-preference-development-v1", "verify_qwen3_preference_v2"),
                   ("diana-qwen3-evidence-integrity-development-v1", "verify_qwen3_evidence_integrity"),
                   ("diana-qwen3-matched-sft-development-v1", "verify_qwen3_matched_sft"))
        for partition, (schema, module_name) in itertools.product(("validation", "test"), schemas):
            with self.subTest(partition=partition, schema=schema), tempfile.TemporaryDirectory() as directory:
                run = Path(directory) / "run"
                output = Path(directory) / "review"
                run.mkdir()
                case = {"id": "fixture", "source": "A source.", "question": "Which source?", "expectedAbstention": False}
                for name, value in (("report.json", {"schema": schema, "selectedEpoch": None}),
                                    ("protocol.json", {"settings": {"epochs": 2}}), ("development.json", [case])):
                    (run/name).write_text(json.dumps(value), encoding="utf-8")
                for name, text in (("baseline-development.jsonl", "base"), ("epoch-2-development.jsonl", "adapter")):
                    (run/name).write_text(json.dumps({"id": "fixture", "output": text}) + "\n", encoding="utf-8")
                verifier = Mock()
                module = types.ModuleType(module_name)
                module.verify = verifier
                argv = ["review", "build", "--run", str(run), "--output", str(output), "--partition", partition, "--epoch", "2"]
                with patch.dict(sys.modules, {module.__name__: module}), patch.object(sys, "argv", argv), patch("sys.stdout", new_callable=io.StringIO):
                    if partition == "test":
                        with self.assertRaisesRegex(ValueError, "no final-test evidence"):
                            main()
                        self.assertFalse(output.exists())
                    else:
                        main()
                        packet = json.loads((output/"packet.json").read_text(encoding="utf-8"))
                        self.assertEqual(packet["diagnosticEpoch"], 2)
                        self.assertEqual({packet["cases"][0]["responseA"], packet["cases"][0]["responseB"]}, {"base", "adapter"})
                verifier.assert_called_once_with(run.resolve())


if __name__ == "__main__":
    unittest.main()
