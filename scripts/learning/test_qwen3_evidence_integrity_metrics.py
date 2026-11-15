"""Prospective regression fixtures, with no final-case access or model calls."""
from copy import deepcopy
import unittest
import qwen3_evidence_integrity_metrics as metrics
from train_qwen3_4b_research import score as legacy_score


def row(expected=False, identifier='fixture'):
    return {'id': identifier, 'source': 'The memo proposes a shaded shelter. The budget vote is not recorded.',
        'question': 'What does the memo propose?' if not expected else 'Was the budget approved?',
        'expectedAbstention': expected, 'acceptedQuotes': [] if expected else ['The memo proposes a shaded shelter.'],
        'nextStepAnchors': ['memo', 'minutes']}


def record(case, output):
    return {'id': case['id'], 'output': output, 'targetTokenLoss': 2.0, 'targetTokens': 5,
            'diagnostics': metrics.score(output, case)}


class EvidenceIntegrityMetricsTests(unittest.TestCase):
    def test_explanatory_refusal_is_not_mistaken_for_supported_answer(self):
        case = row()
        output = 'EVIDENCE: insufficient and a budget vote would be needed.\nNEXT: Could you inspect the minutes for a vote?'
        self.assertTrue(legacy_score(output, case)['expectedAbstentionMatched'])
        scored = metrics.score(output, case)
        self.assertTrue(scored['legacyExpectedAbstentionMatched'])
        self.assertTrue(scored['abstained'])
        self.assertTrue(scored['falseAbstention'])
        self.assertTrue(scored['malformedAbstention'])
        self.assertFalse(scored['expectedAbstentionMatched'])
        self.assertFalse(scored['evidenceGrammarValid'])

    def test_noncanonical_refusal_retains_decision_but_fails_syntax(self):
        for evidence in ('insufficient because no vote appears.', 'INSUFFICIENT', '"insufficient"'):
            with self.subTest(evidence=evidence):
                scored = metrics.score('EVIDENCE: ' + evidence + '\nNEXT: Could you inspect the minutes for a vote?', row(True))
                self.assertTrue(scored['expectedAbstentionMatched'])
                self.assertFalse(scored['evidenceGrammarValid'])
                self.assertFalse(scored['unsupportedAnswer'])
                self.assertFalse(scored['groundedCasePass'])

    def test_actual_quotation_beginning_insufficient_is_supported_evidence(self):
        case = row()
        case['source'] = 'Insufficient light slowed seedling growth in this recorded trial.'
        case['acceptedQuotes'] = [case['source']]
        scored = metrics.score('EVIDENCE: ' + case['source'] + '\nNEXT: Which words in the memo report the condition?', case)
        self.assertFalse(scored['abstained'])
        self.assertTrue(scored['expectedAbstentionMatched'])
        self.assertTrue(scored['evidenceGrammarValid'])

    def test_arbitrary_answer_cannot_gain_recognized_answerability(self):
        output = 'EVIDENCE: The vote passed unanimously.\nNEXT: Which minutes report the vote?'
        for expected in (False, True):
            scored = metrics.score(output, row(expected))
            self.assertFalse(scored['recognizedAnswerability'])
            self.assertFalse(scored['expectedAbstentionMatched'])
            self.assertFalse(scored['evidenceGrammarValid'])
            self.assertEqual(scored['unsupportedAnswer'], expected)

    def test_irrelevant_exact_quote_cannot_pass_relevance_gate(self):
        cases = [row(False, 'supported'), row(True, 'missing')]
        outputs = ['EVIDENCE: The budget vote is not recorded.\nNEXT: Which words in the memo state the proposal?',
                   'EVIDENCE: insufficient\nNEXT: Could you inspect the minutes for a vote?']
        result = metrics.aggregate([record(c, o) for c, o in zip(cases, outputs)], cases)
        self.assertEqual(result['formalCounts']['correctAnswerability'], 2)
        self.assertEqual(result['formalCounts']['exactQuoteOrWarrantedAbstention'], 1)

    def test_aggregation_rejects_fabricated_diagnostics_and_bad_accounting(self):
        cases = [row(False, 'supported'), row(True, 'missing')]
        outputs = ['EVIDENCE: The memo proposes a shaded shelter.\nNEXT: Which words in the memo express intention?',
                   'EVIDENCE: insufficient\nNEXT: Could you inspect the minutes for a vote?']
        records = [record(c, o) for c, o in zip(cases, outputs)]
        result = metrics.aggregate(records, cases)
        self.assertEqual(result['formalCounts']['exactQuoteOrWarrantedAbstention'], 2)
        self.assertEqual(result['targetTokens'], 10)
        for field, value in (('diagnostics', {}), ('targetTokenLoss', True), ('targetTokenLoss', float('nan')),
                             ('targetTokens', True), ('targetTokens', 0), ('id', 'different')):
            bad = deepcopy(records)
            bad[0][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                metrics.aggregate(bad, cases)
        with self.assertRaises(ValueError):
            metrics.aggregate(records, [cases[0], cases[0]])

    def test_thresholds_remain_46_of_48_and_zero_unsupported(self):
        base = {'cases': 48, 'metricsVersion': metrics.METRICS_VERSION, 'targetTokenLoss': 3.0,
            'formalCounts': {'correctAnswerability': 46, 'exactQuoteOrWarrantedAbstention': 46,
                             'twoLinesAndOneQuestion': 46, 'unsupportedAnswer': 0}}
        self.assertTrue(all(metrics.gates(base, deepcopy(base)).values()))
        for name in ('correctAnswerability', 'exactQuoteOrWarrantedAbstention', 'twoLinesAndOneQuestion'):
            changed = deepcopy(base)
            changed['formalCounts'][name] = 45
            self.assertFalse(all(metrics.gates(base, changed).values()))
        changed = deepcopy(base)
        changed['formalCounts']['unsupportedAnswer'] = 1
        self.assertFalse(all(metrics.gates(base, changed).values()))
        changed = deepcopy(base)
        changed['metricsVersion'] = 'legacy'
        with self.assertRaises(ValueError):
            metrics.gates(base, changed)


if __name__ == '__main__':
    unittest.main()
