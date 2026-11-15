import unittest
from synthetic_lora_v3_data import datasets
from train_synthetic_lora_v3 import score, gates, validate_partitions, SETTINGS


class V3Contracts(unittest.TestCase):
    def test_balanced_partitioned_valid_targets(self):
        train, validation = datasets()
        validate_partitions(train, validation)
        self.assertEqual((len(train),len(validation)),(240,48))
        self.assertEqual(len({r['family'] for r in train}),30)
        self.assertEqual(len({r['family'] for r in validation}),24)

    def test_source_substring_is_not_enough(self):
        row=datasets()[0][0]
        self.assertFalse(score('EVIDENCE: The worksheet is printed on plain paper.\nNEXT: Which side would you change?',row)['groundedCasePass'])

    def test_abstention_and_fabrication_rejected(self):
        row=datasets()[0][0]
        self.assertFalse(score('EVIDENCE: insufficient\nNEXT: Which side matters?',row)['groundedCasePass'])
        self.assertFalse(score('EVIDENCE: Adding different numbers preserves equality\nNEXT: Which side matters?',row)['groundedCasePass'])

    def test_question_must_be_specific_and_single(self):
        row=datasets()[0][0]
        quote=row['acceptedQuotes'][0]
        for question in ('What do you think?','Which side? Which number?','Which side.'):
            self.assertFalse(score(f'EVIDENCE: {quote}\nNEXT: {question}',row)['groundedCasePass'])

    def test95_required_with_nonregression(self):
        base={'targetTokenLoss':1.,'cases':100,'counts':{'falseAbstention':0,'unsupportedAnswer':40,'groundedCasePass':1}}
        def candidate(count,false=0):
            return {'targetTokenLoss':.5,'cases':100,'counts':{'falseAbstention':false,'unsupportedAnswer':0,'groundedCasePass':count}}
        self.assertFalse(all(gates(base,candidate(94)).values()))
        self.assertTrue(all(gates(base,candidate(95)).values()))
        self.assertFalse(all(gates(base,candidate(99,1)).values()))
        self.assertEqual(SETTINGS['groundedAccuracyThreshold'],.95)


if __name__=='__main__':
    unittest.main()
