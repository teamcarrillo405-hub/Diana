"""Corrected independent read-only preference verification; no final loader.

Version 2 preserves the frozen version 1 verifier and experiment evidence.
The qualification pins original reviewed-contract bytes, while freeze writes a
JSON-equivalent copy. Both identities are checked explicitly below.

Checks bind local durable evidence, not a third-party attestation of execution.
In particular, a cached-reference receipt proves internal ordering consistency,
not that an adversary could not fabricate an entirely new run directory.
"""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path, PurePosixPath
import random

import verify_qwen3_grounding_revision as revision
import verify_qwen3_4b_research as base
from verify_qwen3_4b_research import require, read, read_lines, digest, canonical, evidence, manifest, finite

SYSTEM_HASH = 'c991021a7e8b65728f32733332c60e37e28060f8f131b71395135d662ee4ff2e'
PARENT_REPORT = '3cbb8856dda318f6e3da666ce23fa6c04a747b598683740fb74033f43892ce01'
PARENT_PROTOCOL = 'c5c109a0a3d079a3722deb3cae97795e928c1c3fbea89c9d2bb4d63b6e304ecc'
SETTINGS = {**revision.SETTINGS, 'learningRate': .000005, 'seed': 71313,
            'beta': .1, 'chosenSFTWeight': .2, 'selectedEpochOnly': 2,
            'objectiveAuditTolerance': .0001}
DATA_MODULES = {'qwen3_preference_data_a.py', 'qwen3_preference_data_b.py'}
SOURCES = revision.SOURCES | DATA_MODULES | {'train_qwen3_preference.py',
    'verify_qwen3_preference.py', 'verify_qwen3_grounding_revision.py'}
CATEGORIES = {'echo': 80, 'unsupported-premise': 40, 'wrong-scope': 40, 'wrong-answerability': 40}
OBJECTIVE = '-logsigmoid(beta*((chosen_sum-rejected_sum)-(reference_chosen_sum-reference_rejected_sum))) + chosenSFTWeight*(-chosen_sum/chosen_tokens)'
REFERENCE_POLICY = 'verified run-007 epoch-one cached before fitting; never refreshed'
SELECTION = 'Both fixed epochs retained. Only final epoch two can be selected if formal gates pass. No epoch-one fallback. The 95% complete semantic and zero-fabrication gate requires subsequent independent blinded review.'
boundaries, aggregate, required_gates = revision.boundaries, revision.aggregate, revision.required_gates


def check_parent_path(recorded, local_parent):
    require(revision.parent_path_identity(recorded) == revision.parent_path_identity(str(local_parent)),
            'Recorded parent is not the mapped local sibling')
    require(PurePosixPath(recorded.replace('\\', '/')).name == 'qwen3-run-007', 'Unexpected parent run')


def check_training(rows, development):
    from train_qwen3_4b_research import score
    require(len(rows) == 200 and len({r['id'] for r in rows}) == 200, 'Require 200 unique preference pairs')
    require(len({(r['source'], r['question']) for r in rows}) == 200, 'Duplicate preference question')
    require(not {r['id'] for r in rows} & {r['id'] for r in development}, 'Preference/development ID overlap')
    require(not {r['source'] for r in rows} & {r['source'] for r in development}, 'Preference/development source overlap')
    require(Counter(r['subject'] for r in rows) == {s: 40 for s in ('math', 'reading', 'English', 'science', 'history')}, 'Subject imbalance')
    require(Counter(r['preferenceCategory'] for r in rows) == CATEGORIES, 'Preference category imbalance')
    require(len({r['source'] for r in rows}) == 100, 'Context count drift')
    for partition in (rows[:100], rows[100:]):
        require(len({r['source'] for r in partition}) == 50 and Counter(r['expectedAbstention'] for r in partition) == {True: 50, False: 50}, 'Author partition imbalance')
    for source in {r['source'] for r in rows}:
        group = [r for r in rows if r['source'] == source]
        require(len(group) == 2 and Counter(r['expectedAbstention'] for r in group) == {True: 1, False: 1}, 'Context question balance drift')
    require(len({r['source'] for r in rows if r.get('conflictingContext') is True}) >= 20, 'Insufficient conflicting contexts')
    for row in rows:
        require(type(row.get('expectedAbstention')) is bool and all(isinstance(row.get(k), str) and row[k].strip() for k in ('id', 'family', 'subject', 'level', 'source', 'question', 'target', 'rejected', 'preferenceReason')), 'Missing preference annotations')
        require(row['target'] != row['rejected'] and len(row['preferenceReason'].strip()) >= 20, 'Missing distinct rejection or rationale')
        require(score(row['target'], row)['groundedCasePass'], 'Preferred target violates evidence contract')


def check_audit(root, audit, train):
    require(audit.get('schema') == 'diana-qwen3-preference-audit-v1' and audit.get('approvedForTraining') is True
            and audit.get('independentReviewer') is True, 'Independent preference audit missing')
    require(audit.get('educatorReviewed') is False and audit.get('unresolvedFindings') == [], 'Invalid audit boundary')
    require(audit.get('trainingCanonicalSha256') == canonical(train), 'Audited pairs changed')
    require(audit.get('sourceSha256') == {name: digest(evidence(root, 'source/' + name)) for name in DATA_MODULES}, 'Audited source changed')
    reviews = audit.get('caseReviews', [])
    mapping = {r['id']: r for r in train}
    require(len(reviews) == len(mapping) == 200 and {r['id'] for r in reviews} == set(mapping), 'Incomplete individual pair audit')
    for row in reviews:
        require(all(row.get(k) is True for k in ('passed', 'chosenPass', 'rejectedIsInferior'))
                and row.get('pairHash') == canonical(mapping[row['id']])
                and isinstance(row.get('notes'), str) and len(row['notes'].strip()) >= 20, 'Pair audit judgment or binding missing')
    copied = read(evidence(root, 'audit-evidence-manifest.json'))
    originals = audit.get('evidenceFiles', {})
    require(isinstance(originals, dict) and len(copied) == len(originals) == 2, 'Require both independent audit evidence files')
    for name in originals:
        revision.parent_path_identity(name)  # absolute, canonical host or WSL syntax
    expected = {f'audit-evidence/{i}-{PurePosixPath(name.replace(chr(92), chr(47))).name}':
                {'originalPath': name, 'sha256': value} for i, (name, value) in enumerate(sorted(originals.items()))}
    require(copied == expected, 'Audit evidence mapping drift')
    reviewer_ids, reviewed_ids = set(), set()
    partitions = [(train[:100], 'qwen3_preference_data_a.py'), (train[100:], 'qwen3_preference_data_b.py')]
    for name, item in copied.items():
        require(isinstance(item['sha256'], str) and base.SHA.fullmatch(item['sha256'])
                and digest(evidence(root, name)) == item['sha256'], 'Independent audit evidence changed')
        proof = read(evidence(root, name))
        reviewer = proof.get('reviewerId')
        require(isinstance(reviewer, str) and reviewer.strip() and reviewer not in reviewer_ids, 'Independent reviewer identity missing or duplicated')
        reviewer_ids.add(reviewer)
        require(proof.get('approvedForTraining') is True and proof.get('independentReviewer') is True
                and proof.get('educatorReviewed') is False and proof.get('unresolvedFindings') == [], 'Independent audit approval/boundary drift')
        cases = proof.get('caseReviews', [])
        ids = {r['id'] for r in cases}
        matched = [(rows, module) for rows, module in partitions if ids == {r['id'] for r in rows}]
        require(len(cases) == len(ids) == 100 and len(matched) == 1 and not ids & reviewed_ids, 'Independent partition audit coverage drift')
        rows, module = matched[0]
        require(proof.get('sourceSha256') == audit['sourceSha256'][module]
                and proof.get('canonicalRowsSha256') == canonical(rows), 'Independent audit source/data binding drift')
        for case in cases:
            require(all(case.get(k) is True for k in ('passed', 'chosenPass', 'rejectedIsInferior'))
                    and case.get('pairHash') == canonical(mapping[case['id']])
                    and isinstance(case.get('notes'), str) and len(case['notes'].strip()) >= 20, 'Independent case review binding/judgment missing')
        reviewed_ids.update(ids)
    require(reviewed_ids == set(mapping), 'Independent audit union is incomplete')
    return set(copied)


def check_sequence(item):
    prefix, full, labels = item.get('prefix'), item.get('full'), item.get('labels')
    require(isinstance(prefix, list) and prefix and isinstance(full, list) and len(full) > len(prefix), 'Invalid token sequence')
    require(all(type(t) is int and 0 <= t < 151936 for t in full + prefix), 'Invalid token ID')
    require(isinstance(labels, list) and all(type(t) is int for t in labels)
            and full[:len(prefix)] == prefix and labels == [-100] * len(prefix) + full[len(prefix):], 'Prompt loss or target leakage')
    require(type(item.get('targetTokens')) is int and item['targetTokens'] == len(full) - len(prefix), 'Target token count drift')
    require(len(full) <= 768 and len(prefix) + 128 <= 768, 'Undeclared truncation')


def encode(tokenizer, row, system):
    """Rebuild prompts without consulting the runner's encoding implementation."""
    messages = [{'role': 'system', 'content': system},
                {'role': 'user', 'content': f"SOURCE: {row['source']}\nQUESTION: {row['question']}"}]
    prefix = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True, return_dict=False)
    full = tokenizer.apply_chat_template(messages + [{'role': 'assistant', 'content': row['target']}],
                                         tokenize=True, add_generation_prompt=False, return_dict=False)
    item = {'prefix': prefix, 'full': full, 'labels': [-100] * len(prefix) + full[len(prefix):], 'targetTokens': len(full) - len(prefix)}
    check_sequence(item)
    return item


def check_tokenization(encoded, pairs, train, development):
    require(len(encoded) == 248 and len(pairs) == len(train) == 200 and len(development) == 48, 'Tokenization population drift')
    for item in encoded:
        check_sequence(item)
    for row, pair, item in zip(train, pairs, encoded[:200], strict=True):
        require(pair.get('id') == row['id'] and pair.get('chosen') == item, 'Pair chosen identity drift')
        for side in ('chosen', 'rejected'):
            check_sequence(pair[side])
        require(pair['chosen']['prefix'] == pair['rejected']['prefix'], 'Chosen/rejected prompt mismatch')
    return tuple(2 * sum(p[side]['targetTokens'] for p in pairs) for side in ('chosen', 'rejected'))


def logprob(value):
    require(type(value) in (int, float) and math.isfinite(value) and value <= 0, 'Invalid target log probability')


def close(actual, expected, label):
    require(type(actual) in (int, float) and math.isfinite(actual)
            and math.isclose(actual, expected, rel_tol=1e-5, abs_tol=.0001), 'Objective/accounting drift: ' + label)


def check_logps(record, side, tokens):
    require(type(record.get(side + 'Tokens')) is int and record[side + 'Tokens'] == tokens, 'Log probability token count drift')
    values, total = record.get(side + 'TokenLogps'), record.get(side + 'SumLogp')
    require(isinstance(values, list) and len(values) == tokens and tokens > 0, 'Missing per-token log probabilities')
    for value in values:
        logprob(value)
    logprob(total)
    require(math.isclose(math.fsum(values), total, rel_tol=1e-6, abs_tol=.0001), 'Per-token sum drift')
    return total


def objective(chosen, rejected, ref_chosen, ref_rejected, tokens):
    for value in (chosen, rejected, ref_chosen, ref_rejected):
        logprob(value)
    require(type(tokens) is int and tokens > 0, 'Invalid chosen target count')
    margin = (chosen - rejected) - (ref_chosen - ref_rejected)
    scaled = .1 * margin
    dpo = max(0., -scaled) + math.log1p(math.exp(-abs(scaled)))
    ce = -chosen / tokens
    return {'preferenceMargin': margin, 'scaledPreferenceMargin': scaled, 'dpoLoss': dpo,
            'chosenTokenMeanCE': ce, 'combinedLoss': dpo + .2 * ce}


def check_reference(cache, pairs, parent_hash, protocol_hash):
    require(cache.get('schema') == 'diana-qwen3-frozen-preference-reference-v1'
            and cache.get('parentAdapterSha256') == parent_hash and cache.get('protocolSha256') == protocol_hash
            and cache.get('pairTokenizationSha256') == canonical(pairs) and cache.get('systemSha256') == SYSTEM_HASH
            and cache.get('createdBeforeOptimizer') is True, 'Frozen reference binding drift')
    records = cache.get('pairs', [])
    require(len(records) == len(pairs) == 200, 'Incomplete reference cache')
    for record, pair in zip(records, pairs, strict=True):
        require(record.get('id') == pair['id'], 'Reference pair order drift')
        for side in ('chosen', 'rejected'):
            check_logps(record, side, pair[side]['targetTokens'])
    return records


def check_history(history, train, pairs, references, cache_hash):
    require(len(history) == 100 and len(train) == len(pairs) == len(references) == 200, 'Require 100 updates and 200 pairs')
    expected = []
    for epoch in (1, 2):
        order = list(range(200))
        random.Random(71313 + epoch).shuffle(order)
        expected.extend((epoch, order[i:i + 4]) for i in range(0, 200, 4))
    seen = chosen_tokens = rejected_tokens = 0
    for step, (record, (epoch, indices)) in enumerate(zip(history, expected, strict=True), 1):
        require(type(record.get('epoch')) is int and record['epoch'] == epoch and type(record.get('optimizerStep')) is int
                and record['optimizerStep'] == step and record.get('referenceCacheSha256') == cache_hash, 'Update order or reference-cache drift')
        finite(record.get('gradientNorm'), 'gradient norm')
        examples = record.get('examples', [])
        require(len(examples) == 4, 'Incomplete accumulation batch')
        for example, index in zip(examples, indices, strict=True):
            pair, reference = pairs[index], references[index]
            require(example.get('id') == train[index]['id'] == pair['id'] == reference['id'], 'Pair presentation order drift')
            chosen = check_logps(example, 'chosen', pair['chosen']['targetTokens'])
            rejected = check_logps(example, 'rejected', pair['rejected']['targetTokens'])
            require(example.get('referenceChosenSumLogp') == reference['chosenSumLogp']
                    and example.get('referenceRejectedSumLogp') == reference['rejectedSumLogp'], 'Frozen reference score changed')
            terms = objective(chosen, rejected, reference['chosenSumLogp'], reference['rejectedSumLogp'], pair['chosen']['targetTokens'])
            for name, value in terms.items():
                close(example.get(name), value, name)
            for tensor, scalar in (('tensorCombinedLoss', 'combinedLoss'), ('tensorDPOLoss', 'dpoLoss'), ('tensorChosenTokenMeanCE', 'chosenTokenMeanCE')):
                close(example.get(tensor), terms[scalar], tensor)
            seen += 1
            chosen_tokens += pair['chosen']['targetTokens']
            rejected_tokens += pair['rejected']['targetTokens']
        for name, total in (('examplesSeen', seen), ('targetTokensSeen', chosen_tokens), ('rejectedTargetTokensSeen', rejected_tokens)):
            require(type(record.get(name)) is int and record[name] == total, 'Cumulative pair/token accounting drift')
    require(seen == 400, 'Require 400 pair presentations')
    return chosen_tokens, rejected_tokens


def check_runtime_contract(root, expected_raw_hash):
    """Bind original approval bytes and the reserialized frozen JSON separately."""
    original = evidence(root.parent / 'qwen3-runtime', 'reviewed-environment-contract.json')
    frozen = evidence(root, 'environment-contract.json')
    require(isinstance(expected_raw_hash, str) and base.SHA.fullmatch(expected_raw_hash)
            and digest(original) == expected_raw_hash, 'Original reviewed runtime contract hash drift')
    original_data, frozen_data = read(original), read(frozen)
    require(original_data == frozen_data
            and canonical(original_data) == canonical(frozen_data) == base.CONTRACT_CANONICAL_SHA,
            'Original and frozen runtime contract content differs')
    return {'originalRuntimeContractSha256': digest(original),
            'frozenRuntimeContractSha256': digest(frozen),
            'runtimeContractCanonicalSha256': canonical(frozen_data)}


def check_objective_qualification(root, proof, environment):
    require(proof.get('schema') == 'diana-qwen3-dpo-objective-qualification-v1' and proof.get('status') == 'qualified'
            and proof.get('sourceSha256') == digest(evidence(root, 'source/train_qwen3_preference.py'))
            and proof.get('settingsSha256') == canonical(SETTINGS), 'DPO qualification source/recipe drift')
    require(proof.get('environment') == environment and proof.get('environmentSha256') == canonical(environment),
            'DPO qualification environment drift')
    check_runtime_contract(root, proof.get('runtimeContractSha256'))
    require(all(proof.get(k) is True for k in ('randomTinyModelOnly', 'initialDPOLossEqualsLog2', 'finiteGradients', 'gradientDirectionPassed', 'referenceUnchanged'))
            and proof.get('realModelOrTrainingDataLoaded') is False and proof.get('productionEligible') is False, 'DPO qualification boundary drift')
    require(proof.get('trainableTensors') == proof.get('changedTensors') == 16
            and isinstance(proof.get('referenceSha256'), str) and base.SHA.fullmatch(proof['referenceSha256']), 'Tiny adapter/reference evidence missing')
    events = proof.get('events', [])
    require(len(events) == 2, 'Require two tiny qualification steps')
    for i, event in enumerate(events, 1):
        require(type(event.get('step')) is int and event['step'] == i, 'Tiny objective step drift')
        finite(event.get('gradientNorm'), 'tiny gradient norm')
        margin = event.get('preferenceMargin')
        require(type(margin) in (int, float) and math.isfinite(margin), 'Invalid qualification margin')
        scaled = .1 * margin
        close(event.get('scaledPreferenceMargin'), scaled, 'qualification scale')
        dpo = max(-scaled, 0.) + math.log1p(math.exp(-abs(scaled)))
        close(event.get('dpoLoss'), dpo, 'qualification DPO')
        finite(event.get('chosenTokenMeanCE'), 'qualification CE')
        close(event.get('combinedLoss'), dpo + .2 * event['chosenTokenMeanCE'], 'qualification combined loss')
    close(events[0]['dpoLoss'], math.log(2), 'initial DPO log2')


def select_candidate(candidates):
    require([c.get('epoch') for c in candidates] == [1, 2], 'Both epochs must complete')
    gates = candidates[1].get('gates')
    require(isinstance(gates, dict) and gates and all(type(v) is bool for v in gates.values()), 'Invalid final gates')
    return candidates[1] if all(gates.values()) else None


def verify(root: Path):
    from train_qwen3_4b_research import score
    from train_qwen3_grounding_revision import SYSTEM as parent_system, development_rows
    from qwen3_preference_data_a import rows as rows_a
    from qwen3_preference_data_b import rows as rows_b
    from prepare_qwen3_4b_research import validate_snapshot, DEFAULT_OUTPUT
    from transformers import AutoTokenizer
    root = Path(root).resolve()
    report = read(evidence(root, 'report.json'))
    require(report.get('schema') == 'diana-qwen3-preference-development-v1', 'Wrong preference report schema')
    boundaries(report, validation=True)
    require(report.get('researchOnly') is True and report.get('educatorReviewed') is False
            and type(report.get('providerCalls')) is int and report['providerCalls'] == 0
            and report.get('method') == 'standard DPO plus chosen-response supervised loss', 'Unsupported preference execution claim')
    files = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    require(not any('test' in name.lower() or 'interrupted' in name.lower() for name in files), 'Final-test or interrupted artifact prohibited')
    manifest(root, report.get('artifactHashes'), files - {'report.json', 'completion.json', 'execution.log', 'supervisor-artifact-manifest.json'})
    protocol = read(evidence(root, 'protocol.json'))
    require(digest(root / 'protocol.json') == report.get('protocolSha256'), 'Protocol hash drift')
    require(protocol.get('schema') == 'diana-qwen3-preference-protocol-v1' and protocol.get('model') == base.MODEL
            and protocol.get('revision') == base.REVISION and protocol.get('settings') == SETTINGS, 'Preference recipe drift')
    boundaries(protocol)
    require(protocol.get('freshOptimizer') is True and protocol.get('inferencePerformed') is False
            and protocol.get('researchOnly') is True and protocol.get('educatorReviewed') is False
            and protocol.get('studentOrTextbookDataUsed') is False, 'Frozen research boundary drift')
    require(protocol.get('objective') == OBJECTIVE and protocol.get('referencePolicy') == REFERENCE_POLICY
            and protocol.get('selection') == SELECTION, 'Objective/reference/selection contract changed')
    require(protocol.get('systemSha256') == SYSTEM_HASH == hashlib.sha256(protocol['system'].encode()).hexdigest()
            and protocol.get('originalSystemSha256') == revision.SYSTEM_HASH, 'Preference prompt drift')
    train, development = read(evidence(root, 'train.json')), read(evidence(root, 'development.json'))
    check_training(train, development)
    require(canonical(development) == base.DATA_HASHES['development'], 'Original development annotations changed')
    require(protocol.get('dataCanonicalHashes') == {'train': canonical(train), 'development': canonical(development)}, 'Data hash mismatch')
    require(train == rows_a() + rows_b() and development == development_rows(), 'Source/row mismatch')
    audit_files = check_audit(root, read(evidence(root, 'training-audit.json')), train)
    frozen = {'train.json', 'development.json', 'environment-contract.json', 'qualification.json', 'model-provenance.json',
        'tokenization.json', 'pair-tokenization.json', 'parent-original-tokenization.json', 'parent-evidence.json',
        'training-audit.json', 'audit-evidence-manifest.json', 'objective-qualification.json', 'design.md'} | audit_files | {'source/' + n for n in SOURCES}
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
    require(parent == read(root / 'parent-evidence.json') and parent.get('epoch') == 1, 'Parent evidence drift')
    parent_root = root.parent / 'qwen3-run-007'
    check_parent_path(parent.get('root'), parent_root)
    require(protocol.get('initialAdapter') == {'epoch': 1, 'root': parent['root']}, 'Initial adapter drift')
    manifest(parent_root, parent.get('files'), revision.PARENT_FILES)
    require(digest(parent_root / 'report.json') == PARENT_REPORT and digest(parent_root / 'protocol.json') == PARENT_PROTOCOL, 'Immutable parent changed')
    parent_verified = revision.verify(parent_root)
    require(parent.get('verified') == parent_verified and parent_verified.get('verified') is True
            and parent_verified.get('selectedEpoch') == 1 and parent_verified.get('automaticEligibilityPassed') is True
            and parent_verified.get('testOpened') is False, 'Parent verification/selection drift')
    encoded, pairs = read(root / 'tokenization.json'), read(root / 'pair-tokenization.json')
    totals = check_tokenization(encoded, pairs, train, development)
    require(canonical(encoded) == protocol.get('tokenizationSha256') and canonical(pairs) == protocol.get('pairTokenizationSha256'), 'Tokenization hash drift')
    tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False)
    require(encoded == [encode(tokenizer, r, protocol['system']) for r in train + development], 'Reconstructed chosen/development tokenization differs')
    for row, pair in zip(train, pairs, strict=True):
        require(pair['rejected'] == encode(tokenizer, {**row, 'target': row['rejected']}, protocol['system']), 'Reconstructed rejected tokenization differs')
    require(protocol.get('minimumTargetTokens') == min(r['targetTokens'] for r in encoded)
            and protocol.get('maximumFullTokens') == max(len(r['full']) for r in encoded), 'Token bounds drift')
    original_encoded = read(root / 'parent-original-tokenization.json')
    require(original_encoded == [encode(tokenizer, r, parent_system) for r in development]
            and canonical(original_encoded) == protocol.get('parentOriginalTokenizationSha256'), 'Parent original tokenization drift')
    def evaluation(label, items=None):
        records = read_lines(evidence(root, label + '.jsonl'))
        metrics = base.check_generated_records(records, development, encoded[200:] if items is None else items, tokenizer, score, aggregate)
        require(metrics == read(evidence(root, label + '-metrics.json')), 'Saved evaluation aggregate drift')
        return records, metrics
    reproduced, original_metrics = evaluation('parent-original-reproduction', original_encoded)
    revision.identical(read_lines(parent_root / 'epoch-1-development.jsonl'), reproduced)
    require(read(evidence(root, 'parent-reproduction.json')) == {'identicalOutputs': True, 'cases': 48, 'parentEpoch': 1}, 'Parent reproduction receipt missing')
    _, baseline = evaluation('baseline-development')
    _, parent_metrics = evaluation('parent-development')
    require(report.get('baseline') == baseline and report.get('parent') == parent_metrics and report.get('parentOriginal') == original_metrics, 'Paired baseline report drift')
    parameters = read(evidence(root, 'parameters.json'))
    base.check_parameters(parameters, base.base_parameter_count(snapshot))
    require(report.get('trainableParameters') == parameters['trainable'], 'Trainable report drift')
    cache = read(evidence(root, 'reference-cache.json'))
    cache_hash = digest(root / 'reference-cache.json')
    references = check_reference(cache, pairs, parent['files']['epoch-1/adapter_model.safetensors'], report['protocolSha256'])
    require(read_lines(evidence(root, 'reference-cache-progress.jsonl')) == references, 'Durable reference progress differs')
    require(read(evidence(root, 'optimizer-start.json')) == {'referenceCacheSha256': cache_hash,
        'referencePairCount': 200, 'optimizerStateInitiallyEmpty': True, 'optimizerSteps': 0}, 'Reference not bound before fresh optimizer')
    require(report.get('referenceCacheSha256') == cache_hash, 'Reported reference cache changed')
    observed = check_history(read_lines(evidence(root, 'training-history.jsonl')), train, pairs, references, cache_hash)
    require(observed == totals == (report.get('targetTokensSeen'), report.get('rejectedTargetTokensSeen')), 'Target token totals drift')
    require(report.get('optimizerSteps') == protocol.get('expectedOptimizerSteps') == 100 and report.get('examplesSeen') == 400
            and report.get('trainCount') == protocol.get('trainCount') == 200
            and report.get('developmentCount') == protocol.get('developmentCount') == 48, 'Run accounting drift')
    candidates, outputs = [], {}
    for epoch in (1, 2):
        records, metrics = evaluation(f'epoch-{epoch}-development')
        outputs[epoch] = records
        candidate = read(evidence(root, f'epoch-{epoch}-candidate.json'))
        require(candidate.get('epoch') == epoch and candidate.get('optimizerSteps') == epoch * 50
                and candidate.get('metrics') == metrics and candidate.get('gates') == required_gates(baseline, metrics), 'Candidate gates/accounting drift')
        checkpoint = root / f'epoch-{epoch}'
        inventory = {p.name for p in checkpoint.iterdir() if p.is_file()}
        require(inventory == {'README.md', 'adapter_config.json', 'adapter_model.safetensors'}, 'Checkpoint inventory drift')
        manifest(checkpoint, candidate.get('artifactHashes'), inventory)
        base.check_weights(root, epoch)
        candidates.append(candidate)
    selected = select_candidate(candidates)
    epoch = 2 if selected else None
    selection = read(evidence(root, 'selection.json'))
    boundaries(selection, validation=True)
    require(selection.get('selectedEpoch') == report.get('selectedEpoch') == epoch and selection.get('candidates') == candidates
            and selection.get('automaticEligibilityPassed') is bool(selected) and report.get('automaticEligibilityPassed') is bool(selected), 'Final-epoch selection drift')
    if selected:
        records, metrics = evaluation('selected-reload-development')
        revision.identical(outputs[2], records)
        require(all(required_gates(baseline, metrics).values()) and selection.get('savedAdapterOutputsIdentical') is True
                and report.get('status') == 'awaiting-semantic-review', 'Selected reload missing or changed')
    else:
        require(selection.get('savedAdapterOutputsIdentical') is False and report.get('status') == 'rejected-automatic-eligibility', 'Rejected run claimed a selected adapter')
    evaluations = {'parent-original-reproduction', 'baseline-development', 'parent-development', 'epoch-1-development', 'epoch-2-development'}
    if selected:
        evaluations.add('selected-reload-development')
    expected = frozen | {'protocol.json', 'started.json', 'parent-reproduction.json', 'parameters.json',
        'reference-cache-progress.jsonl', 'reference-cache.json', 'optimizer-start.json', 'training-history.jsonl',
        'epoch-1-candidate.json', 'epoch-2-candidate.json', 'selection.json', 'report.json', 'completion.json',
        'execution.log', 'supervisor-artifact-manifest.json'}
    expected |= {label + suffix for label in evaluations for suffix in ('.jsonl', '-metrics.json')}
    expected |= {f'epoch-{e}/{name}' for e in (1, 2) for name in ('README.md', 'adapter_config.json', 'adapter_model.safetensors')}
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
        'productionEligible': False, 'finalQualityValidated': False, 'referenceCacheSha256': cache_hash,
        'optimizerSteps': 100, 'pairPresentations': 400,
        'verifierVersion': 2, 'verifierSourceSha256': digest(Path(__file__)),
        'verificationCorrection': {
            'kind': 'original-runtime-contract-bytes-versus-frozen-json-serialization',
            'frozenVerifierPreserved': True,
            'frozenVerifierSha256': protocol['frozenFiles']['source/verify_qwen3_preference.py'],
            **check_runtime_contract(root, read(root / 'objective-qualification.json')['runtimeContractSha256'])}}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--run', type=Path, required=True)
    print(json.dumps(verify(parser.parse_args().run), indent=2))
