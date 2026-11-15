"""Integrity checks only: no inference, historical data, or model-output access.

These tests establish structure and seal consistency, not educational quality.
Run: python -B -m unittest discover -s scripts/learning -p test_qwen3_fresh_evaluation.py
"""
from __future__ import annotations

import ast
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).with_name("qwen3_fresh_evaluation.py")
MANIFEST = ROOT / "docs/engineering/qwen3-fresh-test-manifest.json"
CONTRACT = ROOT / "docs/engineering/qwen3-grounding-evaluation-contract.md"
SPEC = importlib.util.spec_from_file_location("fresh_evaluation_integrity_subject", SOURCE)
assert SPEC is not None and SPEC.loader is not None
EVALUATION = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EVALUATION)

SUBJECTS = ("math", "reading", "english", "science", "history")
LEVELS = ("grades 6–8", "grades 9–12", "introductory college", "advanced college")
ANSWERABILITY = {"answerable": 60, "missing": 25, "conflicting": 15}
REQUIRED = {
    "id", "family", "subject", "level", "source", "question", "target",
    "expectedAbstention", "acceptedQuotes", "nextStepAnchors", "answerability", "rubric",
}
OPTIONAL = {"requiredNextStepConcepts", "sourceInstructionAttack"}


def canonical_bytes(records):
    return json.dumps(records, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False).encode("utf-8")


def sha256(data):
    return hashlib.sha256(data).hexdigest()


class FreshEvaluationIntegrity(unittest.TestCase):
    def setUp(self):
        self.records = EVALUATION.rows()

    def test_schema_and_nonempty_fields(self):
        self.assertIsInstance(self.records, list)
        for row in self.records:
            with self.subTest(id=row.get("id")):
                self.assertIsInstance(row, dict)
                self.assertTrue(REQUIRED <= row.keys())
                self.assertTrue(row.keys() <= REQUIRED | OPTIONAL)
                for field in REQUIRED - {"expectedAbstention", "acceptedQuotes", "nextStepAnchors"}:
                    self.assertIsInstance(row[field], str)
                    self.assertTrue(row[field].strip())
                self.assertIs(type(row["expectedAbstention"]), bool)
                self.assertIn(row["subject"], SUBJECTS)
                self.assertIn(row["level"], LEVELS)
                self.assertIn(row["answerability"], ANSWERABILITY)
                self.assertTrue(row["question"].endswith("?"))
                if "sourceInstructionAttack" in row:
                    self.assertIs(type(row["sourceInstructionAttack"]), bool)
                for field in ("acceptedQuotes", "nextStepAnchors"):
                    self.assertIsInstance(row[field], list)
                    self.assertTrue(all(isinstance(x, str) and x.strip() for x in row[field]))

    def test_exact_distribution_and_unique_contexts(self):
        self.assertEqual(len(self.records), 100)
        self.assertEqual([r["id"] for r in self.records], [f"fresh-{i:03d}" for i in range(1, 101)])
        for field in ("id", "family", "source", "question"):
            self.assertEqual(len({r[field] for r in self.records}), 100, field)
        self.assertEqual(Counter(r["subject"] for r in self.records), {s: 20 for s in SUBJECTS})
        self.assertEqual(Counter(r["level"] for r in self.records), {v: 25 for v in LEVELS})
        self.assertEqual(Counter((r["subject"], r["level"]) for r in self.records),
                         {(s, v): 5 for s in SUBJECTS for v in LEVELS})
        self.assertEqual(Counter(r["answerability"] for r in self.records), ANSWERABILITY)
        self.assertGreaterEqual(sum(r.get("sourceInstructionAttack", False) for r in self.records), 4)

    def test_abstention_and_exact_evidence(self):
        for row in self.records:
            with self.subTest(id=row["id"]):
                abstains = row["answerability"] != "answerable"
                self.assertEqual(row["expectedAbstention"], abstains)
                evidence = row["target"].splitlines()[0]
                if abstains:
                    self.assertEqual(row["acceptedQuotes"], [])
                    self.assertEqual(evidence, "EVIDENCE: insufficient")
                else:
                    self.assertTrue(row["acceptedQuotes"])
                    self.assertTrue(evidence.startswith("EVIDENCE: "))
                    self.assertIn(evidence.removeprefix("EVIDENCE: "), row["acceptedQuotes"])
                    for quote in row["acceptedQuotes"]:
                        self.assertLessEqual(len(quote), 240)
                        self.assertIn(quote, row["source"])
                        self.assertNotIn("\n", quote)

    def test_targets_have_two_lines_and_one_focused_question_form(self):
        for row in self.records:
            with self.subTest(id=row["id"]):
                lines = row["target"].splitlines()
                self.assertEqual(len(lines), 2)
                self.assertTrue(lines[0].startswith("EVIDENCE: "))
                self.assertTrue(lines[1].startswith("NEXT: "))
                self.assertEqual(lines[1].count("?"), 1)
                self.assertTrue(lines[1].endswith("?"))
                self.assertEqual(row["target"], "\n".join(lines))
                self.assertNotIn("\t", row["target"])
                self.assertNotIn("```", row["target"])
                next_question = lines[1].removeprefix("NEXT: ").casefold()
                self.assertTrue(row["nextStepAnchors"])
                self.assertTrue(any(a.casefold() in next_question for a in row["nextStepAnchors"]))
                for group in row.get("requiredNextStepConcepts", []):
                    self.assertIsInstance(group, list)
                    self.assertTrue(group)
                    self.assertTrue(all(isinstance(a, str) and a.strip() for a in group))
                    self.assertTrue(any(a.casefold() in next_question for a in group))

    def test_rows_are_deterministic_and_independent(self):
        original = canonical_bytes(EVALUATION.rows())
        self.records[0]["acceptedQuotes"].append("integrity-test mutation")
        self.records[0]["source"] = "integrity-test mutation"
        self.assertEqual(canonical_bytes(EVALUATION.rows()), original)
        self.assertEqual(canonical_bytes(EVALUATION.rows()), canonical_bytes(EVALUATION.rows()))

    def test_module_dependencies_remain_stdlib_only(self):
        tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                self.assertTrue(all(a.name in {"copy"} for a in node.names))
            elif isinstance(node, ast.ImportFrom):
                self.assertIn(node.module, {"__future__", "copy"})
        self.assertFalse(any(isinstance(node, (ast.AsyncFunctionDef, ast.Await)) for node in ast.walk(tree)))

    def test_manifest_seals_and_counts(self):
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(manifest["source_sha256"], sha256(SOURCE.read_bytes()))
        self.assertEqual(manifest["canonical_rows_sha256"], sha256(canonical_bytes(self.records)))
        self.assertEqual(manifest["integrity_tests_sha256"], sha256(Path(__file__).read_bytes()))
        self.assertEqual(manifest["contract_sha256"], sha256(CONTRACT.read_bytes()))
        self.assertEqual(manifest["counts"]["total"], len(self.records))
        self.assertEqual(manifest["counts"]["by_answerability"], ANSWERABILITY)
        self.assertEqual(manifest["counts"]["by_subject"], dict(Counter(r["subject"] for r in self.records)))
        self.assertEqual(manifest["counts"]["by_level"], dict(Counter(r["level"] for r in self.records)))
        for entry in manifest["counts"]["by_subject_and_level"]:
            self.assertEqual(entry["count"], sum(r["subject"] == entry["subject"] and
                                                   r["level"] == entry["level"] for r in self.records))
        self.assertEqual(len(manifest["counts"]["by_subject_and_level"]), 20)
        self.assertEqual(manifest["counts"]["source_instruction_attacks"],
                         sum(r.get("sourceInstructionAttack", False) for r in self.records))
        self.assertEqual(manifest["authorship"]["self_review"]["reviewed_case_count"], 100)
        self.assertFalse(manifest["authorship"]["educator_approved"])
        self.assertFalse(manifest["authorship"]["representative_course_coverage_claimed"])


if __name__ == "__main__":
    unittest.main()
