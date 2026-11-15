import copy
import unittest

from grounding_review_v3 import DIMENSIONS, build_packet, digest
from grounding_adjudication import prepare, assess


class AdjudicationTests(unittest.TestCase):
    def fixture(self):
        rows = [{'id': 'a', 'source': 'A described observation.', 'question': 'What evidence?', 'expectedAbstention': False}]
        outputs = [{'id': 'a', 'output': 'An original synthetic output.'}]
        packet, key = build_packet(rows, outputs, outputs, 'a'*64, 'validation', 1)
        ratings = [{'id': 'a', 'arm': arm, 'caseHash': packet['cases'][0]['caseHash'],
                    'responseHash': digest(outputs[0]['output']), **{name: True for name in DIMENSIONS},
                    'notes': 'Fixture only, not model quality evidence.'} for arm in ('A', 'B')]
        first = {'packetHash': digest(packet), 'reviewerId': 'one', 'reviewerKind': 'ai', 'ratings': ratings}
        second = copy.deepcopy(first)
        second['reviewerId'] = 'two'
        # Agreed source failure must remain a failure regardless of adjudication.
        first['ratings'][0]['sourceSupported'] = False
        second['ratings'][0]['sourceSupported'] = False
        second['ratings'][0]['usefulNextStep'] = False
        disputes, _ = prepare(packet, key, first, second)
        case = disputes['disputes'][0]
        adjudication = {'disputePacketHash': digest(disputes), 'reviewerId': 'third', 'reviewerKind': 'ai',
                        'ratings': [{name: case[name] for name in ('id', 'arm', 'caseHash', 'responseHash')}]}
        adjudication['ratings'][0].update({'decisions': {'usefulNextStep': True}, 'notes': 'Independent fixture explanation of this disagreement.'})
        return packet, key, first, second, disputes, adjudication

    def test_agreed_failure_preserved_and_original_reviews_retained(self):
        result = assess(*self.fixture())
        row = next(row for row in result['finalRatings'] if row['arm'] == 'A')
        self.assertFalse(row['sourceSupported'])
        self.assertTrue(row['usefulNextStep'])
        self.assertEqual(len(result['originalReviews']), 2)
        self.assertFalse(result['productionEligible'])
        self.assertFalse(result['reviewerIndependenceVerifiedBySoftware'])

    def test_cannot_override_agreement_or_skip_dispute(self):
        for mode in ('override', 'missing', 'extra', 'duplicate', 'boolean'):
            values = self.fixture()
            ratings = values[-1]['ratings']
            if mode == 'override': ratings[0]['decisions']['sourceSupported'] = True
            if mode == 'missing': ratings.clear()
            if mode == 'extra': ratings.append({**ratings[0], 'arm': 'B'})
            if mode == 'duplicate': ratings.append(copy.deepcopy(ratings[0]))
            if mode == 'boolean': ratings[0]['decisions']['usefulNextStep'] = 1
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                assess(*values)

    def test_different_dimension_failures_cannot_reverse_joint_case_rejection(self):
        packet, key, first, second, _, _ = self.fixture()
        second['ratings'][0]['sourceSupported'] = True
        disputes, _ = prepare(packet, key, first, second)
        row = disputes['disputes'][0]
        judgment = {'disputePacketHash': digest(disputes), 'reviewerId': 'third', 'reviewerKind': 'ai',
                    'ratings': [{k: row[k] for k in ('id', 'arm', 'caseHash', 'responseHash')}]}
        judgment['ratings'][0].update({'decisions': {d: True for d in row['dimensions']},
                                      'notes': 'Fixture attempts to reverse both original case failures.'})
        with self.assertRaisesRegex(ValueError, 'case-level failure'):
            assess(packet, key, first, second, disputes, judgment)

    def test_changed_evidence_ratings_or_response_binding_rejected(self):
        for mode in ('evidence', 'review', 'hash', 'response'):
            values = self.fixture()
            if mode == 'evidence': values[-2]['disputes'][0]['source'] = 'Changed source'
            if mode == 'review': values[2]['ratings'][0]['notes'] = 'Changed after packet was saved'
            if mode == 'hash': values[-1]['disputePacketHash'] = 'b'*64
            if mode == 'response': values[-1]['ratings'][0]['responseHash'] = 'b'*64
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                assess(*values)

    def test_distinct_reviewer_and_adjudicator_ids_required(self):
        values = self.fixture()
        values[3]['reviewerId'] = values[2]['reviewerId']
        with self.assertRaises(ValueError): prepare(*values[:4])
        values = self.fixture()
        values[-1]['reviewerId'] = 'one'
        with self.assertRaises(ValueError): assess(*values)

    def test_dispute_packet_contains_no_model_arm_key_or_summary_rates(self):
        dispute = self.fixture()[-2]
        self.assertNotIn('arms', dispute)
        self.assertNotIn('originalReviews', dispute)
        self.assertNotIn('operatorKey', dispute)
        self.assertEqual(dispute['disputes'][0]['dimensions'], ['usefulNextStep'])


if __name__ == '__main__':
    unittest.main()
