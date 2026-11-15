"""Opaque metadata-only readiness tests; never load model weights or a GPU."""
import importlib.util
import json
import os
from pathlib import Path
import stat
import struct
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('readiness',Path(__file__).with_name('local_training_readiness.py'))
readiness = importlib.util.module_from_spec(spec);spec.loader.exec_module(readiness)


def inputs():
    packages = {name:'test-version' for name in ('torch','transformers','peft','accelerate','safetensors','tokenizers')}
    runtime = {'schema':'local-training-runtime-probe-v1','packages':{**packages,'bitsandbytes':None,'torchao':None},'configRegistry':{'qwen3_5':True}}
    reference = {'modelType':'qwen3'}
    larger = {'format':'gguf','architecture':'qwen35','declaredParameterCount':27_320_697_856}
    contract = {'schema':'test-contract','environment':{'gpuTotalMemory':34_054_242_304,'gpuName':'test-device','gpuArchitecture':'test-arch','packages':packages},'smokes':[{'kind':'qwen3-lora'}]}
    return runtime, reference, larger, contract


class TrainingReadinessTests(unittest.TestCase):
    def test_inference_residency_and_config_registration_do_not_authorize_training(self):
        values=inputs();values[2]['reportedInferenceResidency']=16*1024**3
        result=readiness.assess(*values)
        self.assertFalse(result['trainingAuthorized'])
        self.assertFalse(result['historicalQualificationScope']['transfersTo27B'])
        self.assertIn('installed_gguf_not_existing_transformers_peft_snapshot',result['blockers'])
        self.assertIn('larger_model_backward_memory_reload_unqualified',result['blockers'])
        self.assertEqual(result['memory']['bf16BaseWeightBytes'],54_641_395_712)

    def test_package_presence_or_more_memory_does_not_grant_new_recipe_approval(self):
        values=inputs();values[0]['packages']['bitsandbytes']='test-version';values[2]['format']='safetensors';values[3]['environment']['gpuTotalMemory']=100*1024**3
        result=readiness.assess(*values)
        self.assertNotIn('no_inspected_low_memory_training_backend_installed',result['blockers'])
        self.assertIn('new_exact_training_recipe_not_approved',result['blockers'])
        self.assertFalse(result['trainingAuthorized'])

    def test_missing_packages_and_runtime_drift_are_separate(self):
        values=inputs();values[0]['packages']['peft']=None
        result=readiness.assess(*values)
        self.assertIn('peft',result['missingDependencies']);self.assertIn('peft',result['runtimeVersionDrift'])

    def test_historical_four_b_proof_does_not_cover_different_architecture(self):
        result=readiness.assess(*inputs())
        self.assertIn('existing_qwen3_qualification_does_not_cover_larger_architecture',result['blockers'])
        self.assertFalse(result['productionEligible'])

    def test_bad_memory_and_parameter_counts_rejected(self):
        for invalid in (0,-1,True,1.5):
            values=inputs();values[2]['declaredParameterCount']=invalid
            with self.assertRaisesRegex(ValueError,'positive_memory'):
                readiness.assess(*values)

    def test_headers_only_read_without_tensor_payload(self):
        with tempfile.TemporaryDirectory(prefix='training-readiness-') as name:
            path=Path(name)/'opaque.safetensors';header=json.dumps({'weight':{'dtype':'BF16','shape':[2,3],'data_offsets':[0,12]}}).encode()
            path.write_bytes(struct.pack('<Q',len(header))+header)
            self.assertEqual(readiness.safetensors_header(path)['parametersByDtype'],{'BF16':6})
            path.write_bytes(struct.pack('<Q',8_000_001))
            with self.assertRaisesRegex(ValueError,'header_bound'):readiness.safetensors_header(path)

    def test_explicit_metadata_digest_and_exclusive_outputs(self):
        with tempfile.TemporaryDirectory(prefix='training-readiness-') as name:
            path=Path(name)/'metadata.json';readiness.write_new(path,{'opaque':True})
            with self.assertRaises(FileExistsError):readiness.write_new(path,{})
            with self.assertRaisesRegex(ValueError,'digest_mismatch'):readiness.read_json(path,'0'*64)
            self.assertEqual(readiness.read_json(path,readiness.digest(path.read_bytes())),{'opaque':True})

    def test_runtime_probe_never_imports_torch_or_model_library(self):
        original_import=__import__
        def guarded(name,*args,**kwargs):
            if name.split('.')[0] in ('torch','peft','transformers','accelerate'):
                raise AssertionError('runtime/model import attempted')
            return original_import(name,*args,**kwargs)
        with patch('builtins.__import__',side_effect=guarded):
            result=readiness.runtime_probe()
        self.assertFalse(result['gpuInitialized']);self.assertFalse(result['trainingExecuted'])

    def test_config_registration_detects_both_legacy_and_generated_mapping_files(self):
        for filename in ('configuration_auto.py','auto_mappings.py'):
            with tempfile.TemporaryDirectory(prefix='training-readiness-') as name:
                root=Path(name);directory=root/'models/auto';directory.mkdir(parents=True)
                (directory/filename).write_text('CONFIG_MAPPING_NAMES = OrderedDict([("qwen3", "Qwen3Config"), ("qwen3_5", "Qwen3_5Config")])')
                result=readiness.config_registry(root)
                self.assertTrue(result['qwen3']);self.assertTrue(result['qwen3_5'])

    def test_metadata_growth_after_open_is_bounded_and_rejected(self):
        with tempfile.TemporaryDirectory(prefix='training-readiness-') as name:
            path=Path(name)/'metadata.json';path.write_bytes(b'{"x":1}')
            original_read=os.read; returned=[]
            def grow_then_read(descriptor,count):
                if not returned:
                    with path.open('ab') as stream:stream.write(b' '*10000)
                chunk=original_read(descriptor,count);returned.append(len(chunk));return chunk
            with patch.object(readiness.os,'read',side_effect=grow_then_read):
                with self.assertRaisesRegex(ValueError,'metadata_file_changed'):
                    readiness.read_json(path,limit=16)
            self.assertLessEqual(sum(returned),17)

    def test_metadata_creation_and_modification_times_can_differ(self):
        with tempfile.TemporaryDirectory(prefix='training-readiness-') as name:
            path=Path(name)/'metadata.json';data=b'{"x":1}';path.write_bytes(data)
            os.utime(path,ns=(1_000_000_000,1_000_000_000))
            self.assertEqual(readiness.read_json(path,readiness.digest(data)),{'x':1})

    def test_metadata_path_replacement_before_open_is_rejected_even_with_same_bytes(self):
        with tempfile.TemporaryDirectory(prefix='training-readiness-') as name:
            path=Path(name)/'metadata.json';data=b'{"x":1}';path.write_bytes(data)
            original_open=os.open
            def replace_then_open(filename,flags):
                path.rename(path.with_name('original.json'));path.write_bytes(data)
                return original_open(filename,flags)
            with patch.object(readiness.os,'open',side_effect=replace_then_open):
                with self.assertRaisesRegex(ValueError,'metadata_file_changed'):
                    readiness.read_json(path,readiness.digest(data))

    def test_metadata_descriptor_size_change_after_read_is_rejected(self):
        with tempfile.TemporaryDirectory(prefix='training-readiness-') as name:
            path=Path(name)/'metadata.json';path.write_bytes(b'{"x":1}')
            original_read=os.read; altered=False
            def truncate_after_read(descriptor,count):
                nonlocal altered
                chunk=original_read(descriptor,count)
                if not altered:
                    altered=True
                    with path.open('wb') as stream:stream.write(b'{}')
                return chunk
            with patch.object(readiness.os,'read',side_effect=truncate_after_read):
                with self.assertRaisesRegex(ValueError,'metadata_file_changed'):
                    readiness.read_json(path)

    def test_metadata_directory_and_symlink_component_rejected_before_open(self):
        with tempfile.TemporaryDirectory(prefix='training-readiness-') as name:
            root=Path(name)
            with self.assertRaisesRegex(ValueError,'metadata_file_bound'):readiness.read_json(root)
            path=root/'metadata.json';path.write_bytes(b'{}')
            original_lstat=Path.lstat
            def symlink_parent(value,*args,**kwargs):
                result=original_lstat(value,*args,**kwargs)
                if value == root:
                    fields=list(result);fields[0]=stat.S_IFLNK|0o777
                    return os.stat_result(fields)
                return result
            with patch.object(Path,'lstat',symlink_parent), patch.object(readiness.os,'open') as opened:
                with self.assertRaisesRegex(ValueError,'metadata_symlink_path'):readiness.read_json(path)
                opened.assert_not_called()


if __name__ == '__main__':unittest.main()
