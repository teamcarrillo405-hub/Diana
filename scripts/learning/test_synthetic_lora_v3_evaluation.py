"""Dataset integrity tests; never execute a model or read v3 development data."""
import hashlib
import json
from collections import Counter
from pathlib import Path
import unittest

from synthetic_lora_v3_evaluation import (
    EVALUATION_VERSION, LEVELS, SUBJECTS, dataset_sha256, evaluation_cases,
)


class LockedEvaluationTests(unittest.TestCase):
    def setUp(self):
        self.rows = evaluation_cases()

    def test_size_and_nonduplicated_contexts(self):
        self.assertEqual(len(self.rows), 100)
        for field in ("id", "family", "source", "question"):
            self.assertEqual(len({row[field] for row in self.rows}), 100, field)

    def test_declared_slices_and_evidence_mix(self):
        self.assertEqual(Counter(row["subject"] for row in self.rows),
                         {subject: 20 for subject in SUBJECTS})
        self.assertEqual(Counter(row["level"] for row in self.rows),
                         {level: 25 for level in LEVELS})
        self.assertEqual(Counter((row["subject"], row["level"]) for row in self.rows),
                         {(subject, level): 5 for subject in SUBJECTS for level in LEVELS})
        self.assertEqual(Counter(row["evidenceStatus"] for row in self.rows),
                         {"answerable": 60, "missing": 25, "conflicting": 15})

    def test_every_reference_is_structured_and_source_bound(self):
        for row in self.rows:
            with self.subTest(identifier=row["id"]):
                lines = row["target"].splitlines()
                self.assertEqual(len(lines), 2)
                self.assertTrue(lines[0].startswith("EVIDENCE: "))
                self.assertTrue(lines[1].startswith("NEXT: "))
                self.assertTrue(lines[1].endswith("?"))
                self.assertEqual(lines[1].count("?"), 1)
                self.assertTrue(row["semanticRubric"])
                self.assertTrue(row["nextStepAnchors"])
                self.assertTrue(any(anchor.lower() in lines[1].lower()
                                    for anchor in row["nextStepAnchors"]))
                if row["expectedAbstention"]:
                    self.assertEqual(lines[0], "EVIDENCE: insufficient")
                    self.assertEqual(row["acceptedQuotes"], [])
                    self.assertTrue(row["missingInformation"])
                else:
                    self.assertIn(lines[0][10:], row["acceptedQuotes"])
                    self.assertEqual(row["missingInformation"], "")
                    for quote in row["acceptedQuotes"]:
                        self.assertIn(quote, row["source"])
                        self.assertGreater(len(quote.split()), 1)

    def test_sealed_manifest_matches_exact_module_and_canonical_rows(self):
        repo = Path(__file__).resolve().parents[2]
        path = repo / "docs/engineering/grounding-v3-test-manifest.json"
        manifest = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(manifest["version"], EVALUATION_VERSION)
        self.assertEqual(manifest["testCases"], 100)
        self.assertEqual(manifest["minimumGroundingAccuracy"], 0.95)
        self.assertEqual(manifest["testRowsSha256"], dataset_sha256())
        module = Path(__file__).with_name("synthetic_lora_v3_evaluation.py")
        self.assertEqual(manifest["moduleSha256"], hashlib.sha256(module.read_bytes()).hexdigest())


if __name__ == "__main__":
    unittest.main()
