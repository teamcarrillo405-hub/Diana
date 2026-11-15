# Local Qwen3 grounding experiment

## Verified preparation and runtime

The user approved Qwen/Qwen3-4B-Instruct-2507 preparation and download on September 28, 2026. The [official snapshot preparation](qwen3-4b-model-preparation.md) completed and a separate offline rehash passed. No paid compute was purchased.

The earlier CPU-only Python environment did not establish that the computer lacked a usable GPU. A fresh hardware investigation found an AMD Radeon AI PRO R9700 with 34,054,242,304 bytes of device memory. The existing Ubuntu 24.04.4 WSL2 installation provides Python 3.12.3, ROCm 7.2.1 and PyTorch 2.9.1. BF16 support and GPU access were verified in that runtime.

An isolated workspace dependency overlay supplies PEFT 0.21.0, using its officially published wheel hash. Existing ComfyUI packages and GPU drivers were not modified. The qualified runtime uses Transformers 5.15.1, Accelerate 1.14.0, safetensors 0.8.0 and tokenizers 0.22.2. Process-local GPU discovery and library flags are recorded in the environment contract.

Two small BF16 tests, a linear model and a randomly initialized two-layer Qwen3 attention-LoRA model, each completed three optimizer updates twice. All losses and gradients were finite, all 16 Qwen3 adapter tensors changed, and repeated seeded losses and final tensor hashes matched exactly. This establishes a working backward/update path, not educational quality or a guarantee that the full model fits.

- Original immutable qualification: `artifacts/learning-engine/research/qwen3-runtime/environment-contract.json`, SHA-256 `c6486baf20db3a7c56aa92806804c4c63bcbdd044c4dc372134e7ae3074d34f2`.
- Separately reviewed runtime contract: `reviewed-environment-contract.json` in that directory, SHA-256 `440edb7a7dab64fe784e28f418970e80cf78f943bdb4f5d0b6445978c3a7042c`.
- Approval concerns the local research runtime only. It provides no educator credential, model acceptance or deployment approval.

Primary references: [AMD WSL compatibility](https://rocm.docs.amd.com/projects/radeon-ryzen/en/latest/docs/compatibility/compatibilityrad/wsl/wsl_compatibility.html), [AMD WSL GPU discovery](https://rocm.docs.amd.com/projects/rocprofiler-sdk/en/develop/how-to/using-rocprofv3-on-wsl.html), [AMD R9700 training workaround](https://github.com/ROCm/TheRock/issues/7699), [PEFT package metadata](https://pypi.org/pypi/peft/0.21.0/json). The runtime was actually tested; compatibility was not inferred only from documentation.

## Run 006

The [frozen scientific design](../engineering/qwen3-grounding-evaluation-contract.md) retains 440 training and 48 reused development records, starts fresh 4B adapters, and requires 95% grounding with baseline nonregression. The executable freeze independently passed source/model/environment hashes and tokenization checks on all 488 records. Maximum full example length is 259 tokens; no example was truncated.

Run directory: `artifacts/learning-engine/research/qwen3-run-006`.

Protocol SHA-256: `2ff6ce808c9e8bcf1d133831e37e20d90c6d5dff5535bd6ef014fbf160f9d6f8`.

The worker started at `2026-09-28T17:51:36.515187+00:00` and completed in 444.58 seconds. It trained 11,796,480 fresh LoRA parameters over 220 updates and 880 example presentations. Mechanical development grounding was 26/48 before training, 33/48 after epoch one and 30/48 after epoch two. Neither checkpoint met the frozen gates. Selection is null; final-test evaluation count is zero, and the candidate remains inactive.

Full independent evidence verification passed. It initially exposed an incorrect total-parameter expectation derived from the publisher index's advisory byte count. The corrected verifier derives all 398 base tensor names/shapes from configuration and verified safetensors headers. Actual base tensors contain 4,022,468,096 parameters; adding LoRA gives 4,034,264,576. The publisher index total exceeds the actual tensor payload by 655,360 bytes; its cause is not established. All publisher file hashes match, and no weights, run artifacts or quality criteria were changed to resolve this verifier defect. Thirteen verifier tests pass.

Report SHA-256: `cfa06bdc14f8c9041a364f0612cae13eade9c462e231492197bf66e886e25943`.

Two separate blinded semantic AI reviews of the stronger diagnostic checkpoint completed: 37/48 (77.1%) and 42/48 (87.5%) complete passes, versus paired base rates of 27/48 and 29/48. Reviewers agreed on 37 adapter passes and six failures, with five disputed cases. Fabricated-claim or premise flags affected six and three adapter responses respectively. Neither review supports the 95% target. Original ratings and separately verified results are retained under docs/engineering/qwen3-run-006-*.json. See [the separately frozen revision design](../engineering/qwen3-grounding-revision-design.md). All outputs and the execution log remain in the run directory. Some mechanical failures have reasonable wording alternatives, so automated and semantic results must remain separate. The runner contains no final-test loader; a separately authored final set and independent semantic review are required by the acceptance contract.

## Reproduction and verification

Use the qualified WSL Python interpreter with these process-only environment values:

```text
HSA_ENABLE_DXG_DETECTION=1
LD_LIBRARY_PATH=/opt/rocm-7.2.1/lib:/usr/lib/wsl/lib
PYTHONPATH=/mnt/c/Users/glcar/.codex/worktrees/9d6c/Diana/artifacts/learning-engine/research/qwen3-runtime/python
PYTHONDONTWRITEBYTECODE=1
HF_HUB_OFFLINE=1
TRANSFORMERS_OFFLINE=1
TOKENIZERS_PARALLELISM=false
TORCH_BLAS_PREFER_HIPBLASLT=0
```

Interpreter: `/home/glcarrillo/comfyui-r9700-venv/bin/python -B`. Run `scripts/learning/train_qwen3_4b_research.py freeze` with a new output directory, verified model root and reviewed environment contract. Inspect the resulting protocol before using `run --output ... --protocol-sha256 ...`. Never reuse an attempted run directory. The runner supervises a bounded worker, denies Python networking during inference/training and sets model-library offline flags; it does not claim an operating-system network sandbox.

After completion, run the independent `scripts/learning/verify_qwen3_4b_research.py --run artifacts/learning-engine/research/qwen3-run-006` from the existing Windows research Python environment. It checks the preserved WSL evidence and local snapshot without performing inference. A training completion message alone is not verification or release acceptance.
