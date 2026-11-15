"""Structural checks for author A's original fictional preference research.

These tests intentionally do not train models, inspect model outputs, import
evaluation cases, or decide whether a response is pedagogically adequate.
"""

from collections import Counter, defaultdict
import unittest

from qwen3_preference_data_a import rows


class PreferenceDataAStructureTests(unittest.TestCase):
    def setUp(self) -> None:
        self.data = rows()

    def test_counts_and_unique_identifiers(self) -> None:
        self.assertEqual(len(self.data), 100)
        self.assertEqual(len({row["id"] for row in self.data}), 100)
        self.assertTrue(all(row["id"].startswith("pref-a-") for row in self.data))
        self.assertEqual(
            Counter(row["subject"] for row in self.data),
            {"math": 20, "reading": 20, "English": 20, "science": 20, "history": 20},
        )
        self.assertEqual(
            Counter(row["preferenceCategory"] for row in self.data),
            {"echo": 40, "unsupported-premise": 20, "wrong-scope": 20, "wrong-answerability": 20},
        )
        self.assertEqual(
            Counter(row["answerability"] for row in self.data),
            {"answerable": 50, "insufficient": 50},
        )

    def test_two_distinct_tasks_per_original_context(self) -> None:
        families = defaultdict(list)
        for row in self.data:
            families[row["family"]].append(row)
        self.assertEqual(len(families), 50)
        self.assertEqual(len({row["source"] for row in self.data}), 50)
        for family_rows in families.values():
            self.assertEqual(len(family_rows), 2)
            self.assertEqual(len({row["source"] for row in family_rows}), 1)
            self.assertEqual(len({row["question"] for row in family_rows}), 2)
            self.assertEqual({row["expectedAbstention"] for row in family_rows}, {True, False})
            self.assertEqual({row["answerability"] for row in family_rows}, {"answerable", "insufficient"})
        self.assertGreaterEqual(
            sum(any(row["conflictingContext"] for row in family_rows) for family_rows in families.values()),
            10,
        )

    def test_source_fields_and_research_marking(self) -> None:
        required = {
            "id", "family", "subject", "level", "source", "question", "target",
            "rejected", "expectedAbstention", "acceptedQuotes", "nextStepAnchors",
            "answerability", "preferenceCategory", "preferenceReason",
        }
        for row in self.data:
            with self.subTest(id=row["id"]):
                self.assertTrue(required <= row.keys())
                self.assertGreaterEqual(len(row["source"]), 180)
                self.assertLessEqual(len(row["source"]), 500)
                self.assertIn("unvalidated", row["level"])
                self.assertIs(row["researchOnly"], True)
                self.assertGreater(len(row["preferenceReason"]), 60)
                self.assertTrue(row["question"].endswith("?"))
                self.assertNotIn("\n", row["source"])

    def test_both_completions_have_two_lines_and_one_question(self) -> None:
        for row in self.data:
            for key in ("target", "rejected"):
                with self.subTest(id=row["id"], key=key):
                    response = row[key]
                    lines = response.splitlines()
                    self.assertEqual(len(lines), 2)
                    self.assertTrue(lines[0].startswith("EVIDENCE: "))
                    self.assertTrue(lines[1].startswith("NEXT: "))
                    self.assertEqual(response.count("?"), 1)
                    self.assertTrue(lines[1].endswith("?"))
                    self.assertLessEqual(len(lines[0].removeprefix("EVIDENCE: ")), 240)
                    self.assertNotEqual(row["target"], row["rejected"])

    def test_preferred_evidence_is_exact_or_abstains(self) -> None:
        for row in self.data:
            with self.subTest(id=row["id"]):
                evidence = row["target"].splitlines()[0].removeprefix("EVIDENCE: ")
                if row["expectedAbstention"]:
                    self.assertEqual(evidence, "insufficient")
                    self.assertEqual(row["acceptedQuotes"], [])
                    self.assertEqual(row["answerability"], "insufficient")
                else:
                    self.assertIn(evidence, row["source"])
                    self.assertEqual(row["acceptedQuotes"], [evidence])
                    self.assertEqual(row["answerability"], "answerable")
                    self.assertTrue(evidence.endswith((".", "!", "?", "'", '"')))

    def test_anchors_are_present_in_preferred_next_step(self) -> None:
        for row in self.data:
            with self.subTest(id=row["id"]):
                next_step = row["target"].splitlines()[1].removeprefix("NEXT: ").casefold()
                self.assertGreaterEqual(len(row["nextStepAnchors"]), 2)
                for anchor in row["nextStepAnchors"]:
                    self.assertIsInstance(anchor, str)
                    self.assertGreater(len(anchor), 2)
                    self.assertIn(anchor.casefold(), next_step)

    def test_wrong_answerability_rejects_in_opposite_direction(self) -> None:
        for row in self.data:
            if row["preferenceCategory"] == "wrong-answerability":
                rejected_evidence = row["rejected"].splitlines()[0].removeprefix("EVIDENCE: ")
                self.assertEqual(rejected_evidence == "insufficient", not row["expectedAbstention"])

    def test_rows_returns_independent_mutable_values(self) -> None:
        original = rows()
        original[0]["nextStepAnchors"].append("unpersisted-test-mutation")
        original[0]["source"] = "unpersisted-test-mutation"
        self.assertNotIn("unpersisted-test-mutation", rows()[0]["nextStepAnchors"])
        self.assertNotEqual(rows()[0]["source"], "unpersisted-test-mutation")


if __name__ == "__main__":
    unittest.main()
