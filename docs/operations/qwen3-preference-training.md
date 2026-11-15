# Qwen3 preference continuation

This separate research runner preserves prior runs. It continues verified run 007 epoch one, which passed formal eligibility and failed semantic acceptance. It cannot import a final test or authorize production activation.

The objective follows established [Direct Preference Optimization](https://arxiv.org/abs/2305.18290), with an added chosen-response supervised term. [Hugging Face's DPO documentation](https://huggingface.co/docs/trl/dpo_trainer) describes the reference-policy likelihood ratio and reference-score precomputation. This implementation uses the existing PyTorch/PEFT environment and installs no TRL or other packages. It makes no algorithmic novelty claim.

## Fixed objective and recipe

For target-only **summed** log probabilities, compute:

```text
margin = (policy_chosen - policy_rejected) - (reference_chosen - reference_rejected)
dpo = -logsigmoid(0.1 * margin)
chosen_ce = -policy_chosen / chosen_target_tokens
loss = dpo + 0.2 * chosen_ce
```

The shared prompt contributes no target log probabilities. Only the added supervised term is normalized by token count. Chosen and rejected sequences use exactly the same prompt prefix; neither target enters generation prompts. Assistant tokens and the template's ending tokens remain supervised. Truncation is forbidden.

The immutable recipe uses 200 pairs, two epochs, one pair per microbatch, accumulation four, 100 optimizer updates, seed 71313, learning rate 0.000005, AdamW weight decay 0.01, clipping 1.0, and the existing rank-16/alpha-32 q/k/v/o adapter. Computation uses native BF16, FP32 target log-softmax, eager attention, nonreentrant training checkpointing, zero dropout, four CPU threads, sequence limit 768, and at most 128 generated tokens. Training disables cache; greedy evaluation enables it. The supervisor is bounded to 7,200 seconds.

## Independent pair audit

The two author modules expose 100 rows each. Combined data must contain 100 source contexts, each with distinct supported/insufficient questions; 100 cases in each answerability class; five subjects with 40 rows each; at least 20 conflicting contexts; and category counts 80 `echo`, 40 `unsupported-premise`, 40 `wrong-scope`, and 40 `wrong-answerability`.

Each row carries its preferred `target`, intentionally defective `rejected`, `preferenceCategory`, and explanatory `preferenceReason`, alongside normal grounding annotations. Negative responses are research examples, never authorized student-facing instructions. Original 48 development rows and annotations remain unchanged.

Before freeze, independently inspect all 200 pairs and resolve findings. The audit manifest schema is `diana-qwen3-preference-audit-v1`, with:

- `approvedForTraining: true`, `independentReviewer: true`, `educatorReviewed: false`, and `unresolvedFindings: []`.
- `trainingCanonicalSha256` and exact author-module `sourceSha256` values.
- `caseReviews` covering every pair exactly once, with `id`, `passed: true`, `chosenPass: true`, `rejectedIsInferior: true`, `pairHash`, and concrete `notes` of at least 20 characters.
- `evidenceFiles` mapping absolute execution-host paths to raw SHA-256 hashes for preserved audit reports.

Canonical row/pair hashes use UTF-8 JSON with sorted keys, compact comma/colon separators, `ensure_ascii=False`, and nonfinite values forbidden. Audits are machine research review and do not establish educator credentials.

## Tiny numerical qualification

Use the existing approved WSL ROCm process environment, interpreter, and isolated PEFT overlay. First run:

```text
python scripts/learning/train_qwen3_preference.py qualify-objective --output <new-proof.json> --environment-contract <reviewed-runtime-contract.json>
```

This uses a randomly initialized, two-layer tiny Qwen3 model and synthetic token IDs. It loads no approved 4B weights, training examples, or final cases. It checks initial DPO loss equals log(2), FP32 objective agreement with the scalar formula, finite gradients, both preference gradient signs, all 16 adapter tensors changing after two updates, and unchanged reference values. The proof binds runner source, recipe, and exact GPU environment. Any subsequent runner edit requires a new proof before freeze.

The authorized local qualification completed at `artifacts/learning-engine/research/qwen3-runtime/preference-objective-qualification/qualification.json`. Its SHA-256 is `741376426a6dc356e0a2f9b672b02d1a61d3994044f78e13759d997c9bb10cb1`; qualified runner SHA-256 is `dc168c5d407a00ba652560cf1f617c94c71501f41298477279e4a2060d529c7e`. Initial DPO was 0.6931471805599453, both updates had finite gradients, and all 16 adapter tensors changed. This is numerical engineering evidence and provides no semantic-quality result. The output directory must exist before running qualification; use a new proof filename for any subsequent qualification.

## Freeze, review, and execute

```text
python scripts/learning/train_qwen3_preference.py freeze --output <new-run> --model-root <verified-base-root> --environment-contract <reviewed-runtime-contract.json> --parent-run <qwen3-run-007> --training-audit <preference-audit.json> --objective-qualification <new-proof.json>
```

Freeze performs no model inference. It verifies parent report/protocol hashes and the selected adapter, preserves all audit evidence, checks exact tokenization without truncation, and freezes source/data/prompt/runtime/parent/recipe hashes. Review `protocol.json` and its digest before execution:

```text
python scripts/learning/train_qwen3_preference.py run --output <same-run> --protocol-sha256 <reviewed-digest>
```

Execution first reproduces all 48 saved parent outputs under their original prompt. It then records untouched-base and preserved-parent baselines under the new prompt, separating the prompt change from fitting.

All 200 parent reference pairs are scored before creating the fresh optimizer. `reference-cache.json` binds the parent adapter, frozen protocol, prompt, pair tokenization, ordered pair IDs, target counts, and per-token/summed log probabilities. No second full model is required; the unchanged parent supplies reference scores before becoming the trainable policy. The cache is never refreshed after fitting begins and is rehashed before both epochs and after training.

`training-history.jsonl` records each group of four pair presentations, all policy/reference scores, per-token policy log probabilities, standard scalar objective terms, actual tensor loss components, gradient norm, cumulative counts, and exact optimizer step. Nonfinite quantities or scalar/tensor disagreement stop execution. Partial reference progress and training evidence remain preserved.

## Selection and review

Both epoch checkpoints and all development outputs remain available. Only epoch two may be selected, and only if it passes the existing formal gates against the untouched base. Epoch one is never a fallback, even if its target-token loss is lower. The selected adapter must reproduce its development output strings and token IDs after reload.

Formal eligibility requires at least 46/48 correct answerability decisions, exact quotations or warranted abstentions, and valid two-line/single-question formatting; zero answers on insufficient cases; and target-token loss no worse than untouched base. Original lexical diagnostics remain visible.

`validationPassed`, `semanticQualityValidated`, and `productionEligible` remain false. Formal eligibility cannot establish the 95% complete semantic/zero-fabrication gate. Two independently saved blinded semantic reviews, dispute-only third review, and preservation of agreed failures remain necessary. Final-test execution needs a separately adapted, verified one-attempt gate covering this experiment and all ancestor training data. This runner never imports final cases.
