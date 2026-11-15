"""Independent read-only verifier for the prospective matched chosen-target SFT run.

No inference, new-runner import, or final-case loading. Evidence consistency is
not third-party attestation of physical execution or semantic acceptance.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path, PurePosixPath
import random

import verify_qwen3_evidence_integrity as integrity
import verify_qwen3_grounding_revision as revision
import verify_qwen3_preference_v2 as preference
import verify_qwen3_4b_research as base
from verify_qwen3_4b_research import require, read, read_lines, digest, canonical, evidence, manifest, finite
from qwen3_evidence_integrity_metrics import score, aggregate
from qwen3_evidence_integrity_contract import SYSTEM_HASH, METRICS_VERSION

PARENT_REPORT = integrity.PARENT_REPORT
PARENT_PROTOCOL = integrity.PARENT_PROTOCOL
COMPARATOR_REPORT = '06b9d89bdff32ccf98244fd1f8612a7bbd083cba6b43b8913f3e68c0aba3142a'
COMPARATOR_PROTOCOL = '68654384af3bfdfa641eb25c1c16efd65552360098ecd4766b5965c4d4fcbe34'
COMPARATOR_RECEIPT = 'b769788f5acdb4214e922ad7ee3bf2b2fcae2370d0ba124bda2ce9d906d2a86c'
TRAIN_CANONICAL = '73e94b7f518849cc78024b2b63571638e8569708f28c1f8ee87f08811356a760'
AUDIT_HASH = '20d4687cd24ac3bb2c19ed4284d90af59a698e09f0fd3aeb65338a1e9d219d6c'
COMPARATOR_AUDIT_HASH = '463b0c7c5bb583a1e61537a1ec3e7192805a90804e9bc8a7044f1a069870c2a7'
AUDIT_CANONICAL_HASH = '83745a29cf3480e76b7291d39f0132ad4f0fdc60cf7828eaab04bb76563ce172'
SETTINGS = {k: v for k, v in integrity.SETTINGS.items() if k != 'beta'}
SOURCES = integrity.SOURCES | {'train_qwen3_matched_sft.py', 'verify_qwen3_matched_sft.py'}
PARENT_FILES = integrity.PARENT_FILES
OBJECTIVE = '0.5 * (-chosen_sum_log_probability / chosen_target_tokens)'
SELECTION = integrity.SELECTION
boundaries = revision.boundaries
check_parent_path = integrity.check_parent_path
check_prior_training_overlap = integrity.check_prior_training_overlap
check_audit = integrity.check_audit
check_sequence = integrity.check_sequence
encode = integrity.encode
check_logps = integrity.check_logps
close = integrity.close
required_gates = integrity.required_gates
select_candidate = integrity.select_candidate


def check_training(rows, development):
    integrity.check_training(rows, development)
    require(canonical(rows) == TRAIN_CANONICAL, 'Audited comparator rows changed')


def check_tokenization(encoded, train, development):
    require(len(encoded) == 348 and len(train) == 300 and len(development) == 48,
            'Chosen-only tokenization population drift')
    for item in encoded:
        check_sequence(item)
    return 3 * sum(item['targetTokens'] for item in encoded[:300])


def objective(chosen, tokens):
    integrity.logprob(chosen)
    require(type(tokens) is int and tokens > 0, 'Positive chosen count required')
    ce = -chosen / tokens
    return {'chosenTokenMeanCE': ce, 'combinedLoss': .5 * ce}


EXAMPLE_KEYS = {'id', 'chosenSumLogp', 'chosenTokens', 'chosenTokenLogps',
    'chosenTokenMeanCE', 'combinedLoss', 'tensorCombinedLoss', 'tensorChosenTokenMeanCE'}
HISTORY_KEYS = {'epoch', 'optimizerStep', 'gradientNorm', 'examples', 'examplesSeen',
    'targetTokensSeen', 'rejectedTargetTokensSeen'}


def check_example(example, tokens, *, qualification=False):
    allowed = (EXAMPLE_KEYS - {'id'}) | {'step', 'gradientNorm'} if qualification else EXAMPLE_KEYS
    require(set(example) == allowed, 'Undeclared objective term or missing chosen loss evidence')
    chosen = check_logps(example, 'chosen', tokens)
    terms = objective(chosen, tokens)
    for name, value in terms.items():
        close(example.get(name), value, name)
    close(example.get('tensorCombinedLoss'), terms['combinedLoss'], 'tensor weighted chosen CE')
    close(example.get('tensorChosenTokenMeanCE'), terms['chosenTokenMeanCE'], 'tensor chosen CE')
    return terms


def check_history(history, train, encoded):
    require(len(history) == 225 and len(train) == 300 and len(encoded) == 348,
            'Require 225 updates, 300 chosen rows, and 48 development rows')
    expected = []
    for epoch in (1, 2, 3):
        indices = list(range(300))
        random.Random(81173 + epoch).shuffle(indices)
        expected.extend((epoch, indices[i:i + 4]) for i in range(0, 300, 4))
    seen = tokens = 0
    for step, (event, (epoch, indices)) in enumerate(zip(history, expected, strict=True), 1):
        require(set(event) == HISTORY_KEYS, 'Undeclared history fields')
        require(type(event.get('epoch')) is int and event['epoch'] == epoch
                and type(event.get('optimizerStep')) is int and event['optimizerStep'] == step,
                'Deterministic optimizer order drift')
        finite(event.get('gradientNorm'), 'gradient norm')
        examples = event.get('examples')
        require(isinstance(examples, list) and len(examples) == 4, 'Accumulation must be four')
        for example, index in zip(examples, indices, strict=True):
            require(example.get('id') == train[index]['id'], 'Chosen presentation order drift')
            check_example(example, encoded[index]['targetTokens'])
            seen += 1
            tokens += encoded[index]['targetTokens']
        for key, value in (('examplesSeen', seen), ('targetTokensSeen', tokens), ('rejectedTargetTokensSeen', 0)):
            require(type(event.get(key)) is int and event[key] == value, 'Cumulative chosen-only accounting drift')
    require(seen == 900, 'Require exactly 900 chosen presentations')
    return tokens


def check_objective_qualification(root, proof, environment):
    require(proof.get('schema') == 'diana-qwen3-matched-sft-objective-qualification-v1'
            and proof.get('status') == 'qualified'
            and proof.get('sourceSha256') == digest(evidence(root, 'source/train_qwen3_matched_sft.py'))
            and proof.get('settingsSha256') == canonical(SETTINGS), 'Qualification source/recipe drift')
    require(proof.get('environment') == environment and proof.get('environmentSha256') == canonical(environment),
            'Qualification runtime environment drift')
    integrity.check_runtime_contract(root, proof.get('runtimeContractSha256'))
    require(all(proof.get(key) is True for key in ('randomTinyModelOnly', 'targetOnlyMasking',
            'finiteGradients', 'gradientDirectionPassed'))
            and proof.get('realModelOrTrainingDataLoaded') is False
            and proof.get('productionEligible') is False, 'Tiny qualification boundary drift')
    require(type(proof.get('trainableTensors')) is int and type(proof.get('changedTensors')) is int
            and proof['trainableTensors'] == proof['changedTensors'] == 16, 'All 16 tiny adapters must change')
    fixture = proof.get('fixture', {})
    check_sequence(fixture)
    require(fixture == {'prefix': [1, 3, 4, 5, 6, 7],
        'full': [1, 3, 4, 5, 6, 7, 9, 10, 11, 2],
        'labels': [-100] * 6 + [9, 10, 11, 2], 'targetTokens': 4},
        'Qualification must use the fixed random-model synthetic token fixture')
    events = proof.get('events', [])
    require(len(events) == 2, 'Require two tiny objective updates')
    for step, event in enumerate(events, 1):
        require(type(event.get('step')) is int and event['step'] == step, 'Tiny step order drift')
        finite(event.get('gradientNorm'), 'tiny gradient norm')
        check_example(event, fixture['targetTokens'], qualification=True)


def loss_recovery(history, parent, comparator, final):
    training = []
    for epoch in (1, 2, 3):
        examples = [example for event in history if event['epoch'] == epoch for example in event['examples']]
        require(len(examples) == 300, 'Incomplete diagnostic epoch')
        training.append({'epoch': epoch,
            'chosenTokenMeanCE': sum(e['chosenTokenMeanCE'] for e in examples) / len(examples),
            'chosenTokenWeightedCE': -sum(e['chosenSumLogp'] for e in examples) / sum(e['chosenTokens'] for e in examples)})
    def losses(metrics):
        return {'all': metrics['targetTokenLoss'],
                **{label: metrics['slices'][label]['targetTokenLoss'] for label in ('supported', 'insufficient')}}
    return {'trainingCEByEpoch': training,
        'trainingCEMeasurement': 'online pre-update chosen-target losses; not checkpoint evaluation',
        'developmentCE': {'parent': losses(parent), 'comparator': losses(comparator), 'epoch3': losses(final)},
        'fullParentLossRecovery': final['targetTokenLoss'] <= parent['targetTokenLoss'],
        'improvedOverComparator': final['targetTokenLoss'] < comparator['targetTokenLoss'],
        'doesNotAlterEligibility': True}


def check_audit_serialization(root, sibling):
    """The original approved audit and run 009 serialization have fixed identities."""
    original = evidence(root, 'training-audit.json')
    frozen = evidence(sibling, 'training-audit.json')
    require(digest(original) == AUDIT_HASH and digest(frozen) == COMPARATOR_AUDIT_HASH,
            'Approved original or comparator serialized audit bytes changed')
    original_value, frozen_value = read(original), read(frozen)
    require(original_value == frozen_value
            and canonical(original_value) == canonical(frozen_value) == AUDIT_CANONICAL_HASH,
            'Original/comparator audit content differs beyond approved serialization')
    return canonical(original_value)


def check_comparator(root, protocol, train, development):
    """Bind sibling evidence to immutable approved hashes, never a fresh claim."""
    sibling = root.parent / 'qwen3-run-009'
    copied = read(evidence(root, 'comparator-evidence.json'))
    require(copied == protocol.get('comparator')
            and digest(root / 'comparator-evidence.json') == protocol.get('comparatorEvidenceSha256'),
            'Comparator commitment drift')
    require(revision.parent_path_identity(copied.get('root')) == revision.parent_path_identity(str(sibling)),
            'Comparator must be the preserved local sibling')
    require(digest(evidence(sibling, 'report.json')) == COMPARATOR_REPORT
            and digest(evidence(sibling, 'protocol.json')) == COMPARATOR_PROTOCOL
            and digest(evidence(root, 'comparator-verification.json')) == COMPARATOR_RECEIPT,
            'Immutable comparator report/protocol/verification changed')
    old_report = read(sibling / 'report.json')
    old_protocol = read(sibling / 'protocol.json')
    receipt = read(root / 'comparator-verification.json')
    require(receipt.get('verified') is True and receipt.get('reportSha256') == COMPARATOR_REPORT
            and receipt.get('selectedEpoch') == 3 and receipt.get('automaticEligibilityPassed') is True
            and receipt.get('optimizerSteps') == 225 and receipt.get('pairPresentations') == 900
            and receipt.get('testOpened') is False and receipt.get('productionEligible') is False,
            'Comparator verification receipt claims changed')
    files = {p.relative_to(sibling).as_posix() for p in sibling.rglob('*') if p.is_file()}
    require(not any('test' in name.lower() or 'interrupted' in name.lower() for name in files),
            'Comparator contains final or interrupted evidence')
    manifest(sibling, old_report.get('artifactHashes'), files - {
        'report.json', 'completion.json', 'execution.log', 'supervisor-artifact-manifest.json'})
    require(old_report.get('protocolSha256') == COMPARATOR_PROTOCOL,
            'Comparator report/protocol binding changed')
    for name, hashed in old_protocol.get('frozenFiles', {}).items():
        require(old_report['artifactHashes'].get(name) == hashed, 'Comparator frozen manifest disagreement')
    supervisor = read(evidence(sibling, 'supervisor-artifact-manifest.json'))
    require(supervisor.get('productionEligible') is False, 'Comparator supervisor production claim')
    manifest(sibling, supervisor.get('files'), files - {'supervisor-artifact-manifest.json'})
    manifest(sibling, copied.get('files'), files)
    require(read(evidence(sibling, 'completion.json')) == {
        'reportSha256': COMPARATOR_REPORT, 'productionEligible': False}, 'Comparator completion changed')
    expected = {'root': copied['root'], 'reportSha256': COMPARATOR_REPORT,
        'protocolSha256': COMPARATOR_PROTOCOL, 'verificationReceiptSha256': COMPARATOR_RECEIPT,
        'files': copied['files'], 'trainingCanonicalSha256': TRAIN_CANONICAL,
        'developmentCanonicalSha256': base.DATA_HASHES['development'], 'auditSha256': AUDIT_HASH,
        'comparatorAuditSha256': COMPARATOR_AUDIT_HASH,
        'auditCanonicalSha256': check_audit_serialization(root, sibling),
        'sameTrainingData': True, 'initializationAncestor': False}
    require(copied == expected, 'Undeclared comparator identity or ancestry')
    require(old_protocol.get('settings') == integrity.SETTINGS
            and {k: v for k, v in old_protocol['settings'].items() if k != 'beta'} == SETTINGS,
            'Non-objective comparator recipe drift')
    for field in ('model', 'revision', 'system', 'systemSha256', 'originalSystemSha256',
                  'environment', 'environmentSha256', 'initialAdapter', 'parent'):
        require(protocol.get(field) == old_protocol.get(field), 'Matched comparator input drift: ' + field)
    require(train == read(evidence(sibling, 'train.json'))
            and development == read(evidence(sibling, 'development.json')),
            'Matched rows differ from comparator')
    same_files = {'train.json', 'development.json', 'tokenization.json', 'parent-original-tokenization.json',
        'audit-evidence-manifest.json', 'environment-contract.json',
        'qualification.json', 'model-provenance.json', 'parent-evidence.json', 'prior-training-overlap.json'}
    same_files |= {'source/' + name for name in integrity.SOURCES}
    same_files |= set(read(evidence(root, 'audit-evidence-manifest.json')))
    for name in same_files:
        require(old_protocol.get('frozenFiles', {}).get(name) == digest(evidence(root, name))
                == digest(evidence(sibling, name)), 'Undeclared matched frozen-input drift: ' + name)
    encoded = read(evidence(root, 'tokenization.json'))
    pairs = read(evidence(sibling, 'pair-tokenization.json'))
    require(len(pairs) == 300 and [p.get('chosen') for p in pairs] == encoded[:300]
            and [p.get('id') for p in pairs] == [row['id'] for row in train],
            'Comparator chosen tokenization differs')
    return sibling, old_report


def check_matched_baselines(root, sibling, baseline, parent):
    for label, actual in (('baseline-development', baseline), ('parent-development', parent)):
        revision.identical(read_lines(evidence(sibling, label + '.jsonl')), actual)
    require(read(evidence(root, 'matched-baseline-reproduction.json')) == {
        'identicalOutputs': True, 'casesPerBaseline': 48,
        'labels': ['baseline-development', 'parent-development'],
        'comparatorReportSha256': COMPARATOR_REPORT, 'beforeOptimizer': True},
        'Matched pre-optimizer baseline reproduction receipt drift')


def verify(root: Path):
    from train_qwen3_preference import SYSTEM as parent_system
    from train_qwen3_grounding_revision import development_rows
    from qwen3_evidence_integrity_data_a import rows as rows_a
    from qwen3_evidence_integrity_data_b import rows as rows_b
    from prepare_qwen3_4b_research import validate_snapshot, DEFAULT_OUTPUT
    from transformers import AutoTokenizer
    root = Path(root).resolve()
    report = read(evidence(root, 'report.json'))
    require(report.get('schema') == 'diana-qwen3-matched-sft-development-v1', 'Wrong preference report schema')
    boundaries(report, validation=True)
    require(report.get('researchOnly') is True and report.get('educatorReviewed') is False
            and type(report.get('providerCalls')) is int and report['providerCalls'] == 0
            and report.get('method') == 'matched chosen-target SFT (0.5 token-mean CE; no DPO)', 'Unsupported preference execution claim')
    files = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    require(not any('test' in name.lower() or 'interrupted' in name.lower() for name in files), 'Final-test or interrupted artifact prohibited')
    manifest(root, report.get('artifactHashes'), files - {'report.json', 'completion.json', 'execution.log', 'supervisor-artifact-manifest.json'})
    protocol = read(evidence(root, 'protocol.json'))
    require(digest(root / 'protocol.json') == report.get('protocolSha256'), 'Protocol hash drift')
    require(protocol.get('schema') == 'diana-qwen3-matched-sft-protocol-v1' and protocol.get('model') == base.MODEL
            and protocol.get('revision') == base.REVISION and protocol.get('settings') == SETTINGS, 'Preference recipe drift')
    boundaries(protocol)
    require(protocol.get('freshOptimizer') is True and protocol.get('inferencePerformed') is False
            and protocol.get('researchOnly') is True and protocol.get('educatorReviewed') is False
            and protocol.get('studentOrTextbookDataUsed') is False, 'Frozen research boundary drift')
    require(protocol.get('objective') == OBJECTIVE and 'referencePolicy' not in protocol
            and protocol.get('selection') == SELECTION, 'Objective/reference/selection contract changed')
    require(protocol.get('rejectedTargetsUsedForOptimization') is False and protocol.get('dpoUsed') is False,
            'DPO or rejected-target optimization prohibited')
    require(protocol.get('systemSha256') == SYSTEM_HASH == hashlib.sha256(protocol['system'].encode()).hexdigest()
            and protocol.get('originalSystemSha256') == preference.SYSTEM_HASH, 'Preference prompt drift')
    train, development = read(evidence(root, 'train.json')), read(evidence(root, 'development.json'))
    check_training(train, development)
    require(canonical(development) == base.DATA_HASHES['development'], 'Original development annotations changed')
    require(protocol.get('dataCanonicalHashes') == {'train': canonical(train), 'development': canonical(development)}, 'Data hash mismatch')
    require(train == rows_a() + rows_b() and development == development_rows(), 'Source/row mismatch')
    audit_files = check_audit(root, read(evidence(root, 'training-audit.json')), train)
    frozen = {'train.json', 'development.json', 'environment-contract.json', 'qualification.json', 'model-provenance.json',
        'tokenization.json', 'parent-original-tokenization.json', 'parent-evidence.json',
        'comparator-evidence.json', 'comparator-verification.json', 'training-audit.json', 'prior-training-overlap.json', 'audit-evidence-manifest.json', 'objective-qualification.json', 'design.md'} | audit_files | {'source/' + n for n in SOURCES}
    manifest(root, protocol.get('frozenFiles'), frozen)
    for name in SOURCES:
        require(digest(Path(__file__).with_name(name)) == digest(root / 'source' / name), 'Frozen source drift: ' + name)
    contract = read(root / 'environment-contract.json')
    base.check_environment(protocol['environment'], contract)
    base.check_qualification(root, contract)
    require(canonical(protocol['environment']) == protocol.get('environmentSha256'), 'Environment hash drift')
    check_objective_qualification(root, read(root / 'objective-qualification.json'), protocol['environment'])
    require(digest(root / 'model-provenance.json') == base.PROVENANCE_SHA, 'Publisher provenance drift')
    require(revision.parent_path_identity(protocol.get('modelRoot')) == revision.parent_path_identity(str(DEFAULT_OUTPUT)), 'Unapproved model path')
    snapshot = validate_snapshot(DEFAULT_OUTPUT)
    require(digest(DEFAULT_OUTPUT / 'model-provenance.json') == base.PROVENANCE_SHA, 'Local model provenance drift')
    parent = protocol.get('parent', {})
    require(parent == read(root / 'parent-evidence.json') and parent.get('epoch') == 2, 'Parent evidence drift')
    parent_root = root.parent / 'qwen3-run-008'
    check_parent_path(parent.get('root'), parent_root)
    require(protocol.get('initialAdapter') == {'epoch': 2, 'root': parent['root']}, 'Initial adapter drift')
    manifest(parent_root, parent.get('files'), PARENT_FILES)
    require(digest(parent_root / 'report.json') == PARENT_REPORT and digest(parent_root / 'protocol.json') == PARENT_PROTOCOL, 'Immutable parent changed')
    parent_verified = preference.verify(parent_root)
    require(parent.get('verified') == parent_verified and parent_verified.get('verified') is True
            and parent_verified.get('selectedEpoch') == 2 and parent_verified.get('automaticEligibilityPassed') is True
            and parent_verified.get('testOpened') is False, 'Parent verification/selection drift')
    check_prior_training_overlap(root, train, protocol)
    comparator_root, _ = check_comparator(root, protocol, train, development)
    require(report.get('comparatorReportSha256') == COMPARATOR_REPORT, 'Reported comparator drift')
    encoded = read(root / 'tokenization.json')
    totals = check_tokenization(encoded, train, development)
    require(canonical(encoded) == protocol.get('tokenizationSha256') and 'pairTokenizationSha256' not in protocol, 'Tokenization hash drift')
    tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False)
    require(encoded == [encode(tokenizer, r, protocol['system']) for r in train + development], 'Reconstructed chosen/development tokenization differs')
    require(protocol.get('minimumTargetTokens') == min(r['targetTokens'] for r in encoded)
            and protocol.get('maximumFullTokens') == max(len(r['full']) for r in encoded), 'Token bounds drift')
    original_encoded = read(root / 'parent-original-tokenization.json')
    require(original_encoded == [encode(tokenizer, r, parent_system) for r in development]
            and canonical(original_encoded) == protocol.get('parentOriginalTokenizationSha256'), 'Parent original tokenization drift')
    def evaluation(label, items=None):
        records = read_lines(evidence(root, label + '.jsonl'))
        metrics = base.check_generated_records(records, development, encoded[300:] if items is None else items, tokenizer, score, aggregate)
        require(metrics == read(evidence(root, label + '-metrics.json')), 'Saved evaluation aggregate drift')
        return records, metrics
    reproduced, original_metrics = evaluation('parent-original-reproduction', original_encoded)
    revision.identical(read_lines(parent_root / 'epoch-2-development.jsonl'), reproduced)
    require(read(evidence(root, 'parent-reproduction.json')) == {'identicalOutputs': True, 'cases': 48, 'parentEpoch': 2}, 'Parent reproduction receipt missing')
    baseline_records, baseline = evaluation('baseline-development')
    parent_records, parent_metrics = evaluation('parent-development')
    check_matched_baselines(root, comparator_root, baseline_records, parent_records)
    require(report.get('baseline') == baseline and report.get('parent') == parent_metrics and report.get('parentOriginal') == original_metrics, 'Paired baseline report drift')
    parameters = read(evidence(root, 'parameters.json'))
    base.check_parameters(parameters, base.base_parameter_count(snapshot))
    require(report.get('trainableParameters') == parameters['trainable'], 'Trainable report drift')
    require(read(evidence(root, 'optimizer-start.json')) == {
        'matchedBaselineReproductionSha256': digest(root / 'matched-baseline-reproduction.json'),
        'optimizerStateInitiallyEmpty': True, 'optimizerSteps': 0}, 'Fresh matched optimizer precondition drift')
    history = read_lines(evidence(root, 'training-history.jsonl'))
    observed = check_history(history, train, encoded)
    require(observed == totals == report.get('targetTokensSeen')
            and type(report.get('rejectedTargetTokensSeen')) is int and report['rejectedTargetTokensSeen'] == 0,
            'Chosen-only target accounting drift')
    require(report.get('optimizerSteps') == protocol.get('expectedOptimizerSteps') == 225 and report.get('examplesSeen') == 900
            and report.get('trainCount') == protocol.get('trainCount') == 300
            and report.get('developmentCount') == protocol.get('developmentCount') == 48, 'Run accounting drift')
    candidates, outputs = [], {}
    for epoch in (1, 2, 3):
        records, metrics = evaluation(f'epoch-{epoch}-development')
        outputs[epoch] = records
        candidate = read(evidence(root, f'epoch-{epoch}-candidate.json'))
        require(type(candidate.get('epoch')) is int and candidate['epoch'] == epoch
                and type(candidate.get('optimizerSteps')) is int and candidate['optimizerSteps'] == epoch * 75
                and candidate.get('metrics') == metrics and candidate.get('gates') == required_gates(baseline, metrics), 'Candidate gates/accounting drift')
        checkpoint = root / f'epoch-{epoch}'
        inventory = {p.name for p in checkpoint.iterdir() if p.is_file()}
        require(inventory == {'README.md', 'adapter_config.json', 'adapter_model.safetensors'}, 'Checkpoint inventory drift')
        manifest(checkpoint, candidate.get('artifactHashes'), inventory)
        base.check_weights(root, epoch)
        candidates.append(candidate)
    comparator_metrics = base.check_generated_records(
        read_lines(evidence(comparator_root, 'epoch-3-development.jsonl')),
        development, encoded[300:], tokenizer, score, aggregate)
    require(comparator_metrics == read(evidence(comparator_root, 'epoch-3-development-metrics.json')),
            'Comparator aggregate reconstruction differs')
    diagnostic = loss_recovery(history, parent_metrics, comparator_metrics, candidates[2]['metrics'])
    require(read(evidence(root, 'loss-recovery.json')) == diagnostic and report.get('lossRecovery') == diagnostic, 'Loss recovery diagnostic drift')
    selected = select_candidate(candidates)
    epoch = 3 if selected else None
    selection = read(evidence(root, 'selection.json'))
    boundaries(selection, validation=True)
    require(selection.get('selectedEpoch') == report.get('selectedEpoch') == epoch and selection.get('candidates') == candidates
            and selection.get('automaticEligibilityPassed') is bool(selected) and report.get('automaticEligibilityPassed') is bool(selected), 'Final-epoch selection drift')
    if selected:
        records, metrics = evaluation('selected-reload-development')
        revision.identical(outputs[3], records)
        require(all(required_gates(baseline, metrics).values()) and selection.get('savedAdapterOutputsIdentical') is True
                and report.get('status') == 'awaiting-semantic-review', 'Selected reload missing or changed')
    else:
        require(selection.get('savedAdapterOutputsIdentical') is False and report.get('status') == 'rejected-automatic-eligibility', 'Rejected run claimed a selected adapter')
    evaluations = {'parent-original-reproduction', 'baseline-development', 'parent-development', 'epoch-1-development', 'epoch-2-development', 'epoch-3-development'}
    if selected:
        evaluations.add('selected-reload-development')
    expected = frozen | {'protocol.json', 'started.json', 'parent-reproduction.json', 'parameters.json',
        'matched-baseline-reproduction.json', 'loss-recovery.json', 'optimizer-start.json', 'training-history.jsonl',
        'epoch-1-candidate.json', 'epoch-2-candidate.json', 'epoch-3-candidate.json', 'selection.json', 'report.json', 'completion.json',
        'execution.log', 'supervisor-artifact-manifest.json'}
    expected |= {label + suffix for label in evaluations for suffix in ('.jsonl', '-metrics.json')}
    expected |= {f'epoch-{e}/{name}' for e in (1, 2, 3) for name in ('README.md', 'adapter_config.json', 'adapter_model.safetensors')}
    require(files == expected, 'Unexpected or missing preference artifact inventory')
    finite(report.get('elapsedSeconds'), 'elapsed runtime')
    require(0 < report['elapsedSeconds'] <= 7200, 'Run exceeded runtime bound')
    require(read(evidence(root, 'completion.json')) == {'reportSha256': digest(root / 'report.json'), 'productionEligible': False}, 'Completion receipt drift')
    require(read(evidence(root, 'started.json')).get('protocolSha256') == report['protocolSha256'], 'Started protocol drift')
    supervisor = read(evidence(root, 'supervisor-artifact-manifest.json'))
    require(supervisor.get('productionEligible') is False, 'Supervisor production claim')
    manifest(root, supervisor.get('files'), files - {'supervisor-artifact-manifest.json'})
    return {'verified': True, 'reportSha256': digest(root / 'report.json'), 'selectedEpoch': epoch,
        'automaticEligibilityPassed': bool(selected), 'validationPassed': False, 'semanticQualityValidated': False,
        'baseline': baseline, 'parent': parent_metrics, 'candidates': candidates, 'testOpened': False,
        'productionEligible': False, 'finalQualityValidated': False, 'lossRecovery': diagnostic,
        'comparatorReportSha256': COMPARATOR_REPORT,
        'optimizerSteps': 225, 'chosenPresentations': 900, 'rejectedTargetTokensSeen': 0,
        'verifierVersion': 1, 'verifierSourceSha256': digest(Path(__file__))}



if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--run', type=Path, required=True)
    print(json.dumps(verify(parser.parse_args().run), indent=2))
