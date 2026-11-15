# Evidence integrity preference research operations

This version continues the verified run-008 epoch-2 research adapter. It is a new experiment and preserves the earlier runner, evidence, reviews, and adapter files. No production activation, model download, provider call, or final-test access is part of this workflow.

## Fixed experiment contract

| Setting | Required value |
| --- | --- |
| Parent report SHA-256 | `f6dbec7623471797908c3a6ea8894b6ea0c65ac09c12d22db920bccfa3683e5c` |
| Parent protocol SHA-256 | `52f00147c744c0d04841876bf11349a79b624f1ee8c696d1c9830b3110f8bd7c` |
| Parent checkpoint | run-008 epoch 2, verified with `verify_qwen3_preference_v2.py` |
| Training set | 300 pairs, 150 distinct contexts, two author partitions of 150 pairs each |
| Subjects | math, reading, English, science, history; 60 pairs each |
| Preference categories | evidence-mutation, task-scope, missing-procedure, missing-inputs, source-instruction; 60 pairs each |
| Context coverage | At least 30 conflict contexts and 30 contexts marked `sourceInstructionPresent` |
| Question balance | One supported and one insufficient question per context |
| Objective | Standard sequence-sum DPO plus chosen-response token-mean cross entropy |
| Learning rate / beta / chosen SFT weight | `0.00001` / `0.1` / `0.5` |
| Epochs / accumulation / batch size | 3 / 4 / 1 |
| Optimizer steps / pair presentations | 225 / 900 |
| Seed | 81173 |
| Sequence / generation limits | 768 / 128 tokens; no truncation |
| Wall-time limit | 7200 seconds under the Linux supervisor |
| Checkpoint selection | Epoch 3 only; no fallback to epochs 1 or 2 |

All other LoRA, precision, optimizer, and deterministic runtime choices remain pinned in the new runner's `SETTINGS`. The strict metrics module exports `score(response, row)`, `aggregate(records, rows)`, and `gates(baseline, candidate)`. These mechanical checks do not establish semantic acceptance, educator review, or student outcomes.

## Before freezing

1. Finalize the exact prompt and design in `qwen3-evidence-integrity-design.md` and the runner. Finalize both new author modules and the strict metrics module.
2. Run the synthetic contract tests with the existing Python environment: `python -m unittest discover -s scripts/learning -p test_qwen3_evidence_integrity.py`. These tests use fixtures and mocked parent verification; they do not open run-008 outputs or final cases.
3. Obtain two independent partition audits. Each must bind its author module SHA-256, the canonical hash of its 150 rows, every individual pair hash, concrete notes, and affirmative chosen-pass/rejected-inferior judgments. The combined audit must cover all 300 pairs, record both original audit evidence files and their SHA-256 values, and have no unresolved findings. Reviewer IDs must differ. These are AI audits with `educatorReviewed: false`.
4. Finish and test the independent `verify_qwen3_evidence_integrity.py` verifier. The freeze inventory requires that file, the corrected parent verifier, the complete inherited run-008 source inventory, and all new runner, contract, metrics, and data modules. After verifying the parent chain, freezing checks every new ID, source, and source/question against all 1,240 prior training pairs: 200 in run-008, 600 in run-007, and 440 in run-006. Any overlap stops freezing. The `prior-training-overlap.json` receipt records the three populations, protocol and training hashes, and zero overlap counts without copying old case text. The frozen protocol binds its SHA-256, and freeze verification repeats the check.
5. After prompt and runner code are stable, qualify the tiny objective in the already approved local GPU runtime. This uses a randomly initialized two-layer fixture, not the real model or datasets. Confirm two objective steps, all 16 trainable tensors changed, initial DPO loss equal to `log(2)`, finite gradients, correct gradient directions, and an unchanged reference. Any later runner edit invalidates the proof's source hash and requires fresh qualification.

Do not freeze or run the full experiment until these prerequisites are complete. Do not inspect a blinded arm key or substitute prior response ratings for the new training-pair audit.

## Approved runtime commands

Run these commands from the repository in the existing approved Linux/WSL runtime. The variables below must refer to the operator's already approved paths; they are placeholders, not permission to create or install another runtime. Keep the qualification file outside the run directory because freezing creates a new, empty run directory.

```bash
"$RUNTIME_PYTHON" scripts/learning/train_qwen3_evidence_integrity.py qualify-objective \
  --output "$OBJECTIVE_PROOF" \
  --environment-contract "$REVIEWED_CONTRACT"

"$RUNTIME_PYTHON" scripts/learning/train_qwen3_evidence_integrity.py freeze \
  --output "$NEW_RUN" \
  --model-root "$APPROVED_MODEL_ROOT" \
  --environment-contract "$REVIEWED_CONTRACT" \
  --parent-run "$RUN_008" \
  --training-audit "$COMBINED_AUDIT" \
  --objective-qualification "$OBJECTIVE_PROOF"

"$RUNTIME_PYTHON" scripts/learning/train_qwen3_evidence_integrity.py run \
  --output "$NEW_RUN" \
  --protocol-sha256 "$REVIEWED_PROTOCOL_SHA256"

"$RUNTIME_PYTHON" scripts/learning/verify_qwen3_evidence_integrity.py \
  --run "$NEW_RUN"
```

The operator reviews the new frozen protocol and uses its actual SHA-256. Never substitute a guessed or previous protocol hash. Do not invoke `_worker` directly. An attempted run directory cannot be reused, including after interruption.

The freeze copies the reviewed environment contract's **raw bytes**, including formatting and final newline. Its file hash must match the objective qualification's `runtimeContractSha256`. The run-008 correction for a JSON-equivalent reserialization is not repeated in this version.

## Execution and evidence

The worker first loads the parent checkpoint and reproduces all 48 development outputs using the original run-008 prompt. Every output string and generated token sequence must match the preserved parent evaluation before the experiment proceeds. It then evaluates the untouched base and parent checkpoint under the same new prompt.

Before constructing the fresh optimizer, it caches the parent policy's chosen and rejected sequence sums and per-token log probabilities for all 300 training pairs. The cache binds the parent adapter, protocol, prompt, and complete pair tokenization. That reference remains fixed throughout all three epochs. The optimizer history records the exact four-pair accumulation groups, both token sequences' log probabilities, the independently recomputed scalar objective, and cumulative pair and token counts.

All three checkpoints and their development outputs remain in the run directory. Selection is restricted to epoch 3 when all strict formal gates pass; an earlier checkpoint cannot replace it. A selected checkpoint is reloaded and its development outputs and gates checked again. Independent blinded semantic review is still required afterward. An automatic rejection remains an auditable result.

The report, completion receipt, supervisor manifest, frozen source copies, individual audit evidence, and hash bindings preserve local execution evidence. These are consistency checks on local artifacts, not an external attestation. The report keeps `productionEligible`, `validationPassed`, and `semanticQualityValidated` false and records zero final-test evaluations.

The parent reproduction and later evaluator necessarily read durable parent outputs during execution. A reviewer who must remain blinded should implement or inspect code and synthetic tests only, and leave real parent verification, reproduction, and output inspection to the authorized operator.
