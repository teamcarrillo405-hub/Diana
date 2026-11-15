# Executed synthetic language-model fine-tuning

This experiment trains a real LoRA adapter for `Qwen/Qwen2.5-0.5B-Instruct` on original synthetic tutoring examples. It is a separate CPU research path. The signed, permissioned-data 4B pipeline in [local-lora-research.md](local-lora-research.md) retains its existing review, consent, revocation and hardware gates.

The smaller model was selected because this machine has 66.2 GB RAM, 32 logical CPUs, CPU PyTorch, and no available CUDA device. The [official model card](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct) specifies approximately 0.49 billion parameters and Apache-2.0 licensing. This is genuine language-model parameter adaptation using [PEFT LoRA](https://huggingface.co/docs/peft/en/package_reference/lora). It does not establish that a small synthetic adapter is ready to tutor students.

## Data and evaluation boundaries

- All 32 training examples and eight held-out examples are original machine-authored fixtures in `prepare_synthetic_lora.py`. There are no student records, licensed textbook passages, fabricated educator approvals or paid provider requests.
- Training families cover inverse addition, character inference, experimental variables and missing evidence. Held-out tasks cover percentages, area, sequence versus cause, narrator viewpoint, conservation, observational association, and new missing-evidence contexts.
- Family labels are disjoint. Exact expected records and file hashes are checked before execution. This prevents substituting unreviewed real data into this research route. Shared response format and abstention policy are intentional; semantic independence is not proven.
- The assistant's final reply supplies the training labels. System and user tokens are masked from the loss. No sequence truncation is permitted. Held-out responses are never used for optimizer updates or early stopping.
- The initial experiment runs three epochs and 48 optimizer updates. After its over-abstention regression, one conservative correction was declared: one epoch and 16 optimizer updates with the learning rate reduced from 0.0003 to 0.0001. Both use rank eight adapters on query/value projections, four CPU threads, FP32, and a 256-token input cap. A 45-minute wall-time budget is checked between operations.
- Both arms use the same held-out prompts and greedy decoding with an 80-token output cap. Teacher-forced target token loss and mechanical format/source-quote/abstention checks are diagnostics. They do not measure instructional quality, safety, learning gains or a commercial moat.

## Provenance and runtime

The official immutable model revision is `7ae557604adf67be50417f59c2c2f167def9a775`. The 988,097,824-byte safetensors checkpoint has SHA-256 `fdf756fa7fcbe7404d5c60e26bff1a0c8b8aa1f72ced49e7dd0210fe288fb7fe`. Preparation checks all nine model/tokenizer/license files against publisher Git blob or LFS hashes and records their SHA-256 values.

The isolated venv reads the existing CPU PyTorch installation without changing it. PEFT, Transformers, Accelerate, Safetensors and Tokenizers are installed inside that venv with pinned direct versions. This is not a fully hermetic environment; a package inventory and effective direct versions are recorded in the run report. Existing global speech packages are not invoked or modified.

Training sets Hugging Face offline flags before model imports, refuses remote model code, loads only local safetensors, and rejects socket connection attempts. These application controls are not an operating-system network sandbox. The experiment has no application route or automatic promotion mechanism. Its artifacts explicitly declare `researchOnly: true`, `productionEligible: false`, and `educatorReviewed: false`.

## Reproduce

Use an isolated environment matching `scripts/learning/synthetic-lora-requirements.txt`. Preparation downloads the free official checkpoint; execution and adapter reload require no network.

```text
python scripts/learning/prepare_synthetic_lora.py --output artifacts/learning-engine/research/local-lora-execution/run-001 --download-official-model
python scripts/learning/train_synthetic_lora.py --dataset artifacts/learning-engine/research/local-lora-execution/run-001 --allow-original-synthetic-research
python scripts/learning/verify_synthetic_adapter.py --dataset artifacts/learning-engine/research/local-lora-execution/run-001
python -m unittest discover -s scripts/learning -p test_synthetic_lora.py -v
```

The runner requires a new `execution` directory and never overwrites a prior experiment. Preserve incomplete runs. Reports bind data, source code, base-model provenance, adapter files, optimizer history and both evaluation arms through content hashes. These local reports are not externally signed, independently attested research records.

The correction uses `--partition subsequent-test` during preparation and `--recipe conservative` during training. Its eight subsequent test cases were authored after observing the initial failure, then fixed and hashed in `execution/preregistration.json` before model loading and training. They cover slope, mean, author purpose, text comparison, food webs, circuits and two unsupported questions. The earlier eight cases became a development set when they informed the correction. No tuning on the subsequent test is planned. This small authored test is not an independently curated or blinded benchmark.

## Observed runs

The initial run completed 48 optimizer updates in 143.7 seconds. Its saved adapter was reloaded into a fresh base model offline and reproduced all eight recorded greedy outputs exactly.

| Initial development diagnostic | Base | Adapter |
| --- | ---: | ---: |
| Target token loss, lower is better | 1.627 | 2.627 |
| Two-line format | 6/8 | 8/8 |
| Exact source quote or abstention | 0/8 | 8/8 |
| Matched expected abstention behavior | 6/8 | 2/8 |
| Abstained despite sufficient source evidence | 0/6 | 6/6 |

**The initial adapter is rejected.** It learned to return the repeated abstention response on answerable cases. Its perfect quote-or-abstention count illustrates why format checks alone cannot establish tutoring quality. Masking inspection confirmed that the prompt was excluded from training loss and the complete chat prefix was matched; the narrow repetitive training data and aggressive recipe overfit. The base model also had substantial source-following errors and is not approved by these results.

The conservative correction completed 16 optimizer updates in 79.14 seconds. Reloading its saved adapter reproduced all eight subsequent-test outputs exactly.

| Subsequent-test diagnostic | Base | Adapter |
| --- | ---: | ---: |
| Target token loss, lower is better | 1.496 | 1.083 |
| Two-line format | 8/8 | 8/8 |
| Exact source quote or abstention | 0/8 | 4/8 |
| One focused question punctuation check | 3/8 | 6/8 |
| Matched expected abstention behavior | 6/8 | 6/8 |
| Abstained despite sufficient source evidence | 0/6 | 2/6 |

**The conservative adapter is also rejected.** Although target token loss improved approximately 27.7%, false abstentions increased on answerable cases. That violates the non-regression rule recorded before the run. These eight cases will not be reused for further tuning. The initial and subsequent results use different test sets and must not be pooled as a single independent benchmark.

[Machine-readable release eligibility and artifact hashes](local-lora-execution-results.json) records both rejections. `summarize_synthetic_lora.py` verifies evaluation hashes and saved-adapter reload evidence, rejects nonfinite measurements, and always emits `productionEligible: false` for this synthetic route even if its limited diagnostics pass. Ten contract tests cover source substitution, forged review status, immutable model/tokenizer identity, isolated test partitions, network denial and this release boundary.

The correction's adapter-weight SHA-256 is `8e74a0199c6104f8e65102014ab0a376da06bb50ec99dd1ab07c93f0116f0540`. Its report SHA-256 is `1214f4bd6063dfad9d885776ad53ad6cd0b48823fab25aadc4e5500d264eaf4f`. The exact training and data-generator source at the time of the correction is archived beside that run. Later runner hardening additionally pins all nine model/tokenizer SHA-256 values and automatically archives source for future runs; it does not alter the recorded experiment.

Artifacts live under `artifacts/learning-engine/research/local-lora-execution/`. Each run retains `dataset-manifest.json`, `model-provenance.json`, training logs, `execution/report.json`, exact baseline/adapter responses, adapter safetensors, optimizer history and reload verification. The first pre-training failure caused by an explicit Transformers chat-template API return type was preserved as `run-001/execution-incomplete-template-api`; it performed no optimizer updates.

## Release boundary

The subsequent [v2 quality correction](local-lora-v2-quality.md) adds matched evidence contrasts, separate validation and test partitions, stricter grounding checks, and saved-checkpoint verification. It preserves both rejected experiments above. Its own results and limitations are recorded separately; no synthetic research route can authorize production deployment.

A completed run proves that model weights were adapted and compared locally. Broad grade-six-through-college tutoring requires a much larger reviewed curriculum and evaluation set, independent educator assessment, representative student accessibility/safety checks and measured comparison with the existing retrieval/teaching pipeline. A real learner study is required for learning-effectiveness claims. Keep this adapter out of production until those gates are satisfied.
