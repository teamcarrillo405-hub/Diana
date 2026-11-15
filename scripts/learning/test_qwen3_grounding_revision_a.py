"""Structural and targeted premise checks for the original revision-A material.

These checks are not a substitute for independent semantic content review.
They intentionally import only the paired newly authored module.
"""

import collections
import hashlib
import json
import unittest

import qwen3_grounding_revision_a as data


class GroundingRevisionATests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = data.rows()
        cls.by_id = {row["id"]: row for row in cls.rows}
        cls.groups = collections.defaultdict(list)
        for row in cls.rows:
            cls.groups[row["family"]].append(row)

    def test_manifest_counts_and_original_context_identity(self):
        self.assertEqual(len(data.CONTEXTS), 100)
        self.assertEqual(len(self.rows), 300)
        self.assertEqual(len(self.groups), 100)
        self.assertEqual(len({c["slug"] for c in data.CONTEXTS}), 100)
        self.assertEqual(len({r["source"] for r in self.rows}), 100)
        self.assertEqual(len(self.by_id), 300)
        self.assertEqual(set(data.NEXT_ANCHORS), {c["slug"] for c in data.CONTEXTS})

    def test_subjects_have_twenty_contexts_and_sixty_rows(self):
        expected = {s: 20 for s in ("math", "reading", "English", "science", "history")}
        self.assertEqual(collections.Counter(c["subject"] for c in data.CONTEXTS), expected)
        self.assertEqual(collections.Counter(r["subject"] for r in self.rows), {s: 60 for s in expected})
        for subject in expected:
            with self.subTest(subject=subject):
                subset = [r for r in self.rows if r["subject"] == subject]
                self.assertEqual(sum(r["expectedAbstention"] for r in subset), 30)

    def test_answerability_balanced_within_context_patterns(self):
        self.assertEqual(sum(r["expectedAbstention"] for r in self.rows), 150)
        patterns = collections.Counter()
        conflict_contexts = 0
        for family, group in self.groups.items():
            with self.subTest(family=family):
                self.assertEqual(len(group), 3)
                self.assertEqual(len({r["question"] for r in group}), 3)
                self.assertEqual(len({r["source"] for r in group}), 1)
                self.assertEqual(len({r["subject"] for r in group}), 1)
                self.assertEqual(len({r["level"] for r in group}), 1)
                patterns[sum(not r["expectedAbstention"] for r in group)] += 1
                if any(r["answerability"] == "conflicting" for r in group):
                    conflict_contexts += 1
                    self.assertTrue(any(r["answerability"] == "answerable" for r in group))
        self.assertEqual(patterns, {1: 50, 2: 50})
        self.assertEqual(conflict_contexts, 20)

    def test_schema_and_exact_evidence(self):
        required = {"id", "family", "contextId", "subject", "level", "source", "question", "target",
                    "expectedAbstention", "acceptedQuotes", "nextStepAnchors", "answerability"}
        for row in self.rows:
            with self.subTest(row=row["id"]):
                self.assertEqual(set(row), required)
                self.assertTrue(row["id"].startswith("train-r2a-"))
                self.assertEqual(row["contextId"], row["family"])
                self.assertIn("not validated", row["level"])
                self.assertGreaterEqual(len(row["source"]), 180)
                self.assertLessEqual(len(row["source"]), 650)
                self.assertEqual(row["source"], row["source"].strip())
                self.assertEqual(len(row["target"].splitlines()), 2)
                evidence, next_line = row["target"].splitlines()
                self.assertTrue(evidence.startswith("EVIDENCE: "))
                self.assertTrue(next_line.startswith("NEXT: "))
                quote = evidence.removeprefix("EVIDENCE: ")
                if row["expectedAbstention"]:
                    self.assertEqual(quote, "insufficient")
                    self.assertEqual(row["acceptedQuotes"], [])
                    self.assertIn(row["answerability"], {"missing", "conflicting"})
                else:
                    self.assertEqual(row["answerability"], "answerable")
                    self.assertEqual(row["acceptedQuotes"], [quote])
                    self.assertIn(quote, row["source"])
                    self.assertLessEqual(len(quote), 240)
                    self.assertTrue(quote.endswith("."))
                    self.assertGreaterEqual(len(quote.split()), 8)

    def test_next_questions_and_specific_anchors(self):
        for row in self.rows:
            with self.subTest(row=row["id"]):
                next_question = row["target"].splitlines()[1].removeprefix("NEXT: ")
                self.assertEqual(next_question.count("?"), 1)
                self.assertTrue(next_question.endswith("?"))
                self.assertNotEqual(next_question.lower(), row["question"].lower())
                self.assertFalse(any(mark in next_question for mark in ("\n", "!", ";")))
                self.assertGreater(len(row["nextStepAnchors"]), 0)
                for anchor in row["nextStepAnchors"]:
                    self.assertIn(anchor, next_question)
                    self.assertGreaterEqual(len(anchor), 7)
                    self.assertLess(len(anchor), len(next_question))

    def test_concrete_false_premise_regressions(self):
        # Explicitly test fragile author choices, including questions whose wording
        # invites the assistant to assume a violation, outcome, or event exists.
        cases = (
            ("comma-list-2", "whether any comma is missing", "the missing comma"),
            ("verb-time-2", "whether any verb", "the verb that breaks"),
            ("parallel-headings-2", "whether any heading", "the heading that breaks"),
            ("fragment-check-2", "whether it contains a fragment", "the fragment in"),
            ("fragment-check-3", "suspected fragment", "your fragment to"),
            ("night-watch-2", "who, if anyone", "the person who turned"),
            ("lost-key-note-2", "whether anyone found", "the finder"),
            ("dissolving-control-3", "whether and by how much", "how much faster"),
            ("meeting-vote-3", "evidence that construction occurred", "the completed market"),
            ("canal-letter-3", "evidence of an opening", "after the canal opened"),
            ("ration-notice-2", "whether any households", "the households that exceeded"),
            ("postal-routes-3", "whether snow prevented", "the snow cancellations"),
            ("forest-proposal-3", "any reserve policy", "the adopted reserve"),
        )
        for suffix, required_phrase, forbidden_phrase in cases:
            with self.subTest(case=suffix):
                row = self.by_id[f"train-r2a-{suffix}"]
                next_line = row["target"].splitlines()[1]
                self.assertTrue(row["expectedAbstention"])
                self.assertIn(required_phrase, next_line)
                self.assertNotIn(forbidden_phrase, next_line)

    def test_conflict_identification_and_resolution_are_separate(self):
        for subject in ("math", "reading", "English", "science", "history"):
            with self.subTest(subject=subject):
                groups = [g for g in self.groups.values() if g[0]["subject"] == subject
                          and any(r["answerability"] == "conflicting" for r in g)]
                self.assertEqual(len(groups), 4)
                for group in groups:
                    conflict_rows = [r for r in group if r["answerability"] == "conflicting"]
                    self.assertEqual(len(conflict_rows), 1)
                    self.assertEqual(conflict_rows[0]["acceptedQuotes"], [])
                    self.assertTrue(any(r["acceptedQuotes"] for r in group))

    def test_stability_and_fresh_return_values(self):
        original = data.rows()
        canonical = json.dumps(original, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        original[0]["acceptedQuotes"].append("mutation probe")
        original[1]["nextStepAnchors"].clear()
        original[2]["source"] = "mutation probe"
        current = json.dumps(data.rows(), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        self.assertEqual(hashlib.sha256(canonical.encode()).hexdigest(), hashlib.sha256(current.encode()).hexdigest())


if __name__ == "__main__":
    unittest.main()
