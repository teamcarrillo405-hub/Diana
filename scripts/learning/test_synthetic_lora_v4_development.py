import unittest
from synthetic_lora_v3_data import datasets as v3_datasets
from synthetic_lora_v4_development import datasets
from train_synthetic_lora_v4 import validate_partitions, SETTINGS


class V4DevelopmentContracts(unittest.TestCase):
    def test_balanced_combination_and_target_contract(self):
        train, validation = datasets()
        validate_partitions(train,validation)
        self.assertEqual((len(train),len(validation)),(440,48))
        self.assertEqual(sum(row['expectedAbstention'] for row in train),220)

    def test_scope_correction_is_explicit_and_original_unchanged(self):
        original=v3_datasets()[0]
        combined=datasets()[0]
        before=[r for r in original if r['family']=='train-v3-topic-6']
        after=[r for r in combined if r['family']=='train-v3-topic-6']
        self.assertEqual(len(after),8)
        self.assertTrue(all('An exponent tells' in r['source'] for r in before))
        self.assertTrue(all('A positive integer exponent tells' in r['source'] for r in after))

    def test_only_three_preaudited_validation_alternatives_added(self):
        before=v3_datasets()[1]
        after=datasets()[1]
        differences=[]
        for left,right in zip(before,after,strict=True):
            for key in left:
                if left[key]!=right[key]:
                    self.assertEqual(key,'acceptedQuotes')
                    differences.append(left['id'])
        self.assertEqual(sorted(differences),sorted(['validation-v3-13-present','validation-v3-7-present','validation-v3-10-present']))

    def test_continuation_budget_fixed(self):
        self.assertEqual(SETTINGS['epochs'],2)
        self.assertEqual(SETTINGS['learningRate'],.0001)
        self.assertEqual(SETTINGS['groundedAccuracyThreshold'],.95)
        self.assertEqual(440%SETTINGS['gradientAccumulation'],0)


if __name__=='__main__':
    unittest.main()
