"""Integrity tests for independently authored revision B training rows only."""

import importlib.util
from collections import Counter, defaultdict
from pathlib import Path
import unittest


MODULE_PATH = Path(__file__).with_name("qwen3_grounding_revision_b.py")
SPEC = importlib.util.spec_from_file_location("qwen3_grounding_revision_b", MODULE_PATH)
DATA = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(DATA)


class RevisionBTests(unittest.TestCase):
    def setUp(self):
        self.rows = DATA.rows()
        self.families = defaultdict(list)
        for row in self.rows:
            self.families[row["family"]].append(row)

    def test_counts_and_identifiers(self):
        self.assertEqual(len(self.rows), 300)
        self.assertEqual(len(self.families), 100)
        self.assertEqual(len({row["id"] for row in self.rows}), 300)
        self.assertTrue(all(row["id"].startswith("train-r2b-") for row in self.rows))
        self.assertEqual(sum(row["expectedAbstention"] for row in self.rows), 150)
        self.assertEqual(Counter(row["answerability"] for row in self.rows),
                         {"answerable": 150, "missing": 110, "conflicting": 40})

    def test_subject_and_context_balance(self):
        subjects = {"math", "reading", "English", "science", "history"}
        self.assertEqual(set(row["subject"] for row in self.rows), subjects)
        for subject in subjects:
            selected = [row for row in self.rows if row["subject"] == subject]
            self.assertEqual(len(selected), 60, subject)
            self.assertEqual(len({row["family"] for row in selected}), 20, subject)
            self.assertEqual(sum(row["expectedAbstention"] for row in selected), 30, subject)
        answerable_counts = Counter(
            sum(not row["expectedAbstention"] for row in group)
            for group in self.families.values()
        )
        self.assertEqual(answerable_counts, {1: 50, 2: 50})

    def test_sources_and_family_consistency(self):
        unique_sources = set()
        for family, group in self.families.items():
            self.assertEqual(len(group), 3, family)
            self.assertEqual(len({row["question"] for row in group}), 3, family)
            self.assertEqual(len({row["target"].split("\n")[1] for row in group}), 3, family)
            for field in ("source", "subject", "level", "contextId"):
                self.assertEqual(len({row[field] for row in group}), 1, (family, field))
            self.assertEqual(group[0]["contextId"], family)
            source = group[0]["source"]
            self.assertGreaterEqual(len(source), 180, family)
            self.assertLessEqual(len(source), 650, family)
            unique_sources.add(source)
        self.assertEqual(len(unique_sources), 100)

    def test_evidence_contract(self):
        for row in self.rows:
            with self.subTest(row=row["id"]):
                lines = row["target"].splitlines()
                self.assertEqual(len(lines), 2)
                self.assertTrue(lines[0].startswith("EVIDENCE: "))
                self.assertTrue(lines[1].startswith("NEXT: "))
                evidence = lines[0].removeprefix("EVIDENCE: ")
                self.assertEqual(row["expectedAbstention"], row["answerability"] != "answerable")
                if row["expectedAbstention"]:
                    self.assertEqual(evidence, "insufficient")
                    self.assertEqual(row["acceptedQuotes"], [])
                else:
                    self.assertIn(evidence, row["source"])
                    self.assertLessEqual(len(evidence), 240)
                    self.assertGreater(len(evidence.split()), 3)
                    self.assertTrue(evidence.endswith((".", ".'")))
                    self.assertEqual(row["acceptedQuotes"], [evidence])

    def test_followup_contract(self):
        for row in self.rows:
            with self.subTest(row=row["id"]):
                followup = row["target"].split("\nNEXT: ")[1]
                self.assertEqual(followup.count("?"), 1)
                self.assertTrue(followup.endswith("?"))
                self.assertNotEqual(followup.casefold(), row["question"].casefold())
                self.assertNotIn("{", followup)
                self.assertNotIn("}", followup)
                self.assertTrue(row["nextStepAnchors"])
                for anchor in row["nextStepAnchors"]:
                    self.assertGreaterEqual(len(anchor.split()), 2)
                    self.assertIn(anchor, followup)

    def test_conflict_contexts_preserve_uncertainty(self):
        conflict_groups = [group for group in self.families.values()
                           if any(row["answerability"] == "conflicting" for row in group)]
        self.assertEqual(len(conflict_groups), 20)
        self.assertEqual(Counter(group[0]["subject"] for group in conflict_groups),
                         {"math": 4, "reading": 4, "English": 4, "science": 4, "history": 4})
        for group in conflict_groups:
            self.assertEqual(Counter(row["answerability"] for row in group),
                             {"answerable": 1, "conflicting": 2})
            for row in group:
                if row["answerability"] == "conflicting":
                    self.assertTrue(row["expectedAbstention"])

    def test_calls_return_independent_row_objects(self):
        altered = DATA.rows()
        altered[0]["nextStepAnchors"].append("test mutation")
        altered[0]["source"] = "changed"
        self.assertNotIn("test mutation", DATA.rows()[0]["nextStepAnchors"])
        self.assertEqual(DATA.rows()[0]["source"], self.rows[0]["source"])


if __name__ == "__main__":
    unittest.main()
