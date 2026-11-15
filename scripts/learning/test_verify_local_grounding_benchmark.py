"""Adversarial checks against actual Ollama and durable-artifact schemas."""
from copy import deepcopy
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import shutil
import unittest
from uuid import uuid4

import verify_local_grounding_benchmark as v


ROW = {'id': 'fixture-supported', 'source': 'The observatory flag was blue.',
       'question': 'Which color was recorded?', 'expectedAbstention': False,
       'acceptedQuotes': ['blue'], 'nextStepAnchors': ['flag'], 'requiredNextStepConcepts': []}
OUTPUT = 'EVIDENCE: The observatory flag was blue.\nNEXT: Which word describes the flag?'


@contextmanager
def temporary_directory():
    # Explicit default mkdir permissions avoid Windows sandbox tempfile mode-700 ACL issues.
    base = Path(__file__).resolve().parents[2]
    root = base / ('.local-grounding-verifier-test-' + uuid4().hex)
    root.mkdir()
    try:
        yield root
    finally:
        assert root.resolve().is_relative_to(base) and root.name.startswith('.local-grounding-verifier-test-')
        shutil.rmtree(root)


def response():
    return {'model': 'qwen3-vl:30b', 'created_at': '2026-09-28T00:00:00Z',
            'message': {'role': 'assistant', 'content': OUTPUT, 'thinking': ''},
            'done': True, 'done_reason': 'stop', 'total_duration': 1_000_000_000,
            'load_duration': 100_000_000, 'prompt_eval_count': 100,
            'prompt_eval_duration': 200_000_000, 'eval_count': 30, 'eval_duration': 600_000_000}


def resident():
    return {'models': [{'name': 'qwen3-vl:30b', 'model': 'qwen3-vl:30b', 'digest': 'a' * 64,
                        'size': 18_000_000_000, 'size_vram': 12_000_000_000, 'context_length': 8192}]}


def record():
    request = v.request_for('qwen3-vl:30b', ROW)
    result = {'arm': 0, 'caseIndex': 0, 'id': ROW['id'], 'request': request, 'response': response(),
              'output': OUTPUT, 'diagnostics': v.score(OUTPUT, ROW), 'targetTokenLoss': None,
              'targetTokens': None, 'wallSeconds': 1.1, 'startedUtc': '2026-09-28T00:00:00Z',
              'finishedUtc': '2026-09-28T00:00:01.1Z', 'residency': resident(),
              'exchange': 'raw/exchange-00000.json', 'modelDigest': 'a' * 64}
    exchange = {'method': 'POST', 'url': v.ENDPOINT + '/api/chat', 'requestBody': request,
                'responseStatus': 200, 'responseBody': response(), 'responseText': json.dumps(response()), 'wallSeconds': 1.1}
    return result, {'raw/exchange-00000.json': exchange}


class RawResponseTests(unittest.TestCase):
    def test_accept_real_schema_without_semantic_acceptance(self):
        self.assertEqual(v.check_response(response(), 'qwen3-vl:30b'), OUTPUT)

    def test_reject_bad_raw_results(self):
        mutations = [lambda r: r.update(done=False), lambda r: r.update(done_reason='length'),
                     lambda r: r.update(model='other'), lambda r: r['message'].update(content=''),
                     lambda r: r['message'].update(thinking={'invalid': 'type'}),
                     lambda r: r['message'].update(role='user'),
                     lambda r: r.update(eval_count=True), lambda r: r.update(eval_count=4096),
                     lambda r: r.update(eval_count=-1), lambda r: r.update(prompt_eval_count=0),
                     lambda r: r.update(eval_duration=0), lambda r: r.update(total_duration=1),
                     lambda r: r.update(load_duration=float('nan'))]
        for mutate in mutations:
            with self.subTest(mutation=mutate):
                r = response(); mutate(r)
                with self.assertRaises(ValueError):
                    v.check_response(r, 'qwen3-vl:30b')

    def test_model_thinking_cannot_replace_empty_content(self):
        r = response(); r['message'].update(content='', thinking=OUTPUT)
        with self.assertRaises(ValueError):
            v.check_response(r, 'qwen3-vl:30b')

    def test_missing_thinking_permitted(self):
        r = response(); del r['message']['thinking']
        self.assertEqual(v.check_response(r, 'qwen3-vl:30b'), OUTPUT)

    def test_thinking_preserved_but_excluded_from_scored_content(self):
        r = response(); r['message']['thinking'] = 'Private intermediate reasoning; not final answer.'
        self.assertEqual(v.check_response(r, 'qwen3-vl:30b'), OUTPUT)
        self.assertTrue(r['message']['thinking'])

    def test_raw_exchange_requires_loopback_exact(self):
        _, exchanges = record(); raw = next(iter(exchanges.values()))
        for url in ['https://provider.example/api/chat', 'http://localhost:11434/api/chat',
                    v.ENDPOINT + '.evil/api/chat', v.ENDPOINT + '/api/pull']:
            changed = deepcopy(raw); changed['url'] = url
            with self.assertRaises(ValueError):
                v.check_exchange(changed)


class RecordTests(unittest.TestCase):
    model = {'name': 'qwen3-vl:30b', 'digest': 'a' * 64}

    def test_exact_request_and_raw_content_valid(self):
        r, exchanges = record()
        v.check_record(r, ROW, self.model, 0, 0, exchanges)

    def test_tampering_despite_locally_consistent_record(self):
        mutations = [lambda r: r.update(id='different'), lambda r: r.update(caseIndex=1),
                     lambda r: r.update(output=OUTPUT + ' '),
                     lambda r: r.update(targetTokenLoss=0.1),
                     lambda r: r['diagnostics'].update(groundedCasePass=False),
                     lambda r: r['request']['options'].update(seed=81174),
                     lambda r: r['request'].update(think=False),
                     lambda r: r['request']['messages'][1].update(content='Target leakage'),
                     lambda r: r['residency']['models'][0].update(digest='b' * 64),
                     lambda r: r['residency']['models'][0].update(context_length=4096),
                     lambda r: r['residency']['models'][0].update(size_vram=19_000_000_000),
                     lambda r: r.update(finishedUtc='2026-09-27T00:00:00Z'),
                     lambda r: r.update(wallSeconds=100)]
        for mutate in mutations:
            r, exchanges = record(); mutate(r)
            # Re-signing or changing the transport copy does not make the evidence valid.
            exchanges[r['exchange']]['requestBody'] = deepcopy(r['request'])
            exchanges[r['exchange']]['responseBody'] = deepcopy(r['response'])
            exchanges[r['exchange']]['wallSeconds'] = r['wallSeconds']
            with self.subTest(mutation=mutate), self.assertRaises(ValueError):
                v.check_record(r, ROW, self.model, 0, 0, exchanges)

    def test_fixed_prompt_contains_no_target(self):
        request = v.request_for('qwen3-vl:30b', {**ROW, 'target': 'SECRET ANSWER'})
        self.assertEqual(request['messages'], [{'role': 'system', 'content': v.SYSTEM},
            {'role': 'user', 'content': 'SOURCE: The observatory flag was blue.\nQUESTION: Which color was recorded?'}])
        self.assertNotIn('SECRET ANSWER', json.dumps(request))

    def test_hand_calculated_aggregates(self):
        a, _ = record(); b = deepcopy(a); b['wallSeconds'] = 3.1
        b['response']['eval_count'] = 90; b['response']['eval_duration'] = 1_000_000_000
        result = v.aggregate([a, b], [ROW, ROW])
        self.assertEqual(result['cases'], 2)
        self.assertEqual(result['formalCounts'], {'correctAnswerability': 2,
            'exactQuoteOrWarrantedAbstention': 2, 'twoLinesAndOneQuestion': 2, 'unsupportedAnswer': 0})
        self.assertIsNone(result['targetTokenLoss'])
        self.assertEqual(result['timing']['completionTokens'], 120)
        self.assertEqual(result['timingDistribution']['tokensPerSecond'], {'median': 70.0, 'p95': 90.0})
        self.assertEqual(result['timingDistribution']['wallSeconds'], {'median': 2.1, 'p95': 3.1})

    def test_percentile_uses_nearest_rank(self):
        self.assertEqual(v.distribution(list(range(1, 49))), {'median': 24.5, 'p95': 46})


class ManifestTests(unittest.TestCase):
    def fixture(self, root):
        (root / 'protocol.json').write_text('{}', encoding='utf-8')
        (root / 'report.json').write_text('{}', encoding='utf-8')
        value = {'schemaVersion': 1, 'protocolSha256': v.digest(root / 'protocol.json'),
                 'files': [{'path': p, 'sha256': v.digest(root / p)} for p in ('protocol.json', 'report.json')]}
        (root / 'completion.json').write_text(json.dumps(value), encoding='utf-8')

    def test_missing_extra_tampered_and_failure_rejected(self):
        for mode in ('missing', 'extra', 'tampered', 'failed'):
            with self.subTest(mode=mode), temporary_directory() as directory:
                root = Path(directory); self.fixture(root)
                v.check_manifest(root)
                if mode == 'missing': (root / 'report.json').unlink()
                elif mode == 'extra': (root / 'unknown.txt').write_text('extra')
                elif mode == 'tampered': (root / 'report.json').write_text('{"passed":true}')
                else: (root / 'failure.json').write_text('{}')
                with self.assertRaises(ValueError): v.check_manifest(root)

    def test_duplicate_and_nonfinite_json_rejected(self):
        for source in ['{"same":1,"same":2}', '{"counter":NaN}', '{"duration":Infinity}']:
            with self.assertRaises(ValueError): v.parse(source)

    def test_evidence_cannot_escape_or_open_sealed_absolute_path(self):
        with temporary_directory() as directory:
            for path in ('../sealed.json', '/sealed.json', 'C:/sealed.json', 'a\\b.json'):
                with self.assertRaises(ValueError): v.evidence(Path(directory), path)


def write(root, name, value):
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding='utf-8')


def seal(root, protocol_sha):
    files = [{'path': p.relative_to(root).as_posix(), 'sha256': v.digest(p)}
             for p in sorted(root.rglob('*')) if p.is_file() and p.name != 'completion.json']
    write(root, 'completion.json', {'schemaVersion': 1, 'protocolSha256': protocol_sha, 'files': files})


def full_fixture(root):
    """Construct the saved HTTP schema directly, without importing the writer."""
    repo = Path(__file__).resolve().parents[2]
    dataset_path = 'artifacts/learning-engine/research/qwen3-run-010/development.json'
    rows = v.read(repo / dataset_path)
    write(root, 'development.json', rows)
    version = {'version': '0.20.7'}
    models = []
    for index, name in enumerate(v.MODELS):
        blob_sha = ('a' if index == 0 else 'b') * 64
        manifest = {'schemaVersion': 2, 'config': {'digest': 'sha256:' + blob_sha, 'size': 100}, 'layers': []}
        raw = json.dumps(manifest)
        digest = hashlib.sha256(raw.encode()).hexdigest()
        model = {'name': name, 'digest': digest, 'manifestSha256': digest,
                 'manifestPath': f'C:/fixture/model-{index}', 'manifestRaw': raw, 'manifest': manifest,
                 'layers': [{'path': f'C:/fixture/blob-{index}', 'sha256': blob_sha, 'sizeBytes': 100}],
                 'show': {'model_info': {'general.architecture': 'fixture'}, 'details': {'format': 'gguf'}}}
        ps = resident(); ps['models'][0].update(name=name, model=name, digest=digest)
        res = response(); res['model'] = name; res['message']['thinking'] = 'Reasoning preserved verbatim.'
        model['smoke'] = {'request': v.request_for(name, v.SMOKE_CASE), 'response': res, 'wallSeconds': 1.1, 'ps': ps}
        models.append(model)
    inventory = {'schemaVersion': 1, 'models': models, 'ollamaVersion': version}
    write(root, 'inventory.json', inventory)
    sources = []
    for name, path in sorted(v.source_paths().items()):
        frozen = 'frozenSources/' + name
        target = root / frozen; target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(path.read_bytes())
        sources.append({'path': name, 'frozenPath': frozen, 'sha256': v.digest(path)})
    protocol = {'schemaVersion': 1, 'system': v.SYSTEM, 'systemSha256': v.SYSTEM_HASH,
                'recipe': v.RECIPE, 'flags': v.FLAGS, 'smokeCase': v.SMOKE_CASE,
                'limits': {'totalSeconds': 7200, 'requestSeconds': 180}, 'models': models,
                'ollamaVersion': version, 'inventorySha256': v.digest(root / 'inventory.json'),
                'sourceInventory': sources, 'dataset': {'path': dataset_path,
                    'sha256': v.digest(root / 'development.json'), 'canonicalSha256': v.DEVELOPMENT_SHA, 'count': 48}}
    write(root, 'protocol.json', protocol)
    protocol_sha = v.digest(root / 'protocol.json')
    start = datetime(2026, 9, 28, tzinfo=timezone.utc)
    write(root, 'run-start.json', {'protocolSha256': protocol_sha, 'startedUtc': start.isoformat()})
    counter = 0

    def http(route, body, result):
        nonlocal counter
        name = f'raw/exchange-{counter:05d}.json'; counter += 1
        write(root, name, {'method': 'GET' if body is None else 'POST', 'url': v.ENDPOINT + route,
                          'requestBody': body, 'responseStatus': 200, 'responseBody': result,
                          'responseText': json.dumps(result), 'wallSeconds': 1.1 if route == '/api/chat' else .01})
        return name

    def identity(model):
        http('/api/version', None, version)
        http('/api/tags', None, {'models': [{'name': m['name'], 'digest': m['digest']} for m in models]})
        http('/api/show', {'model': model['name']}, model['show'])

    for model in models: identity(model)
    summaries = []
    for arm, model in enumerate(models):
        http('/api/ps', None, {'models': []})
        identity(model)
        snapshot = {'ollamaVersion': version, 'model': {k: val for k, val in model.items() if k != 'smoke'}}
        write(root, f'arm-{arm}-before.json', snapshot)
        records = []
        for index, row in enumerate(rows):
            res = deepcopy(model['smoke']['response']); res['message']['content'] = row['target']
            begin = start + timedelta(seconds=(arm * 48 + index) * 2 + 1)
            r = {'arm': arm, 'caseIndex': index, 'id': row['id'], 'modelDigest': model['digest'],
                 'request': v.request_for(model['name'], row), 'response': res, 'output': row['target'],
                 'diagnostics': v.score(row['target'], row), 'targetTokenLoss': None, 'targetTokens': None,
                 'wallSeconds': 1.1, 'startedUtc': begin.isoformat(),
                 'finishedUtc': (begin + timedelta(seconds=1.1)).isoformat(), 'residency': model['smoke']['ps']}
            r['exchange'] = http('/api/chat', r['request'], res)
            http('/api/ps', None, r['residency'])
            write(root, f'records/{arm}-{index:03d}.json', r); records.append(r)
        identity(model); write(root, f'arm-{arm}-after.json', snapshot)
        http('/api/chat', {'model': model['name'], 'messages': [], 'keep_alive': 0, 'stream': False},
             {'done': True, 'done_reason': 'unload'})
        summary = {'name': model['name'], 'digest': model['digest'], **v.aggregate(records, rows),
                   'residencyLabel': v.RESIDENCY_LABEL, 'slices': {}}
        for label, expected in [('supported', False), ('insufficient', True)]:
            subset = [(r, row) for r, row in zip(records, rows) if row['expectedAbstention'] is expected]
            summary['slices'][label] = v.aggregate([r for r, _ in subset], [row for _, row in subset])
        summaries.append(summary)
    write(root, 'report.json', {'schemaVersion': 1, 'protocolSha256': protocol_sha, 'flags': v.FLAGS,
        'semanticAcceptance': False, 'historical4BComparisonsMatched': False,
        'historical4BComparisonReason': 'Format, runtime and token budget changed; historical 4B results are not matched arms.',
        'targetTokenLoss': None, 'targetTokenLossStatus': 'unmeasured', 'metricsVersion': v.METRICS_VERSION, 'arms': summaries})
    seal(root, protocol_sha)
    return protocol_sha


class FullEvidenceTests(unittest.TestCase):
    def test_complete_and_resealed_adversarial_artifacts(self):
        with temporary_directory() as root:
            sha = full_fixture(root)
            result = v.verify(root, sha)
            self.assertTrue(result['verified'])
            self.assertFalse(result['semanticAcceptance'])
            cases = [
                ('records/0-000.json', lambda obj: obj.update(id='other-case')),
                ('records/1-047.json', lambda obj: obj['diagnostics'].update(groundedCasePass=False)),
                ('report.json', lambda obj: obj.update(semanticAcceptance=True)),
                ('report.json', lambda obj: obj['arms'][0]['timing'].update(completionTokens=0)),
                ('raw/exchange-00011.json', lambda obj: obj['responseBody']['models'][0].update(digest='c' * 64)),
                ('arm-1-after.json', lambda obj: obj['model'].update(digest='c' * 64)),
            ]
            for name, mutate in cases:
                with self.subTest(name=name):
                    original = (root / name).read_bytes()
                    value = v.read(root / name); mutate(value); write(root, name, value); seal(root, sha)
                    with self.assertRaises(ValueError): v.verify(root, sha)
                    (root / name).write_bytes(original); seal(root, sha)
            (root / 'records/1-047.json').unlink(); seal(root, sha)
            with self.assertRaises(ValueError): v.verify(root, sha)


if __name__ == '__main__':
    unittest.main()
