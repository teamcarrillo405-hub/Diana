# Approved Qwen3-4B model preparation

## Exact candidate

- Model: `Qwen/Qwen3-4B-Instruct-2507`
- Immutable publisher revision: `cdbee75f17c01a7cc42f958dc650907174af0554`
- License: Apache-2.0, retained in the downloaded snapshot.
- Architecture: Qwen3 causal language model, 36 layers, hidden size 2,560, 32 query heads and eight key/value heads, BF16 weights.
- This is the non-thinking instruct variant. It is a research candidate, not a claim of 95% grounding accuracy.

The [official publisher model card](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507) identifies this architecture and license. The preparation script pins the repository revision and file identities from the [official immutable metadata endpoint](https://huggingface.co/api/models/Qwen/Qwen3-4B-Instruct-2507/revision/cdbee75f17c01a7cc42f958dc650907174af0554?blobs=true).

## Scope and integrity

`scripts/learning/prepare_qwen3_4b_research.py` only prepares an approved snapshot. It does not import development or heldout data, execute model inference, fit weights, acquire credentials, rent hardware, or activate a production model. All earlier Qwen2.5 experiments and their data remain intact.

The script verifies the publisher identity, revision, license, exact file sizes, all large-file SHA-256 hashes, and Git blob hashes for small files. It additionally checks the downloaded configuration and three-shard index. Local SHA-256 values and publisher metadata are retained in `model-provenance.json`. Pickle weights and remote Python code are not downloaded.

Each weight file is downloaded to a `.partial` file. An interrupted transfer can resume only when the server returns the exact remaining byte range and expected size. Promotion to the final filename requires a complete publisher hash match. Invalid existing final files are preserved and rejected instead of overwritten. Download writes are confined to the repository's research artifacts directory; linked paths and concurrent download locks are rejected. HTTPS redirects are restricted to Hugging Face download domains. No authentication token is used.

## Commands

Use the already installed local research Python environment:

```powershell
# Print the pinned preparation plan without network access.
& artifacts/learning-engine/research/local-lora-execution/venv/Scripts/python.exe scripts/learning/prepare_qwen3_4b_research.py

# Download or resume the user-approved official snapshot.
& artifacts/learning-engine/research/local-lora-execution/venv/Scripts/python.exe scripts/learning/prepare_qwen3_4b_research.py --download-official-model

# Recheck the complete local snapshot without network or inference.
& artifacts/learning-engine/research/local-lora-execution/venv/Scripts/python.exe scripts/learning/prepare_qwen3_4b_research.py --verify-only
```

Default artifact root: `artifacts/learning-engine/research/qwen3-4b-instruct-2507`. Snapshot directory: `model/cdbee75f17c01a7cc42f958dc650907174af0554` beneath that root. Seven synthetic offline contract tests passed before the download began. The initial restricted metadata request timed out; the authorized network escalation succeeded without credentials or paid resources.

## Resource planning

The three BF16 weight shards total 8,044,982,000 bytes. Tokenizer, configuration, license, and metadata require additional disk space. Float32 loading would roughly double weight memory; inference and training need additional runtime, cache, adapter, gradient, and optimizer memory. These are storage/arithmetic estimates, not a measured fit or throughput claim.

The host has substantial free disk capacity. A Radeon AI PRO R9700 was separately discovered by the coordinator; supported ROCm/WSL execution is being investigated independently. Preparation does not assume that an installed GPU is supported by the existing Python runtime. A GPU smoke test and a separately frozen experiment protocol are required before claiming execution readiness. Paid compute requires an explicit cost quote and approval before purchase.

## Verified execution result

The download completed successfully on September 28, 2026. All 12 selected files, totaling **8,060,915,998 bytes**, passed publisher identity/hash checks. A separate offline `--verify-only` invocation then rehashed the entire snapshot and passed.

Provenance SHA-256: `fb8aad829c9a523351518c3f214cfb7ede0eaca44558f97d238778db9a826a3b`.

Weight shard SHA-256 values:

| Shard | SHA-256 |
| --- | --- |
| `model-00001-of-00003.safetensors` | `75311d91bb08cf0b882913da464a1e722a31fb44db35208663487efb7a3d8ed6` |
| `model-00002-of-00003.safetensors` | `0b48adbb1f60e901153d91907ba11ce63bd4b8b584482e730f48808d055dfba1` |
| `model-00003-of-00003.safetensors` | `7dd39ccca5e4de123c74c14af44c9bf2eb75df33b4614382af0134528e060d5d` |

The preparation record explicitly states `productionEligible: false`, `inferencePerformed: false`, and `trainingPerformed: false`. No model execution, training, paid resource purchase, or evaluation-set access occurred in this preparation task.
