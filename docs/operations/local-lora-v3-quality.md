# Grounding research v3: 95% target

## Contract

This experiment continues engineering the existing local Qwen2.5-0.5B-Instruct candidate. It does not activate a model or modify the deployed tutoring system. The target is at least 95% on both development validation and a separately authored, locked 100-case holdout, with no regression in target-token loss, false abstentions, or unsupported responses relative to the same base model. A separate semantic review must assess quotation relevance, supported reasoning, usefulness, and fabrication; mechanical checks alone cannot establish the target.

The task remains source-grounded tutoring: one `EVIDENCE:` line containing relevant verbatim evidence, or an explicit insufficiency marker when facts are missing or unresolved; one `NEXT:` line containing a focused teaching question. The v3 prompt allows a useful question about missing information instead of requiring the previous generic question. Embedded source instructions remain untrusted data. Both the baseline and adapter receive this same revised prompt.

## Development data and training recipe

The authored development set has 240 training records: 30 topics with four context variants and matched answerable/unanswerable questions. These are 30 repeated topic families, not 240 independent skills. Training is balanced at 120 answerable and 120 insufficient cases. There are 48 validation cases across 24 different topic families, also balanced. The data contains irrelevant details, embedded instruction attempts, and unresolved source conflicts. It contains no student records or copied textbook passages and has not been educator reviewed.

The preregistered recipe uses four epochs, learning rate 0.0002, rank 16/alpha 32 adapters on query/key/value/output attention projections, gradient accumulation four, clipping at 1.0, and four CPU threads. The maximum wall-clock budget is 3,600 seconds. Assistant-only token loss is used; neither source nor question tokens receive training loss. Input lengths are checked before optimization, and no silent truncation is allowed. The base and tokenizer bytes, dependency versions, source code, development datasets, and opaque holdout module are hashed before training.

Each epoch is preserved and evaluated on validation. Selection is the lowest validation loss among checkpoints that satisfy every quality gate. If none passes, the selected epoch is null, the holdout is not imported or read, and no test outcomes are generated. There is no diagnostic-test fallback. After an eligible checkpoint is fixed, one baseline/adapter heldout comparison is allowed, followed by a fresh adapter reload solely to verify artifact reproducibility. Test results cannot select a checkpoint or trigger more fitting in this run.

## Measurement limits

The stricter mechanical check requires the quotation to contain a declared relevant evidence span and be an exact source substring. It rejects unrelated exact quotations, invented quotations, false abstention, missing abstention, invalid formatting, and nonspecific question anchors. These lexical tests still cannot decide whether every claim in a question is supported or whether instruction is useful. Independent blinded semantic review is therefore necessary, and synthetic agent review is not a substitute for qualified educators or student outcomes.

A 95% observed score on 100 authored cases is not proof of 95% population accuracy or universal curriculum performance. Production eligibility stays false regardless of this experiment's result. Existing rejected runs are retained, and their consumed tests are excluded from training and validation.

## Reproduce

```powershell
& artifacts/learning-engine/research/local-lora-execution/venv/Scripts/python.exe -m unittest discover -s scripts/learning -p test_synthetic_lora_v3.py -v
& artifacts/learning-engine/research/local-lora-execution/venv/Scripts/python.exe scripts/learning/train_synthetic_lora_v3.py --output artifacts/learning-engine/research/local-lora-execution/run-004-v3 --model-root artifacts/learning-engine/research/local-lora-execution/run-001 --allow-original-synthetic-research
& artifacts/learning-engine/research/local-lora-execution/venv/Scripts/python.exe scripts/learning/verify_synthetic_lora_v3.py --run artifacts/learning-engine/research/local-lora-execution/run-004-v3
```

Use a new output directory. This path uses an already publisher-verified local snapshot, denies Python socket networking, makes no paid provider calls, and does not claim an operating-system network sandbox. It cannot silently switch models, rent hardware, or deploy an adapter.

## Execution evidence, September 28, 2026

Run `run-004-v3` completed all 240 optimizer updates in 2,294.54 seconds (38.24 minutes). The independent verifier recomputed raw-output diagnostics, candidate selection, hashes, adapter configuration and tensor structure successfully.

| Validation checkpoint | Relevant grounded cases | Target-token loss | False abstentions | Missing required insufficiency flag |
| --- | ---: | ---: | ---: | ---: |
| Untouched base | 1/48 | 1.9341 | 1/24 | 23/24 |
| Epoch 1 | 17/48 | 1.1542 | 2/24 | 0/24 |
| Epoch 2 | 20/48 | 1.6292 | 0/24 | 4/24 |
| Epoch 3 | 26/48 | 1.7913 | 0/24 | 1/24 |
| Epoch 4 | 18/48 | 1.9802 | 9/24 | 0/24 |

**The run is rejected.** Its best diagnostic validation checkpoint reached 54.17%, below 95%. It is not an eligible selected checkpoint: `selectedEpoch` is null, `validationPassed` is false, `testOpened` is false, and zero final-test evaluations occurred. The 100-case independent holdout remains sealed. All four checkpoints and their original scores remain preserved.

Loss and the final-epoch false-abstention increase indicate that more repetition of these same 30 training topics was not a successful correction. Earlier outputs also contained paraphrased quotations presented as exact evidence, underspecified snippets, irrelevant questions, and over-abstention on source instructions. Narrow accepted spans can additionally produce false negatives; an independent pre-output development audit documented three such examples without changing this run's results. These observations do not establish a hard capacity limit for the base model.

The report SHA-256 is `db67346a325a78d777171f42b7ade82a0461433a7b5e9dac930faa61dc95edfd`. Epoch three's adapter SHA-256 is `7649dae3749e848563f862010342a650928ace0a0480b49cdaa7baa4dea705dd`. No model was activated, downloaded, or called through a paid provider.

A separately preregistered [v4 development continuation](local-lora-v4-quality.md) uses the preserved third checkpoint and independently authored additional scenarios. This does not reopen or alter the rejected v3 experiment.

## Blinded semantic development review

An independent AI reviewer assessed all 48 paired base/epoch-three validation cases, 96 responses total, before arm identities were revealed. Complete semantic passes were 3/48 for the base and 14/48 (29.17%) for the adapter. The reviewer marked unsupported or fabricated premises in 16 adapter responses. Examples included reversed memoir chronology, an invented customer-satisfaction survey, assuming an acidic result despite contradictory notes, and confusing parallel structure with subject-verb agreement.

The semantic result is separate from the mechanical 26/48 diagnostic. It identifies comprehension and teaching-quality problems beyond narrow accepted-span scoring. It is a development-set AI audit, not a heldout result or qualified educator approval. See `docs/engineering/grounding-v3-semantic-result-2026-09-28.json` for the hash-bound unblinded result. No change to the sealed final test or frozen v4 training recipe was made in response to this audit.
