"""Metadata-only training readiness screen. Never imports torch or loads tensors.

Existing Qwen3 training preflights remain authoritative for their frozen recipes.
This command screens format/runtime/memory prerequisites before any new recipe.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import socket
import stat
import struct
import sys

PACKAGES = ('torch','transformers','peft','accelerate','safetensors','tokenizers','bitsandbytes','torchao','gguf')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def metadata_path_stat(path):
    """Reject symlinks/junctions in every component; do not resolve through them."""
    leaf = None
    for component in (path, *path.parents):
        info = component.lstat()
        if stat.S_ISLNK(info.st_mode) or (getattr(info, 'st_file_attributes', 0) & getattr(stat, 'FILE_ATTRIBUTE_REPARSE_POINT', 0)):
            raise ValueError('metadata_symlink_path')
        if leaf is None:
            leaf = info
    return leaf


def metadata_identity(info):
    # Windows lstat and CRT fstat can expose different legacy ctime semantics.
    # Compare ctime only within the same API before/after the read below.
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, getattr(info, 'st_birthtime_ns', None))


def read_json(path, expected=None, limit=2_000_000):
    if type(limit) is not int or limit < 1:
        raise ValueError('metadata_file_bound')
    # abspath removes lexical dot segments without following filesystem links.
    path = Path(os.path.abspath(path))
    before = metadata_path_stat(path)
    if not stat.S_ISREG(before.st_mode) or before.st_size > limit:
        raise ValueError('metadata_file_bound')
    flags = os.O_RDONLY | getattr(os, 'O_BINARY', 0) | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_NONBLOCK', 0)
    descriptor = os.open(path, flags)
    try:
        opened = os.fstat(descriptor)
        if not stat.S_ISREG(opened.st_mode) or opened.st_size > limit:
            raise ValueError('metadata_file_bound')
        if metadata_identity(opened) != metadata_identity(before):
            raise ValueError('metadata_file_changed')
        data = bytearray()
        while len(data) < limit + 1:
            chunk = os.read(descriptor, min(65536, limit + 1 - len(data)))
            if not chunk:
                break
            data.extend(chunk)
        after = os.fstat(descriptor)
        current = metadata_path_stat(path)
        if (len(data) > limit or len(data) != opened.st_size
                or metadata_identity(after) != metadata_identity(opened)
                or metadata_identity(current) != metadata_identity(opened)
                or after.st_ctime_ns != opened.st_ctime_ns
                or current.st_ctime_ns != before.st_ctime_ns
                or not stat.S_ISREG(current.st_mode)):
            raise ValueError('metadata_file_changed')
    finally:
        os.close(descriptor)
    if expected is not None and digest(data) != expected:
        raise ValueError('metadata_digest_mismatch')
    return json.loads(data)


def config_registry(package_root):
    files = []
    for name in ('configuration_auto.py', 'auto_mappings.py'):
        path = Path(package_root) / 'models/auto' / name
        if path.is_file():
            text = path.read_text()
            files.append({'path':str(path),'sha256':digest(text.encode()),'text':text})
    combined = '\n'.join(item['text'] for item in files)
    return {'files':[{k:v for k,v in item.items() if k != 'text'} for item in files],
            'qwen3':bool(re.search(r'\("qwen3",\s*"Qwen3Config"\)', combined)),
            'qwen3_5':bool(re.search(r'\("qwen3_5",\s*"Qwen3_5Config"\)', combined))}


def runtime_probe():
    # Metadata/library source reads only. No CUDA/HIP initialization or tensor operations.
    versions, metadata = {}, {}
    for name in PACKAGES:
        try:
            package = importlib.metadata.distribution(name)
            versions[name] = package.version
            content = package.read_text('METADATA')
            metadata[name] = digest(content.encode()) if content is not None else None
        except importlib.metadata.PackageNotFoundError:
            versions[name], metadata[name] = None, None
    config = importlib.util.find_spec('transformers')
    registry = config_registry(Path(config.origin).parent) if config else {'files':[],'qwen3':False,'qwen3_5':False}
    return {'schema':'local-training-runtime-probe-v1', 'createdAt':datetime.now(timezone.utc).isoformat(),
            'pythonExecutable':sys.executable, 'pythonVersion':sys.version.split()[0], 'packages':versions,
            'packageMetadataSha256':metadata,
            'configRegistry':registry,
            'trainingExecuted':False, 'inferenceExecuted':False, 'gpuInitialized':False,
            'limits':['Distribution metadata and config registration do not prove backward kernels, PEFT target compatibility, memory fit or saved-adapter reload.']}


def safetensors_header(path):
    with Path(path).open('rb') as stream:
        prefix = stream.read(8)
        if len(prefix) != 8:
            raise ValueError('safetensors_header_missing')
        size = struct.unpack('<Q', prefix)[0]
        if not 2 <= size <= 8_000_000:
            raise ValueError('safetensors_header_bound')
        raw = stream.read(size)
        if len(raw) != size:
            raise ValueError('safetensors_header_truncated')
    tensors = json.loads(raw)
    result = {}
    for name, value in tensors.items():
        if name == '__metadata__':
            continue
        shape = value['shape']
        if not isinstance(shape, list) or any(type(n) is not int or n < 0 for n in shape):
            raise ValueError('tensor_shape_invalid')
        result[value['dtype']] = result.get(value['dtype'], 0) + math.prod(shape)
    return {'headerSha256':digest(raw), 'parametersByDtype':result}


def inspect_4b(provenance_path, provenance):
    revision = provenance['revision']
    if provenance['model'] != 'Qwen/Qwen3-4B-Instruct-2507' or not re.fullmatch('[a-f0-9]{40}', revision):
        raise ValueError('unexpected_reference_model')
    directory = provenance_path.resolve().parent / 'model' / revision
    files = provenance['files']
    config = read_json(directory / 'config.json', files['config.json']['sha256'])
    read_json(directory / 'model.safetensors.index.json', files['model.safetensors.index.json']['sha256'])
    shards = []
    for name, expected in files.items():
        if not name.endswith('.safetensors'):
            continue
        if Path(name).name != name:
            raise ValueError('weight_path_invalid')
        path = directory / name
        if path.stat().st_size != expected['bytes']:
            raise ValueError('weight_size_mismatch')
        shards.append({'name':name,'bytes':path.stat().st_size, **safetensors_header(path)})
    if not shards:
        raise ValueError('trainable_shards_missing')
    return {'modelId':provenance['model'],'revision':revision,'format':'safetensors','modelType':config['model_type'],
            'architectures':config['architectures'],'dtype':config['torch_dtype'],'shards':shards,
            'tensorParameters':sum(sum(s['parametersByDtype'].values()) for s in shards),
            'fullWeightHashesReverified':False,'metadataOnly':True}


def inspect_27b(inventory):
    model = inventory['model']
    if model['name'] != 'qwen3.8:27b' or model['show']['details']['format'] != 'gguf':
        raise ValueError('unexpected_larger_model')
    manifest = read_json(model['manifestPath'], model['manifestSha256'])
    layers = []
    for layer in manifest['layers']:
        if layer['mediaType'] != 'application/vnd.ollama.image.model':
            continue
        expected = next((v for v in model['layers'] if 'sha256:'+v['sha256'] == layer['digest']), None)
        if not expected:
            raise ValueError('model_layer_missing')
        path = Path(expected['path'])
        if path.stat().st_size != expected['sizeBytes'] or path.stat().st_size != layer['size']:
            raise ValueError('model_layer_size_mismatch')
        with path.open('rb') as stream:
            magic = stream.read(4)
        if magic != b'GGUF':
            raise ValueError('expected_gguf_header')
        layers.append({'declaredSha256':expected['sha256'],'bytes':path.stat().st_size,'magic':'GGUF'})
    if not layers:
        raise ValueError('model_layer_missing')
    return {'modelId':model['name'],'installedManifestSha256':model['manifestSha256'],
            'format':model['show']['details']['format'],'quantization':model['show']['details']['quantization_level'],
            'architecture':model['show']['model_info']['general.architecture'],
            'declaredParameterCount':model['show']['model_info']['general.parameter_count'],
            'layers':layers,'fullWeightHashesReverified':False,'metadataOnly':True}


def assess(runtime, reference_model, larger_model, contract):
    if runtime.get('schema') != 'local-training-runtime-probe-v1':
        raise ValueError('runtime_probe_schema')
    capacity = contract['environment']['gpuTotalMemory']
    parameters = larger_model['declaredParameterCount']
    if type(capacity) is not int or capacity <= 0 or type(parameters) is not int or parameters <= 0:
        raise ValueError('positive_memory_and_parameter_counts_required')
    missing = [n for n in ('torch','transformers','peft','accelerate','safetensors') if not runtime['packages'].get(n)]
    drift = [n for n,v in contract['environment']['packages'].items() if runtime['packages'].get(n) != v]
    blockers = ['new_exact_training_recipe_not_approved', 'larger_model_backward_memory_reload_unqualified']
    if larger_model['format'] != 'safetensors':
        blockers.append('installed_gguf_not_existing_transformers_peft_snapshot')
    if larger_model['architecture'] != reference_model['modelType']:
        blockers.append('existing_qwen3_qualification_does_not_cover_larger_architecture')
    if 2*parameters > capacity:
        blockers.append('bf16_resident_base_alone_exceeds_reviewed_gpu_capacity')
    if not runtime['packages'].get('bitsandbytes') and not runtime['packages'].get('torchao'):
        blockers.append('no_inspected_low_memory_training_backend_installed')
    if missing: blockers.append('training_dependencies_missing')
    if drift: blockers.append('historical_runtime_versions_differ')
    if not runtime['configRegistry']['qwen3_5']: blockers.append('larger_config_registration_not_observed')
    return {'schema':'local-training-readiness-v1','createdAt':datetime.now(timezone.utc).isoformat(),
            'status':'blocked_for_new_training','trainingAuthorized':False,'productionEligible':False,
            'blockers':blockers,'missingDependencies':missing,'runtimeVersionDrift':drift,
            'runtime':runtime,'existing4B':reference_model,'candidate27B':larger_model,
            'memory':{'basis':'Declared Ollama parameter count times two bytes; excludes activations, gradients, adapters, optimizer and workspaces.',
                      'bf16BaseWeightBytes':2*parameters,'reviewedGpuTotalBytes':capacity,'currentFreeGpuMemoryMeasured':False,
                      'historicalDevice':contract['environment']['gpuName'],'historicalArchitecture':contract['environment']['gpuArchitecture']},
            'historicalQualificationScope':{'schema':contract['schema'],'smokeKinds':[s['kind'] for s in contract.get('smokes',[])],
                                            'transfersTo27B':False},
            'requiredDecisionPacket':[
                'Exact model publisher/revision, native trainable weight format, file hashes, download bytes and source/license; no weight acquisition approved here.',
                'Exact local runtime/package sources and quantization/offload strategy; any installation or changed backend needs approval and qualification.',
                'Exact local device and memory/offload limits, or a named paid-compute provider, location, privacy terms, duration and dollar ceiling; no paid compute approved.',
                'Frozen model/runtime/source/data/recipe hashes; explicit sequence length, microbatch, accumulation, LoRA targets/rank, optimizer, steps, timeout and output bounds.',
                'Separately authorized architecture-specific backward/update smoke, peak-memory measurement and saved-adapter reload, then exact training recipe authorization.',
            ],
            'limits':['The known approved 27B location is a GGUF inference artifact. No global disk search for hypothetical other snapshots was performed.',
                      'GGUF conversion or another trainer may be possible; neither is implemented or qualified by the existing Qwen3 PEFT path.',
                      'Absent bitsandbytes/torchao is not proof that every alternative backend is impossible. No low-memory route was qualified.',
                      'Weight headers/sizes and pinned metadata were inspected; full multi-gigabyte weight hashes were not recomputed.',
                      'No GPU initialization, inference, training, protected corpus read, download, environment modification or activation occurs.']}


def write_new(path, value):
    with Path(path).open('x',encoding='utf8') as stream:
        json.dump(value,stream,indent=2);stream.write('\n')


def main():
    os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',HF_HUB_DISABLE_TELEMETRY='1')
    def denied(*_args,**_kwargs): raise RuntimeError('network_disabled_for_metadata_preflight')
    socket.create_connection = denied; socket.socket.connect = denied; socket.socket.connect_ex = denied; socket.socket.sendto = denied
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command',required=True)
    probe = sub.add_parser('probe-runtime'); probe.add_argument('output',type=Path)
    inspect = sub.add_parser('inspect')
    for name in ('runtime','inventory','provenance','contract'):
        inspect.add_argument('--'+name,type=Path,required=True);inspect.add_argument('--'+name+'-sha256',required=True)
    inspect.add_argument('--output',type=Path,required=True)
    args = parser.parse_args()
    if args.command == 'probe-runtime':
        write_new(args.output,runtime_probe());return
    values = {name:read_json(getattr(args,name),getattr(args,name+'_sha256')) for name in ('runtime','inventory','provenance','contract')}
    report = assess(values['runtime'],inspect_4b(args.provenance,values['provenance']),inspect_27b(values['inventory']),values['contract'])
    report['inputPins'] = {name:{'path':str(getattr(args,name)),'sha256':getattr(args,name+'_sha256')} for name in values}
    write_new(args.output,report);print(json.dumps({'status':report['status'],'blockers':report['blockers'],'trainingAuthorized':False}))
    sys.exit(2)


if __name__ == '__main__':
    main()
