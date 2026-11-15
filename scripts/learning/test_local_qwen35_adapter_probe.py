import copy
import importlib.util
from pathlib import Path
import uuid
import unittest

spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('local_qwen35_adapter_probe.py'))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)

class ProbeContractTests(unittest.TestCase):
    def guard(self):
        return dict(recordedAtUnix=1000, computeSamples=[], gpuProcesses=[], collectionSucceeded=True)

    def test_no_runtime_import_or_weights_at_import(self):
        self.assertNotIn('torch', probe.__dict__)
        self.assertEqual(probe.CONFIG['layer_types'], ['linear_attention', 'full_attention'])
        self.assertEqual(probe.TIMEOUT, 300)
        self.assertGreaterEqual(probe.MIN_FREE, 2 * 1024**3)

    def test_requires_fresh_successful_idle_host_guard(self):
        probe.validate_host_guard(self.guard(), 1001)
        for delta in (-1, 121):
            with self.assertRaises(ValueError): probe.validate_host_guard(self.guard(), 1000 + delta)
        for patch in ({'collectionSucceeded': False}, {'computeSamples': [{'percent': 2}]},
                      {'gpuProcesses': [{'name': 'ollama', 'dedicatedBytes': 1}]},
                      {'gpuProcesses': [{'name': 'python', 'dedicatedBytes': 1}]}):
            value = self.guard(); value.update(patch)
            with self.assertRaises(ValueError): probe.validate_host_guard(value, 1001)

    def test_rejects_unknown_guard_fields(self):
        value = self.guard(); value['ignoreGpuBusy'] = True
        with self.assertRaises(ValueError): probe.validate_host_guard(value, 1001)

    def test_ui_helper_exemption_is_small_and_never_overrides_compute(self):
        value = self.guard()
        value['gpuProcesses'] = [{'name': 'python', 'dedicatedBytes': 1720320, 'windowsMcpUiHelper': True}]
        probe.validate_host_guard(value, 1001)
        value['computeSamples'] = [{'percent': 3}]
        with self.assertRaises(ValueError): probe.validate_host_guard(value, 1001)
        value['computeSamples'] = []
        value['gpuProcesses'][0]['dedicatedBytes'] = 16 * 1024**2 + 1
        with self.assertRaises(ValueError): probe.validate_host_guard(value, 1001)

    def test_invalid_guard_values_never_establish_idle(self):
        for timestamp in (True, float('nan'), float('inf'), '1000'):
            value = self.guard(); value['recordedAtUnix'] = timestamp
            with self.assertRaises(ValueError): probe.validate_host_guard(value, 1001)
        for row in ({'name': '', 'dedicatedBytes': 0}, {'name': 'python', 'dedicatedBytes': -1},
                    {'name': 'python', 'dedicatedBytes': 1, 'windowsMcpUiHelper': 'true'}):
            value = self.guard(); value['gpuProcesses'] = [row]
            with self.assertRaises(ValueError): probe.validate_host_guard(value, 1001)

    def test_strict_sub_two_million_parameter_limit(self):
        for count in (0, -1, True, 1.5, 2_000_000, 27_000_000_000):
            with self.assertRaises(ValueError): probe.validate_parameter_count(count)
        probe.validate_parameter_count(1_999_999)

    def test_exclusive_report_and_nonfinite_rejection(self):
        root = Path(__file__).resolve().parents[2] / 'artifacts' / 'learning-engine' / 'probe-tests'
        root.mkdir(parents=True, exist_ok=True)
        directory = root / str(uuid.uuid4())
        directory.mkdir()
        try:
            path = directory / 'report.json'; probe.save(path, {'a': 1})
            with self.assertRaises(FileExistsError): probe.save(path, {})
            with self.assertRaises(ValueError): probe.save(directory / 'nan.json', {'a': float('nan')})
            self.assertFalse((directory / 'nan.json').exists())
        finally:
            for path in directory.iterdir(): path.unlink()
            directory.rmdir()

    def test_recipe_small_and_both_attention_targets_explicit(self):
        config = copy.deepcopy(probe.CONFIG)
        self.assertLessEqual(config['hidden_size'], 64)
        self.assertEqual(config['num_hidden_layers'], 2)
        self.assertIn('in_proj_qkv', probe.TARGETS)
        self.assertIn('q_proj', probe.TARGETS)

if __name__ == '__main__': unittest.main()
