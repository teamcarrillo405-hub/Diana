"""Frozen, development-only two-arm local Ollama research benchmark.

No download, training, provider fallback, final-case import, or automatic retry.
Only the fixed loopback Ollama endpoint is reachable through this HTTP client.
"""
from __future__ import annotations

import argparse
import ast
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import re
import statistics
import time
import urllib.request

from qwen3_evidence_integrity_contract import SYSTEM, SYSTEM_HASH, METRICS_VERSION
from qwen3_evidence_integrity_metrics import score

ROOT = Path(__file__).resolve().parents[2]
DATASET = ROOT / 'artifacts/learning-engine/research/qwen3-run-010/development.json'
DATA_HASH = 'a76d8bcb1735b9b721308cd925dfa187d44af4481c799307971e82e9f2b3aad5'
MODELS = ['qwen3-vl:30b', 'qwen3.8:27b']
ENDPOINT = 'http://127.0.0.1:11434'
RECIPE = {'think': True, 'stream': False, 'keep_alive': '5m',
          'options': {'temperature': 1, 'top_p': .95, 'top_k': 20, 'repeat_penalty': 1.0,
                      'seed': 81173, 'num_ctx': 8192, 'num_predict': 4096}}
SMOKE = {'source': 'At noon, the observatory flag was blue. The log did not record wind speed.',
         'question': 'Which color was recorded for the flag?'}
FLAGS = {'testOpened': False, 'productionEligible': False, 'trained': False, 'researchOnly': True}
LIMITS = {'totalSeconds': 7200, 'requestSeconds': 180}
RESIDENCY_LABEL = 'Ollama reported residency; not peak GPU memory or proof of full GPU offload'


def canonical_hash(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'),
                                    ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def sha256(path, deadline=None):
    digest = hashlib.sha256()
    with Path(path).open('rb') as handle:
        while chunk := handle.read(8 * 1024 * 1024):
            check_deadline(deadline)
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'),
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError('Nonfinite JSON')))


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8', newline='\n') as handle:
        json.dump(value, handle, indent=2, ensure_ascii=False, allow_nan=False)
        handle.write('\n')


def check_deadline(deadline):
    if deadline is not None and time.monotonic() >= deadline:
        raise TimeoutError('Bounded benchmark time limit reached')


def finite(value, name, positive=False, integer=False):
    if type(value) not in ((int,) if integer else (int, float)) or not math.isfinite(value):
        raise ValueError('Invalid telemetry: ' + name)
    if value < 0 or (positive and value <= 0):
        raise ValueError('Invalid telemetry: ' + name)
    return value


def normalize_digest(value):
    value = str(value).removeprefix('sha256:').lower()
    if not re.fullmatch('[0-9a-f]{64}', value):
        raise ValueError('Invalid model digest')
    return value


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('Redirects forbidden')


class LocalClient:
    def __init__(self, output, deadline):
        self.output = Path(output)
        self.deadline = deadline
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
        self.number = len(list((self.output / 'raw').glob('exchange-*.json')))
        self.last_exchange = None

    def call(self, route, body=None, cleanup=False):
        if route not in ('/api/version', '/api/tags', '/api/show', '/api/chat', '/api/ps'):
            raise ValueError('Only fixed loopback API routes allowed')
        if not cleanup:
            check_deadline(self.deadline)
        timeout = 30 if cleanup else min(LIMITS['requestSeconds'], self.deadline - time.monotonic())
        method = 'GET' if body is None else 'POST'
        request = urllib.request.Request(ENDPOINT + route,
            data=None if body is None else json.dumps(body, allow_nan=False).encode(),
            headers={'Content-Type': 'application/json'}, method=method)
        exchange = {'method': method, 'url': ENDPOINT + route, 'requestBody': body,
                    'responseStatus': None, 'responseBody': None, 'wallSeconds': 0}
        relative = f'raw/exchange-{self.number:05d}.json'
        self.number += 1
        self.last_exchange = relative
        start = time.monotonic()
        try:
            with self.opener.open(request, timeout=max(.001, timeout)) as response:
                exchange['responseStatus'] = response.status
                raw = response.read()
                exchange['responseText'] = raw.decode('utf-8')
                exchange['responseBody'] = json.loads(exchange['responseText'])
                if response.status != 200 or not isinstance(exchange['responseBody'], dict):
                    raise ValueError('Invalid API response')
                if 'error' in exchange['responseBody']:
                    raise ValueError('Ollama returned an error')
                return exchange['responseBody']
        except BaseException as error:
            exchange['error'] = f'{type(error).__name__}: {error}'
            raise
        finally:
            exchange['wallSeconds'] = time.monotonic() - start
            write_json(self.output / relative, exchange)


def request_for(name, row):
    return {'model': name, 'messages': [{'role': 'system', 'content': SYSTEM},
        {'role': 'user', 'content': f"SOURCE: {row['source']}\nQUESTION: {row['question']}"}],
        **RECIPE}


def validate_response(response, name):
    if response.get('model') != name or response.get('done') is not True or response.get('done_reason') != 'stop':
        raise ValueError('Incomplete, truncated, or mismatched response')
    message = response.get('message', {})
    if message.get('role') != 'assistant' or not isinstance(message.get('content'), str) or not message['content'].strip():
        raise ValueError('Missing final content')
    if ('thinking' in message and not isinstance(message['thinking'], str)) or message.get('tool_calls'):
        raise ValueError('Invalid thinking or unexpected tool calls')
    if re.search(r'<\s*/?\s*think\b', message['content'], re.I):
        raise ValueError('Unexpected inline thinking')
    for field in ('prompt_eval_count', 'eval_count'):
        finite(response.get(field), field, positive=True, integer=True)
    if response['eval_count'] >= RECIPE['options']['num_predict']:
        raise ValueError('Generation reached output limit')
    for field in ('total_duration', 'load_duration', 'prompt_eval_duration', 'eval_duration'):
        finite(response.get(field), field, positive=field in ('prompt_eval_duration', 'eval_duration'), integer=True)
    if sum(response[key] for key in ('load_duration', 'prompt_eval_duration', 'eval_duration')) > response['total_duration']:
        raise ValueError('Inconsistent duration telemetry')
    return message['content']


def resident(ps, model):
    entries = [entry for entry in ps.get('models', []) if entry.get('name') == model['name']]
    if len(entries) != 1:
        raise ValueError('Missing or repeated resident model')
    entry = entries[0]
    if normalize_digest(entry.get('digest')) != normalize_digest(model['digest']):
        raise ValueError('Resident model drift')
    finite(entry.get('size'), 'resident size', positive=True, integer=True)
    finite(entry.get('size_vram'), 'resident VRAM', integer=True)
    if entry['size_vram'] > entry['size'] or entry.get('context_length') != RECIPE['options']['num_ctx']:
        raise ValueError('Invalid residency/context telemetry')
    return entry


def validate_layers(model, deadline):
    manifest = Path(model['manifestPath'])
    if not manifest.is_absolute() or sha256(manifest, deadline) != model['manifestSha256']:
        raise ValueError('Local manifest drift')
    if normalize_digest(model['digest']) != model['manifestSha256']:
        raise ValueError('Manifest does not match model digest')
    document = read_json(manifest)
    if model.get('manifestRaw') != manifest.read_text(encoding='utf-8') or model.get('manifest') != document:
        raise ValueError('Manifest proof differs from actual local manifest')
    if hashlib.sha256(model['manifestRaw'].encode('utf-8')).hexdigest() != model['manifestSha256']:
        raise ValueError('Manifest raw proof digest mismatch')
    expected = {normalize_digest(layer['digest']): layer['size']
                for layer in [document['config'], *document['layers']]}
    actual = {}
    for layer in model['layers']:
        path = Path(layer['path'])
        digest = normalize_digest(layer['sha256'])
        if digest in actual or not path.is_absolute() or path.stat().st_size != layer['sizeBytes']:
            raise ValueError('Invalid local layer identity')
        if sha256(path, deadline) != digest:
            raise ValueError('Local model layer drift')
        actual[digest] = layer['sizeBytes']
    if actual != expected:
        raise ValueError('Local layers differ from manifest')


def identity(client, model, version, deadline):
    current_version = client.call('/api/version')
    if current_version != version:
        raise ValueError('Ollama runtime changed')
    entries = [entry for entry in client.call('/api/tags').get('models', []) if entry.get('name') == model['name']]
    if len(entries) != 1 or normalize_digest(entries[0]['digest']) != normalize_digest(model['digest']):
        raise ValueError('Installed model digest changed')
    show = client.call('/api/show', {'model': model['name']})
    if show != model['show']:
        raise ValueError('Model show metadata changed')
    if show.get('remote_host') or show.get('remote_model') or entries[0].get('remote_host'):
        raise ValueError('Cloud models forbidden')
    validate_layers(model, deadline)
    return {'ollamaVersion': current_version, 'model': {key: value for key, value in model.items() if key != 'smoke'}}


def sources():
    pending = [Path(__file__), Path(__file__).with_name('verify_local_grounding_benchmark.py')]
    found = set()
    while pending:
        path = pending.pop().resolve()
        if path in found:
            continue
        if not path.is_file():
            raise ValueError('Required source missing: ' + str(path))
        found.add(path)
        for node in ast.walk(ast.parse(path.read_text(encoding='utf-8-sig'))):
            modules = [node.module] if isinstance(node, ast.ImportFrom) and node.module else (
                [alias.name for alias in node.names] if isinstance(node, ast.Import) else [])
            for module in modules:
                candidate = path.parent / (module.split('.')[0] + '.py')
                if candidate.is_file():
                    pending.append(candidate)
    design = ROOT / 'docs/engineering/local-large-model-comparison.md'
    if not design.is_file():
        raise ValueError('Prospective design source missing')
    return sorted(found | {design})


def validate_dataset(rows):
    if canonical_hash(rows) != DATA_HASH or len(rows) != 48 or len({row['id'] for row in rows}) != 48:
        raise ValueError('Development source mismatch')


def freeze(output, inventory_path):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    deadline = time.monotonic() + LIMITS['totalSeconds']
    try:
        inventory = read_json(inventory_path)
        if inventory.get('schemaVersion') != 1 or [m['name'] for m in inventory['models']] != MODELS:
            raise ValueError('Incorrect fixed model inventory')
        rows = read_json(DATASET)
        validate_dataset(rows)
        client = LocalClient(output, deadline)
        for model in inventory['models']:
            smoke = model['smoke']
            if smoke['request'] != request_for(model['name'], SMOKE):
                raise ValueError('Smoke recipe mismatch')
            validate_response(smoke['response'], model['name'])
            finite(smoke['wallSeconds'], 'smoke wallSeconds', positive=True)
            resident(smoke['ps'], model)
            identity(client, model, inventory['ollamaVersion'], deadline)
        (output / 'inventory.json').write_bytes(Path(inventory_path).read_bytes())
        (output / 'development.json').write_bytes(DATASET.read_bytes())
        source_inventory = []
        for path in sources():
            relative = path.relative_to(ROOT).as_posix()
            frozen = 'frozenSources/' + relative
            target = output / frozen
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(path.read_bytes())
            source_inventory.append({'path': relative, 'sha256': sha256(path), 'frozenPath': frozen})
        protocol = {'schemaVersion': 1, 'dataset': {'path': DATASET.relative_to(ROOT).as_posix(),
            'sha256': sha256(DATASET), 'canonicalSha256': DATA_HASH, 'count': 48},
            'system': SYSTEM, 'systemSha256': SYSTEM_HASH, 'recipe': RECIPE, 'models': inventory['models'],
            'ollamaVersion': inventory['ollamaVersion'], 'sourceInventory': source_inventory,
            'inventorySha256': sha256(output / 'inventory.json'), 'smokeCase': SMOKE, 'flags': FLAGS, 'limits': LIMITS}
        write_json(output / 'protocol.json', protocol)
        return sha256(output / 'protocol.json')
    except BaseException as error:
        write_json(output / 'failure.json', {'stage': 'freeze', 'error': f'{type(error).__name__}: {error}', 'flags': FLAGS})
        raise


def distribution(values):
    ordered = sorted(values)
    return {'median': statistics.median(ordered), 'p95': ordered[math.ceil(.95 * len(ordered)) - 1]}


def aggregate(records):
    diagnostics = [record['diagnostics'] for record in records]
    formal = {'correctAnswerability': sum(d['expectedAbstentionMatched'] for d in diagnostics),
        'exactQuoteOrWarrantedAbstention': sum(d['relevantSourceQuoteOrAbstention'] and d['evidenceGrammarValid'] for d in diagnostics),
        'twoLinesAndOneQuestion': sum(d['twoLineFormat'] and d['oneQuestion'] and d['evidenceGrammarValid'] for d in diagnostics),
        'unsupportedAnswer': sum(d['unsupportedAnswer'] for d in diagnostics)}
    timing = {'wallSeconds': sum(record['wallSeconds'] for record in records)}
    for key, source in [('promptTokens', 'prompt_eval_count'), ('completionTokens', 'eval_count'),
            ('totalDurationNs', 'total_duration'), ('loadDurationNs', 'load_duration'),
            ('promptEvalDurationNs', 'prompt_eval_duration'), ('evalDurationNs', 'eval_duration')]:
        timing[key] = sum(record['response'][source] for record in records)
    distributions = {'wallSeconds': [r['wallSeconds'] for r in records],
        'completionTokens': [r['response']['eval_count'] for r in records],
        'tokensPerSecond': [r['response']['eval_count'] / (r['response']['eval_duration'] / 1e9) for r in records],
        'residentVramBytes': [resident(r['residency'], {'name': r['request']['model'], 'digest': r['modelDigest']})['size_vram'] for r in records]}
    return {'cases': len(records), 'targetTokens': None, 'targetTokenLoss': None,
        'counts': {name: sum(d[name] for d in diagnostics) for name in diagnostics[0]},
        'formalCounts': formal, 'formalRates': {key: value / len(records) for key, value in formal.items()},
        'timing': timing, 'timingDistribution': {key: distribution(value) for key, value in distributions.items()}}


def validate_protocol(output, expected_digest):
    if sha256(output / 'protocol.json') != expected_digest:
        raise ValueError('Protocol digest mismatch')
    protocol = read_json(output / 'protocol.json')
    if any(protocol[key] != value for key, value in [('schemaVersion', 1), ('system', SYSTEM),
            ('systemSha256', SYSTEM_HASH), ('recipe', RECIPE), ('smokeCase', SMOKE), ('flags', FLAGS), ('limits', LIMITS)]):
        raise ValueError('Fixed protocol changed')
    if [m['name'] for m in protocol['models']] != MODELS:
        raise ValueError('Model arms changed')
    if sha256(output / 'inventory.json') != protocol['inventorySha256']:
        raise ValueError('Inventory changed')
    inventory = read_json(output / 'inventory.json')
    if inventory['models'] != protocol['models'] or inventory['ollamaVersion'] != protocol['ollamaVersion']:
        raise ValueError('Inventory/protocol mismatch')
    if protocol['dataset'] != {'path': DATASET.relative_to(ROOT).as_posix(), 'sha256': sha256(DATASET),
                               'canonicalSha256': DATA_HASH, 'count': 48}:
        raise ValueError('Current dataset changed')
    if sha256(output / 'development.json') != protocol['dataset']['sha256']:
        raise ValueError('Frozen dataset changed')
    expected_sources = {path.relative_to(ROOT).as_posix() for path in sources()}
    if {item['path'] for item in protocol['sourceInventory']} != expected_sources:
        raise ValueError('Source inventory changed')
    for item in protocol['sourceInventory']:
        if item['frozenPath'] != 'frozenSources/' + item['path']:
            raise ValueError('Invalid frozen source path')
        if sha256(ROOT / item['path']) != item['sha256'] or sha256(output / item['frozenPath']) != item['sha256']:
            raise ValueError('Protocol source drift')
    rows = read_json(output / 'development.json')
    validate_dataset(rows)
    return protocol, rows


def run(output, protocol_sha256):
    output = Path(output)
    # Exclusive creation is deliberately before validation: even an invalid attempt is not retried.
    write_json(output / 'run-start.json', {'protocolSha256': protocol_sha256,
               'startedUtc': datetime.now(timezone.utc).isoformat()})
    deadline = time.monotonic() + LIMITS['totalSeconds']
    client = LocalClient(output, deadline)
    owned = None
    try:
        if (output / 'failure.json').exists() or (output / 'completion.json').exists():
            raise ValueError('Output already failed or completed')
        protocol, rows = validate_protocol(output, protocol_sha256)
        summaries = []
        for arm, model in enumerate(protocol['models']):
            ps = client.call('/api/ps')
            if any(entry.get('name') in MODELS for entry in ps.get('models', [])):
                raise ValueError('Benchmark model already resident; ownership cannot be claimed')
            write_json(output / f'arm-{arm}-before.json', identity(client, model, protocol['ollamaVersion'], deadline))
            records = []
            for index, row in enumerate(rows):
                check_deadline(deadline)
                request = request_for(model['name'], row)
                owned = model['name']
                start = time.monotonic()
                started = datetime.now(timezone.utc).isoformat()
                response = client.call('/api/chat', request)
                wall = time.monotonic() - start
                exchange = client.last_exchange
                finished = datetime.now(timezone.utc).isoformat()
                record = {'arm': arm, 'caseIndex': index, 'id': row['id'], 'request': request,
                    'response': response, 'exchange': exchange, 'wallSeconds': wall,
                    'startedUtc': started, 'finishedUtc': finished, 'modelDigest': model['digest'],
                    'targetTokenLoss': None, 'targetTokens': None}
                try:
                    record['output'] = validate_response(response, model['name'])
                    record['residency'] = client.call('/api/ps')
                    resident(record['residency'], model)
                    record['diagnostics'] = score(record['output'], row)
                except BaseException as error:
                    record['error'] = f'{type(error).__name__}: {error}'
                    raise
                finally:
                    write_json(output / f'records/{arm}-{index:03d}.json', record)
                records.append(record)
            write_json(output / f'arm-{arm}-after.json', identity(client, model, protocol['ollamaVersion'], deadline))
            stopping, owned = owned, None
            stop_owned(client, stopping)
            summary = {'name': model['name'], 'digest': model['digest'], **aggregate(records),
                       'residencyLabel': RESIDENCY_LABEL}
            summary['slices'] = {label: aggregate([r for r, row in zip(records, rows, strict=True)
                if row['expectedAbstention'] is expected]) for label, expected in [('supported', False), ('insufficient', True)]}
            summaries.append(summary)
        check_deadline(deadline)
        validate_protocol(output, protocol_sha256)
        report = {'schemaVersion': 1, 'protocolSha256': protocol_sha256, 'flags': FLAGS,
            'semanticAcceptance': False, 'historical4BComparisonsMatched': False,
            'historical4BComparisonReason': 'Format, runtime and token budget changed; historical 4B results are not matched arms.',
            'targetTokenLoss': None, 'targetTokenLossStatus': 'unmeasured', 'metricsVersion': METRICS_VERSION, 'arms': summaries}
        write_json(output / 'report.json', report)
        files = [{'path': path.relative_to(output).as_posix(), 'sha256': sha256(path, deadline)}
                 for path in sorted(output.rglob('*')) if path.is_file()]
        write_json(output / 'completion.json', {'schemaVersion': 1, 'protocolSha256': protocol_sha256, 'files': files})
        return report
    except BaseException as error:
        if not (output / 'failure.json').exists():
            write_json(output / 'failure.json', {'stage': 'run', 'error': f'{type(error).__name__}: {error}',
                       'protocolSha256': protocol_sha256, 'flags': FLAGS})
        raise
    finally:
        if owned is not None:
            stop_owned(client, owned)


def stop_owned(client, name):
    if name not in MODELS:
        raise ValueError('Refuse unloading unrelated model')
    result = client.call('/api/chat', {'model': name, 'messages': [], 'keep_alive': 0, 'stream': False}, cleanup=True)
    if result.get('done') is not True or result.get('done_reason') != 'unload':
        raise ValueError('Owned model unload was not confirmed')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    freezing = commands.add_parser('freeze')
    freezing.add_argument('--output', type=Path, required=True)
    freezing.add_argument('--inventory', type=Path, required=True)
    running = commands.add_parser('run')
    running.add_argument('--output', type=Path, required=True)
    running.add_argument('--protocol-sha256', required=True)
    args = parser.parse_args()
    if args.command == 'freeze':
        print(freeze(args.output, args.inventory))
    else:
        print(json.dumps(run(args.output, args.protocol_sha256), indent=2))


if __name__ == '__main__':
    main()
