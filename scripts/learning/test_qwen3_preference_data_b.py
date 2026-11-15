"""Structural checks for original research-only set B; no educator validation."""

from collections import Counter, defaultdict
import re
import unittest

from qwen3_preference_data_b import AUTHOR_REVIEW, CONTEXTS, NEXT_ANCHORS, digest, rows


class PreferenceBTests(unittest.TestCase):
    def test_context_balance_and_conflicts(self):
        self.assertEqual(len(CONTEXTS), 50)
        self.assertEqual(len({c['key'] for c in CONTEXTS}), 50)
        self.assertEqual(len({c['source'] for c in CONTEXTS}), 50)
        self.assertEqual(Counter(c['subject'] for c in CONTEXTS), {
            'math': 10, 'reading': 10, 'English': 10, 'science': 10, 'history': 10})
        self.assertGreaterEqual(sum(c['conflict'] for c in CONTEXTS), 10)

    def test_pair_counts_and_schema(self):
        data = rows()
        self.assertEqual(len(data), 100)
        self.assertEqual(len({r['id'] for r in data}), 100)
        self.assertEqual(Counter(r['preferenceCategory'] for r in data), {
            'echo': 40, 'unsupported-premise': 20,
            'wrong-scope': 20, 'wrong-answerability': 20})
        self.assertEqual(Counter(r['answerability'] for r in data), {
            'answerable': 50, 'insufficient': 50})
        expected = {'id', 'family', 'subject', 'level', 'source', 'question',
                    'target', 'rejected', 'expectedAbstention', 'acceptedQuotes',
                    'nextStepAnchors', 'answerability', 'preferenceCategory',
                    'preferenceReason', 'conflictingContext'}
        for row in data:
            with self.subTest(row=row['id']):
                self.assertEqual(set(row), expected)
                self.assertTrue(row['id'].startswith('pref-b-'))
                self.assertEqual(row['level'], 'unvalidated')
                self.assertGreaterEqual(len(row['source']), 180)
                self.assertLessEqual(len(row['source']), 500)
                self.assertGreater(len(row['preferenceReason']), 100)
                self.assertNotEqual(row['target'], row['rejected'])

    def test_evidence_and_two_line_question_format(self):
        for row in rows():
            with self.subTest(row=row['id']):
                for field in ('target', 'rejected'):
                    lines = row[field].splitlines()
                    self.assertEqual(len(lines), 2)
                    self.assertTrue(lines[0].startswith('EVIDENCE: '))
                    self.assertTrue(lines[1].startswith('NEXT: '))
                    self.assertEqual(row[field].count('?'), 1)
                    self.assertTrue(lines[1].endswith('?'))
                    evidence = lines[0].removeprefix('EVIDENCE: ')
                    self.assertLessEqual(len(evidence), 240)
                    if evidence != 'insufficient':
                        self.assertIn(evidence, re.split(r'(?<=\.)\s+', row['source']))
                preferred_evidence = row['target'].splitlines()[0][10:]
                self.assertEqual(preferred_evidence == 'insufficient', row['expectedAbstention'])
                self.assertEqual(row['acceptedQuotes'], [] if row['expectedAbstention'] else [preferred_evidence])
                self.assertTrue(row['nextStepAnchors'])
                for anchor in row['nextStepAnchors']:
                    self.assertIn(anchor, row['target'].splitlines()[1])
                    self.assertNotEqual(anchor, row['target'].splitlines()[1][6:])

    def test_same_context_distinct_requirements(self):
        families = defaultdict(list)
        for row in rows():
            families[row['family']].append(row)
        self.assertEqual(len(families), 50)
        for family, pair in families.items():
            with self.subTest(family=family):
                self.assertEqual(len(pair), 2)
                self.assertEqual(pair[0]['source'], pair[1]['source'])
                self.assertEqual({r['expectedAbstention'] for r in pair}, {True, False})
                self.assertNotEqual(pair[0]['question'], pair[1]['question'])
                self.assertNotEqual(pair[0]['nextStepAnchors'], pair[1]['nextStepAnchors'])
                self.assertNotEqual(pair[0]['preferenceReason'], pair[1]['preferenceReason'])

    def test_reasons_and_questions_are_individually_authored(self):
        data = rows()
        self.assertEqual(len({r['question'] for r in data}), 100)
        self.assertEqual(len({r['preferenceReason'] for r in data}), 100)
        self.assertEqual(len({r['target'].splitlines()[1] for r in data}), 100)

    def test_wrong_answerability_is_the_evidence_difference(self):
        for row in rows():
            if row['preferenceCategory'] != 'wrong-answerability':
                continue
            preferred, rejected = row['target'].splitlines(), row['rejected'].splitlines()
            self.assertEqual(preferred[1], rejected[1])
            self.assertNotEqual(preferred[0], rejected[0])

    def test_fresh_rows_and_deterministic_digest(self):
        expected = digest()
        data = rows()
        data[0]['acceptedQuotes'].append('mutation')
        data[0]['nextStepAnchors'].clear()
        self.assertEqual(digest(), expected)
        self.assertRegex(expected, r'^[0-9a-f]{64}$')

    def test_review_coverage_and_conflict_metadata(self):
        self.assertEqual(AUTHOR_REVIEW['contextsReviewed'], len(CONTEXTS))
        self.assertEqual(AUTHOR_REVIEW['pairsReviewed'], len(rows()))
        self.assertEqual(set(NEXT_ANCHORS), {c['key'] for c in CONTEXTS})
        self.assertEqual(sum(r['conflictingContext'] for r in rows()), 30)


if __name__ == '__main__':
    unittest.main()
