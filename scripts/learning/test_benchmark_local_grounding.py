"""Synthetic checks only: no model inference, downloads, or final cases."""
import copy
from contextlib import contextmanager
import json
from pathlib import Path
import shutil
import time
import unittest
import uuid
from unittest.mock import patch

import benchmark_local_grounding as benchmark


@contextmanager
def test_directory():
    # Python 3.14's Windows mode-0700 tempfile ACL excludes the sandbox token.
    path = benchmark.ROOT / ('local-benchmark-test-' + uuid.uuid4().hex)
    path.mkdir()
    try:
        yield path
    finally:
        if path.resolve().parent != benchmark.ROOT.resolve() or not path.name.startswith('local-benchmark-test-'):
            raise ValueError('Unsafe temporary cleanup path')
        shutil.rmtree(path)


def response():
    return {'model': benchmark.MODELS[0], 'done': True, 'done_reason': 'stop',
        'message': {'role': 'assistant', 'thinking': 'Private diagnostic trace.',
                    'content': 'EVIDENCE: blue\nNEXT: Which log entry names the color?'},
        'prompt_eval_count': 250, 'eval_count': 30, 'total_duration': 120,
        'load_duration': 10, 'prompt_eval_duration': 20, 'eval_duration': 80}


def fixture_model(directory):
    blob = directory / 'blob'
    blob.write_bytes(b'local synthetic weights')
    digest = benchmark.sha256(blob)
    manifest = {'config': {'digest': 'sha256:' + digest, 'size': blob.stat().st_size}, 'layers': []}
    raw = json.dumps(manifest)
    path = directory / 'manifest'
    path.write_text(raw, encoding='utf-8')
    return {'name': benchmark.MODELS[0], 'digest': benchmark.sha256(path), 'show': {'details': {'family': 'synthetic'}},
        'manifestPath': str(path), 'manifestSha256': benchmark.sha256(path), 'manifestRaw': raw, 'manifest': manifest,
        'layers': [{'path': str(blob), 'sha256': digest, 'sizeBytes': blob.stat().st_size}]}


class FakeClient:
    def __init__(self, model):
        self.model = model
        self.calls = []

    def call(self, route, body=None, **kwargs):
        self.calls.append((route, body))
        if route == '/api/version':
            return {'version': 'test'}
        if route == '/api/tags':
            return {'models': [{'name': self.model['name'], 'digest': self.model['digest']}]}
        if route == '/api/show':
            return self.model['show']
        return {'done': True, 'done_reason': 'unload'}


class LocalBenchmarkTests(unittest.TestCase):
    def test_fixed_request_preserves_content_without_targets(self):
        request = benchmark.request_for(benchmark.MODELS[0], benchmark.SMOKE)
        self.assertEqual(request['messages'][0]['content'], benchmark.SYSTEM)
        self.assertEqual(len(request['messages']), 2)
        self.assertTrue(request['think'])
        self.assertEqual(request['options']['num_predict'], 4096)
        self.assertNotIn('target', request)

    def test_thinking_saved_but_only_content_scored(self):
        result = response()
        self.assertEqual(benchmark.validate_response(result, benchmark.MODELS[0]), result['message']['content'])
        result['message']['thinking'] = 3
        with self.assertRaisesRegex(ValueError, 'thinking'):
            benchmark.validate_response(result, benchmark.MODELS[0])

    def test_incomplete_and_silent_limit_rejected(self):
        for changes in ({'done': False}, {'done_reason': 'length'}, {'eval_count': 4096}, {'model': 'other'}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                benchmark.validate_response({**response(), **changes}, benchmark.MODELS[0])
        result = response()
        result['message']['content'] = ''
        with self.assertRaises(ValueError):
            benchmark.validate_response(result, benchmark.MODELS[0])

    def test_invalid_telemetry_rejected(self):
        for field, value in [('eval_count', True), ('eval_duration', 0), ('total_duration', 20),
                             ('prompt_eval_count', float('nan')), ('load_duration', -1)]:
            with self.subTest(field=field), self.assertRaises(ValueError):
                benchmark.validate_response({**response(), field: value}, benchmark.MODELS[0])

    def test_local_layer_and_manifest_drift_rejected(self):
        with test_directory() as temporary:
            model = fixture_model(Path(temporary))
            benchmark.validate_layers(model, None)
            Path(model['layers'][0]['path']).write_bytes(b'corrupt synthetic blob')
            with self.assertRaises(ValueError):
                benchmark.validate_layers(model, None)

    def test_model_digest_and_runtime_drift_rejected(self):
        with test_directory() as temporary:
            model = fixture_model(Path(temporary))
            client = FakeClient(model)
            benchmark.identity(client, model, {'version': 'test'}, None)
            changed = copy.deepcopy(model)
            changed['digest'] = 'f' * 64
            with self.assertRaisesRegex(ValueError, 'digest'):
                benchmark.identity(client, changed, {'version': 'test'}, None)
            with self.assertRaisesRegex(ValueError, 'runtime'):
                benchmark.identity(client, model, {'version': 'another'}, None)

    def test_wrong_development_source_rejected(self):
        with self.assertRaisesRegex(ValueError, 'source'):
            benchmark.validate_dataset([{'id': 'synthetic'}])

    def test_loopback_boundary_and_redirects(self):
        with test_directory() as temporary:
            client = benchmark.LocalClient(temporary, time.monotonic() + 20)
            for target in ('https://example.com/api/chat', '//evil.test', '/api/pull', '/api/chat?remote=1'):
                with self.subTest(target=target), self.assertRaisesRegex(ValueError, 'loopback'):
                    client.call(target)
            self.assertFalse(any(isinstance(handler, benchmark.urllib.request.ProxyHandler)
                                 and handler.proxies for handler in client.opener.handlers))
            with self.assertRaisesRegex(ValueError, 'Redirects'):
                benchmark.NoRedirect().redirect_request(None, None, None, None, None, 'http://example.com')

    def test_run_is_exclusive_even_when_preflight_fails(self):
        with test_directory() as temporary:
            output = Path(temporary)
            with self.assertRaises(FileNotFoundError):
                benchmark.run(output, 'a' * 64)
            self.assertTrue((output / 'failure.json').is_file())
            with self.assertRaises(FileExistsError):
                benchmark.run(output, 'a' * 64)

    def test_freeze_refuses_existing_output(self):
        with test_directory() as temporary, self.assertRaises(FileExistsError):
            benchmark.freeze(Path(temporary), Path(temporary) / 'inventory.json')

    def test_stop_only_owned_model_and_no_implicit_retry(self):
        client = FakeClient({})
        with self.assertRaisesRegex(ValueError, 'unrelated'):
            benchmark.stop_owned(client, 'other')
        self.assertEqual(client.calls, [])
        benchmark.stop_owned(client, benchmark.MODELS[0])
        self.assertEqual(len(client.calls), 1)
        with patch.object(client, 'call', side_effect=TimeoutError('stop timeout')) as call:
            with self.assertRaises(TimeoutError):
                benchmark.stop_owned(client, benchmark.MODELS[0])
            self.assertEqual(call.call_count, 1)

    def test_incomplete_arm_saves_partial_and_stops_owned_model_once(self):
        class IncompleteClient:
            last_exchange = 'raw/synthetic.json'

            def __init__(self):
                self.calls = []

            def call(self, route, body=None, **kwargs):
                self.calls.append((route, body))
                if route == '/api/ps':
                    return {'models': []}
                if body.get('keep_alive') == 0:
                    return {'done': True, 'done_reason': 'unload'}
                return {**response(), 'done_reason': 'length'}

        client = IncompleteClient()
        model = {'name': benchmark.MODELS[0], 'digest': 'a' * 64}
        protocol = {'models': [model], 'ollamaVersion': {'version': 'test'}}
        rows = [{'id': 'synthetic-partial', **benchmark.SMOKE}]
        with test_directory() as output, patch.object(benchmark, 'LocalClient', return_value=client), \
                patch.object(benchmark, 'validate_protocol', return_value=(protocol, rows)), \
                patch.object(benchmark, 'identity', return_value={'synthetic': True}):
            with self.assertRaisesRegex(ValueError, 'truncated'):
                benchmark.run(output, 'a' * 64)
            self.assertTrue((output / 'failure.json').exists())
            self.assertTrue((output / 'records/0-000.json').exists())
            self.assertFalse((output / 'report.json').exists())
            chats = [body for route, body in client.calls if route == '/api/chat']
            self.assertEqual(len(chats), 2)
            self.assertEqual(chats[-1]['keep_alive'], 0)

    def test_residency_is_validated(self):
        model = {'name': benchmark.MODELS[0], 'digest': 'a' * 64}
        ps = {'models': [{'name': model['name'], 'digest': 'sha256:' + model['digest'],
                          'size': 100, 'size_vram': 80, 'context_length': 8192}]}
        self.assertEqual(benchmark.resident(ps, model)['size_vram'], 80)
        ps['models'][0]['size_vram'] = 101
        with self.assertRaises(ValueError):
            benchmark.resident(ps, model)

    def test_deadline_and_distributions(self):
        with self.assertRaises(TimeoutError):
            benchmark.check_deadline(time.monotonic() - 1)
        self.assertEqual(benchmark.distribution([1, 2, 3, 4]), {'median': 2.5, 'p95': 4})


if __name__ == '__main__':
    unittest.main()
