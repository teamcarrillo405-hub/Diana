"""Read-only reconstruction of saved local Ollama development evidence.

No model calls, downloads, final-case loaders, training, or writes. This verifies
artifact consistency, not physical execution or independent semantic quality.
"""
from __future__ import annotations

import argparse
import ast
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path, PurePosixPath
import re
import statistics

from qwen3_evidence_integrity_contract import SYSTEM, SYSTEM_HASH, METRICS_VERSION
from qwen3_evidence_integrity_metrics import score

DEVELOPMENT_SHA = 'a76d8bcb1735b9b721308cd925dfa187d44af4481c799307971e82e9f2b3aad5'
MODELS = ['qwen3-vl:30b', 'qwen3.8:27b']
ENDPOINT = 'http://127.0.0.1:11434'
RECIPE = {'think': True, 'stream': False, 'keep_alive': '5m',
          'options': {'temperature': 1, 'top_p': .95, 'top_k': 20, 'repeat_penalty': 1.0,
                      'seed': 81173, 'num_ctx': 8192, 'num_predict': 4096}}
FLAGS = {'testOpened': False, 'productionEligible': False, 'trained': False, 'researchOnly': True}
SMOKE_CASE = {'source': 'At noon, the observatory flag was blue. The log did not record wind speed.',
              'question': 'Which color was recorded for the flag?'}
RESIDENCY_LABEL = 'Ollama reported residency; not peak GPU memory or proof of full GPU offload'
SHA = re.compile(r'[0-9a-f]{64}')
DURATIONS = ('total_duration', 'load_duration', 'prompt_eval_duration', 'eval_duration')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def canonical(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'),
                                     ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def parse(text):
    def pairs(items):
        value = {}
        for key, item in items:
            require(key not in value, 'Duplicate JSON key: ' + key)
            value[key] = item
        return value
    def invalid(value):
        raise ValueError('Nonfinite JSON value: ' + value)
    return json.loads(text, object_pairs_hook=pairs, parse_constant=invalid)


def read(path):
    return parse(Path(path).read_text(encoding='utf-8'))


def evidence(root, name):
    require(isinstance(name, str) and bool(name), 'Missing evidence path')
    p = PurePosixPath(name)
    require(str(p) == name and not p.is_absolute() and '..' not in p.parts
            and '\\' not in name and ':' not in name, 'Noncanonical evidence path')
    result = root.joinpath(*p.parts)
    require(result.resolve().is_relative_to(root.resolve()), 'Escaping evidence path')
    for part in (result, *result.parents):
        require(not part.is_symlink() and not (hasattr(part, 'is_junction') and part.is_junction()),
                'Linked evidence path')
    require(result.is_file() and result.stat().st_nlink == 1, 'Missing or hard-linked evidence: ' + name)
    return result


def number(value, name, *, positive=False, integer=False):
    require(type(value) in ((int,) if integer else (int, float)) and math.isfinite(value)
            and (value > 0 if positive else value >= 0), 'Invalid ' + name)
    return value


def model_digest(value):
    require(isinstance(value, str), 'Missing model digest')
    value = value.removeprefix('sha256:')
    require(SHA.fullmatch(value), 'Invalid model digest')
    return value


def request_for(model, row):
    return {'model': model, 'messages': [{'role': 'system', 'content': SYSTEM},
        {'role': 'user', 'content': f"SOURCE: {row['source']}\nQUESTION: {row['question']}"}],
        **RECIPE, 'options': dict(RECIPE['options'])}


def check_response(response, model):
    require(isinstance(response, dict) and response.get('model') == model,
            'Response model changed')
    require(response.get('done') is True and response.get('done_reason') == 'stop',
            'Incomplete or truncated response')
    require('error' not in response, 'Server error response')
    message = response.get('message', {})
    require(message.get('role') == 'assistant' and isinstance(message.get('content'), str)
            and bool(message['content'].strip()), 'Missing actual assistant content')
    require(isinstance(message.get('thinking', ''), str) and not message.get('tool_calls'),
            'Invalid thinking or unexpected tool call')
    require(not re.search(r'<\s*/?\s*think\b', message['content'], re.I), 'Inline thinking in final content')
    number(response.get('prompt_eval_count'), 'prompt tokens', positive=True, integer=True)
    count = number(response.get('eval_count'), 'completion tokens', positive=True, integer=True)
    require(count < 4096, 'Completion reached generation limit')
    for name in DURATIONS:
        number(response.get(name), name, integer=True)
    require(response['eval_duration'] > 0 and response['prompt_eval_duration'] > 0,
            'Positive token counts require positive evaluation time')
    require(response['total_duration'] >= sum(response[k] for k in DURATIONS[1:]),
            'Incoherent server durations')
    return message['content']


def check_residency(snapshot, model):
    require(isinstance(snapshot, dict) and isinstance(snapshot.get('models'), list),
            'Missing raw residency snapshot')
    matches = [item for item in snapshot['models'] if item.get('name') == model['name']
               or item.get('model') == model['name']]
    require(len(matches) == 1, 'Missing or repeated resident model')
    item = matches[0]
    require(model_digest(item.get('digest')) == model_digest(model['digest']), 'Resident model digest drift')
    require(item.get('context_length') == 8192, 'Resident context length drift')
    size = number(item.get('size'), 'resident size', positive=True, integer=True)
    vram = number(item.get('size_vram'), 'resident VRAM', integer=True)
    require(vram <= size, 'Resident VRAM exceeds resident size')
    return vram


def distribution(values):
    values = sorted(values)
    return {'median': statistics.median(values), 'p95': values[math.ceil(.95 * len(values)) - 1]}


def aggregate(records, rows):
    require(len(records) == len(rows) and bool(rows), 'Incomplete aggregate population')
    diagnostics = [score(record['output'], row) for record, row in zip(records, rows, strict=True)]
    formal = {
        'correctAnswerability': sum(d['expectedAbstentionMatched'] for d in diagnostics),
        'exactQuoteOrWarrantedAbstention': sum(d['relevantSourceQuoteOrAbstention'] and d['evidenceGrammarValid'] for d in diagnostics),
        'twoLinesAndOneQuestion': sum(d['twoLineFormat'] and d['oneQuestion'] and d['evidenceGrammarValid'] for d in diagnostics),
        'unsupportedAnswer': sum(d['unsupportedAnswer'] for d in diagnostics),
    }
    fields = {'promptTokens': 'prompt_eval_count', 'completionTokens': 'eval_count',
              'totalDurationNs': 'total_duration', 'loadDurationNs': 'load_duration',
              'promptEvalDurationNs': 'prompt_eval_duration', 'evalDurationNs': 'eval_duration'}
    timing = {'wallSeconds': sum(r['wallSeconds'] for r in records)}
    timing.update({key: sum(r['response'][source] for r in records) for key, source in fields.items()})
    return {'cases': len(rows), 'counts': {key: sum(d[key] for d in diagnostics) for key in diagnostics[0]},
            'formalCounts': formal, 'formalRates': {key: value / len(rows) for key, value in formal.items()},
            'targetTokens': None, 'targetTokenLoss': None, 'timing': timing,
            'timingDistribution': {
                'wallSeconds': distribution([r['wallSeconds'] for r in records]),
                'completionTokens': distribution([r['response']['eval_count'] for r in records]),
                'tokensPerSecond': distribution([r['response']['eval_count'] * 1e9 / r['response']['eval_duration'] for r in records]),
                'residentVramBytes': distribution([next(x['size_vram'] for x in r['residency']['models']
                    if x.get('name') == r['response']['model'] or x.get('model') == r['response']['model']) for r in records]),
            }}


def equal(actual, expected, label):
    """Structural equality with numeric tolerance only for derived floats."""
    if type(expected) is float:
        number(actual, label)
        require(math.isclose(actual, expected, rel_tol=1e-10, abs_tol=1e-9), label + ' drift')
    elif isinstance(expected, dict):
        require(isinstance(actual, dict) and set(actual) == set(expected), label + ' keys drift')
        for key in expected:
            equal(actual[key], expected[key], label + '.' + key)
    elif isinstance(expected, list):
        require(isinstance(actual, list) and len(actual) == len(expected), label + ' length drift')
        for a, b in zip(actual, expected, strict=True):
            equal(a, b, label)
    else:
        require(type(actual) is type(expected) and actual == expected, label + ' drift')


def check_manifest(root):
    completion = read(evidence(root, 'completion.json'))
    require(completion.get('schemaVersion') == 1, 'Completion schema changed')
    records = completion.get('files')
    require(isinstance(records, list) and records, 'Missing completion inventory')
    paths = [item.get('path') for item in records]
    require(all(isinstance(p, str) for p in paths) and paths == sorted(set(paths)),
            'Unsorted or duplicate completion inventory')
    actual = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    require('failure.json' not in actual and set(paths) == actual - {'completion.json'},
            'Partial run or missing/extra artifacts')
    for item in records:
        require(set(item) == {'path', 'sha256'} and SHA.fullmatch(item.get('sha256', '')),
                'Malformed completion hash')
        require(digest(evidence(root, item['path'])) == item['sha256'], 'Tampered artifact: ' + item['path'])
    require(completion.get('protocolSha256') == digest(evidence(root, 'protocol.json')),
            'Completion protocol mismatch')
    return set(paths)


def check_model(model):
    require(model.get('name') in MODELS, 'Unapproved model')
    value = model_digest(model.get('digest'))
    require(value == model.get('digest') == model.get('manifestSha256'), 'Manifest/model digest mismatch')
    require(isinstance(model.get('manifestPath'), str) and bool(model['manifestPath']), 'Missing manifest identity')
    show = model.get('show')
    require(isinstance(show, dict) and isinstance(show.get('model_info'), dict) and show['model_info']
            and isinstance(show.get('details'), dict) and show['details'], 'Missing model metadata')
    layers = model.get('layers')
    require(isinstance(layers, list) and layers, 'Missing layer commitments')
    require(len({item.get('path') for item in layers}) == len(layers), 'Repeated layer commitment')
    for item in layers:
        require(isinstance(item.get('path'), str) and bool(item['path'])
                and SHA.fullmatch(item.get('sha256', '')), 'Invalid layer identity')
        number(item.get('sizeBytes'), 'layer size', positive=True, integer=True)
    raw = model.get('manifestRaw')
    require(isinstance(raw, str) and hashlib.sha256(raw.encode()).hexdigest() == value,
            'Raw manifest differs from model digest')
    manifest = parse(raw)
    equal(model.get('manifest'), manifest, 'Parsed manifest')
    objects = [manifest.get('config', {}), *manifest.get('layers', [])]
    committed = {(x['sha256'], x['sizeBytes']) for x in layers}
    require({(model_digest(x.get('digest')), x.get('size')) for x in objects} == committed,
            'Manifest layer mapping differs')


def check_exchange(exchange):
    require(isinstance(exchange, dict) and set(exchange) == {
        'method', 'url', 'requestBody', 'responseStatus', 'responseBody', 'responseText', 'wallSeconds'},
        'Malformed or unsuccessful raw exchange')
    route = exchange.get('url', '').removeprefix(ENDPOINT)
    require(exchange['url'] == ENDPOINT + route and route in {
        '/api/chat', '/api/show', '/api/tags', '/api/ps', '/api/version'}, 'Nonlocal or unexpected API route')
    require(exchange['method'] == ('POST' if route in {'/api/chat', '/api/show'} else 'GET'),
            'Unexpected HTTP method')
    require(type(exchange['responseStatus']) is int and exchange['responseStatus'] == 200,
            'Unsuccessful HTTP exchange')
    require(isinstance(exchange['responseBody'], dict), 'Missing raw JSON response')
    require(isinstance(exchange['responseText'], str), 'Missing raw response bytes text')
    equal(parse(exchange['responseText']), exchange['responseBody'], 'Raw response text')
    require('error' not in exchange['responseBody'], 'Raw HTTP error')
    number(exchange['wallSeconds'], 'HTTP wall time', positive=True)
    if route in {'/api/tags', '/api/ps', '/api/version'}:
        require(exchange['requestBody'] is None, 'Unexpected GET body')
    return route


def check_record(record, row, model, arm, index, exchanges):
    require(record.get('arm') == arm and type(record.get('caseIndex')) is int
            and record['caseIndex'] == index and record.get('id') == row['id'], 'Case identity/order drift')
    require(record.get('modelDigest') == model['digest'], 'Record model digest drift')
    equal(record.get('request'), request_for(model['name'], row), 'Exact case request')
    output = check_response(record.get('response'), model['name'])
    require(record.get('output') == output, 'Output differs from actual message.content')
    equal(record.get('diagnostics'), score(output, row), 'Reconstructed diagnostics')
    require('targetTokenLoss' in record and record['targetTokenLoss'] is None
            and 'targetTokens' in record and record['targetTokens'] is None, 'Invented loss measurement')
    number(record.get('wallSeconds'), 'case wall time', positive=True)
    require(record['response']['total_duration'] / 1e9 <= record['wallSeconds'] + 1,
            'Server duration exceeds observed wall time')
    try:
        start, end = [datetime.fromisoformat(record[k].replace('Z', '+00:00'))
                      for k in ('startedUtc', 'finishedUtc')]
    except (ValueError, KeyError, TypeError) as error:
        raise ValueError('Invalid case timestamps') from error
    require(start.tzinfo is not None and end.tzinfo is not None and end >= start,
            'Unordered or naive timestamps')
    require(abs((end - start).total_seconds() - record['wallSeconds']) <= 1,
            'Timestamp and wall-time mismatch')
    check_residency(record.get('residency'), model)
    name = record.get('exchange')
    require(name in exchanges, 'Missing raw chat exchange')
    exchange = exchanges[name]
    require(exchange['url'] == ENDPOINT + '/api/chat', 'Record linked to non-chat exchange')
    equal(exchange['requestBody'], record['request'], 'Raw request')
    equal(exchange['responseBody'], record['response'], 'Raw response')
    require(exchange['wallSeconds'] <= record['wallSeconds'] <= exchange['wallSeconds'] + 1,
            'HTTP/record wall time mismatch')
    return start, end


def source_paths():
    """Inspect imports as syntax; never import or execute the benchmark runner."""
    root = Path(__file__).resolve().parents[2]
    pending = [Path(__file__), Path(__file__).with_name('benchmark_local_grounding.py')]
    found = set()
    while pending:
        path = pending.pop().resolve()
        if path in found:
            continue
        found.add(path)
        tree = ast.parse(path.read_text(encoding='utf-8-sig'))
        for node in ast.walk(tree):
            modules = [node.module] if isinstance(node, ast.ImportFrom) and node.module else (
                [alias.name for alias in node.names] if isinstance(node, ast.Import) else [])
            for module in modules:
                local = path.parent / (module.split('.')[0] + '.py')
                if local.is_file():
                    pending.append(local)
    found.add(root / 'docs/engineering/local-large-model-comparison.md')
    return {path.relative_to(root).as_posix(): path for path in found}


def verify(root, expected_protocol_sha256=None):
    root = Path(root)
    paths = check_manifest(root)
    protocol_path = evidence(root, 'protocol.json')
    protocol_sha = digest(protocol_path)
    if expected_protocol_sha256 is not None:
        require(protocol_sha == expected_protocol_sha256, 'External protocol commitment mismatch')
    protocol = read(protocol_path)
    for key, value in {'schemaVersion': 1, 'system': SYSTEM, 'systemSha256': SYSTEM_HASH,
                       'recipe': RECIPE, 'smokeCase': SMOKE_CASE, 'flags': FLAGS,
                       'limits': {'totalSeconds': 7200, 'requestSeconds': 180}}.items():
        equal(protocol.get(key), value, 'Protocol ' + key)
    rows = read(evidence(root, 'development.json'))
    require(isinstance(rows, list) and len(rows) == 48 and len({r['id'] for r in rows}) == 48
            and canonical(rows) == DEVELOPMENT_SHA, 'Fixed development rows changed')
    equal(protocol.get('dataset'), {
        'path': 'artifacts/learning-engine/research/qwen3-run-010/development.json',
        'sha256': digest(evidence(root, 'development.json')), 'canonicalSha256': DEVELOPMENT_SHA,
        'count': 48}, 'Dataset commitment')
    inventory = read(evidence(root, 'inventory.json'))
    require(digest(root / 'inventory.json') == protocol.get('inventorySha256'), 'Inventory digest drift')
    require(inventory.get('schemaVersion') == 1, 'Inventory schema drift')
    models = protocol.get('models', [])
    require(isinstance(models, list) and [m.get('name') for m in models] == MODELS, 'Fixed model arms changed')
    equal(inventory.get('models'), models, 'Frozen inventory models')
    version = protocol.get('ollamaVersion')
    require(isinstance(version, dict) and isinstance(version.get('version'), str) and version['version'],
            'Missing runtime version')
    equal(inventory.get('ollamaVersion'), version, 'Frozen runtime version')
    for model in models:
        check_model(model)
        smoke = model.get('smoke', {})
        equal(smoke.get('request'), request_for(model['name'], SMOKE_CASE), 'Original-case smoke request')
        check_response(smoke.get('response'), model['name'])
        number(smoke.get('wallSeconds'), 'smoke wall time', positive=True)
        check_residency(smoke.get('ps'), model)

    sources = protocol.get('sourceInventory', [])
    local_sources = source_paths()
    require(isinstance(sources, list) and len(sources) == len(local_sources)
            and {item.get('path') for item in sources} == set(local_sources), 'Source closure drift')
    for item in sources:
        require(item.get('frozenPath') == 'frozenSources/' + item['path'], 'Invalid frozen source mapping')
        require(digest(evidence(root, item['frozenPath'])) == item.get('sha256')
                == digest(local_sources[item['path']]), 'Verifier/runner source commitment drift')

    raw_names = sorted(p for p in paths if p.startswith('raw/'))
    require(raw_names == [f'raw/exchange-{i:05d}.json' for i in range(len(raw_names))],
            'HTTP exchange sequence missing or repeated')
    exchanges = {name: read(evidence(root, name)) for name in raw_names}
    for exchange in exchanges.values():
        check_exchange(exchange)
    cursor = 0

    def take(route, body=None):
        nonlocal cursor
        require(cursor < len(raw_names), 'Incomplete raw HTTP sequence')
        name = raw_names[cursor]; cursor += 1
        exchange = exchanges[name]
        require(exchange['url'] == ENDPOINT + route, 'HTTP sequence route drift')
        equal(exchange['requestBody'], body, 'HTTP sequence request')
        return name, exchange['responseBody']

    def identity(model):
        _, actual_version = take('/api/version')
        equal(actual_version, version, 'Runtime before/after')
        _, tags = take('/api/tags')
        matches = [m for m in tags.get('models', []) if m.get('name') == model['name']]
        require(len(matches) == 1 and model_digest(matches[0].get('digest')) == model['digest'],
                'Server before/after model digest drift')
        require(not matches[0].get('remote_host'), 'Remote model forbidden')
        _, show = take('/api/show', {'model': model['name']})
        equal(show, model['show'], 'Server before/after model metadata')
        require(not show.get('remote_host') and not show.get('remote_model'), 'Remote model forbidden')

    for model in models:
        identity(model)  # Freeze-time read-only identity checks.
    started = read(evidence(root, 'run-start.json'))
    require(started.get('protocolSha256') == protocol_sha, 'Run-start protocol drift')
    run_start = datetime.fromisoformat(started['startedUtc'].replace('Z', '+00:00'))
    require(run_start.tzinfo is not None, 'Naive run-start timestamp')
    previous_end = run_start
    summaries = []
    for arm, model in enumerate(models):
        _, initial_ps = take('/api/ps')
        require(isinstance(initial_ps.get('models'), list) and not any(
            m.get('name') in MODELS for m in initial_ps['models']), 'Benchmark ownership not established')
        identity(model)
        expected_identity = {'ollamaVersion': version, 'model': {k: val for k, val in model.items() if k != 'smoke'}}
        equal(read(evidence(root, f'arm-{arm}-before.json')), expected_identity, 'Before snapshot')
        records = []
        for index, row in enumerate(rows):
            record = read(evidence(root, f'records/{arm}-{index:03d}.json'))
            raw_name, response = take('/api/chat', request_for(model['name'], row))
            require(record.get('exchange') == raw_name, 'Case raw exchange order drift')
            start, end = check_record(record, row, model, arm, index, exchanges)
            require(start >= previous_end and (end - run_start).total_seconds() <= 7200,
                    'Case order or total runtime limit drift')
            require(record['wallSeconds'] <= 181, 'Per-request time bound exceeded')
            previous_end = end
            _, ps = take('/api/ps')
            equal(record['residency'], ps, 'Per-case raw residency')
            records.append(record)
        identity(model)
        equal(read(evidence(root, f'arm-{arm}-after.json')), expected_identity, 'After snapshot')
        _, unloaded = take('/api/chat', {'model': model['name'], 'messages': [], 'keep_alive': 0, 'stream': False})
        require(unloaded.get('done') is True and unloaded.get('done_reason') == 'unload', 'Unload not confirmed')
        summary = {'name': model['name'], 'digest': model['digest'], **aggregate(records, rows),
                   'residencyLabel': RESIDENCY_LABEL}
        summary['slices'] = {}
        for label, expected in [('supported', False), ('insufficient', True)]:
            indices = [i for i, row in enumerate(rows) if row['expectedAbstention'] is expected]
            summary['slices'][label] = aggregate([records[i] for i in indices], [rows[i] for i in indices])
        summaries.append(summary)
    require(cursor == len(raw_names), 'Unexpected extra HTTP requests')
    report = {'schemaVersion': 1, 'protocolSha256': protocol_sha, 'flags': FLAGS,
        'semanticAcceptance': False, 'historical4BComparisonsMatched': False,
        'historical4BComparisonReason': 'Format, runtime and token budget changed; historical 4B results are not matched arms.',
        'targetTokenLoss': None, 'targetTokenLossStatus': 'unmeasured', 'metricsVersion': METRICS_VERSION,
        'arms': summaries}
    equal(read(evidence(root, 'report.json')), report, 'Reconstructed report')
    expected_paths = {'protocol.json', 'inventory.json', 'development.json', 'run-start.json', 'report.json',
                      *raw_names, *(s['frozenPath'] for s in sources),
                      *(f'arm-{arm}-{side}.json' for arm in range(2) for side in ('before', 'after')),
                      *(f'records/{arm}-{index:03d}.json' for arm in range(2) for index in range(48))}
    require(paths == expected_paths, 'Undeclared artifact outside expected evidence schema')
    return {'verified': True, 'protocolSha256': protocol_sha, 'casesPerArm': 48,
            'models': MODELS, 'semanticAcceptance': False, 'flags': FLAGS,
            'limitations': ['Saved commitments and HTTP transcripts are local evidence, not third-party execution attestation.',
                'Saved layer checks do not independently prove Ollama loaded those bytes.',
                'Residency is reported per case and is not peak GPU memory or proof of full GPU offload.',
                'Loss is unmeasured; independent semantic review remains required.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('--protocol-sha256', required=True)
    args = parser.parse_args()
    print(json.dumps(verify(args.root, args.protocol_sha256), indent=2))


if __name__ == '__main__':
    main()
