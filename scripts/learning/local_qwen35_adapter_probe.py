"""Bounded random Qwen3.5 text/LoRA backend proof. No checkpoint or corpus inputs."""
from __future__ import annotations
import argparse
import hashlib
import importlib.metadata as metadata
import json
import math
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import traceback

SEED = 93527
TIMEOUT = 300
MIN_FREE = 2 * 1024**3
MAX_PARAMETERS = 2_000_000
CONFIG = dict(vocab_size=128, hidden_size=64, intermediate_size=128, num_hidden_layers=2,
              num_attention_heads=4, num_key_value_heads=2, head_dim=16,
              linear_conv_kernel_dim=4, linear_key_head_dim=16, linear_value_head_dim=16,
              linear_num_key_heads=2, linear_num_value_heads=4,
              layer_types=['linear_attention', 'full_attention'], max_position_embeddings=64,
              use_cache=False, tie_word_embeddings=False, pad_token_id=0, bos_token_id=1, eos_token_id=2,
              rope_parameters={'rope_type': 'default', 'rope_theta': 10000.0, 'partial_rotary_factor': 1.0,
                               'mrope_section': [3, 3, 2]})
TARGETS = ['in_proj_qkv', 'out_proj', 'q_proj', 'v_proj']

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def save(path: Path, value: object) -> None:
    encoded = json.dumps(value, indent=2, allow_nan=False) + '\n'
    with path.open('x', encoding='utf-8') as stream:
        stream.write(encoded)

def offline() -> None:
    for key in ('HF_HUB_OFFLINE', 'TRANSFORMERS_OFFLINE', 'HF_HUB_DISABLE_TELEMETRY'):
        os.environ[key] = '1'
    os.environ['TOKENIZERS_PARALLELISM'] = 'false'
    os.environ['PYTHONDONTWRITEBYTECODE'] = '1'
    def deny(event, _args):
        if event in ('socket.connect', 'socket.bind', 'socket.getaddrinfo', 'socket.sendto'):
            raise RuntimeError('probe_network_forbidden')
    sys.addaudithook(deny)

def validate_host_guard(value: dict, now: float) -> None:
    if not isinstance(value, dict) or set(value) != {'recordedAtUnix', 'computeSamples', 'gpuProcesses', 'collectionSucceeded'}:
        raise ValueError('host_guard_shape')
    timestamp = value['recordedAtUnix']
    if type(timestamp) not in (int, float) or not math.isfinite(timestamp):
        raise ValueError('host_guard_timestamp')
    if value['collectionSucceeded'] is not True or not 0 <= now - timestamp <= 120:
        raise ValueError('host_guard_stale_or_unavailable')
    if not isinstance(value['computeSamples'], list) or not isinstance(value['gpuProcesses'], list):
        raise ValueError('host_guard_shape')
    if value['computeSamples']:
        raise ValueError('concurrent_host_gpu_compute')
    # A collector-verified Windows MCP UI helper may own a small graphics context.
    # Any active compute sample still blocks, including for these UI helpers.
    for row in value['gpuProcesses']:
        if (not isinstance(row, dict) or not {'name', 'dedicatedBytes'} <= set(row)
                or set(row) - {'pid', 'name', 'dedicatedBytes', 'windowsMcpUiHelper'}
                or not isinstance(row['name'], str) or not row['name']
                or type(row['dedicatedBytes']) is not int or row['dedicatedBytes'] < 0
                or ('windowsMcpUiHelper' in row and type(row['windowsMcpUiHelper']) is not bool)):
            raise ValueError('host_gpu_process_shape')
        if (row.get('windowsMcpUiHelper') is True and row['name'].lower() == 'python'
                and 0 <= row['dedicatedBytes'] <= 16 * 1024**2):
            continue
        if row['dedicatedBytes'] > 0 and any(name in row['name'].lower() for name in ('python', 'ollama', 'llama', 'comfy', 'vmmem')):
            raise ValueError('concurrent_host_gpu_model_residency')

def linux_compute_processes() -> list[dict]:
    excluded = {os.getpid(), os.getppid()}
    found = []
    for path in Path('/proc').iterdir():
        if not path.name.isdigit() or int(path.name) in excluded:
            continue
        try:
            name = (path / 'comm').read_text().strip()
        except (FileNotFoundError, PermissionError):
            continue
        if any(x in name.lower() for x in ('python', 'ollama', 'llama', 'comfy')):
            found.append({'pid': int(path.name), 'name': name})
    return found

def validate_parameter_count(count: int) -> None:
    if type(count) is not int or not 0 < count < MAX_PARAMETERS:
        raise ValueError('random_model_parameter_ceiling')

def child(output: Path, device: str) -> int:
    offline()
    import resource
    resource.setrlimit(resource.RLIMIT_FSIZE, (16 * 1024**2, 16 * 1024**2))
    started = time.monotonic()
    report = {'schema': 'tiny-random-qwen35-lora-proof-v1', 'status': 'incomplete', 'seed': SEED,
              'device': device, 'tinyGpuBackendQualified': False,
              'realCheckpointLoaded': False, 'corpusRead': False, 'networkCallsAllowed': False,
              'productionEligible': False, 'qualityClaim': False, 'largeModelFitClaim': False,
              'probeSourceSha256': digest(Path(__file__)), 'configuration': CONFIG,
              'recipe': {'steps': 1, 'sequenceLength': 16, 'batchSize': 1, 'rank': 2, 'alpha': 4,
                         'dropout': 0.0, 'targets': TARGETS, 'optimizer': 'SGD', 'learningRate': 0.1,
                         'baseDtype': 'bfloat16' if device == 'cuda' else 'float32', 'attention': 'eager', 'timeoutSeconds': TIMEOUT},
              'outputLimits': {'maxSingleFileBytes': 16 * 1024**2, 'maxBaseParametersExclusive': MAX_PARAMETERS,
                               'reloadTolerance': 0, 'randomInputsOnly': True},
              'limits': ['Tiny random tensors do not establish 27B fit, quantized training, quality, or deployment eligibility.',
                         'Python socket audit/offline flags are not operating-system network isolation.',
                         'Sampled process/counter guards cannot prevent another program starting afterward.',
                         'Peak figures are this PyTorch process allocator, not total-board peak memory.']}
    torch = None
    try:
        guard = json.loads((output / 'host-guard.json').read_text()) if (output / 'host-guard.json').exists() else None
        if device == 'cuda':
            validate_host_guard(guard, time.time())
        processes = linux_compute_processes()
        report['concurrencyGuard'] = {'host': guard, 'otherLinuxComputeProcesses': processes}
        if device == 'cuda' and processes:
            raise RuntimeError('concurrent_linux_compute_process')
        import torch as imported_torch
        torch = imported_torch
        from transformers import Qwen3_5TextConfig, Qwen3_5ForCausalLM
        from peft import LoraConfig, TaskType, get_peft_model, PeftModel
        import transformers.models.qwen3_5.modeling_qwen3_5 as architecture
        import peft.tuners.lora.layer as lora_layer
        import inspect
        report['packages'] = {name: metadata.version(name) for name in ('torch', 'transformers', 'peft', 'accelerate', 'safetensors')}
        report['sourcePins'] = [{'path': str(Path(inspect.getfile(obj))), 'sha256': digest(Path(inspect.getfile(obj)))}
                                for obj in (Qwen3_5TextConfig, architecture, lora_layer)]
        if device == 'cuda':
            if not torch.cuda.is_available() or not torch.version.hip:
                raise RuntimeError('rocm_gpu_unavailable')
            free, total = torch.cuda.mem_get_info()
            report['gpu'] = {'name': torch.cuda.get_device_name(0), 'hip': torch.version.hip,
                         'freeBeforeBytes': free, 'totalBytes': total, 'requiredFreeBytes': MIN_FREE}
            if free < MIN_FREE:
                raise RuntimeError('gpu_free_below_2gib')
            if linux_compute_processes():
                raise RuntimeError('concurrent_linux_compute_before_allocation')
            torch.cuda.reset_peak_memory_stats()
        torch.manual_seed(SEED)
        torch.set_num_threads(2)
        config = Qwen3_5TextConfig(**CONFIG)
        config._attn_implementation = 'eager'
        base = Qwen3_5ForCausalLM(config)
        count = sum(p.numel() for p in base.parameters())
        validate_parameter_count(count)
        report['baseParameterCount'] = count
        # Tiny random base only: reload from our own in-memory state, never a checkpoint path.
        base_state = {name: tensor.detach().clone() for name, tensor in base.state_dict().items()}
        runtime_device = 'cuda:0' if device == 'cuda' else 'cpu'
        dtype = torch.bfloat16 if device == 'cuda' else torch.float32
        base.to(device=runtime_device, dtype=dtype)
        lora = LoraConfig(task_type=TaskType.CAUSAL_LM, r=2, lora_alpha=4, lora_dropout=0.0,
                          target_modules=TARGETS, bias='none')
        model = get_peft_model(base, lora)
        trainable = {name: p for name, p in model.named_parameters() if p.requires_grad}
        if not trainable or any('lora_' not in name for name in trainable):
            raise RuntimeError('unexpected_trainable_parameters')
        report['trainableParameterCount'] = sum(p.numel() for p in trainable.values())
        before = {name: p.detach().cpu().clone() for name, p in trainable.items()}
        frozen_before = {name: p.detach().cpu().clone() for name, p in model.named_parameters() if not p.requires_grad}
        tokens = torch.arange(3, 19, device=runtime_device).reshape(1, 16)
        model.train()
        optimizer = torch.optim.SGD(list(trainable.values()), lr=0.1)
        loss = model(input_ids=tokens, labels=tokens, use_cache=False).loss
        if not torch.isfinite(loss).item():
            raise RuntimeError('nonfinite_loss')
        loss.backward()
        gradients = {name: {'present': p.grad is not None,
                            'finite': p.grad is not None and bool(torch.isfinite(p.grad).all().item()),
                            'nonzero': p.grad is not None and bool(torch.count_nonzero(p.grad).item())}
                     for name, p in trainable.items()}
        if not all(row['finite'] for row in gradients.values()) or not any(row['nonzero'] for row in gradients.values()):
            raise RuntimeError('invalid_or_zero_adapter_gradients')
        optimizer.step()
        if device == 'cuda': torch.cuda.synchronize()
        changed = [name for name, p in trainable.items() if not torch.equal(before[name], p.detach().cpu())]
        if not changed or not all(torch.isfinite(p).all().item() for p in model.parameters()):
            raise RuntimeError('invalid_adapter_update')
        frozen_unchanged = all(torch.equal(value, dict(model.named_parameters())[name].detach().cpu()) for name, value in frozen_before.items())
        if not frozen_unchanged:
            raise RuntimeError('base_parameter_changed')
        model.eval()
        with torch.no_grad():
            expected = model(input_ids=tokens, use_cache=False).logits.detach().cpu()
        adapter = output / 'random-adapter'
        model.save_pretrained(adapter, safe_serialization=True, save_embedding_layers=False)
        fresh = Qwen3_5ForCausalLM(config)
        fresh.load_state_dict(base_state, strict=True)
        fresh.to(device=runtime_device, dtype=dtype)
        # Only load the adapter just written here; no remote/base from_pretrained calls.
        loaded = PeftModel.from_pretrained(fresh, str(adapter), local_files_only=True).eval()
        with torch.no_grad():
            actual = loaded(input_ids=tokens, use_cache=False).logits.detach().cpu()
        if device == 'cuda': torch.cuda.synchronize()
        if not torch.isfinite(actual).all().item() or not torch.equal(expected, actual):
            raise RuntimeError('saved_adapter_reload_parity')
        report.update(status='passed', loss=float(loss.item()), gradientChecks=gradients,
                      tinyGpuBackendQualified=device == 'cuda',
                      changedAdapterTensors=changed, frozenBaseUnchanged=frozen_unchanged,
                      reloadLogitsBitwiseEqual=True, reloadMaxAbsoluteDifference=float((expected - actual).abs().max().item()),
                      finiteParameters=True, adapterFiles=[{'path': str(p.relative_to(output)), 'bytes': p.stat().st_size, 'sha256': digest(p)}
                                                       for p in sorted(adapter.iterdir()) if p.is_file()])
        return 0
    except Exception as error:
        report.update(status='blocked', errorType=type(error).__name__, error=str(error), traceback=traceback.format_exc())
        return 1
    finally:
        report['elapsedSeconds'] = time.monotonic() - started
        report['peakProcessResidentBytes'] = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024
        report['gpuInitializedByProbe'] = torch is not None and torch.cuda.is_initialized()
        if torch is not None and torch.cuda.is_initialized():
            report['peakAllocatedGpuBytes'] = torch.cuda.max_memory_allocated()
            report['peakReservedGpuBytes'] = torch.cuda.max_memory_reserved()
        save(output / 'result.json', report)

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--host-guard', type=Path)
    parser.add_argument('--device', choices=('cuda', 'cpu'), default='cuda')
    parser.add_argument('--child', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.child:
        return child(args.output, args.device)
    if args.device == 'cuda' and args.host_guard is None:
        parser.error('--host-guard is required')
    guard_bytes = args.host_guard.read_bytes() if args.host_guard else None
    if guard_bytes is not None and len(guard_bytes) > 128_000:
        raise ValueError('host_guard_size')
    if args.device == 'cuda': validate_host_guard(json.loads(guard_bytes), time.time())
    args.output.mkdir(parents=True, exist_ok=False)
    if guard_bytes is not None: (args.output / 'host-guard.json').write_bytes(guard_bytes)
    (args.output / 'probe-source.py').write_bytes(Path(__file__).read_bytes())
    started = time.monotonic()
    command = [sys.executable, '-B', str(Path(__file__).resolve()), '--child', '--device', args.device, '--output', str(args.output.resolve())]
    environment = {key: value for key, value in os.environ.items() if key in {
        'PATH', 'HOME', 'LD_LIBRARY_PATH', 'PYTHONPATH', 'HSA_ENABLE_DXG_DETECTION', 'TORCH_BLAS_PREFER_HIPBLASLT',
        'LANG', 'LC_ALL', 'TMPDIR', 'HIP_VISIBLE_DEVICES', 'ROCR_VISIBLE_DEVICES'}}
    if args.device == 'cpu':
        environment.update(HIP_VISIBLE_DEVICES='', ROCR_VISIBLE_DEVICES='')
    with (args.output / 'process.log').open('xb') as log:
        process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT, env=environment, start_new_session=True)
        timeout = False
        try:
            code = process.wait(timeout=TIMEOUT)
        except subprocess.TimeoutExpired:
            timeout = True
            os.killpg(process.pid, signal.SIGKILL)  # Only this new probe's own process group.
            code = process.wait()
    save(args.output / 'completion.json', {'schema': 'tiny-qwen35-process-receipt-v1', 'exitCode': code,
         'timeout': timeout, 'timeoutSeconds': TIMEOUT, 'elapsedSeconds': time.monotonic() - started,
         'files': [{'path': str(p.relative_to(args.output)), 'sha256': digest(p), 'bytes': p.stat().st_size}
                   for p in sorted(args.output.rglob('*')) if p.is_file()],
         'externalProcessKilled': False, 'environmentCredentialsForwarded': False,
         'realCheckpointLoaded': False, 'productionEligible': False})
    print(json.dumps({'output': str(args.output), 'exitCode': code, 'timeout': timeout}))
    return code if code >= 0 else 1

if __name__ == '__main__':
    raise SystemExit(main())
