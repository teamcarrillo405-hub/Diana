# Local larger-model training readiness

Read-only inspection: 2026-09-29. No training, inference, downloads, environment
installation, GPU initialization or corpus inspection occurred.

## Current result

**Qwen3.8 27B is not ready for the existing local training path.** The approved known
artifact is Ollama Q4_K_M GGUF, while the established Qwen3 4B path trains a publisher
Transformers BF16 safetensors snapshot with PEFT. A new tag or sufficient inference
residency cannot make the latter training procedure apply to the former artifact.

| Item | Current evidence |
| --- | --- |
| Existing 4B | Qwen/Qwen3-4B-Instruct-2507, revision cdbee75f17c01a7cc42f958dc650907174af0554; Qwen3ForCausalLM; three BF16 safetensors shards |
| 4B stored tensor count | 4,022,468,096 parameters, from bounded safetensors header reads; no tensors loaded |
| Larger candidate | qwen3.8:27b; installed manifest aaee06c39dcf2437cde036998d960e1fc1494b8191be7cc9657d01e509097813; qwen35 family; Q4_K_M GGUF magic and layer sizes observed |
| Larger declared parameter count | 27,320,697,856 from the preserved Ollama metadata |
| Reviewed GPU | Radeon AI PRO R9700 / gfx1201; historical qualified capacity 34,054,242,304 bytes, about 31.7 GiB |
| Hypothetical BF16 larger base | 54,641,395,712 bytes, about 50.9 GiB, before activations, adapters, optimizer, gradients or workspaces |

The BF16 number is an arithmetic lower bound under the declared parameter count,
not a measured training allocation. It rules out simply placing that complete BF16
base on this one reviewed GPU. It does not rule out a separately qualified quantized
or offloaded approach. Current free GPU memory was deliberately not queried while
another agent may be using the device.

## Live runtime inspection

The existing WSL interpreter was inspected with the existing PEFT overlay:

- `/home/glcarrillo/comfyui-r9700-venv/bin/python`, Python 3.12.3.
- PyTorch distribution 2.9.1+rocm7.2.1.lw.gitff65f5bc.
- Transformers 5.15.1, PEFT 0.21.0, Accelerate 1.14.0.
- Safetensors 0.8.0, Tokenizers 0.22.2, GGUF 0.19.0.
- `bitsandbytes` and `torchao` absent from this effective environment.
- Both `qwen3` and `qwen3_5` configuration mappings are present.

The probe reads distribution metadata and mapping source files without importing
PyTorch, Transformers, PEFT or Accelerate. The v2 probe correctly reads the generated
`auto_mappings.py` used by this installed Transformers version. The initial probe
looked only in `configuration_auto.py` and incorrectly reported missing registration;
its files remain preserved and are superseded by `runtime-probe-v2.json` and
`report-v2.json`. A regression covers both registry layouts.

Package versions match the historical reviewed contract. That contract's tiny
linear/Qwen3-LoRA proofs and earlier 4B execution are existing evidence for their
specific scope. They do not prove the qwen35/Qwen3.5 architecture's backward kernels,
LoRA target modules, quantization/offload behavior, memory fit or saved-adapter reload.
The installed GGUF reader is not a trained/qualified quantization backend. No such
qualification was performed during this task.

## One engineering gap addressed

Existing `train_local_lora.py` preflight is tied to Qwen3 4B, its pinned dependencies,
rights-gated data export and protected evaluation inputs. Existing
`train_qwen3_4b_research.py` also enforces its reviewed runtime and recipe. Running
those tools as a larger-model readiness probe would mix data gates with an unqualified
new architecture. They were inspected as source only and were not executed.

The new `scripts/learning/local_training_readiness.py` provides the missing
**content-free format/runtime/memory screen** before proposing a new training recipe.
It reads explicit hash-pinned inventory/provenance/runtime-contract metadata, actual
GGUF magic and layer sizes, and bounded 4B safetensors headers. It records the exact
blockers and a concrete decision-packet checklist. It never invokes the existing
trainers, opens corpus files, allocates tensors, changes an environment or issues a
download. It cannot change `trainingAuthorized: false`.

Metadata hashes and sizes were checked. Full multi-gigabyte weight-file hashes were
not recomputed, and the report says so. The approved known paths were inspected;
this is not a global search asserting that no other model snapshot exists anywhere.

## Required exact decision before any training work

1. **Weights:** select the exact native trainable publisher revision and file hashes,
   with transfer/disk size and permitted use; or separately specify a conversion of
   the existing quantized artifact. Neither acquisition nor conversion is authorized
   by this report. A GGUF dequantization path is not assumed equivalent to publisher
   BF16 weights or guaranteed to preserve training behavior.
2. **Runtime and compute:** specify the exact local AMD quantization/offload backend,
   package sources/versions and limits, or a named external compute configuration
   with privacy, time and dollar ceiling. No alternate backend is installed here.
   No paid compute is approved.
3. **Qualification:** authorize a bounded architecture-specific update experiment,
   measured peak memory, finite gradients and changed adapter tensors, then a saved
   adapter reload. Configuration registration and inference residency cannot satisfy
   this step. A new objective may need an additional source-bound tiny proof.
4. **Recipe:** freeze exact model/runtime/source/data hashes, sequence length,
   microbatch/accumulation, LoRA targets and rank, optimizer, steps, timeout and output
   limits, and obtain approval for that recipe. Existing consent and exclusion/data
   controls remain applicable; the readiness screen does not inspect or replace them.

Existing approved 4B weights and runtime remain available for a separately approved
4B recipe without acquiring a larger model. No new recipe or training run was started.
Neither model has gained a quality, 95%, student-facing or production qualification.

## Commands and tests

`probe-runtime <new.json>` must be run in the actual proposed environment, with its
existing overlay. `inspect` accepts explicit `--runtime`, `--inventory`,
`--provenance`, `--contract` paths plus their matching `--*-sha256` pins and a new
`--output` path. It exits nonzero with `blocked_for_new_training`; this is expected.
Both commands deny Python socket calls, use offline flags and create output exclusively.
They do not claim operating-system network isolation or authenticate operator consent.

```powershell
C:/Python314/python.exe -B -m unittest discover -s scripts/learning -p test_local_training_readiness.py -v
```

The initial nine metadata-only tests passed: residency/configuration cannot authorize training;
package presence/memory cannot authorize a recipe; missing dependencies and drift;
non-transferable architecture proof; invalid memory counts; bounded header-only reads;
trusted digest/exclusive output; no model-runtime imports; and both configuration
registry layouts.

Durable evidence is in
`artifacts/learning-engine/research/local-training-readiness-20260929/`.

### Reader repair after independent review

The reviewer found a size-check/read race: a metadata file could grow between the
path check and an unbounded read. The repaired reader opens one descriptor, reads
at most the limit plus one byte, checks regular-file identity and observed changes
before and after the read, and rejects symlink/reparse paths. Windows path and
descriptor timestamps are compared using compatible fields.

Four growth/replacement/path regressions and one Windows timestamp regression bring
the suite to 14 passing tests. A fresh read of the same pinned metadata produced
`report-v3.json` with the same six training blockers. Earlier reports and the
original verification receipt are preserved. Repair evidence is in
`verification-reader-repair-v1.json`; no training, inference or GPU work was added.
