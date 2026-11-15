"""Structural checks only; no models, old cases, or evaluation modules."""

from collections import Counter, defaultdict
import unittest

from qwen3_evidence_integrity_data_b import AUTHOR_EXPOSURE, rows


class EvidenceIntegrityBStructure(unittest.TestCase):
    def setUp(self):
        self.rows = rows()

    def test_inventory(self):
        self.assertEqual(len(self.rows), 150)
        self.assertEqual(len({r["id"] for r in self.rows}), 150)
        self.assertTrue(all(r["id"].startswith("pref-integrity-b-") for r in self.rows))
        subjects = {"math", "reading", "English", "science", "history"}
        categories = {"evidence-mutation", "task-scope", "missing-procedure", "missing-inputs", "source-instruction"}
        self.assertEqual(Counter(r["subject"] for r in self.rows), {s: 30 for s in subjects})
        self.assertEqual(Counter(r["preferenceCategory"] for r in self.rows), {c: 30 for c in categories})
        self.assertEqual(Counter((r["subject"], r["preferenceCategory"]) for r in self.rows),
                         {(s, c): 6 for s in subjects for c in categories})
        self.assertEqual(Counter(r["expectedAbstention"] for r in self.rows), {False: 75, True: 75})

    def test_context_pairs_and_conflicts(self):
        families = defaultdict(list)
        for row in self.rows:
            families[row["family"]].append(row)
        self.assertEqual(len(families), 75)
        self.assertEqual(len({r["source"] for r in self.rows}), 75)
        for family in families.values():
            self.assertEqual(len(family), 2)
            self.assertEqual(len({r["source"] for r in family}), 1)
            self.assertEqual(len({r["question"] for r in family}), 2)
            self.assertEqual({r["expectedAbstention"] for r in family}, {True, False})
            self.assertEqual(len({r["conflictingContext"] for r in family}), 1)
            self.assertEqual(len({r["sourceInstructionPresent"] for r in family}), 1)
        self.assertGreaterEqual(sum(f[0]["conflictingContext"] for f in families.values()), 15)

    def test_fields_lengths_and_disclosure(self):
        required = {"id", "family", "subject", "level", "source", "question", "target", "rejected",
            "expectedAbstention", "acceptedQuotes", "nextStepAnchors", "answerability", "preferenceCategory",
            "preferenceReason", "conflictingContext", "sourceInstructionPresent"}
        self.assertIn("Prior preference-partition-A author", AUTHOR_EXPOSURE)
        self.assertIn("evaluation-blind", AUTHOR_EXPOSURE)
        for row in self.rows:
            with self.subTest(id=row["id"]):
                self.assertTrue(required <= row.keys())
                self.assertTrue(180 <= len(row["source"]) <= 600)
                self.assertIn("unvalidated", row["level"])
                self.assertIs(row["researchOnly"], True)
                self.assertIs(type(row["conflictingContext"]), bool)
                self.assertIs(type(row["sourceInstructionPresent"]), bool)
                self.assertGreater(len(row["preferenceReason"]), 60)
                self.assertEqual(row["question"].count("?"), 1)

    def test_response_shapes_and_evidence(self):
        for row in self.rows:
            with self.subTest(id=row["id"]):
                for kind in ("target", "rejected"):
                    evidence, next_step = row[kind].splitlines()
                    self.assertTrue(evidence.startswith("EVIDENCE: "))
                    self.assertTrue(next_step.startswith("NEXT: "))
                    self.assertTrue(next_step.endswith("?"))
                    self.assertEqual(row[kind].count("?"), 1)
                    self.assertLessEqual(len(evidence.removeprefix("EVIDENCE: ")), 240)
                self.assertNotEqual(row["target"], row["rejected"])
                evidence = row["target"].splitlines()[0].removeprefix("EVIDENCE: ")
                if row["expectedAbstention"]:
                    self.assertEqual(evidence, "insufficient")
                    self.assertEqual(row["acceptedQuotes"], [])
                    self.assertEqual(row["answerability"], "insufficient")
                else:
                    self.assertIn(evidence, row["source"])
                    self.assertEqual(row["acceptedQuotes"], [evidence])
                    self.assertEqual(row["answerability"], "answerable")
                    self.assertTrue(evidence.endswith((".", "'", '"')))

    def test_literal_next_step_anchors(self):
        for row in self.rows:
            with self.subTest(id=row["id"]):
                next_step = row["target"].splitlines()[1].casefold()
                self.assertGreaterEqual(len(row["nextStepAnchors"]), 2)
                for anchor in row["nextStepAnchors"]:
                    self.assertGreater(len(anchor), 2)
                    self.assertIn(anchor.casefold(), next_step)

    def test_source_instructions_are_explicitly_marked(self):
        selected = [r for r in self.rows if r["preferenceCategory"] == "source-instruction"]
        self.assertEqual(len(selected), 30)
        for row in self.rows:
            self.assertEqual(row["sourceInstructionPresent"], row["preferenceCategory"] == "source-instruction")
        for row in selected:
            self.assertIn("untrusted", row["source"].casefold())

    def test_mutation_contrasts_isolate_next_step_in_at_least_twenty_pairs(self):
        selected = [r for r in self.rows if r["preferenceCategory"] == "evidence-mutation"]
        self.assertEqual(len(selected), 30)
        self.assertGreaterEqual(sum(r["target"].splitlines()[0] == r["rejected"].splitlines()[0] for r in selected), 20)

    def test_calls_return_independent_rows(self):
        changed = rows()
        changed[0]["nextStepAnchors"].append("unpersisted mutation")
        self.assertNotIn("unpersisted mutation", rows()[0]["nextStepAnchors"])


if __name__ == "__main__":
    unittest.main()
