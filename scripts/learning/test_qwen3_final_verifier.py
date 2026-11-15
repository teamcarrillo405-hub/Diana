"""Synthetic final-verifier contracts; no sealed cases, model calls or downloads."""
from copy import deepcopy
from contextlib import contextmanager
import json
from pathlib import Path, PurePosixPath, PureWindowsPath
import sys
import uuid
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import verify_qwen3_final as final
from grounding_review_v3 import build_packet, DIMENSIONS
from qwen3_evidence_integrity_metrics import score
from qwen3_evidence_integrity_contract import SYSTEM


@contextmanager
def fixture_directory():
    workspace = Path(__file__).resolve().parents[2]
    directory = workspace / ('final-verifier-fixture-' + uuid.uuid4().hex)
    directory.mkdir()
    try:
        yield directory
    finally:
        if not directory.resolve().is_relative_to(workspace):
            raise ValueError('Fixture cleanup escaped workspace')
        for item in sorted(directory.rglob('*'), key=lambda path: len(path.parts), reverse=True):
            if item.is_file():
                item.unlink()
            else:
                item.rmdir()
        directory.rmdir()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, allow_nan=False), encoding='utf-8')


def rows(count=100):
    result = []
    for i in range(count):
        insufficient = i >= (60 if count == 100 else 24)
        source = f'Fixture {i} records the value seven.'
        target = f'EVIDENCE: {"insufficient" if insufficient else source}\nNEXT: Which value should we check?'
        result.append({'id': f'fixture-{i}', 'source': source, 'question': f'What value is supported for item {i}?',
            'subject': 'fixture', 'level': 'fixture', 'expectedAbstention': insufficient,
            'acceptedQuotes': [] if insufficient else [source], 'nextStepAnchors': ['value'], 'target': target})
    return result


class Tokenizer:
    def __init__(self, cases):
        self.cases = cases

    def apply_chat_template(self, messages, **kwargs):
        i = next(i for i, row in enumerate(self.cases) if row['question'] in messages[1]['content'])
        prefix = [1, 2, 1000 + i]
        return prefix if kwargs['add_generation_prompt'] else prefix + [3, 4]

    def decode(self, values, **_kwargs):
        return self.cases[values[0] - 10]['target']


def encoded(cases):
    return [{'prefix': [1, 2, 1000 + i], 'full': [1, 2, 1000 + i, 3, 4],
        'labels': [-100, -100, -100, 3, 4], 'targetTokens': 2} for i in range(len(cases))]


def records(cases):
    return [{'id': row['id'], 'output': row['target'], 'targetTokenLoss': 1.0, 'targetTokens': 2,
        'generatedTokenIds': [10 + i], 'diagnostics': score(row['target'], row)} for i, row in enumerate(cases)]


class FinalVerifierContracts(unittest.TestCase):
    def setUp(self):
        self.rows = rows()
        self.encoded = encoded(self.rows)
        self.records = records(self.rows)
        self.tokenizer = Tokenizer(self.rows)

    def test_corrected_backend_and_both_verifier_versions_are_frozen(self):
        self.assertEqual(final.development.__name__, 'verify_qwen3_matched_sft')
        for name in ('verify_qwen3_preference.py', 'verify_qwen3_preference_v2.py', 'verify_qwen3_evidence_integrity.py', 'qwen3_evidence_integrity_metrics.py', 'qwen3_evidence_integrity_contract.py', 'train_qwen3_matched_sft.py', 'verify_qwen3_matched_sft.py'):
            self.assertIn(name, final.SOURCES)
            self.assertIn('source/' + name, final.FROZEN)
        import evaluate_qwen3_final as writer
        self.assertEqual(final.SOURCES, set(writer.SOURCE_FILES))
        self.assertEqual(final.SETTINGS, writer.SETTINGS)

    def test_all_one_hundred_records_recompute_counts_and_slices(self):
        result = final.check_records(self.records, self.rows, self.encoded, self.tokenizer)
        self.assertEqual(result['cases'], 100)
        self.assertEqual(result['formalCounts']['correctAnswerability'], 100)
        self.assertEqual(result['slices']['supported']['cases'], 60)
        self.assertEqual(result['slices']['insufficient']['cases'], 40)

    def test_extended_refusal_retains_strict_final_diagnostic(self):
        cases = deepcopy(self.rows)
        cases[0]['target'] = 'EVIDENCE: insufficient and a value would help\nNEXT: Which value should we check?'
        observed = records(cases)
        result = final.check_records(observed, cases, self.encoded, Tokenizer(cases))
        self.assertEqual(result['formalCounts']['correctAnswerability'], 99)
        self.assertEqual(result['formalCounts']['twoLinesAndOneQuestion'], 99)
        self.assertEqual(result['counts']['malformedAbstention'], 1)
        from train_qwen3_4b_research import score as legacy_score
        observed[0]['diagnostics'] = legacy_score(observed[0]['output'], cases[0])
        with self.assertRaisesRegex(ValueError, 'diagnostic fabrication'):
            final.check_records(observed, cases, self.encoded, Tokenizer(cases))

    def test_comparison_overlap_counts_are_separate_and_enforced(self):
        with patch.object(final, 'ROWS_SHA', final.canonical(self.rows)):
            result = final.check_rows(self.rows, [], [])
            zero = {'ids': 0, 'sources': 0, 'sourceQuestionPairs': 0}
            self.assertEqual(result, {**zero, 'fittingAncestry': zero, 'comparisonExposure': zero})
            for key in ('id', 'source'):
                comparison = {'id': 'other', 'source': 'unrelated', 'question': 'unrelated'}
                comparison[key] = self.rows[0][key]
                with self.subTest(key=key), self.assertRaisesRegex(ValueError, 'overlap training or development'):
                    final.check_rows(self.rows, [], [comparison])

    def test_missing_reordered_duplicate_or_substituted_arm_records_rejected(self):
        for mutation in ('missing', 'order', 'duplicate', 'output', 'tokens', 'target_count', 'loss', 'diagnostics'):
            changed = deepcopy(self.records)
            if mutation == 'missing': changed.pop()
            if mutation == 'order': changed[0], changed[1] = changed[1], changed[0]
            if mutation == 'duplicate': changed[0] = deepcopy(changed[1])
            if mutation == 'output': changed[0]['output'] = 'substituted answer'
            if mutation == 'tokens': changed[0]['generatedTokenIds'] = [True]
            if mutation == 'target_count': changed[0]['targetTokens'] = 3
            if mutation == 'loss': changed[0]['targetTokenLoss'] = True
            if mutation == 'diagnostics': changed[0]['diagnostics']['groundedCasePass'] = False
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                final.check_records(changed, self.rows, self.encoded, self.tokenizer)

    def test_reconstruct_prefix_targets_and_masks_without_inference(self):
        final.check_tokenization(self.encoded, self.rows, self.tokenizer, SYSTEM)
        for mutation in ('prefix', 'full', 'mask', 'target_count', 'truncation', 'missing'):
            changed = deepcopy(self.encoded)
            if mutation == 'prefix': changed[0]['prefix'][0] = 9
            if mutation == 'full': changed[0]['full'][-1] = 9; changed[0]['labels'][-1] = 9
            if mutation == 'mask': changed[0]['labels'][0] = 1
            if mutation == 'target_count': changed[0]['targetTokens'] = 1
            if mutation == 'truncation': changed[0]['full'] = [1] * 769
            if mutation == 'missing': changed.pop()
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                final.check_tokenization(changed, self.rows, self.tokenizer, SYSTEM)

    def test_sealed_rows_and_full_training_history_overlap(self):
        with patch.object(final, 'ROWS_SHA', final.canonical(self.rows)):
            self.assertEqual(final.check_rows(self.rows, []), {'ids': 0, 'sources': 0, 'sourceQuestionPairs': 0})
            ancestor_only = [{'id': 'ancestor', 'source': self.rows[0]['source'], 'question': 'another question'}]
            with self.assertRaisesRegex(ValueError, 'overlap'):
                final.check_rows(self.rows, ancestor_only)
            changed = deepcopy(self.rows)
            changed[0]['question'] += ' changed'
            with self.assertRaisesRegex(ValueError, 'canonical'):
                final.check_rows(changed, [])

    def test_reload_must_preserve_all_outputs_and_generated_ids(self):
        final.check_reproduction(self.records, deepcopy(self.records))
        for key in ('id', 'output', 'generatedTokenIds', 'targetTokens'):
            changed = deepcopy(self.records)
            changed[50][key] = 'changed'
            with self.subTest(key=key), self.assertRaises(ValueError):
                final.check_reproduction(self.records, changed)

    def test_research_boundaries_reject_boolean_integer_aliases(self):
        for value in (True, 1.0, None):
            with self.subTest(value=value), self.assertRaises(ValueError):
                final.exact_flags({'testEvaluations': value}, {'testEvaluations': 1})

    def test_recorded_paths_map_only_the_current_checkout_across_hosts(self):
        windows = 'C:/Users/example/repo'
        wsl = '/mnt/c/Users/example/repo'
        expected = ('artifacts', 'reviews', 'first.json')
        for checkout in (windows, wsl):
            for recorded in (windows + '/artifacts/reviews/first.json', wsl + '/artifacts/reviews/first.json',
                             'C:\\Users\\example\\repo\\artifacts\\reviews\\first.json'):
                with self.subTest(checkout=checkout, recorded=recorded):
                    self.assertEqual(final.recorded_relative_parts(recorded, checkout), expected)
        self.assertEqual(final.recorded_relative_parts('/home/example/repo/file.json', '/home/example/repo'), ('file.json',))

    def test_recorded_paths_reject_foreign_roots_traversal_and_path_aliases(self):
        for value in ('/mnt/c/Users/example/repo-sibling/file.json', '/mnt/d/Users/example/repo/file.json',
                      '/mnt/c/Users/example/repo/../outside.json', 'C:/Users/example/repo/../outside.json',
                      'C:/Users/example/repo/./file.json', 'C:Users/example/repo/file.json',
                      '/home/example/repo/file.json', 'artifacts/file.json', '\\\\server\\share\\file.json',
                      'C:/Users/example/repo/file.json:stream', 'C:/Users/example/repo/trailing. /file.json'):
            for checkout in ('C:/Users/example/repo', '/mnt/c/Users/example/repo'):
                with self.subTest(value=value, checkout=checkout), self.assertRaises(ValueError):
                    final.recorded_relative_parts(value, checkout)

    def other_host_path(self, path):
        text = str(path).replace('\\', '/')
        windows = PureWindowsPath(text)
        if windows.is_absolute() and len(windows.drive) == 2:
            return str(PurePosixPath('/mnt/' + windows.drive[0].lower(), *windows.parts[1:]))
        posix = PurePosixPath(text)
        if len(posix.parts) >= 3 and posix.parts[1] == 'mnt' and len(posix.parts[2]) == 1:
            return str(PureWindowsPath(posix.parts[2].upper() + ':/', *posix.parts[3:]))
        self.skipTest('Cross-host integration requires a Windows drive or its WSL mount; pure-path tests cover both hosts')

    def fixture(self, directory):
        research = Path(directory)
        root, run, preference, revision, parent = (research / name for name in
            ('final-run', 'qwen3-run-010', 'qwen3-run-008', 'qwen3-run-007', 'qwen3-run-006'))
        root.mkdir()
        dev_rows = rows(48)
        dev_outputs = records(dev_rows)
        packet, key = build_packet(dev_rows, dev_outputs, dev_outputs, 'a' * 64, 'validation', 3)
        def review(identity):
            return {'reviewerKind': 'ai', 'reviewerId': identity, 'packetHash': final.canonical(packet),
                'ratings': [{'id': row['id'], 'arm': arm, 'caseHash': row['caseHash'],
                    'responseHash': final.canonical(row['response' + arm]), **{dimension: True for dimension in DIMENSIONS},
                    'notes': 'Synthetic independently saved review fixture.'} for row in packet['cases'] for arm in ('A', 'B')]}
        values = {'packet': packet, 'key': key, 'first': review('one'), 'second': review('two')}
        bundle = {'schema': 'diana-development-semantic-gate-bundle-v1', 'files': {}, 'reviewerReceipts': []}
        for role, value in values.items():
            original = research / 'reviews' / (role + '.json')
            write(original, value)
            write(root / 'gate-inputs' / (role + '.json'), value)
            bundle['files'][role] = {'path': str(original), 'sha256': final.digest(original)}
            if role in ('first', 'second'):
                bundle['reviewerReceipts'].append({'role': role, 'reviewerId': value['reviewerId'],
                    'reviewFileSha256': final.digest(original), 'independentlyAuthored': True, 'savedBeforeUnblinding': True,
                    'savedAtUtc': '2026-09-28T01:00:00Z', 'reviewerUnblindedAtUtc': None,
                    'stillBlinded': True, 'receiptRecordedAtUtc': '2026-09-28T01:01:00Z'})
        original_bundle = research / 'reviews' / 'bundle.json'
        write(original_bundle, bundle)
        write(root / 'development-review-bundle.json', bundle)
        gate = final.check_review(bundle, values, dev_rows, dev_outputs, dev_outputs, 'a' * 64, 3)
        write(root / 'development-semantic-gate.json', gate)
        for name in final.SOURCES:
            destination = root / 'source' / name
            destination.parent.mkdir(exist_ok=True)
            destination.write_bytes(Path(final.__file__).with_name(name).read_bytes())
        for name in ('environment-contract.json', 'qualification.json', 'model-provenance.json', 'final-manifest.json', 'final-content-audit.json'):
            write(root / name, {'syntheticFixture': name})
        model_root = research / 'model-root'
        write(model_root / 'model-provenance.json', final.read(root / 'model-provenance.json'))
        # Development fixtures deliberately have different context from final fixtures.
        # The reviewed packet uses dev_rows; no inference or actual development verifier runs in this unit test.
        stages = ((parent, 'diana-qwen3-grounding-protocol-v1', 440, None),
            (revision, 'diana-qwen3-grounding-revision-protocol-v1', 600, parent),
            (preference, 'diana-qwen3-preference-protocol-v1', 200, revision),
            (run, 'diana-qwen3-matched-sft-protocol-v1', 300, preference))
        for stage, schema, count, preceding in stages:
            training = rows(count)
            for row in training:
                row['id'] = stage.name + '-' + row['id']
            write(stage / 'train.json', training)
            write(stage / 'development.json', dev_rows)
            stage_protocol = {'schema': schema, 'trainCount': count, 'developmentCount': 48,
                'frozenFiles': {name: final.digest(stage / name) for name in ('train.json', 'development.json')}}
            if preceding is not None:
                stage_protocol['parent'] = {'root': str(preceding),
                    'files': {'protocol.json': final.digest(preceding / 'protocol.json')}}
            write(stage / 'protocol.json', stage_protocol)
        sibling = research / 'qwen3-run-009'
        comparison_train = final.read(run / 'train.json')
        write(sibling / 'train.json', comparison_train)
        write(sibling / 'development.json', dev_rows)
        sibling_protocol = {'schema': 'diana-qwen3-evidence-integrity-protocol-v1',
            'frozenFiles': {name: final.digest(sibling / name) for name in ('train.json', 'development.json')},
            'dataCanonicalHashes': {'train': final.canonical(comparison_train), 'development': final.canonical(dev_rows)}}
        write(sibling / 'protocol.json', sibling_protocol)
        write(sibling / 'report.json', {'syntheticComparison': True})
        write(run / 'comparator-verification.json', {'syntheticVerification': True})
        comparator = {'root': str(sibling), 'sameTrainingData': True, 'initializationAncestor': False,
            'protocolSha256': final.digest(sibling / 'protocol.json'), 'reportSha256': final.digest(sibling / 'report.json'),
            'verificationReceiptSha256': final.digest(run / 'comparator-verification.json'),
            'trainingCanonicalSha256': final.canonical(comparison_train), 'developmentCanonicalSha256': final.canonical(dev_rows),
            'files': {name: final.digest(sibling / name) for name in ('protocol.json', 'report.json', 'train.json', 'development.json')}}
        write(run / 'comparator-evidence.json', comparator)
        fitting = final.read(run / 'protocol.json')
        fitting.update(comparator=comparator, comparatorEvidenceSha256=final.digest(run / 'comparator-evidence.json'))
        write(run / 'protocol.json', fitting)
        exposure = {'schema': 'diana-qwen3-final-comparison-exposure-v1', 'root': str(sibling),
            'reportSha256': comparator['reportSha256'], 'protocolSha256': comparator['protocolSha256'],
            'verificationReceiptSha256': comparator['verificationReceiptSha256'],
            'trainSha256': final.digest(sibling / 'train.json'), 'developmentSha256': final.digest(sibling / 'development.json'),
            'trainRows': 300, 'developmentRows': 48, 'trainingCanonicalSha256': final.canonical(comparison_train),
            'developmentCanonicalSha256': final.canonical(dev_rows), 'sameTrainingData': True, 'initializationAncestor': False}
        write(root / 'comparison-exposure.json', exposure)
        ancestry = [self.ancestry_item(stage) for stage in (run, preference, revision, parent)]
        for name in ('report.json', 'selection.json', 'supervisor-artifact-manifest.json',
                     'epoch-3/adapter_config.json', 'epoch-3/adapter_model.safetensors'):
            write(run / name, {'syntheticFixture': name})
        for label in ('baseline-development', 'epoch-3-development'):
            (run / (label + '.jsonl')).write_text(''.join(json.dumps(record) + '\n' for record in dev_outputs), encoding='utf-8')
        # Use distinct final source/id/question names while maintaining the dummy tokenizer contract.
        cases = deepcopy(self.rows)
        for i, row in enumerate(cases):
            row['id'] = 'final-' + row['id']
            row['source'] = 'Final ' + row['source']
            if not row['expectedAbstention']:
                row['acceptedQuotes'] = [row['source']]
                row['target'] = f"EVIDENCE: {row['source']}\nNEXT: Which value should we check?"
        final_records = records(cases)
        rows_hash = final.canonical(cases)
        claim_path = research / 'qwen3-final-consumption' / (rows_hash + '.json')
        protocol = {'schema': 'diana-qwen3-final-protocol-v1', 'createdAt': '2026-09-28T02:00:00Z',
            'model': final.prior.MODEL, 'revision': final.prior.REVISION, 'modelRoot': str(model_root),
            'settings': final.SETTINGS, 'system': SYSTEM, 'systemSha256': final.development.SYSTEM_HASH,
            'developmentRun': str(run), 'selectedEpoch': 3, 'reviewBundle': str(original_bundle),
            'trainingAncestry': ancestry, 'comparisonExposure': exposure,
            'comparisonExposureSha256': final.digest(root / 'comparison-exposure.json'),
            'developmentFiles': {name: final.digest(run / name) for name in ('report.json', 'protocol.json', 'selection.json',
                'supervisor-artifact-manifest.json', 'epoch-3/adapter_config.json', 'epoch-3/adapter_model.safetensors',
                'comparator-evidence.json', 'comparator-verification.json')},
            'environment': {}, 'datasetId': final.DATASET_ID, 'finalModuleSha256': final.MODULE_SHA,
            'finalRowsSha256': rows_hash, 'finalManifestSha256': final.digest(root / 'final-manifest.json'),
            'finalContentAuditSha256': final.digest(root / 'final-content-audit.json'), 'globalConsumptionClaim': str(claim_path),
            'testOpened': False, 'testEvaluations': 0, 'developmentSemanticGatePassed': True,
            'finalSemanticQualityValidated': False, 'productionEligible': False, 'educatorReviewed': False, 'researchOnly': True}
        write(root / 'protocol.json', protocol)
        write(root / 'final-opened.json', {'openedAt': '2026-09-28T02:02:00Z', 'moduleSha256': final.MODULE_SHA})
        zero_overlap = {'ids': 0, 'sources': 0, 'sourceQuestionPairs': 0}
        write(root / 'overlap-counts.json', {**zero_overlap, 'fittingAncestry': zero_overlap, 'comparisonExposure': zero_overlap})
        write(root / 'final-rows.json', cases)
        write(root / 'tokenization.json', encoded(cases))
        for label in final.ARMS:
            (root / (label + '.jsonl')).write_text(''.join(json.dumps(record) + '\n' for record in final_records), encoding='utf-8')
            write(root / (label + '-metrics.json'), final.development.aggregate(final_records, cases))
        (root / 'execution.log').write_text('Synthetic completed run', encoding='utf-8')
        metric = final.development.aggregate(final_records, cases)
        report = {'schema': 'diana-qwen3-final-evaluation-v1', 'status': 'awaiting-independent-final-semantic-review',
            'selectedEpoch': 3, 'finalCases': 100, 'testOpened': True, 'testEvaluations': 1, 'forwardPassArms': 3,
            'optimizerSteps': 0, 'savedAdapterOutputsIdentical': True, 'baseline': metric, 'adapter': metric, 'reload': metric,
            'mechanicalMetricsOnly': True, 'finalSemanticQualityValidated': False, 'productionEligible': False,
            'educatorReviewed': False, 'researchOnly': True, 'providerCalls': 0, 'elapsedSeconds': 30.0}
        write(root / 'report.json', report)
        self.reseal(root, claim_path)
        return root, claim_path, cases

    def ancestry_item(self, stage):
        return {'root': str(stage), 'protocolSha256': final.digest(stage / 'protocol.json'),
            'trainSha256': final.digest(stage / 'train.json'), 'developmentSha256': final.digest(stage / 'development.json'),
            'trainRows': len(final.read(stage / 'train.json')), 'developmentRows': len(final.read(stage / 'development.json'))}

    def reseal(self, root, claim_path, recorded_output=None):
        protocol = final.read(root / 'protocol.json')
        frozen = final.FROZEN | {'gate-inputs/' + role + '.json' for role in ('packet', 'key', 'first', 'second')}
        protocol['frozenFiles'] = {name: final.digest(root / name) for name in frozen}
        write(root / 'protocol.json', protocol)
        protocol_hash = final.digest(root / 'protocol.json')
        claim = {'datasetId': final.DATASET_ID, 'rowsSha256': protocol['finalRowsSha256'], 'output': recorded_output or str(root),
            'protocolSha256': protocol_hash, 'claimedAt': '2026-09-28T02:01:00Z',
            'claimedBeforeFinalImport': True, 'productionEligible': False}
        write(claim_path, claim)
        write(root / 'started.json', claim)
        write(root / 'worker-started.json', {'protocolSha256': protocol_hash})
        report = final.read(root / 'report.json')
        report['protocolSha256'] = protocol_hash
        report['artifactHashes'] = {name: final.digest(root / name) for name in frozen | final.EXECUTION}
        write(root / 'report.json', report)
        write(root / 'completion.json', {'reportSha256': final.digest(root / 'report.json'), 'productionEligible': False})
        write(root / 'supervisor-artifact-manifest.json', {'productionEligible': False,
            'files': {p.relative_to(root).as_posix(): final.digest(p) for p in root.rglob('*')
                      if p.is_file() and p.name != 'supervisor-artifact-manifest.json'}})

    def integration_verify(self, root, cases):
        from contextlib import ExitStack
        with ExitStack() as stack:
            protocol = final.read(root / 'protocol.json')
            run = final.recorded_path(protocol['developmentRun'])
            sibling = root.parent / 'qwen3-run-009'
            stack.enter_context(patch.object(final.development, 'COMPARATOR_PROTOCOL', final.digest(sibling / 'protocol.json')))
            stack.enter_context(patch.object(final.development, 'COMPARATOR_REPORT', final.digest(sibling / 'report.json')))
            stack.enter_context(patch.object(final.development, 'COMPARATOR_RECEIPT', final.digest(run / 'comparator-verification.json')))
            stack.enter_context(patch.object(final.development, 'TRAIN_CANONICAL', final.canonical(final.read(sibling / 'train.json'))))
            stack.enter_context(patch.dict(final.prior.DATA_HASHES, {'development': final.canonical(final.read(sibling / 'development.json'))}))
            stack.enter_context(patch.object(final, 'RESEARCH_ROOT', root.parent))
            stack.enter_context(patch.object(final, 'ROWS_SHA', final.canonical(cases)))
            stack.enter_context(patch.object(final, 'MANIFEST_SHA', final.digest(root / 'final-manifest.json')))
            stack.enter_context(patch.object(final, 'AUDIT_SHA', final.digest(root / 'final-content-audit.json')))
            stack.enter_context(patch.object(final.prior, 'PROVENANCE_SHA', final.digest(root / 'model-provenance.json')))
            stack.enter_context(patch.object(final.prior, 'check_environment'))
            stack.enter_context(patch.object(final.prior, 'check_qualification'))
            stack.enter_context(patch.object(final.development, 'verify', return_value={'verified': True,
                'automaticEligibilityPassed': True, 'selectedEpoch': 3, 'reportSha256': 'a' * 64}))
            stack.enter_context(patch('prepare_qwen3_4b_research.validate_snapshot', return_value=root.parent / 'model-root'))
            fake_auto = SimpleNamespace(from_pretrained=lambda *_args, **_kwargs: Tokenizer(cases))
            stack.enter_context(patch.dict(sys.modules, {'transformers': SimpleNamespace(AutoTokenizer=fake_auto)}))
            return final.verify(root)

    def test_completed_fixture_verifies_all_300_records_without_quality_claim(self):
        with fixture_directory() as directory:
            root, _, cases = self.fixture(directory)
            result = self.integration_verify(root, cases)
            self.assertTrue(result['verified'])
            self.assertEqual(result['verifiedArmRecords'], 300)
            for name in ('productionEligible', 'semanticQualityValidated', 'educatorReviewed',
                         'lossRecomputedByInference', 'physicalExecutionIndependentlyAttested'):
                self.assertFalse(result[name])

    def test_corrected_backend_source_cannot_be_omitted_from_final_inventory(self):
        with fixture_directory() as directory:
            root, claim_path, cases = self.fixture(directory)
            (root / 'source' / 'verify_qwen3_preference_v2.py').unlink()
            with self.assertRaisesRegex(ValueError, 'Missing|missing|file|artifact'):
                self.integration_verify(root, cases)

    def test_rehashed_comparison_receipt_cannot_change_identity_or_role(self):
        mutations = {'root': None, 'protocolSha256': '0' * 64, 'reportSha256': '0' * 64,
            'verificationReceiptSha256': '0' * 64, 'trainSha256': '0' * 64,
            'trainingCanonicalSha256': '0' * 64, 'trainRows': True,
            'sameTrainingData': False, 'initializationAncestor': True}
        for field, value in mutations.items():
            with self.subTest(field=field), fixture_directory() as directory:
                root, claim_path, cases = self.fixture(directory)
                protocol = final.read(root / 'protocol.json')
                if field == 'root': value = protocol['trainingAncestry'][1]['root']
                protocol['comparisonExposure'][field] = value
                write(root / 'comparison-exposure.json', protocol['comparisonExposure'])
                protocol['comparisonExposureSha256'] = final.digest(root / 'comparison-exposure.json')
                write(root / 'protocol.json', protocol)
                self.reseal(root, claim_path)
                original = final.read
                def guarded(path):
                    self.assertNotEqual(Path(path).name, 'final-rows.json')
                    return original(path)
                with patch.object(final, 'read', side_effect=guarded), self.assertRaises(ValueError):
                    self.integration_verify(root, cases)

    def test_missing_comparison_receipt_blocks_final_contents(self):
        with fixture_directory() as directory:
            root, _, cases = self.fixture(directory)
            (root / 'comparison-exposure.json').unlink()
            with self.assertRaises(ValueError): self.integration_verify(root, cases)

    def test_comparator_cannot_replace_run008_initialization_ancestor(self):
        with fixture_directory() as directory:
            root, claim_path, cases = self.fixture(directory)
            protocol = final.read(root / 'protocol.json')
            run = Path(protocol['developmentRun'])
            fitting = final.read(run / 'protocol.json')
            fitting['parent']['root'] = protocol['comparisonExposure']['root']
            fitting['parent']['files']['protocol.json'] = protocol['comparisonExposure']['protocolSha256']
            write(run / 'protocol.json', fitting)
            protocol['trainingAncestry'][0]['protocolSha256'] = final.digest(run / 'protocol.json')
            protocol['developmentFiles']['protocol.json'] = final.digest(run / 'protocol.json')
            write(root / 'protocol.json', protocol)
            self.reseal(root, claim_path)
            with self.assertRaisesRegex(ValueError, 'fitting ancestry run identity'):
                self.integration_verify(root, cases)

    def test_comparison_is_rechecked_after_final_response_reconstruction(self):
        with fixture_directory() as directory:
            root, _, cases = self.fixture(directory)
            path = root.parent / 'qwen3-run-009' / 'train.json'
            original = final.check_reproduction
            def change_after_reproduction(adapted, reloaded):
                original(adapted, reloaded)
                changed = final.read(path)
                changed[0]['question'] = 'Changed after response reconstruction'
                write(path, changed)
            with patch.object(final, 'check_reproduction', side_effect=change_after_reproduction), self.assertRaisesRegex(ValueError, 'comparison exposure hashes'):
                self.integration_verify(root, cases)

    def test_resealed_old_epoch_prompt_or_seed_cannot_enter_final_verification(self):
        for mutation in ('epoch', 'prompt', 'seed'):
            with self.subTest(mutation=mutation), fixture_directory() as directory:
                root, claim_path, cases = self.fixture(directory)
                protocol = final.read(root / 'protocol.json')
                if mutation == 'epoch':
                    protocol['selectedEpoch'] = 2
                    report = final.read(root / 'report.json')
                    report['selectedEpoch'] = 2
                    write(root / 'report.json', report)
                if mutation == 'prompt':
                    protocol['system'] = 'Superseded prompt'
                    protocol['systemSha256'] = final.hashlib.sha256(protocol['system'].encode()).hexdigest()
                if mutation == 'seed': protocol['settings']['seed'] = 71313
                write(root / 'protocol.json', protocol)
                self.reseal(root, claim_path)
                with self.assertRaisesRegex(ValueError, 'Selected final adapter|Final prompt changed|recipe drift'):
                    self.integration_verify(root, cases)

    def test_other_host_recorded_paths_verify_without_rewriting_provenance(self):
        with fixture_directory() as directory:
            root, claim_path, cases = self.fixture(directory)
            protocol = final.read(root / 'protocol.json')
            original_bundle = Path(protocol['reviewBundle'])
            bundle = final.read(original_bundle)
            for item in bundle['files'].values():
                item['path'] = self.other_host_path(item['path'])
            write(original_bundle, bundle)
            write(root / 'development-review-bundle.json', bundle)
            for name in ('developmentRun', 'reviewBundle', 'globalConsumptionClaim', 'modelRoot'):
                protocol[name] = self.other_host_path(protocol[name])
            for item in protocol['trainingAncestry']:
                item['root'] = self.other_host_path(item['root'])
            write(root / 'protocol.json', protocol)
            self.reseal(root, claim_path, recorded_output=self.other_host_path(root))
            watched = (root / 'protocol.json', root / 'development-review-bundle.json', claim_path, root / 'started.json')
            before = {path: path.read_bytes() for path in watched}
            result = self.integration_verify(root, cases)
            self.assertEqual(result['verifiedArmRecords'], 300)
            self.assertEqual({path: path.read_bytes() for path in watched}, before)

    def refresh_ancestry_commitments(self, root):
        """Reseal synthetic ancestor commitments, without bypassing overlap checks."""
        protocol = final.read(root / 'protocol.json')
        stages = [Path(item['root']) for item in protocol['trainingAncestry']]
        for position in reversed(range(len(stages))):
            stage = stages[position]
            saved = final.read(stage / 'protocol.json')
            saved['frozenFiles'] = {name: final.digest(stage / name) for name in ('train.json', 'development.json')}
            if position + 1 < len(stages):
                saved['parent']['files']['protocol.json'] = final.digest(stages[position + 1] / 'protocol.json')
            write(stage / 'protocol.json', saved)
        protocol['trainingAncestry'] = [self.ancestry_item(stage) for stage in stages]
        protocol['developmentFiles']['protocol.json'] = final.digest(stages[0] / 'protocol.json')
        write(root / 'protocol.json', protocol)

    def test_ancestor_only_overlap_fails_even_after_all_fixture_hashes_are_recommitted(self):
        for ancestor in (1, 2, 3):
            for split in ('train.json', 'development.json'):
                with self.subTest(ancestor=ancestor, split=split), fixture_directory() as directory:
                    root, claim_path, cases = self.fixture(directory)
                    protocol = final.read(root / 'protocol.json')
                    path = Path(protocol['trainingAncestry'][ancestor]['root']) / split
                    supplied = final.read(path)
                    supplied[0] = deepcopy(cases[0])
                    write(path, supplied)
                    self.refresh_ancestry_commitments(root)
                    self.reseal(root, claim_path)
                    with self.assertRaisesRegex(ValueError, 'overlap training or development history'):
                        self.integration_verify(root, cases)

    def test_missing_or_reordered_ancestry_rejected_before_final_rows_are_parsed(self):
        for mutation in ('omit', 'reorder', 'count', 'bool_count'):
            with self.subTest(mutation=mutation), fixture_directory() as directory:
                root, claim_path, cases = self.fixture(directory)
                protocol = final.read(root / 'protocol.json')
                inventory = protocol['trainingAncestry']
                if mutation == 'omit': inventory.pop()
                if mutation == 'reorder': inventory[1], inventory[2] = inventory[2], inventory[1]
                if mutation == 'count': inventory[2]['trainRows'] = 439
                if mutation == 'bool_count': inventory[2]['developmentRows'] = True
                write(root / 'protocol.json', protocol)
                self.reseal(root, claim_path)
                reader = final.read
                def guarded_read(path):
                    self.assertNotEqual(Path(path).name, 'final-rows.json', 'Final rows parsed before ancestry was bound')
                    return reader(path)
                with patch.object(final, 'read', side_effect=guarded_read), self.assertRaisesRegex(ValueError, 'fitting ancestry'):
                    self.integration_verify(root, cases)

    def test_rehashed_ancestor_rows_cannot_override_ancestor_protocol_commitment(self):
        with fixture_directory() as directory:
            root, claim_path, cases = self.fixture(directory)
            protocol = final.read(root / 'protocol.json')
            item = protocol['trainingAncestry'][2]
            path = Path(item['root']) / 'train.json'
            supplied = final.read(path)
            supplied[0]['question'] = 'Substituted ancestor question'
            write(path, supplied)
            item['trainSha256'] = final.digest(path)
            write(root / 'protocol.json', protocol)
            self.reseal(root, claim_path)
            with self.assertRaisesRegex(ValueError, 'ancestor protocol commitment'):
                self.integration_verify(root, cases)

    def test_rehashed_parent_protocol_cannot_override_child_commitment(self):
        with fixture_directory() as directory:
            root, claim_path, cases = self.fixture(directory)
            protocol = final.read(root / 'protocol.json')
            item = protocol['trainingAncestry'][2]
            path = Path(item['root']) / 'protocol.json'
            supplied = final.read(path)
            supplied['tampered'] = True
            write(path, supplied)
            item['protocolSha256'] = final.digest(path)
            write(root / 'protocol.json', protocol)
            self.reseal(root, claim_path)
            with self.assertRaisesRegex(ValueError, 'parent protocol differs from child commitment'):
                self.integration_verify(root, cases)

    def test_fitting_chain_order_and_counts_are_independent_of_resealed_inventory(self):
        for mutation in ('schema', 'train_count', 'development_count', 'missing_rows'):
            with self.subTest(mutation=mutation), fixture_directory() as directory:
                root, claim_path, cases = self.fixture(directory)
                protocol = final.read(root / 'protocol.json')
                stage = Path(protocol['trainingAncestry'][2]['root'])
                ancestor = final.read(stage / 'protocol.json')
                if mutation == 'schema': ancestor['schema'] = 'diana-qwen3-preference-protocol-v1'
                if mutation == 'train_count': ancestor['trainCount'] = 439
                if mutation == 'development_count': ancestor['developmentCount'] = 47
                if mutation == 'missing_rows': write(stage / 'train.json', final.read(stage / 'train.json')[:-1])
                write(stage / 'protocol.json', ancestor)
                self.refresh_ancestry_commitments(root)
                self.reseal(root, claim_path)
                with self.assertRaisesRegex(ValueError, 'fitting ancestry|ancestor protocol counts|ancestor training rows'):
                    self.integration_verify(root, cases)

    def test_ancestry_is_rechecked_after_all_final_records_are_reconstructed(self):
        with fixture_directory() as directory:
            root, _, cases = self.fixture(directory)
            protocol = final.read(root / 'protocol.json')
            path = Path(protocol['trainingAncestry'][2]['root']) / 'train.json'
            original = final.check_reproduction
            def mutate_after_reproduction(adapted, reloaded):
                original(adapted, reloaded)
                supplied = final.read(path)
                supplied[0]['question'] = 'Changed during final verification'
                write(path, supplied)
            with patch.object(final, 'check_reproduction', side_effect=mutate_after_reproduction), \
                    self.assertRaisesRegex(ValueError, 'ancestor protocol commitment'):
                self.integration_verify(root, cases)

    def test_rehashed_false_metrics_still_fail_reconstruction(self):
        with fixture_directory() as directory:
            root, claim_path, cases = self.fixture(directory)
            metrics = final.read(root / 'adapter-final-metrics.json')
            metrics['formalCounts']['correctAnswerability'] = 99
            write(root / 'adapter-final-metrics.json', metrics)
            report = final.read(root / 'report.json')
            report['adapter'] = metrics
            write(root / 'report.json', report)
            self.reseal(root, claim_path)
            with self.assertRaisesRegex(ValueError, 'aggregate metric drift'):
                self.integration_verify(root, cases)

    def test_rehashed_output_substitution_still_fails_decoding(self):
        with fixture_directory() as directory:
            root, claim_path, cases = self.fixture(directory)
            supplied = final.read_lines(root / 'adapter-final.jsonl')
            supplied[99]['output'] = 'Replacement final answer'
            (root / 'adapter-final.jsonl').write_text(''.join(json.dumps(row) + '\n' for row in supplied), encoding='utf-8')
            self.reseal(root, claim_path)
            with self.assertRaisesRegex(ValueError, 'decoded generated IDs'):
                self.integration_verify(root, cases)

    def test_interrupted_extra_artifact_blocks_completed_report(self):
        with fixture_directory() as directory:
            root, claim_path, cases = self.fixture(directory)
            write(root / 'interrupted.json', {'retryPermitted': False})
            self.reseal(root, claim_path)
            with self.assertRaisesRegex(ValueError, 'unexpected final artifact'):
                self.integration_verify(root, cases)

    def test_claim_cannot_be_reassigned_to_another_completed_run(self):
        with fixture_directory() as directory:
            root, claim_path, cases = self.fixture(directory)
            claim = final.read(claim_path)
            claim['output'] = str(root.parent / 'another-run')
            write(claim_path, claim)
            with self.assertRaisesRegex(ValueError, 'claims disagree'):
                self.integration_verify(root, cases)


if __name__ == '__main__':
    unittest.main()
