# Qwen3 evidence integrity continuation

Status: prospective design, declared before this experiment's model inference. Same approved immutable Qwen3 4B snapshot and qualified local GPU; no new model, downloads, paid compute, provider calls or production activation.

## Objective and preserved boundaries

Improve complete response quality while preserving the existing five-dimension semantic rubric, 95% observed-sample target and zero-fabrication requirement. The preceding candidate did not meet that complete semantic gate. Its artifacts, automatic counts, original reviews and rejection remain unchanged. Evidence quotation alone is not sufficient for semantic acceptance.

The development set remains the same 48 rows and annotations, canonical SHA-256 `a76d8bcb1735b9b721308cd925dfa187d44af4481c799307971e82e9f2b3aad5`. Development has been reused for research decisions and is not an independent final test. The separately sealed fresh final 100 cases stay closed until all development prerequisites pass. No training author is allowed to read development cases, responses or final cases.

## Parent and prompt

Continue run 008's selected epoch two as a research parent only. Parent report SHA-256 is `f6dbec7623471797908c3a6ea8894b6ea0c65ac09c12d22db920bccfa3683e5c`; protocol SHA-256 is `52f00147c744c0d04841876bf11349a79b624f1ee8c696d1c9830b3110f8bd7c`. Verify it with the corrected independent v2 verifier, preserving the original frozen verifier and all evidence. Reproduce every saved parent response and generated token sequence under its original prompt before fitting.

The new exact prompt is `SYSTEM` in `scripts/learning/qwen3_evidence_integrity_contract.py`. It retains two-line evidence/question output, but states that source facts are read-only; a missing outcome does not erase an established action; the evidence line is either an exact quote or the single word `insufficient`; a next step must direct an operation rather than asking if unknown data would help; proposed checks need adequate inputs and must not presume observations. Freeze its source and digest. Measure untouched base and preserved parent under this same prompt before training, keeping prompt effects separate from fitting effects.

## New original preference data

Two partitions supply 150 pairs each from 75 contexts. Every context has distinct supported and insufficient/conflicting questions. Each partition has 30 pairs per subject (math, reading, English, science, history) and 30 per category:

- Evidence mutation: proposing to add, invent or rewrite a source fact to fill an evidentiary gap. At least 20 of these 30 rejected examples preserve the EVIDENCE line and place the defect in NEXT.
- Task scope: confusing an established action, intention or request with an unknown result, or moving to irrelevant unavailable text.
- Missing procedure: naming unknown information without an actual inspection, measurement or appropriate original source.
- Missing inputs: obtaining an insufficient subset of endpoints, change, time, units, baseline, comparison text or other necessary information.
- Source instruction: treating embedded instructions as evidence to quote, not commands to obey.

There are at least 15 conflicting contexts and 15 instruction-bearing contexts per partition. Sources are original fictional text, 180 to 600 characters; relevant exact quotations are at most 240 characters. Each preferred response contains one useful question, no extra completed solution, no invented observations and no proposal to alter historical evidence. Rejections demonstrate concrete inferior behavior and retain explicit explanations. All pairs require individual independent review, source/row/pair hashes, at least 20-character notes and no unresolved findings before freeze. Two distinct reviewers must cover all 300 pairs; AI reviews do not establish educator credentials.

Partition A is authored in a fresh context without prior cases. Partition B's author previously authored training data but has not read development/final cases or model responses; this exposure is disclosed rather than called fully training-blind. New rows must not duplicate old training or development contexts. Curriculum level labels are unvalidated research labels, not evidence of complete grade coverage.

## Fixed objective and optimization

Use standard DPO summed target log probabilities with a chosen-response supervised term:

```text
margin = (policy_chosen - policy_rejected) - (reference_chosen - reference_rejected)
loss = -logsigmoid(0.1 * margin) + 0.5 * (-policy_chosen / chosen_target_tokens)
```

Reference is the verified parent, scored for all 300 pairs before any optimizer update. Bind its per-token and summed scores to parent, prompt, exact masked tokens and protocol. Never refresh reference scores after fitting. No prompt token contributes to the objective, no target enters generation prompts, and no sequence is truncated.

Use three fixed epochs, learning rate 0.00001, accumulation four, one pair per microbatch, seed 81173, AdamW weight decay 0.01, clipping 1.0, zero dropout, existing rank-16/alpha-32 q/k/v/o LoRA, native BF16, FP32 target log-softmax, eager attention, nonreentrant checkpointing, four CPU threads, 768 sequence tokens and 128 generated tokens. This is 75 updates per epoch, 225 total updates and 900 pair presentations. Wall-time limit is 7,200 seconds. Run a new random tiny-model numerical qualification after the new runner is stable; no real model or dataset is loaded by that qualification. Freeze the approved runtime contract by copying its original bytes, preventing the earlier serialization mismatch prospectively.

## Prospective diagnostic correction

`qwen3_evidence_integrity_metrics.py` preserves legacy diagnostics under explicit fields but makes answerability status and evidence syntax explicit. An extended refusal beginning with `insufficient` is an abstention attempt and invalid evidence syntax, not a supported answer. Arbitrary non-source text has unknown status. An actual source quotation beginning with that word remains a quotation. Relevant quote checks, not merely any exact source substring, contribute to the evidence gate. Format eligibility includes valid evidence syntax. No earlier metric file or run is rewritten.

This correction does not grant semantic acceptance or detect every unsupported assumption. Seven initial regression tests cover the discovered failure mode, true quotations, irrelevant quotations, malformed refusals, fabricated diagnostics, token/loss accounting and unchanged numeric thresholds. Independent semantic reviewers still judge the original five dimensions on raw responses.

## Selection, verification and final test

Preserve all three checkpoints. Only epoch three may be selected, with no earlier-checkpoint fallback and no loss ranking. It must satisfy at least 46/48 correct answerability decisions, 46/48 relevant exact quotes or warranted abstentions, 46/48 valid two-line/question responses, zero unsupported answers on insufficient cases and target loss no worse than the paired untouched base. Reload and reproduce its strings and generated token sequences exactly.

An independently implemented verifier must reconstruct the 225 optimizer updates, 900 presentations, DPO/SFT calculations, masked tokenization, frozen reference scores, runtime qualification, parent chain, all evaluation metrics, selection, reload identity and complete artifact inventories. Formal eligibility remains distinct from semantic acceptance. Obtain two independently saved blinded reviews and a third review of disputes only; preserve agreed failures. At least 95% complete semantic responses and zero fabricated responses are required.

Only then may a separately adapted one-use final runner open the sealed final test. Its overlap and provenance checks must cover all four training generations: 440 + 600 + 200 + 300 = 1,540 rows, plus all development partitions. A failed final test cannot be silently reused. Neither a development pass nor a final authored-sample pass proves population accuracy, educator approval, student learning gains, production readiness or algorithmic novelty. DPO and LoRA are established methods.
