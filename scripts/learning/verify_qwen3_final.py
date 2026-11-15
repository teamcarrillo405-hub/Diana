"""Read-only reconstruction of a completed final research evaluation.

Never import final-case source, generate responses, or train. Saved losses are
checked and aggregated, not recomputed by inference. Hashes establish local
consistency, not independent attestation of physical execution or teaching value.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime
import hashlib
import json
from pathlib import Path, PurePosixPath, PureWindowsPath
import re

import verify_qwen3_4b_research as prior
import verify_qwen3_matched_sft as development
from verify_qwen3_4b_research import require, read, read_lines, digest, canonical, evidence, manifest, finite
from grounding_review_v3 import DIMENSIONS, build_packet, unique
from grounding_adjudication import prepare, assess, index

ROOT = Path(__file__).resolve().parents[2]
RESEARCH_ROOT = ROOT / 'artifacts/learning-engine/research'
MANIFEST_SHA = '6bb02f53190142d3df5a290724b0ce92143a1385a26770da0932c71c3b41ffe8'
AUDIT_SHA = '3641ad7824961bec23e07e190a9585e3aba7aa96a99940b3a7e1f14fb29690d9'
MODULE_SHA = 'e5b11cb1972db7b40aa54eead763b1c6ba925c29d15ba506575ec858c4ff8efb'
ROWS_SHA = '0f167df4eebea0ac93a6074a1f2aa074d7a766ba036541665c1320dc261b88c4'
DATASET_ID = 'qwen3-fresh-educational-grounding-100-v1'
SETTINGS = {'seed': 81173, 'dtype': 'bfloat16', 'device': 'cuda:0',
    'maxSequence': 768, 'maxNewTokens': 128, 'maxSeconds': 7200, 'threads': 4,
    'attentionImplementation': 'eager', 'decoding': 'greedy', 'useCache': True,
    'optimizerSteps': 0, 'expectedCasesPerArm': 100, 'expectedArms': 3}
SOURCES = development.SOURCES | {'evaluate_qwen3_final.py', 'verify_qwen3_final.py',
    'verify_qwen3_preference.py', 'verify_qwen3_preference_v2.py',
    'verify_qwen3_grounding_revision.py', 'grounding_review_v3.py', 'grounding_adjudication.py'}
ARMS = ('baseline-final', 'adapter-final', 'reload-final')
FROZEN = {'environment-contract.json', 'qualification.json', 'model-provenance.json',
    'final-manifest.json', 'final-content-audit.json', 'development-review-bundle.json',
    'development-semantic-gate.json', 'comparison-exposure.json'} | {'source/' + name for name in SOURCES}
EXECUTION = {'protocol.json', 'started.json', 'worker-started.json', 'final-opened.json',
    'overlap-counts.json', 'final-rows.json', 'tokenization.json'} | {
    label + suffix for label in ARMS for suffix in ('.jsonl', '-metrics.json')}
COMPLETION = {'report.json', 'completion.json', 'execution.log', 'supervisor-artifact-manifest.json'}


def recorded_relative_parts(value, checkout):
    """Accept only this checkout's native path or its Windows/WSL drive alias.

    Use pure paths so the interpretation of an original absolute path does not
    depend on the host reading it. Never rewrite the stored provenance string.
    """
    require(isinstance(value, str) and value and '\x00' not in value, 'Invalid recorded evidence path')
    normalized = value.replace('\\', '/')
    require(not normalized.startswith('//') and all(part not in ('.', '..') for part in normalized.split('/')),
            'Recorded evidence path contains traversal or network location')
    checkout = str(checkout).replace('\\', '/')
    windows_root = PureWindowsPath(checkout)
    aliases = []
    if windows_root.is_absolute() and re.fullmatch(r'[A-Za-z]:', windows_root.drive):
        aliases.append((PureWindowsPath, windows_root))
        aliases.append((PurePosixPath, PurePosixPath('/mnt/' + windows_root.drive[0].lower(), *windows_root.parts[1:])))
    else:
        posix_root = PurePosixPath(checkout)
        require(posix_root.is_absolute(), 'Verifier checkout must be absolute')
        aliases.append((PurePosixPath, posix_root))
        if len(posix_root.parts) >= 3 and posix_root.parts[1] == 'mnt' and re.fullmatch(r'[a-z]', posix_root.parts[2]):
            aliases.append((PureWindowsPath, PureWindowsPath(posix_root.parts[2] + ':/', *posix_root.parts[3:])))
    for path_type, approved_root in aliases:
        candidate = path_type(normalized)
        if not candidate.is_absolute():
            continue
        try:
            relative = candidate.relative_to(approved_root)
        except ValueError:
            continue
        require(all(':' not in part and not part.endswith(('.', ' ')) for part in relative.parts),
                'Noncanonical recorded evidence component')
        return relative.parts
    raise ValueError('Recorded evidence path is outside this checkout and its explicit WSL alias')


def recorded_path(value):
    from prepare_qwen3_4b_research import safe_path
    mapped = ROOT.joinpath(*recorded_relative_parts(value, ROOT))
    safe_path(mapped)
    require(mapped.resolve().is_relative_to(ROOT.resolve()), 'Mapped evidence escaped the current checkout')
    return mapped


def exact_flags(record, flags):
    for name, expected in flags.items():
        require(type(record.get(name)) is type(expected) and record[name] == expected,
                'Unsupported research boundary: ' + name)


def utc(value):
    require(isinstance(value, str), 'Missing receipt timestamp')
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    require(parsed.utcoffset() is not None, 'Receipt timestamp needs a timezone')
    return parsed


def check_claim(root, protocol, report_hash):
    claim_path = RESEARCH_ROOT / 'qwen3-final-consumption' / (ROWS_SHA + '.json')
    require(recorded_path(protocol.get('globalConsumptionClaim')).resolve() == claim_path.resolve(),
            'Global consumption claim location changed')
    claim = read(evidence(claim_path.parent, claim_path.name))
    require(claim == read(evidence(root, 'started.json')), 'Global and run claims disagree')
    require(claim.get('datasetId') == DATASET_ID and claim.get('rowsSha256') == ROWS_SHA
            and claim.get('protocolSha256') == report_hash and recorded_path(claim.get('output')).resolve() == root.resolve(),
            'Claim does not bind this dataset, protocol and output')
    exact_flags(claim, {'claimedBeforeFinalImport': True, 'productionEligible': False})
    worker = read(evidence(root, 'worker-started.json'))
    require(worker == {'protocolSha256': report_hash}, 'Worker protocol mismatch')
    opened = read(evidence(root, 'final-opened.json'))
    require(opened.get('moduleSha256') == MODULE_SHA
            and utc(protocol.get('createdAt')) <= utc(claim.get('claimedAt')) <= utc(opened.get('openedAt')),
            'Final opening is not bound to the seal and claim chronology')


def check_review(bundle, values, rows, base, tuned, report_hash, epoch):
    """Independently bind saved judgments to the verified selected development arm."""
    packet, key, first, second = (values[name] for name in ('packet', 'key', 'first', 'second'))
    expected, _ = build_packet(rows, base, tuned, report_hash, 'validation', epoch)
    for name in ('schema', 'reportSha256', 'partition', 'diagnosticEpoch', 'dimensions', 'instructions', 'productionEligible'):
        require(packet.get(name) == expected[name], 'Development review contract drift: ' + name)
    cases, mappings, originals, baselines, adapters = map(unique, (packet['cases'], key['cases'], rows, base, tuned))
    require(len(cases) == 48 and cases.keys() == mappings.keys() == originals.keys() == baselines.keys() == adapters.keys(),
            'Incomplete development review binding')
    for identifier, case in cases.items():
        row, mapping = originals[identifier], mappings[identifier]
        require({mapping.get('A'), mapping.get('B')} == {'base', 'adapter'}, 'Development arm pair changed')
        wanted = {'id': identifier, 'source': row['source'], 'question': row['question'],
            'subject': row.get('subject', 'unspecified'), 'level': row.get('level', 'unspecified'),
            'answerability': row.get('answerability', 'insufficient' if row['expectedAbstention'] else 'answerable')}
        for arm in ('A', 'B'):
            wanted['response' + arm] = (baselines if mapping[arm] == 'base' else adapters)[identifier]['output']
        wanted['caseHash'] = canonical(wanted)
        require(case == wanted, 'Review substituted development evidence, annotation or response')
    receipt_roles = {'first', 'second'} | ({'adjudication'} if 'adjudication' in values else set())
    receipts = bundle.get('reviewerReceipts', [])
    require(len(receipts) == len(receipt_roles) and {r.get('role') for r in receipts} == receipt_roles,
            'Incomplete independent-review receipts')
    reviewer_ids = []
    for receipt in receipts:
        role = receipt['role']
        require(receipt.get('reviewerId') == values[role].get('reviewerId')
                and receipt.get('reviewFileSha256') == bundle['files'][role]['sha256'], 'Review receipt binding drift')
        exact_flags(receipt, {'independentlyAuthored': True, 'savedBeforeUnblinding': True})
        require('reviewerUnblindedAtUtc' in receipt, 'Missing unblinding attestation')
        if receipt['reviewerUnblindedAtUtc'] is None:
            exact_flags(receipt, {'stillBlinded': True})
            end = receipt.get('receiptRecordedAtUtc')
        else:
            require(receipt.get('stillBlinded', False) is False, 'Contradictory unblinding receipt')
            end = receipt['reviewerUnblindedAtUtc']
        require(utc(receipt.get('savedAtUtc')) <= utc(end), 'Review saved after recorded unblinding')
        reviewer_ids.append(receipt['reviewerId'])
    require(len(set(reviewer_ids)) == len(reviewer_ids), 'Repeated independent reviewer')
    disputes, summaries = prepare(packet, key, first, second)
    if disputes['disputes']:
        require('adjudication' in values and 'disputes' in values, 'Missing independent dispute adjudication')
        resolved = assess(packet, key, first, second, values['disputes'], values['adjudication'])
        ratings = resolved['finalRatings']
    else:
        require('adjudication' not in values, 'Unexpected adjudication without disputes')
        resolved, ratings = summaries[0], first['ratings']
    one, two, final = map(index, (first['ratings'], second['ratings'], ratings))
    passes, fabricated, agreed_failures = 0, 0, []
    counts = {name: 0 for name in DIMENSIONS}
    for row in rows:
        arm = next(arm for arm in ('A', 'B') if mappings[row['id']][arm] == 'adapter')
        identity = (row['id'], arm)
        rejected = not all(one[identity][d] for d in DIMENSIONS) and not all(two[identity][d] for d in DIMENSIONS)
        if rejected:
            agreed_failures.append(row['id'])
        passes += int(all(final[identity][d] for d in DIMENSIONS) and not rejected)
        fabricated += int(not final[identity]['noFabricatedClaims'])
        for name in DIMENSIONS:
            counts[name] += int(final[identity][name])
    require(passes >= 46 and fabricated == 0, 'Development semantic prerequisite did not pass 95% with zero fabrication')
    return {'cases': 48, 'completePasses': passes, 'completePassRate': passes / 48,
        'fabricatedResponses': fabricated, 'dimensionPassCounts': counts,
        'agreedFailureCaseIds': agreed_failures, 'originalReviews': summaries,
        'resolvedReview': resolved, 'developmentSemanticGatePassed': True,
        'reviewerIndependenceVerifiedBySoftware': False, 'receiptChronologyVerifiedBySoftware': False,
        'productionEligible': False, 'educatorQualificationVerified': False}


def overlap_counts(rows, known):
    return {'ids': len({r['id'] for r in rows} & {r['id'] for r in known}),
        'sources': len({r['source'] for r in rows} & {r['source'] for r in known}),
        'sourceQuestionPairs': len({(r['source'], r['question']) for r in rows} & {(r['source'], r['question']) for r in known})}


def check_rows(rows, known, comparison=None):
    require(isinstance(rows, list) and len(rows) == 100 and len(unique(rows)) == 100, 'Incomplete final case inventory')
    require(canonical(rows) == ROWS_SHA, 'Sealed canonical final rows changed')
    require(all(type(row.get('expectedAbstention')) is bool for row in rows)
            and Counter(row['expectedAbstention'] for row in rows) == {False: 60, True: 40}, 'Final answerability mix changed')
    overlap = overlap_counts(rows, known + (comparison or []))
    require(not any(overlap.values()), 'Final cases overlap training or development history')
    if comparison is not None:
        overlap.update(fittingAncestry=overlap_counts(rows, known), comparisonExposure=overlap_counts(rows, comparison))
    return overlap


def training_ancestry(run, committed):
    """Reconstruct the complete fitting chain and bind it to the frozen inventory."""
    stages = (('diana-qwen3-matched-sft-protocol-v1', 300),
              ('diana-qwen3-preference-protocol-v1', 200),
              ('diana-qwen3-grounding-revision-protocol-v1', 600),
              ('diana-qwen3-grounding-protocol-v1', 440))
    names = ('qwen3-run-010', 'qwen3-run-008', 'qwen3-run-007', 'qwen3-run-006')
    require(isinstance(committed, list) and len(committed) == len(stages),
            'Incomplete frozen fitting ancestry inventory')
    known, visited, inventory = [], set(), []
    current = Path(run)
    parent_protocol_hash = None
    for position, (schema, train_count) in enumerate(stages):
        require(current.name == names[position], 'Unexpected fitting ancestry run identity')
        require(current.resolve().is_relative_to(RESEARCH_ROOT.resolve()), 'Fitting ancestor outside research directory')
        require(current.resolve() not in visited, 'Cyclic fitting ancestry')
        visited.add(current.resolve())
        protocol = read(evidence(current, 'protocol.json'))
        require(protocol.get('schema') == schema, 'Incomplete or reordered fitting ancestry')
        if parent_protocol_hash is not None:
            require(digest(current / 'protocol.json') == parent_protocol_hash,
                    'Fitting parent protocol differs from child commitment')
        require(type(protocol.get('trainCount')) is int and protocol['trainCount'] == train_count
                and type(protocol.get('developmentCount')) is int and protocol['developmentCount'] == 48,
                'Fitting ancestor protocol counts changed')
        train = read(evidence(current, 'train.json'))
        dev = read(evidence(current, 'development.json'))
        require(isinstance(train, list) and len(train) == train_count and len(unique(train)) == train_count,
                'Incomplete fitting ancestor training rows')
        require(isinstance(dev, list) and len(dev) == 48 and len(unique(dev)) == 48,
                'Incomplete fitting ancestor development rows')
        saved = committed[position]
        require(isinstance(saved, dict) and set(saved) == {'root', 'protocolSha256', 'trainSha256',
                'developmentSha256', 'trainRows', 'developmentRows'}, 'Invalid fitting ancestry inventory fields')
        require(recorded_path(saved.get('root')).resolve() == current.resolve(),
                'Frozen fitting ancestry root differs from committed parent chain')
        wanted = {'root': saved['root'], 'protocolSha256': digest(current / 'protocol.json'),
            'trainSha256': digest(current / 'train.json'), 'developmentSha256': digest(current / 'development.json'),
            'trainRows': len(train), 'developmentRows': len(dev)}
        require(protocol.get('frozenFiles', {}).get('train.json') == wanted['trainSha256']
                and protocol.get('frozenFiles', {}).get('development.json') == wanted['developmentSha256'],
                'Fitting rows differ from ancestor protocol commitment')
        require(type(saved.get('trainRows')) is int and type(saved.get('developmentRows')) is int
                and saved == wanted, 'Frozen fitting ancestry hashes or counts changed')
        inventory.append(wanted)
        known.extend(train)
        known.extend(dev)
        if position < len(stages) - 1:
            parent = protocol.get('parent')
            require(isinstance(parent, dict), 'Missing fitting parent commitment')
            parent_protocol_hash = parent.get('files', {}).get('protocol.json')
            require(isinstance(parent_protocol_hash, str) and re.fullmatch(r'[0-9a-f]{64}', parent_protocol_hash),
                    'Missing fitting parent protocol digest')
            current = recorded_path(parent.get('root'))
        else:
            require(protocol.get('parent') is None, 'Unexpected additional fitting ancestor')
    return known, inventory


def comparison_exposure(run, committed, ancestry):
    """Bind the matched DPO sibling as evaluation exposure, never initialization."""
    require(isinstance(committed, dict) and set(committed) == {
        'schema', 'verificationReceiptSha256', 'trainingCanonicalSha256', 'developmentCanonicalSha256',
        'root', 'protocolSha256', 'reportSha256', 'trainSha256', 'developmentSha256',
        'trainRows', 'developmentRows', 'sameTrainingData', 'initializationAncestor'},
        'Incomplete comparison exposure inventory')
    sibling = recorded_path(committed.get('root'))
    require(sibling.resolve() == (run.parent / 'qwen3-run-009').resolve()
            and sibling.resolve() not in {recorded_path(item['root']).resolve() for item in ancestry},
            'Comparison sibling cannot be an initialization ancestor or foreign run')
    exact_flags(committed, {'trainRows': 300, 'developmentRows': 48,
        'sameTrainingData': True, 'initializationAncestor': False})
    fitting_protocol = read(evidence(run, 'protocol.json'))
    comparator = fitting_protocol.get('comparator', {})
    require(comparator == read(evidence(run, 'comparator-evidence.json'))
            and digest(run / 'comparator-evidence.json') == fitting_protocol.get('comparatorEvidenceSha256'),
            'Copied matched comparison evidence commitment differs')
    require(digest(evidence(run, 'comparator-verification.json')) == development.COMPARATOR_RECEIPT
            == comparator.get('verificationReceiptSha256'), 'Comparison verification receipt differs')
    require(recorded_path(comparator.get('root')).resolve() == sibling.resolve()
            and comparator.get('sameTrainingData') is True and comparator.get('initializationAncestor') is False,
            'Comparison exposure differs from matched development commitment')
    sibling_protocol = read(evidence(sibling, 'protocol.json'))
    require(sibling_protocol.get('schema') == 'diana-qwen3-evidence-integrity-protocol-v1',
            'Comparison sibling protocol schema changed')
    train, dev = read(evidence(sibling, 'train.json')), read(evidence(sibling, 'development.json'))
    require(isinstance(train, list) and len(train) == len(unique(train)) == 300
            and isinstance(dev, list) and len(dev) == len(unique(dev)) == 48,
            'Comparison exposure population changed')
    wanted = {'schema': 'diana-qwen3-final-comparison-exposure-v1',
        'root': committed['root'], 'protocolSha256': digest(sibling / 'protocol.json'),
        'reportSha256': digest(evidence(sibling, 'report.json')),
        'verificationReceiptSha256': development.COMPARATOR_RECEIPT,
        'trainSha256': digest(sibling / 'train.json'), 'developmentSha256': digest(sibling / 'development.json'),
        'trainingCanonicalSha256': canonical(train), 'developmentCanonicalSha256': canonical(dev),
        'trainRows': 300, 'developmentRows': 48, 'sameTrainingData': True, 'initializationAncestor': False}
    require(committed == wanted, 'Frozen comparison exposure hashes differ')
    require(wanted['trainingCanonicalSha256'] == development.TRAIN_CANONICAL
            == comparator.get('trainingCanonicalSha256')
            and wanted['developmentCanonicalSha256'] == prior.DATA_HASHES['development']
            == comparator.get('developmentCanonicalSha256'), 'Comparison canonical row identity changed')
    require(wanted['protocolSha256'] == development.COMPARATOR_PROTOCOL == comparator.get('protocolSha256')
            and wanted['reportSha256'] == development.COMPARATOR_REPORT == comparator.get('reportSha256'),
            'Immutable comparison sibling identity differs')
    for field, filename in (('protocolSha256', 'protocol.json'), ('reportSha256', 'report.json'),
                            ('trainSha256', 'train.json'), ('developmentSha256', 'development.json')):
        require(comparator.get('files', {}).get(filename) == wanted[field],
                'Comparison file differs from matched development commitment')
    for filename, rows, field in (('train.json', train, 'train'), ('development.json', dev, 'development')):
        require(sibling_protocol.get('frozenFiles', {}).get(filename) == digest(sibling / filename)
                and sibling_protocol.get('dataCanonicalHashes', {}).get(field) == canonical(rows),
                'Comparison rows differ from original frozen commitments')
        require(rows == read(evidence(run, filename)), 'Matched comparison does not use identical rows')
    return train + dev, wanted


def check_tokenization(items, rows, tokenizer, system):
    require(isinstance(items, list) and len(items) == len(rows) == 100, 'Incomplete final tokenization')
    for item, row in zip(items, rows, strict=True):
        prefix, full, labels = item.get('prefix'), item.get('full'), item.get('labels')
        require(isinstance(prefix, list) and prefix and isinstance(full, list) and len(full) > len(prefix), 'Invalid final token sequence')
        require(all(type(token) is int and 0 <= token < 151936 for token in prefix + full), 'Invalid tokenizer ID')
        require(full[:len(prefix)] == prefix and labels == [-100] * len(prefix) + full[len(prefix):], 'Target leaked into prompt or loss mask')
        require(type(item.get('targetTokens')) is int and item['targetTokens'] == len(full) - len(prefix), 'Target token count drift')
        require(len(full) <= 768 and len(prefix) + 128 <= 768, 'Undeclared final truncation')
        messages = [{'role': 'system', 'content': system},
                    {'role': 'user', 'content': f"SOURCE: {row['source']}\nQUESTION: {row['question']}"}]
        expected_prefix = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True, return_dict=False)
        expected_full = tokenizer.apply_chat_template(messages + [{'role': 'assistant', 'content': row['target']}],
            tokenize=True, add_generation_prompt=False, return_dict=False)
        require(prefix == expected_prefix and full == expected_full, 'Final tokenizer reconstruction differs from saved evidence')


def check_records(records, rows, encoded, tokenizer):
    from qwen3_evidence_integrity_metrics import score
    require(len(records) == len(rows) == len(encoded) == 100, 'Incomplete final arm')
    for record, row, item in zip(records, rows, encoded, strict=True):
        require(record.get('id') == row['id'] and type(record.get('targetTokens')) is int
                and record['targetTokens'] == item['targetTokens'], 'Final identity or target accounting changed')
        finite(record.get('targetTokenLoss'), 'final target loss')
        tokens = record.get('generatedTokenIds')
        require(isinstance(tokens, list) and 0 < len(tokens) <= 128
                and all(type(token) is int and 0 <= token < 151936 for token in tokens), 'Invalid final generated IDs')
        require(isinstance(record.get('output'), str) and tokenizer.decode(tokens, skip_special_tokens=True) == record['output'],
                'Final raw response differs from decoded generated IDs')
        require(record.get('diagnostics') == score(record['output'], row), 'Final diagnostic fabrication')
    return development.aggregate(records, rows)


def check_reproduction(adapted, reloaded):
    require(len(adapted) == len(reloaded) == 100, 'Incomplete final adapter reproduction')
    for original, repeated in zip(adapted, reloaded, strict=True):
        require(all(original.get(key) == repeated.get(key) for key in ('id', 'output', 'generatedTokenIds', 'targetTokens')),
                'Final saved adapter reproduction differs')


def _verify(root):
    from prepare_qwen3_4b_research import safe_path, validate_snapshot
    from transformers import AutoTokenizer
    root = Path(root).absolute()
    safe_path(root)
    require(root.resolve().is_relative_to(RESEARCH_ROOT.resolve()), 'Final evidence outside research directory')
    report = read(evidence(root, 'report.json'))
    require(report.get('schema') == 'diana-qwen3-final-evaluation-v1'
            and report.get('status') == 'awaiting-independent-final-semantic-review', 'Incomplete final report')
    exact_flags(report, {'testOpened': True, 'testEvaluations': 1, 'forwardPassArms': 3, 'optimizerSteps': 0,
        'finalCases': 100, 'savedAdapterOutputsIdentical': True, 'mechanicalMetricsOnly': True,
        'finalSemanticQualityValidated': False, 'productionEligible': False, 'educatorReviewed': False,
        'researchOnly': True, 'providerCalls': 0})
    protocol = read(evidence(root, 'protocol.json'))
    protocol_hash = digest(root / 'protocol.json')
    require(report.get('protocolSha256') == protocol_hash, 'Final protocol digest mismatch')
    require(protocol.get('schema') == 'diana-qwen3-final-protocol-v1' and protocol.get('model') == prior.MODEL
            and protocol.get('revision') == prior.REVISION and canonical(protocol.get('settings')) == canonical(SETTINGS),
            'Fixed final model or recipe drift')
    require(protocol.get('systemSha256') == development.SYSTEM_HASH
            and hashlib.sha256(protocol.get('system', '').encode()).hexdigest() == development.SYSTEM_HASH, 'Final prompt changed')
    exact_flags(protocol, {'testOpened': False, 'testEvaluations': 0, 'developmentSemanticGatePassed': True,
        'finalSemanticQualityValidated': False, 'productionEligible': False, 'educatorReviewed': False, 'researchOnly': True})
    require(protocol.get('datasetId') == DATASET_ID and protocol.get('finalRowsSha256') == ROWS_SHA
            and protocol.get('finalModuleSha256') == MODULE_SHA and protocol.get('finalManifestSha256') == MANIFEST_SHA
            and protocol.get('finalContentAuditSha256') == AUDIT_SHA, 'Final seal contract drift')
    bundle = read(evidence(root, 'development-review-bundle.json'))
    require(bundle.get('schema') == 'diana-development-semantic-gate-bundle-v1', 'Unknown development review bundle')
    roles = set(bundle.get('files', {}))
    require(roles in ({'packet', 'key', 'first', 'second'}, {'packet', 'key', 'first', 'second', 'disputes', 'adjudication'}),
            'Invalid development review roles')
    frozen = FROZEN | {'gate-inputs/' + role + '.json' for role in roles}
    files = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    require(files == frozen | EXECUTION | COMPLETION, 'Missing, interrupted or unexpected final artifact')
    manifest(root, protocol.get('frozenFiles'), frozen)
    manifest(root, report.get('artifactHashes'), frozen | EXECUTION)
    for name in SOURCES:
        require(digest(evidence(Path(__file__).parent, name)) == digest(root / 'source' / name), 'Frozen final source drift: ' + name)
    for name, expected_hash in (('final-manifest.json', MANIFEST_SHA), ('final-content-audit.json', AUDIT_SHA)):
        require(digest(root / name) == expected_hash, 'Final metadata seal changed')
    # The final module is deliberately not read or imported. Its reviewed source
    # digest is committed above; the saved canonical rows are checked below.
    supervisor = read(evidence(root, 'supervisor-artifact-manifest.json'))
    exact_flags(supervisor, {'productionEligible': False})
    manifest(root, supervisor.get('files'), files - {'supervisor-artifact-manifest.json'})
    require(read(evidence(root, 'completion.json')) == {'reportSha256': digest(root / 'report.json'), 'productionEligible': False},
            'Final completion receipt changed')
    check_claim(root, protocol, protocol_hash)
    finite(report.get('elapsedSeconds'), 'final elapsed time')
    require(0 < report['elapsedSeconds'] <= 7200, 'Final execution exceeded fixed runtime')
    run = recorded_path(protocol['developmentRun'])
    require(not root.resolve().is_relative_to(run.resolve()), 'Invalid development evidence location')
    checked = development.verify(run)
    epoch = protocol.get('selectedEpoch')
    require(type(epoch) is int and epoch == 3 and report.get('selectedEpoch') == epoch
            and checked.get('verified') is True and checked.get('automaticEligibilityPassed') is True
            and checked.get('selectedEpoch') == epoch, 'Selected final adapter is not verified development selection')
    selected_files = {'report.json', 'protocol.json', 'selection.json', 'supervisor-artifact-manifest.json',
        'comparator-evidence.json', 'comparator-verification.json',
        f'epoch-{epoch}/adapter_config.json', f'epoch-{epoch}/adapter_model.safetensors'}
    manifest(run, protocol.get('developmentFiles'), selected_files)
    values = {}
    for role, item in bundle['files'].items():
        saved = evidence(root, 'gate-inputs/' + role + '.json')
        original = recorded_path(item['path'])
        require(digest(evidence(original.parent, original.name)) == item['sha256'] == digest(saved),
                'Original and frozen review evidence disagree')
        values[role] = read(saved)
    bundle_path = recorded_path(protocol['reviewBundle'])
    require(digest(evidence(bundle_path.parent, bundle_path.name)) == digest(root / 'development-review-bundle.json'),
            'Development review bundle changed')
    gate = check_review(bundle, values, read(evidence(run, 'development.json')),
        read_lines(evidence(run, 'baseline-development.jsonl')), read_lines(evidence(run, f'epoch-{epoch}-development.jsonl')),
        checked['reportSha256'], epoch)
    require(gate == read(evidence(root, 'development-semantic-gate.json')), 'Recomputed development semantic prerequisite differs')
    contract = read(evidence(root, 'environment-contract.json'))
    prior.check_environment(protocol.get('environment', {}), contract)
    prior.check_qualification(root, contract)
    require(digest(root / 'model-provenance.json') == prior.PROVENANCE_SHA, 'Final publisher provenance changed')
    model_root = recorded_path(protocol['modelRoot'])
    snapshot = validate_snapshot(model_root)
    require(digest(evidence(model_root, 'model-provenance.json')) == prior.PROVENANCE_SHA, 'Final base publisher provenance differs')
    # Parent verification already validates model tensor geometry and both LoRA checkpoints.
    known, ancestry = training_ancestry(run, protocol.get('trainingAncestry'))
    require(protocol.get('comparisonExposure') == read(evidence(root, 'comparison-exposure.json'))
            and protocol.get('comparisonExposureSha256') == digest(root / 'comparison-exposure.json'),
            'Frozen comparison exposure commitment differs')
    comparison_rows, exposure = comparison_exposure(run, protocol.get('comparisonExposure'), ancestry)
    rows = read(evidence(root, 'final-rows.json'))
    overlap = check_rows(rows, known, comparison_rows)
    require(overlap == read(evidence(root, 'overlap-counts.json')), 'Saved overlap evidence differs')
    tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True, trust_remote_code=False)
    encoded = read(evidence(root, 'tokenization.json'))
    check_tokenization(encoded, rows, tokenizer, protocol['system'])
    records, metrics = {}, {}
    for label in ARMS:
        records[label] = read_lines(evidence(root, label + '.jsonl'))
        metrics[label] = check_records(records[label], rows, encoded, tokenizer)
        require(metrics[label] == read(evidence(root, label + '-metrics.json')), 'Final aggregate metric drift: ' + label)
        field = 'baseline' if label == 'baseline-final' else label.split('-')[0]
        require(report.get(field) == metrics[label], 'Reported final metrics differ: ' + field)
    check_reproduction(records['adapter-final'], records['reload-final'])
    _, rechecked_ancestry = training_ancestry(run, protocol.get('trainingAncestry'))
    require(rechecked_ancestry == ancestry, 'Fitting ancestry changed during final reconstruction')
    _, rechecked_exposure = comparison_exposure(run, protocol.get('comparisonExposure'), rechecked_ancestry)
    require(rechecked_exposure == exposure, 'Comparison exposure changed during final reconstruction')
    return {'verified': True, 'reportSha256': digest(root / 'report.json'), 'protocolSha256': protocol_hash,
        'datasetId': DATASET_ID, 'finalRowsSha256': ROWS_SHA, 'selectedEpoch': epoch,
        'finalCases': 100, 'verifiedArmRecords': 300, 'testOpened': True, 'testEvaluations': 1,
        'optimizerSteps': 0, 'savedAdapterOutputsIdentical': True, 'developmentSemanticGatePassed': True,
        'baseline': metrics['baseline-final'], 'adapter': metrics['adapter-final'], 'reload': metrics['reload-final'],
        'mechanicalMetricsOnly': True, 'semanticQualityValidated': False, 'finalSemanticQualityValidated': False,
        'productionEligible': False, 'educatorReviewed': False, 'researchOnly': True,
        'lossRecomputedByInference': False, 'physicalExecutionIndependentlyAttested': False,
        'reviewerIndependenceVerifiedBySoftware': False,
        'limitations': ['Local evidence consistency only; no independent physical execution attestation',
            'Recorded losses are validated and aggregated without running model inference',
            'Final semantic review, qualified educator review and learner evidence remain separate']}


def verify(root):
    from train_qwen3_4b_research import deny_network
    with deny_network():
        return _verify(root)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True)
    print(json.dumps(verify(parser.parse_args().run), indent=2))
