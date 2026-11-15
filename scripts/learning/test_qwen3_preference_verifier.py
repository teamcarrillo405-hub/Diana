"""Adversarial verification fixtures. No inference or final-case imports."""
from copy import deepcopy
import json
import math
from pathlib import Path
import random
import tempfile
import unittest

import verify_qwen3_preference as verify


class PreferenceVerifierTests(unittest.TestCase):
    @staticmethod
    def sequence(rejected=False):
        target = [5, 6, 7] if rejected else [3, 4]
        return {'prefix': [1, 2], 'full': [1, 2] + target,
                'labels': [-100, -100] + target, 'targetTokens': len(target)}

    def fixture(self):
        train = [{'id': f'pair-{i}'} for i in range(200)]
        pairs = [{'id': row['id'], 'chosen': self.sequence(), 'rejected': self.sequence(True)} for row in train]
        encoded = [self.sequence() for _ in range(248)]
        records = [{'id': row['id'], 'chosenTokens': 2, 'rejectedTokens': 3,
                    'chosenTokenLogps': [-1., -2.], 'chosenSumLogp': -3.,
                    'rejectedTokenLogps': [-2., -3., -4.], 'rejectedSumLogp': -9.} for row in train]
        cache = {'schema': 'diana-qwen3-frozen-preference-reference-v1', 'parentAdapterSha256': 'a' * 64,
                 'protocolSha256': 'b' * 64, 'pairTokenizationSha256': verify.canonical(pairs),
                 'systemSha256': verify.SYSTEM_HASH, 'createdBeforeOptimizer': True, 'pairs': records}
        history = []
        seen = 0
        for epoch in (1, 2):
            order = list(range(200))
            random.Random(71313 + epoch).shuffle(order)
            for start in range(0, 200, 4):
                examples = []
                for index in order[start:start + 4]:
                    example = deepcopy(records[index])
                    # Unequal response lengths catch sequence-mean DPO substitutions.
                    example.update(referenceChosenSumLogp=-3., referenceRejectedSumLogp=-9.)
                    terms = verify.objective(-3., -9., -3., -9., 2)
                    example.update(terms, tensorCombinedLoss=terms['combinedLoss'],
                                   tensorDPOLoss=terms['dpoLoss'], tensorChosenTokenMeanCE=terms['chosenTokenMeanCE'])
                    examples.append(example)
                seen += 4
                history.append({'epoch': epoch, 'optimizerStep': len(history) + 1, 'gradientNorm': 1.,
                    'examples': examples, 'examplesSeen': seen, 'targetTokensSeen': seen * 2,
                    'rejectedTargetTokensSeen': seen * 3, 'referenceCacheSha256': 'c' * 64})
        return train, pairs, encoded, cache, history

    def test_cross_host_parent_identity_and_strict_paths(self):
        windows = r'C:\Users\test\research\qwen3-run-007'
        wsl = '/mnt/c/Users/test/research/qwen3-run-007'
        verify.check_parent_path(windows, wsl)
        verify.check_parent_path(wsl, windows)
        verify.check_parent_path('/home/test/qwen3-run-007', '/home/test/qwen3-run-007')
        for path in ('research/qwen3-run-007', 'C:research/qwen3-run-007',
                     '/mnt/c/Users/test/../research/qwen3-run-007',
                     '/mnt/c//Users/test/research/qwen3-run-007',
                     '/mnt/d/Users/test/research/qwen3-run-007',
                     '/mnt/c/Users/other/research/qwen3-run-007',
                     '//server/share/qwen3-run-007', '/mnt/c/Users/test/research/qwen3-run-006'):
            with self.subTest(path=path), self.assertRaises(ValueError):
                verify.check_parent_path(path, windows)

    def test_data_balance_and_disjointness(self):
        from qwen3_preference_data_a import rows as rows_a
        from qwen3_preference_data_b import rows as rows_b
        rows = rows_a() + rows_b()
        verify.check_training(rows, [])
        for key, value in (('id', rows[1]['id']), ('question', rows[1]['question']),
                           ('source', rows[2]['source']), ('subject', 'unapproved'),
                           ('expectedAbstention', 1), ('preferenceCategory', 'other'),
                           ('target', 'EVIDENCE: invented\nNEXT: What now?'), ('rejected', rows[0]['target'])):
            changed = deepcopy(rows)
            changed[0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                verify.check_training(changed, [])
        with self.assertRaises(ValueError):
            verify.check_training(rows, [{'id': 'new', 'source': rows[0]['source']}])
        with self.assertRaises(ValueError):
            verify.check_training(rows, [{'id': rows[0]['id'], 'source': 'unrelated'}])

    def test_mask_count_prefix_and_budget_tampering(self):
        train, pairs, encoded, _, _ = self.fixture()
        self.assertEqual(verify.check_tokenization(encoded, pairs, train, [{}] * 48), (800, 1200))
        for key, value in (('labels', [1, 2, 3, 4]), ('labels', [-100, -100, True, 4]),
                           ('targetTokens', 3), ('targetTokens', True),
                           ('prefix', [1, 2, 3, 4]), ('full', [1, 2, 151936, 4])):
            changed = deepcopy(encoded)
            changed[0][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                verify.check_tokenization(changed, pairs, train, [{}] * 48)
        changed = deepcopy(pairs)
        changed[0]['rejected']['prefix'] = [9, 2]
        changed[0]['rejected']['full'][:2] = [9, 2]
        with self.assertRaises(ValueError):
            verify.check_tokenization(encoded, changed, train, [{}] * 48)
        with self.assertRaises(ValueError):
            verify.check_sequence({'prefix': [1] * 641, 'full': [1] * 642,
                'labels': [-100] * 641 + [1], 'targetTokens': 1})

    def test_encoder_never_places_targets_in_generation_messages(self):
        class Tokenizer:
            def __init__(self): self.calls = []
            def apply_chat_template(self, messages, **kwargs):
                self.calls.append((deepcopy(messages), kwargs))
                return [1, 2] if kwargs['add_generation_prompt'] else [1, 2, 3, 4]
        tokenizer = Tokenizer()
        row = {'source': 'source datum', 'question': 'source question', 'target': 'secret target'}
        self.assertEqual(verify.encode(tokenizer, row, 'system'), self.sequence())
        messages, options = tokenizer.calls[0]
        self.assertEqual([m['role'] for m in messages], ['system', 'user'])
        self.assertEqual(messages[1]['content'], 'SOURCE: source datum\nQUESTION: source question')
        self.assertNotIn('secret target', json.dumps(messages))
        self.assertTrue(options['add_generation_prompt'])
        self.assertEqual(tokenizer.calls[1][0][-1], {'role': 'assistant', 'content': 'secret target'})

    def test_reference_cache_per_token_sums_and_all_bindings(self):
        _, pairs, _, cache, _ = self.fixture()
        self.assertEqual(len(verify.check_reference(cache, pairs, 'a' * 64, 'b' * 64)), 200)
        for key in ('schema', 'parentAdapterSha256', 'protocolSha256', 'pairTokenizationSha256', 'systemSha256', 'createdBeforeOptimizer'):
            changed = deepcopy(cache)
            changed[key] = False
            with self.subTest(key=key), self.assertRaises(ValueError):
                verify.check_reference(changed, pairs, 'a' * 64, 'b' * 64)
        for key, value in (('id', 'different'), ('chosenTokens', 3), ('chosenSumLogp', -4.),
                           ('chosenTokenLogps', [-1., 1.]), ('rejectedTokenLogps', [-2., -3., float('nan')]),
                           ('rejectedTokenLogps', [-2., -3.]), ('chosenSumLogp', True)):
            changed = deepcopy(cache)
            changed['pairs'][0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                verify.check_reference(changed, pairs, 'a' * 64, 'b' * 64)

    def test_objective_sequence_sum_dpo_and_mean_chosen_ce(self):
        terms = verify.objective(-5., -6., -5., -6., 4)
        self.assertAlmostEqual(terms['dpoLoss'], math.log(2))
        self.assertAlmostEqual(terms['chosenTokenMeanCE'], 1.25)
        self.assertAlmostEqual(terms['combinedLoss'], math.log(2) + .25)
        better = verify.objective(-4., -7., -5., -6., 4)
        self.assertAlmostEqual(better['preferenceMargin'], 2.)
        self.assertLess(better['combinedLoss'], terms['combinedLoss'])
        huge = verify.objective(-1., -100001., -1., -1., 2)
        self.assertTrue(math.isfinite(huge['combinedLoss']))
        for invalid in (True, float('inf'), .1):
            with self.assertRaises(ValueError): verify.objective(invalid, -2., -3., -4., 2)

    def test_history_exact100_updates400_presentations_and_objective_math(self):
        train, pairs, _, cache, history = self.fixture()
        self.assertEqual(verify.check_history(history, train, pairs, cache['pairs'], 'c' * 64), (800, 1200))
        for key, value in (('referenceCacheSha256', 'd' * 64), ('optimizerStep', 2), ('epoch', 2),
                           ('examplesSeen', 3), ('targetTokensSeen', 7), ('rejectedTargetTokensSeen', 11),
                           ('gradientNorm', float('inf'))):
            changed = deepcopy(history)
            changed[0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                verify.check_history(changed, train, pairs, cache['pairs'], 'c' * 64)
        for key, value in (('id', 'other'), ('chosenTokens', 3), ('referenceChosenSumLogp', -4.),
                           ('referenceRejectedSumLogp', -10.), ('chosenSumLogp', -2.),
                           ('chosenTokenLogps', [-1., -1.]), ('preferenceMargin', 1.),
                           ('scaledPreferenceMargin', 1.), ('dpoLoss', .5), ('combinedLoss', 1.),
                           ('chosenTokenMeanCE', 2.), ('tensorCombinedLoss', 1.),
                           ('tensorDPOLoss', 1.), ('tensorChosenTokenMeanCE', 1.)):
            changed = deepcopy(history)
            changed[0]['examples'][0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                verify.check_history(changed, train, pairs, cache['pairs'], 'c' * 64)
        with self.assertRaises(ValueError):
            verify.check_history(history[:-1], train, pairs, cache['pairs'], 'c' * 64)
        changed = deepcopy(history)
        changed[0]['examples'].pop()
        with self.assertRaises(ValueError):
            verify.check_history(changed, train, pairs, cache['pairs'], 'c' * 64)

    def audit_fixture(self, root):
        train = [{'id': f'pair-{i}', 'datum': i} for i in range(200)]
        (root / 'source').mkdir()
        for name in verify.DATA_MODULES:
            (root / 'source' / name).write_text('synthetic source', encoding='utf-8')
        (root / 'audit-evidence').mkdir()
        audit = {'schema': 'diana-qwen3-preference-audit-v1', 'approvedForTraining': True,
            'independentReviewer': True, 'educatorReviewed': False, 'unresolvedFindings': [],
            'trainingCanonicalSha256': verify.canonical(train),
            'sourceSha256': {n: verify.digest(root / 'source' / n) for n in verify.DATA_MODULES},
            'caseReviews': [{'id': r['id'], 'passed': True, 'chosenPass': True, 'rejectedIsInferior': True,
                'pairHash': verify.canonical(r), 'notes': 'Concrete synthetic test rationale for this pair.'} for r in train],
            'evidenceFiles': {}}
        manifest = {}
        for i, module in enumerate(sorted(verify.DATA_MODULES)):
            proof = {'reviewerId': f'independent-{i}', 'approvedForTraining': True,
                'independentReviewer': True, 'educatorReviewed': False, 'unresolvedFindings': [],
                'sourceSha256': audit['sourceSha256'][module],
                'canonicalRowsSha256': verify.canonical(train[i * 100:(i + 1) * 100]),
                'caseReviews': deepcopy(audit['caseReviews'][i * 100:(i + 1) * 100])}
            path = root / f'audit-evidence/{i}-review-{i}.json'
            path.write_text(json.dumps(proof), encoding='utf-8')
            sha = verify.digest(path)
            original = f'/approved/review-{i}.json'
            audit['evidenceFiles'][original] = sha
            manifest[f'audit-evidence/{i}-review-{i}.json'] = {'originalPath': original, 'sha256': sha}
        (root / 'audit-evidence-manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
        return train, audit

    def test_audit_full_pair_binding_and_copied_evidence(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            train, audit = self.audit_fixture(root)
            verify.check_audit(root, audit, train)
            for mutation in ('approval', 'independence', 'educator', 'unresolved', 'data', 'source', 'duplicate',
                             'pairHash', 'notes', 'chosenPass', 'rejectedIsInferior', 'passed', 'evidence'):
                changed = deepcopy(audit)
                if mutation == 'approval': changed['approvedForTraining'] = False
                if mutation == 'independence': changed['independentReviewer'] = False
                if mutation == 'educator': changed['educatorReviewed'] = True
                if mutation == 'unresolved': changed['unresolvedFindings'] = ['open issue']
                if mutation == 'data': changed['trainingCanonicalSha256'] = '0' * 64
                if mutation == 'source': changed['sourceSha256'] = {}
                if mutation == 'duplicate': changed['caseReviews'][0] = changed['caseReviews'][1]
                if mutation == 'pairHash': changed['caseReviews'][0]['pairHash'] = '0' * 64
                if mutation == 'notes': changed['caseReviews'][0]['notes'] = 'ok'
                if mutation in ('chosenPass', 'rejectedIsInferior', 'passed'): changed['caseReviews'][0][mutation] = False
                if mutation == 'evidence': changed['evidenceFiles'] = {}
                with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                    verify.check_audit(root, changed, train)
            (root / 'audit-evidence/0-review-0.json').write_text('{}', encoding='utf-8')
            with self.assertRaises(ValueError): verify.check_audit(root, audit, train)

    def test_rehashed_independent_audit_cannot_hide_changed_review(self):
        for mutation in ('reviewer', 'coverage', 'source', 'canonical', 'pairHash', 'notes', 'approval'):
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                train, audit = self.audit_fixture(root)
                path = root / 'audit-evidence/1-review-1.json'
                proof = json.loads(path.read_text())
                if mutation == 'reviewer': proof['reviewerId'] = 'independent-0'
                if mutation == 'coverage': proof['caseReviews'][0] = proof['caseReviews'][1]
                if mutation == 'source': proof['sourceSha256'] = '0' * 64
                if mutation == 'canonical': proof['canonicalRowsSha256'] = '0' * 64
                if mutation == 'pairHash': proof['caseReviews'][0]['pairHash'] = '0' * 64
                if mutation == 'notes': proof['caseReviews'][0]['notes'] = 'ok'
                if mutation == 'approval': proof['approvedForTraining'] = False
                path.write_text(json.dumps(proof), encoding='utf-8')
                sha = verify.digest(path)
                audit['evidenceFiles']['/approved/review-1.json'] = sha
                manifest_path = root / 'audit-evidence-manifest.json'
                manifest = json.loads(manifest_path.read_text())
                manifest['audit-evidence/1-review-1.json']['sha256'] = sha
                manifest_path.write_text(json.dumps(manifest), encoding='utf-8')
                with self.assertRaises(ValueError): verify.check_audit(root, audit, train)

    def test_objective_qualification_rechecks_numerics_and_boundaries(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'source').mkdir()
            (root / 'source/train_qwen3_preference.py').write_text('fixture', encoding='utf-8')
            (root / 'environment-contract.json').write_text('{}', encoding='utf-8')
            terms = verify.objective(-4., -5., -4., -5., 4)
            proof = {'schema': 'diana-qwen3-dpo-objective-qualification-v1', 'status': 'qualified',
                'sourceSha256': verify.digest(root / 'source/train_qwen3_preference.py'),
                'settingsSha256': verify.canonical(verify.SETTINGS), 'environment': {},
                'environmentSha256': verify.canonical({}), 'runtimeContractSha256': verify.digest(root / 'environment-contract.json'),
                'randomTinyModelOnly': True, 'initialDPOLossEqualsLog2': True, 'finiteGradients': True,
                'gradientDirectionPassed': True, 'referenceUnchanged': True,
                'realModelOrTrainingDataLoaded': False, 'productionEligible': False,
                'trainableTensors': 16, 'changedTensors': 16, 'referenceSha256': 'd' * 64,
                'events': [{'step': i, 'gradientNorm': 1., **terms} for i in (1, 2)]}
            verify.check_objective_qualification(root, proof, {})
            for mutation in ('source', 'environment', 'changed', 'events', 'math', 'realModel', 'production'):
                changed = deepcopy(proof)
                if mutation == 'source': changed['sourceSha256'] = '0' * 64
                if mutation == 'environment': changed['environment'] = {'altered': True}
                if mutation == 'changed': changed['changedTensors'] = 15
                if mutation == 'events': changed['events'].pop()
                if mutation == 'math': changed['events'][1]['combinedLoss'] += 1
                if mutation == 'realModel': changed['realModelOrTrainingDataLoaded'] = True
                if mutation == 'production': changed['productionEligible'] = True
                with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                    verify.check_objective_qualification(root, changed, {})

    def test_only_epoch_two_no_fallback_and_no_semantic_acceptance(self):
        first = {'epoch': 1, 'gates': {'formal': True}}
        second = {'epoch': 2, 'gates': {'formal': False}}
        self.assertIsNone(verify.select_candidate([first, second]))
        second['gates']['formal'] = True
        self.assertIs(verify.select_candidate([first, second]), second)
        with self.assertRaises(ValueError): verify.select_candidate([first])
        record = {'productionEligible': False, 'testOpened': False, 'testEvaluations': 0,
                  'semanticQualityValidated': False, 'validationPassed': False}
        verify.boundaries(record, validation=True)
        for key in record:
            with self.subTest(key=key), self.assertRaises(ValueError):
                verify.boundaries({**record, key: True}, validation=True)

    def test_fixed_recipe_matches_frozen_runner_contract(self):
        import train_qwen3_preference as runner
        self.assertEqual(verify.SETTINGS, runner.SETTINGS)
        self.assertEqual(verify.SOURCES, set(runner.SOURCE_FILES))
        self.assertEqual(verify.SYSTEM_HASH, runner.SYSTEM_HASH)


if __name__ == '__main__':
    unittest.main()
