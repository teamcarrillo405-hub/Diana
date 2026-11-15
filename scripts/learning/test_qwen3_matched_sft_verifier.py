"""Adversarial chosen-only verifier tests; no inference or final-case access."""
from copy import deepcopy
from contextlib import ExitStack
import ast
import json
from pathlib import Path
import random
import unittest
from unittest.mock import patch

import verify_qwen3_matched_sft as v
import test_qwen3_evidence_integrity_verifier as prior_tests
from test_qwen3_evidence_integrity import fixture_directory


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, sort_keys=True, allow_nan=False), encoding='utf-8')


class MatchedVerifierTests(unittest.TestCase):
    @staticmethod
    def sequence():
        return {'prefix': [1, 2], 'full': [1, 2, 3, 4],
                'labels': [-100, -100, 3, 4], 'targetTokens': 2}

    @staticmethod
    def example(identity=None):
        item = {'chosenSumLogp': -3., 'chosenTokens': 2, 'chosenTokenLogps': [-1., -2.],
            'chosenTokenMeanCE': 1.5, 'combinedLoss': .75,
            'tensorCombinedLoss': .75, 'tensorChosenTokenMeanCE': 1.5}
        if identity is not None:
            item['id'] = identity
        return item

    def fixture(self):
        train = [{'id': f'chosen-{i}'} for i in range(300)]
        encoded = [self.sequence() for _ in range(348)]
        history = []
        for epoch in (1, 2, 3):
            order = list(range(300))
            random.Random(81173 + epoch).shuffle(order)
            for start in range(0, 300, 4):
                step = len(history) + 1
                history.append({'epoch': epoch, 'optimizerStep': step, 'gradientNorm': .8,
                    'examples': [self.example(train[i]['id']) for i in order[start:start + 4]],
                    'examplesSeen': step * 4, 'targetTokensSeen': step * 8,
                    'rejectedTargetTokensSeen': 0})
        return train, encoded, history

    def test_exact_half_chosen_mean_and_invalid_inputs(self):
        self.assertEqual(v.objective(-9., 3), {'chosenTokenMeanCE': 3., 'combinedLoss': 1.5})
        for chosen, tokens in ((1, 2), (True, 2), (float('nan'), 2),
                               (-1, True), (-1, 0), (-1, -1), (-1, 2.0)):
            with self.subTest(chosen=chosen, tokens=tokens), self.assertRaises(ValueError):
                v.objective(chosen, tokens)

    def test_full_deterministic_225_updates_and_900_presentations(self):
        train, encoded, history = self.fixture()
        self.assertEqual(v.check_tokenization(encoded, train, [{}] * 48), 1800)
        self.assertEqual(v.check_history(history, train, encoded), 1800)

    def test_token_mask_count_prefix_and_truncation(self):
        train, encoded, _ = self.fixture()
        for key, value in (('labels', [1, 2, 3, 4]), ('labels', [-100, -100, True, 4]),
                           ('targetTokens', True), ('targetTokens', 3),
                           ('prefix', [9, 2]), ('full', [1, 2, -1, 4])):
            changed = deepcopy(encoded)
            changed[0][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                v.check_tokenization(changed, train, [{}] * 48)
        for count in (347, 349):
            with self.assertRaises(ValueError):
                v.check_tokenization([self.sequence()] * count, train, [{}] * 48)
        item = {'prefix': [1] * 650, 'full': [1] * 650 + [2],
                'labels': [-100] * 650 + [2], 'targetTokens': 1}
        with self.assertRaises(ValueError):
            v.check_sequence(item)

    def test_history_mutations_rejected_even_when_cumulative_counts_plausible(self):
        train, encoded, history = self.fixture()
        mutations = {
            'order': lambda h: h[0]['examples'].reverse(),
            'step': lambda h: h[0].update(optimizerStep=True),
            'epoch': lambda h: h[0].update(epoch=2),
            'missingUpdate': lambda h: h.pop(),
            'extraUpdate': lambda h: h.append(deepcopy(h[-1])),
            'accumulation': lambda h: h[0]['examples'].pop(),
            'presentationTotal': lambda h: h[-1].update(examplesSeen=899),
            'tokenTotal': lambda h: h[-1].update(targetTokensSeen=1799),
            'rejectedTokens': lambda h: h[0].update(rejectedTargetTokensSeen=1),
            'boolRejectedCount': lambda h: h[0].update(rejectedTargetTokensSeen=False),
            'gradientNaN': lambda h: h[0].update(gradientNorm=float('nan')),
            'referenceField': lambda h: h[0].update(referenceCacheSha256='a' * 64),
        }
        for label, change in mutations.items():
            altered = deepcopy(history)
            change(altered)
            with self.subTest(label=label), self.assertRaises(ValueError):
                v.check_history(altered, train, encoded)

    def test_dpo_reference_and_rejected_terms_are_not_accepted(self):
        for field in ('dpoLoss', 'tensorDPOLoss', 'rejectedSumLogp', 'rejectedTokens',
                      'referenceChosenSumLogp', 'referenceRejectedSumLogp', 'preferenceMargin'):
            with self.subTest(field=field), self.assertRaises(ValueError):
                v.check_example({**self.example('x'), field: 0}, 2)

    def test_per_token_sums_and_scalar_tensor_losses(self):
        for field, value in (('chosenTokens', 3), ('chosenTokenLogps', [-1., -1.]),
                ('chosenTokenLogps', [-1., float('-inf')]), ('chosenSumLogp', -4.),
                ('combinedLoss', 1.5), ('chosenTokenMeanCE', 3.),
                ('tensorCombinedLoss', 1.5), ('tensorChosenTokenMeanCE', 3.)):
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                v.check_example({**self.example('x'), field: value}, 2)

    def qualification_fixture(self, directory):
        root = directory / 'run'
        root.mkdir()
        approved = Path(__file__).resolve().parents[2] / 'artifacts/learning-engine/research/qwen3-runtime/reviewed-environment-contract.json'
        runtime = directory / 'qwen3-runtime'
        runtime.mkdir()
        (runtime / 'reviewed-environment-contract.json').write_bytes(approved.read_bytes())
        (root / 'environment-contract.json').write_bytes(approved.read_bytes())
        (root / 'source').mkdir()
        (root / 'source/train_qwen3_matched_sft.py').write_text('synthetic qualification fixture')
        proof = {'schema': 'diana-qwen3-matched-sft-objective-qualification-v1', 'status': 'qualified',
            'sourceSha256': v.digest(root / 'source/train_qwen3_matched_sft.py'),
            'settingsSha256': v.canonical(v.SETTINGS), 'environment': {}, 'environmentSha256': v.canonical({}),
            'runtimeContractSha256': v.digest(root / 'environment-contract.json'),
            'randomTinyModelOnly': True, 'realModelOrTrainingDataLoaded': False,
            'targetOnlyMasking': True, 'finiteGradients': True, 'gradientDirectionPassed': True,
            'trainableTensors': 16, 'changedTensors': 16,
            'fixture': {'prefix': [1, 3, 4, 5, 6, 7], 'full': [1, 3, 4, 5, 6, 7, 9, 10, 11, 2],
                        'labels': [-100] * 6 + [9, 10, 11, 2], 'targetTokens': 4},
            'events': [{**self.example(), 'chosenSumLogp': -6., 'chosenTokens': 4,
                       'chosenTokenLogps': [-1., -2., -1., -2.], 'step': i, 'gradientNorm': .5} for i in (1, 2)],
            'productionEligible': False}
        return root, proof

    def test_qualification_reconstructs_mask_numerics_and_bindings(self):
        with fixture_directory() as directory:
            root, proof = self.qualification_fixture(Path(directory))
            v.check_objective_qualification(root, proof, {})
            for key, value in (('sourceSha256', '0' * 64), ('settingsSha256', '0' * 64),
                    ('runtimeContractSha256', '0' * 64), ('environment', {'changed': True}),
                    ('changedTensors', 15), ('realModelOrTrainingDataLoaded', True),
                    ('targetOnlyMasking', False), ('productionEligible', True), ('events', [])):
                with self.subTest(key=key), self.assertRaises(ValueError):
                    v.check_objective_qualification(root, {**proof, key: value}, {})
            for mutate in (lambda p: p['fixture']['labels'].__setitem__(0, 1),
                           lambda p: p['events'][1].update(tensorCombinedLoss=.9),
                           lambda p: p['events'][0].update(chosenTokenLogps=[-2., -2.])):
                changed = deepcopy(proof)
                mutate(changed)
                with self.assertRaises(ValueError):
                    v.check_objective_qualification(root, changed, {})
            # Semantically identical JSON is insufficient: original raw bytes bind.
            contract = root / 'environment-contract.json'
            write(contract, v.read(contract))
            changed = {**proof, 'runtimeContractSha256': v.digest(contract)}
            with self.assertRaises(ValueError):
                v.check_objective_qualification(root, changed, {})

    def test_loss_recovery_is_separate_and_uses_both_slices(self):
        _, _, history = self.fixture()
        def metric(all_loss):
            return {'targetTokenLoss': all_loss, 'slices': {
                'supported': {'targetTokenLoss': all_loss + .1},
                'insufficient': {'targetTokenLoss': all_loss - .1}}}
        result = v.loss_recovery(history, metric(1.7), metric(3.88), metric(2.0))
        self.assertFalse(result['fullParentLossRecovery'])
        self.assertTrue(result['improvedOverComparator'])
        self.assertTrue(result['doesNotAlterEligibility'])
        self.assertEqual(result['trainingCEByEpoch'][2], {
            'epoch': 3, 'chosenTokenMeanCE': 1.5, 'chosenTokenWeightedCE': 1.5})
        self.assertEqual(set(result['developmentCE']['epoch3']), {'all', 'supported', 'insufficient'})
        self.assertTrue(v.loss_recovery(history, metric(1.7), metric(3.88), metric(1.7))['fullParentLossRecovery'])
        self.assertFalse(v.loss_recovery(history, metric(1.7), metric(3.88), metric(3.88))['improvedOverComparator'])

    def test_matched_reproduction_requires_raw_strings_and_tokens(self):
        with fixture_directory() as directory:
            root, sibling = Path(directory) / 'run', Path(directory) / 'comparator'
            records = [{'id': str(i), 'output': 'unchanged', 'generatedTokenIds': [2, 3],
                        'targetTokens': 2} for i in range(48)]
            sibling.mkdir()
            for label in ('baseline-development', 'parent-development'):
                (sibling / (label + '.jsonl')).write_text('\n'.join(json.dumps(r) for r in records))
            write(root / 'matched-baseline-reproduction.json', {'identicalOutputs': True,
                'casesPerBaseline': 48, 'labels': ['baseline-development', 'parent-development'],
                'comparatorReportSha256': v.COMPARATOR_REPORT, 'beforeOptimizer': True})
            v.check_matched_baselines(root, sibling, records, records)
            for key, value in (('output', 'changed'), ('generatedTokenIds', [3, 2]),
                               ('targetTokens', 3), ('id', 'changed')):
                changed = deepcopy(records)
                changed[0][key] = value
                with self.subTest(key=key), self.assertRaises(ValueError):
                    v.check_matched_baselines(root, sibling, changed, records)

    def test_fixed_epoch_and_research_boundaries(self):
        candidates = [{'epoch': i, 'gates': {'pass': i != 3}} for i in (1, 2, 3)]
        self.assertIsNone(v.select_candidate(candidates))
        candidates[2]['gates']['pass'] = True
        self.assertEqual(v.select_candidate(candidates)['epoch'], 3)
        record = {'productionEligible': False, 'testOpened': False, 'testEvaluations': 0,
                  'semanticQualityValidated': False, 'validationPassed': False}
        for key in record:
            with self.subTest(key=key), self.assertRaises(ValueError):
                v.boundaries({**record, key: True}, validation=True)

    def test_exact_300_reuse_and_unchanged_strict_gates(self):
        from qwen3_evidence_integrity_data_a import rows as a
        from qwen3_evidence_integrity_data_b import rows as b
        rows = a() + b()
        v.check_training(rows, [])
        changed = deepcopy(rows)
        changed[0]['preferenceReason'] += ' Added plausible text.'
        with self.assertRaises(ValueError):
            v.check_training(changed, [])
        metric = {'metricsVersion': v.METRICS_VERSION, 'cases': 48, 'targetTokenLoss': 2.,
            'formalCounts': {'correctAnswerability': 46, 'exactQuoteOrWarrantedAbstention': 46,
                             'twoLinesAndOneQuestion': 46, 'unsupportedAnswer': 0}}
        self.assertTrue(all(v.required_gates(metric, metric).values()))
        for value in (45, True, 49):
            changed = deepcopy(metric)
            changed['formalCounts']['correctAnswerability'] = value
            if value == 45:
                self.assertFalse(all(v.required_gates(metric, changed).values()))
            else:
                with self.assertRaises(ValueError):
                    v.required_gates(metric, changed)

    def test_inherits_rehashed_audit_and_actual_ancestry_defenses(self):
        suite = prior_tests.PreferenceVerifierTests()
        suite.test_rehashed_independent_audit_cannot_hide_changed_review()
        suite.test_overlap_receipt_reconstructed_even_after_rehash()
        suite.test_overlap_detects_prior_data_drift_reuse_and_parent_redirection()
        # The matched reader uses the exact immutable ancestor reconstruction.
        self.assertIs(v.check_prior_training_overlap, v.integrity.check_prior_training_overlap)
        self.assertEqual([n for n, _, _ in v.integrity.ANCESTRY],
                         ['qwen3-run-008', 'qwen3-run-007', 'qwen3-run-006'])

    def test_verifier_imports_no_new_runner_or_final_loader(self):
        tree = ast.parse(Path(v.__file__).read_text())
        names = [n.module for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)]
        names += [alias.name for n in ast.walk(tree) if isinstance(n, ast.Import) for alias in n.names]
        self.assertNotIn('train_qwen3_matched_sft', names)
        self.assertFalse(any('final' in name for name in names if name))
        self.assertFalse(any(isinstance(n, ast.Attribute) and n.attr == 'generate' for n in ast.walk(tree)))

    def comparator_fixture(self, directory):
        """Synthetic evidence with fixed trusted hashes established before mutation."""
        root, sibling = directory / 'qwen3-run-new', directory / 'qwen3-run-009'
        root.mkdir()
        sibling.mkdir()
        train = [{'id': f'row-{i}'} for i in range(300)]
        development = [{'id': f'dev-{i}'} for i in range(48)]
        encoded = [self.sequence() for _ in range(348)]
        shared = {'train.json': train, 'development.json': development, 'tokenization.json': encoded,
            'parent-original-tokenization.json': encoded[300:], 'training-audit.json': {},
            'audit-evidence-manifest.json': {}, 'environment-contract.json': {}, 'qualification.json': {},
            'model-provenance.json': {}, 'parent-evidence.json': {}, 'prior-training-overlap.json': {}}
        shared.update({'source/' + name: {'source': name} for name in v.integrity.SOURCES})
        for name, value in shared.items():
            write(root / name, value)
            write(sibling / name, value)
        # Original approval and frozen run 009 use different fixed JSON bytes.
        (sibling / 'training-audit.json').write_text('{\n}\n', encoding='utf-8')
        write(sibling / 'pair-tokenization.json', [
            {'id': row['id'], 'chosen': encoded[i]} for i, row in enumerate(train)])
        old_protocol = {'settings': v.integrity.SETTINGS,
                        'frozenFiles': {name: v.digest(sibling / name) for name in shared}}
        write(sibling / 'protocol.json', old_protocol)
        write(sibling / 'report.json', {'protocolSha256': v.digest(sibling / 'protocol.json'), 'artifactHashes': {
            path.relative_to(sibling).as_posix(): v.digest(path)
            for path in sibling.rglob('*') if path.is_file()}})
        report_hash = v.digest(sibling / 'report.json')
        write(sibling / 'completion.json', {'reportSha256': report_hash, 'productionEligible': False})
        (sibling / 'execution.log').write_text('synthetic fixture')
        write(sibling / 'supervisor-artifact-manifest.json', {'productionEligible': False, 'files': {
            path.relative_to(sibling).as_posix(): v.digest(path)
            for path in sibling.rglob('*') if path.is_file()}})
        write(root / 'comparator-verification.json', {'verified': True, 'reportSha256': report_hash,
            'selectedEpoch': 3, 'automaticEligibilityPassed': True,
            'optimizerSteps': 225, 'pairPresentations': 900,
            'testOpened': False, 'productionEligible': False})
        hashes = {'COMPARATOR_REPORT': report_hash,
            'COMPARATOR_PROTOCOL': v.digest(sibling / 'protocol.json'),
            'COMPARATOR_RECEIPT': v.digest(root / 'comparator-verification.json'),
            'AUDIT_HASH': v.digest(root / 'training-audit.json'),
            'COMPARATOR_AUDIT_HASH': v.digest(sibling / 'training-audit.json'),
            'AUDIT_CANONICAL_HASH': v.canonical({})}
        copied = {'root': str(sibling), 'reportSha256': hashes['COMPARATOR_REPORT'],
            'protocolSha256': hashes['COMPARATOR_PROTOCOL'],
            'verificationReceiptSha256': hashes['COMPARATOR_RECEIPT'],
            'files': {p.relative_to(sibling).as_posix(): v.digest(p) for p in sibling.rglob('*') if p.is_file()},
            'trainingCanonicalSha256': v.TRAIN_CANONICAL,
            'developmentCanonicalSha256': v.base.DATA_HASHES['development'], 'auditSha256': hashes['AUDIT_HASH'],
            'comparatorAuditSha256': hashes['COMPARATOR_AUDIT_HASH'], 'auditCanonicalSha256': v.canonical({}),
            'sameTrainingData': True, 'initializationAncestor': False}
        write(root / 'comparator-evidence.json', copied)
        protocol = {'comparator': copied, 'comparatorEvidenceSha256': v.digest(root / 'comparator-evidence.json')}
        return root, sibling, train, development, protocol, hashes

    def test_comparator_pinned_receipts_frozen_inputs_and_complete_manifests(self):
        for mutation in ('valid', 'receipt', 'source', 'runtime', 'data', 'settings', 'parent',
                         'omittedFile', 'extraFile', 'ancestor', 'root', 'audit', 'equivalentAudit',
                         'comparatorAudit', 'auditCanonicalReceipt'):
            with self.subTest(mutation=mutation), fixture_directory() as directory:
                root, sibling, train, dev, protocol, hashes = self.comparator_fixture(directory)
                if mutation == 'receipt':
                    write(root / 'comparator-verification.json', {'verified': True, 'fabricated': True})
                    protocol['comparator']['verificationReceiptSha256'] = v.digest(root / 'comparator-verification.json')
                if mutation == 'source':
                    write(root / 'source/qwen3_evidence_integrity_contract.py', {'source': 'changed'})
                if mutation == 'runtime':
                    write(root / 'environment-contract.json', {'changed': True})
                if mutation == 'data':
                    train[0]['id'] = 'changed'
                    write(root / 'train.json', train)
                if mutation == 'settings':
                    changed = v.read(sibling / 'protocol.json')
                    changed['settings']['learningRate'] = .00002
                    write(sibling / 'protocol.json', changed)
                if mutation == 'parent':
                    protocol['initialAdapter'] = {'epoch': 3, 'root': str(sibling)}
                if mutation == 'omittedFile':
                    protocol['comparator']['files'].pop('execution.log')
                if mutation == 'extraFile':
                    write(sibling / 'unexpected.json', {})
                if mutation == 'ancestor':
                    protocol['comparator']['initializationAncestor'] = True
                if mutation == 'root':
                    protocol['comparator']['root'] = str(directory / 'elsewhere')
                if mutation == 'audit':
                    write(root / 'training-audit.json', {'approvedForTraining': True})
                    protocol['comparator']['auditSha256'] = v.digest(root / 'training-audit.json')
                if mutation == 'equivalentAudit':
                    (root / 'training-audit.json').write_text('{ }', encoding='utf-8')
                    protocol['comparator']['auditSha256'] = v.digest(root / 'training-audit.json')
                if mutation == 'comparatorAudit':
                    write(sibling / 'training-audit.json', {})
                    protocol['comparator']['comparatorAuditSha256'] = v.digest(sibling / 'training-audit.json')
                if mutation == 'auditCanonicalReceipt':
                    protocol['comparator']['auditCanonicalSha256'] = '0' * 64
                # A dishonest fresh receipt/hash does not override pinned commitments.
                write(root / 'comparator-evidence.json', protocol['comparator'])
                protocol['comparatorEvidenceSha256'] = v.digest(root / 'comparator-evidence.json')
                with ExitStack() as stack:
                    for key, value in hashes.items():
                        stack.enter_context(patch.object(v, key, value))
                    if mutation == 'valid':
                        self.assertEqual(v.check_comparator(root, protocol, train, dev)[0], sibling)
                    else:
                        with self.assertRaises(ValueError):
                            v.check_comparator(root, protocol, train, dev)


if __name__ == '__main__':
    unittest.main()
