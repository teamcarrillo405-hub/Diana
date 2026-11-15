# Matched chosen-target SFT comparison

Prospective design declared before model inference. Use the same approved Qwen3 4B snapshot and existing local GPU runtime. No new model, download, paid compute, provider call or production activation is authorized by this experiment.

## Scientific question

Run 009 achieved perfect automatic evidence/answerability/format counts but only 39/48 complete semantic responses, with two fabricated-premise flags. Preserve that rejection and all evidence. Test removal of DPO while retaining its supervised term. This is a matched sibling experiment initialized from run 008 epoch two, not continuation from run 009.

Run 008 parent report SHA-256: `f6dbec7623471797908c3a6ea8894b6ea0c65ac09c12d22db920bccfa3683e5c`; protocol: `52f00147c744c0d04841876bf11349a79b624f1ee8c696d1c9830b3110f8bd7c`. Verify it with the preserved preference v2 verifier. Reproduce all original-prompt parent response strings and generated tokens before proceeding.

Run 009 comparator report SHA-256: `06b9d89bdff32ccf98244fd1f8612a7bbd083cba6b43b8913f3e68c0aba3142a`; protocol: `68654384af3bfdfa641eb25c1c16efd65552360098ecd4766b5965c4d4fcbe34`; independent verification receipt SHA-256: `b769788f5acdb4214e922ad7ee3bf2b2fcae2370d0ba124bda2ce9d906d2a86c`. Bind the comparator identities and complete frozen training/development inputs without rewriting them. No new or development-shaped training examples are introduced.

## Inputs and fixed recipe

Reuse the exact 300 independently audited preference records, training canonical SHA-256 `73e94b7f518849cc78024b2b63571638e8569708f28c1f8ee87f08811356a760`. Only their chosen targets contribute to optimization. Preserve rejected text as audited comparison metadata; do not feed rejected targets into the model or calculate preference gradients. Reuse both 150-pair audits and their combined manifest SHA-256 `20d4687cd24ac3bb2c19ed4284d90af59a698e09f0fd3aeb65338a1e9d219d6c`. This intentional reuse is disclosed; it is not 300 additional original examples.

Pre-inference integration checking found that run 009 serialized its combined audit when freezing: that preserved copy has raw SHA-256 `463b0c7c5bb583a1e61537a1ec3e7192805a90804e9bc8a7044f1a069870c2a7`. The original and saved copy have equal parsed contents and canonical SHA-256 `83745a29cf3480e76b7291d39f0132ad4f0fdc60cf7828eaab04bb76563ce172`. Bind both exact raw identities and their content equality; copy the original raw bytes into run 010. This explicit serialization difference changes no training record, audit decision or experimental setting. Preserve the rejected first freeze attempt and run 009 unchanged.

Retain the exact run 009 prompt from `qwen3_evidence_integrity_contract.py`, its strict metric implementation, the unchanged 48 development rows and annotations, tokenization rules, base revision, seed 81173, deterministic shuffle order, learning rate 0.00001, AdamW weight decay 0.01, gradient clipping 1.0, accumulation four, one chosen example per microbatch, three epochs, rank-16/alpha-32 q/k/v/o LoRA, zero dropout, BF16 and FP32 target log-softmax, eager attention, nonreentrant checkpointing, four threads, 768 sequence tokens, 128 generated tokens and a 7,200-second supervised runtime ceiling.

The objective is exactly:

```text
loss = 0.5 * (-chosen_sum_log_probability / chosen_target_tokens)
```

The coefficient remains 0.5 to isolate removal of the DPO term, including its effects on gradient clipping and optimizer state. Require assistant-only shifted masking including end tokens, positive target counts and no truncation. Use a fresh optimizer. Train exactly 225 updates and 900 chosen-target presentations; record all per-token log probabilities, token counts, scalar/tensor losses, gradient norms, example ordering and cumulative counts. Keep every checkpoint. Only epoch three is eligible, with no earlier-epoch fallback or loss-based selection.

Qualify the new objective on a random tiny model in the same approved GPU environment before freezing: two finite updates, all 16 adapter tensors changed, target-only masking and scalar/tensor loss agreement. Bind the proof to the new runner source, settings and exact original runtime-contract bytes. No real training or evaluation inputs are used by this qualification.

## Comparison and verification

Evaluate the untouched base and reproduced parent under the same prompt before fitting. Check their raw responses and generated token sequences against the preserved run 009 paired baselines, retaining exact matching or stopping before optimization. This ensures that the changed objective is the planned experimental difference. Keep source, input, audit, comparator, runtime, parameter, checkpoint, evaluation, completion and supervisor manifests.

An independent read-only verifier reconstructs the data/audits, parent and comparator bindings, masked tokenization, all 225 updates and 900 chosen presentations, the 0.5 CE objective, strict evaluation metrics, epoch-three-only selection and reloaded output identity. The prior training ancestry is run 008 (200), run 007 (600), run 006 (440). The new 300 records exactly reuse run 009's data and are checked for zero overlap with those three ancestors and development. The sibling comparator's exposure is explicit; it is not part of the initialization chain.

## Separate acceptance conclusions

1. **Objective recovery diagnostic:** report chosen training CE and development CE, including both answerability slices. Full parent-loss recovery requires final development CE no greater than the same-prompt parent (approximately 1.6975). Improvement over run 009's 3.88667 alone is partial recovery. This diagnostic does not replace semantic acceptance or alter its existing gate.
2. **Development eligibility:** retain all existing strict formal gates, at least 46/48 correct answerability, relevant evidence and format, zero unsupported answers, and loss no worse than the paired untouched base. Require exact selected-adapter reload identity. Then obtain two fresh independently saved blinded reviews and dispute-only adjudication, preserving agreed failures. Require at least 46/48 complete semantic responses and zero fabricated premises.
3. **Final research acceptance:** the separate 100-case final set remains sealed until every development prerequisite passes and the checkpoint is committed. Require at least 95/100 complete responses and zero fabricated premises after independent review. Never silently reuse a consumed final test. Overlap checks must include the full fitting ancestry plus this explicitly identical-data sibling comparator.

All reports remain research-only and production-ineligible. No novelty, educator qualification, population accuracy or student-learning benefit follows from a synthetic benchmark. One deterministic matched run can support a bounded observed comparison, not a general causal claim across seeds and data distributions.
