# Matched chosen-target SFT operations

This prospective run is `qwen3-run-010`, a sibling initialized from verified run-008 epoch two. It intentionally reuses run-009's 300 audited records, prompt, tokenization, order and runtime. It changes the fitting objective to exactly `0.5 * (-chosen_sum_log_probability / chosen_target_tokens)`. Rejected responses remain audit metadata. The new runner never tokenizes rejected responses or sends them through a model.

The controlling contract is `qwen3-matched-sft-design.md`. This workflow uses the existing approved local Linux/WSL GPU runtime and publisher snapshot. No model download, final-case access, provider generation or production activation is part of it.

## Immutable comparison identities

| Binding | SHA-256 |
| --- | --- |
| Parent run-008 report | `f6dbec7623471797908c3a6ea8894b6ea0c65ac09c12d22db920bccfa3683e5c` |
| Parent run-008 protocol | `52f00147c744c0d04841876bf11349a79b624f1ee8c696d1c9830b3110f8bd7c` |
| Comparator run-009 report | `06b9d89bdff32ccf98244fd1f8612a7bbd083cba6b43b8913f3e68c0aba3142a` |
| Comparator run-009 protocol | `68654384af3bfdfa641eb25c1c16efd65552360098ecd4766b5965c4d4fcbe34` |
| Comparator independent verification receipt | `b769788f5acdb4214e922ad7ee3bf2b2fcae2370d0ba124bda2ce9d906d2a86c` |
| Reused 300 training records, canonical | `73e94b7f518849cc78024b2b63571638e8569708f28c1f8ee87f08811356a760` |
| Reused combined independent audit, raw bytes | `20d4687cd24ac3bb2c19ed4284d90af59a698e09f0fd3aeb65338a1e9d219d6c` |
| Run-009 reserialized audit, preserved raw bytes | `463b0c7c5bb583a1e61537a1ec3e7192805a90804e9bc8a7044f1a069870c2a7` |
| Both audit files, canonical JSON | `83745a29cf3480e76b7291d39f0132ad4f0fdc60cf7828eaab04bb76563ce172` |

Freeze performs full independent run-008 verification with the preserved preference v2 verifier and checks the 200/600/440-record fitting ancestry for overlap. The comparator is bound to its committed report, protocol and independent verification receipt. Its complete input/output manifest is checked without repeating its expensive full verification. Reused sources, runtime contract, tokenization, parent bindings and both independently saved 150-pair audits must match the comparator's frozen bytes. The comparator's data reuse is explicit and does not add run-009 to the initialization ancestry.

One disclosed serialization exception applies to the combined audit: run 009 reserialized the approved JSON, while run 010 preserves the original approved bytes. Both distinct raw hashes and their shared canonical hash above are pinned, and parsed JSON must be exactly equal. `comparator-evidence.json` records all three commitments. Arbitrary reformatting, altered content or replacing one file with the other remains prohibited. The first run-010 freeze stopped on this difference before creating a run directory or performing inference; the corrected binding requires a fresh source-bound tiny qualification.

## Fixed recipe and prerequisites

The recipe retains seed 81173, deterministic per-epoch order, three epochs, one chosen example per microbatch, accumulation four, AdamW learning rate `1e-5`, weight decay `0.01`, clip norm `1.0`, rank-16/alpha-32 q/k/v/o LoRA, zero dropout, BF16, eager attention and nonreentrant checkpointing. Target log-softmax is FP32. The maximum full sequence is 768 tokens and generation is capped at 128 tokens. Truncation is prohibited. The Linux supervisor bounds the run to 7,200 seconds.

Run synthetic checks before qualification:

```bash
"$RUNTIME_PYTHON" -m unittest discover -s scripts/learning -p 'test_qwen3_matched_sft*.py'
```

Both the runner and independent verifier must be stable before freezing. The new objective requires its own GPU qualification, even though the existing runtime and original training qualification are reused. This tiny qualification uses a randomly initialized two-layer fixture, two finite optimizer updates, and all 16 adapter tensors changing. Its proof includes the exact runner source hash, settings hash, original runtime-contract byte hash, assistant-only mask, per-token probabilities, scalar/tensor losses and gradient norms. It loads no real training or evaluation records. Any runner edit invalidates that proof and requires a new qualification file; preserve previous attempts.

## Commands

Run from the repository using the already approved Linux/WSL interpreter. These variables refer to existing approved paths. `NEW_RUN` must identify a new `qwen3-run-010` directory beside preserved runs 008 and 009. Keep `OBJECTIVE_PROOF` outside `NEW_RUN`, because freeze creates an empty new directory. `COMPARATOR_VERIFICATION` must be the exact original receipt whose byte hash is listed above.

```bash
"$RUNTIME_PYTHON" scripts/learning/train_qwen3_matched_sft.py qualify-objective \
  --output "$OBJECTIVE_PROOF" \
  --environment-contract "$REVIEWED_CONTRACT"

"$RUNTIME_PYTHON" scripts/learning/train_qwen3_matched_sft.py freeze \
  --output "$NEW_RUN" \
  --model-root "$APPROVED_MODEL_ROOT" \
  --environment-contract "$REVIEWED_CONTRACT" \
  --parent-run "$RUN_008" \
  --training-audit "$COMBINED_AUDIT" \
  --objective-qualification "$OBJECTIVE_PROOF" \
  --comparator-run "$RUN_009" \
  --comparator-verification "$COMPARATOR_VERIFICATION"

"$RUNTIME_PYTHON" scripts/learning/train_qwen3_matched_sft.py run \
  --output "$NEW_RUN" \
  --protocol-sha256 "$REVIEWED_PROTOCOL_SHA256"

"$RUNTIME_PYTHON" scripts/learning/verify_qwen3_matched_sft.py \
  --run "$NEW_RUN"
```

Use the actual SHA-256 emitted by the new freeze after reviewing its protocol. Never substitute a prior run's hash. The `run` command enforces the supervisor and preserves its execution log and completion manifest. Do not invoke `_worker` directly or reuse an attempted directory. A timeout or interruption terminates and reaps the owned process group and records that a retry is not permitted in that directory.

The runtime contract and reused combined audit are copied as raw bytes. Formatting or newline changes invalidate their bindings even when JSON values are equal. The runner and every imported local dependency are copied into the frozen source inventory. Tests and this operations guide are not fitting inputs.

## Reproduction before optimization

Execution first reproduces all 48 run-008 development response strings and generated token lists under the original prompt. It then evaluates the untouched base and parent under the exact run-009 prompt. Both 48-case sets must reproduce the corresponding preserved run-009 base and parent outputs and token lists. Any difference stops execution before the fresh optimizer is created.

`parent-reproduction.json` records the original-parent comparison. `matched-baseline-reproduction.json` records the same-prompt comparisons, and `optimizer-start.json` binds that receipt. Comparator outputs stay in their preserved sibling directory; `comparator-evidence.json` binds every file and identifies the sibling's data exposure separately from the initialization ancestry.

## Training and durable evidence

`tokenization.json` contains 300 chosen-target items followed by 48 development items. Each item retains the prompt, complete sequence, assistant-only shifted labels including end tokens, and positive target count. Rejected targets have no optimization tokenization, reference cache or forward pass.

Each training-history update contains exactly four examples in the predeclared order, each example's chosen per-token log probabilities and sum, token count, scalar and tensor CE, scalar and tensor `0.5` weighted loss, and cumulative counters. Nonfinite loss, gradient or adapter values stop execution. There must be exactly 225 optimizer updates and 900 chosen-target presentations. `rejectedTargetTokensSeen` stays zero.

All three checkpoints and their development outputs remain available. Only epoch three may be selected. Its unchanged strict gates require at least 46/48 correct answerability, relevant evidence and format; zero unsupported answers; and development loss no greater than the paired untouched base. A selected adapter is reloaded and must reproduce all 48 output strings and generated token sequences with the same gates. Failure never falls back to an earlier epoch.

`loss-recovery.json` reports online pre-update chosen training CE for each epoch, both example-mean and token-weighted. These are explicitly not checkpoint training-set evaluations. Development CE is reported for the same-prompt parent, comparator epoch three and new epoch three, including supported and insufficient slices. `fullParentLossRecovery` compares final overall CE to the paired parent, while `improvedOverComparator` compares it to run 009. Neither diagnostic changes eligibility or semantic acceptance.

## Remaining acceptance

Independent verification reconstructs the frozen input and audit commitments, fitting ancestry, comparator bindings, masking, all 225 updates, CE arithmetic, strict metrics, selection and reload identity. Successful verification demonstrates consistency of durable local evidence, not external attestation of physical execution.

Formal eligibility still requires two fresh independently saved blinded semantic reviews and dispute-only adjudication, preserving agreed failures. Development acceptance requires at least 46/48 complete semantic responses and zero fabricated premises. The separate 100-case final set remains sealed until every prerequisite passes and the selected checkpoint is committed. Final research acceptance requires at least 95/100 complete responses and zero fabricated premises under independent review, with no silent reuse of a consumed final set. Final overlap checks must include the complete fitting ancestry and disclose this identical-data sibling.

Every report remains research-only, production-ineligible and without an educator, population-accuracy or student-learning claim. One deterministic matched comparison supports a bounded observation about this run.
