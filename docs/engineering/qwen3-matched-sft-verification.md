# Matched chosen-target SFT verification

`scripts/learning/verify_qwen3_matched_sft.py` is a read-only independent
reader for the experiment in `qwen3-matched-sft-design.md`. It never imports
the new runner, runs inference, or loads the final evaluation cases. It reuses
the preserved independent audit, ancestry, mask, checkpoint and strict metric
checks; its new objective, training accounting, comparator commitments,
qualification checks and loss diagnostic are reconstructed independently.

Run after the complete supervised experiment in the existing approved offline
Python environment, replacing the run directory with the actual frozen output:

```text
python -B scripts/learning/verify_qwen3_matched_sft.py --run artifacts/learning-engine/research/qwen3-run-010
```

The approved local tokenizer and publisher snapshot must already exist. The
reader loads the tokenizer for reconstruction, not model weights for inference.
It prints a JSON receipt to stdout and does not write experiment artifacts.

## Checked evidence

- Exactly 300 reused audited rows, their original canonical hash, unchanged
  development rows and annotations, both independent 150-row audits, and the
  exact combined audit bytes. Reuse creates no additional original examples.
- Fixed run 008 report/protocol hashes, full verification through the preserved
  preference v2 verifier, and epoch-two initialization. Original-prompt parent
  response strings and generated tokens must reproduce exactly.
- Fixed run 009 report, protocol and prior independent receipt hashes. Complete
  comparator report and supervisor manifests are checked. All shared frozen
  source, row, audit, tokenizer, parent and runtime inputs must be byte identical;
  settings differ only by removal of the DPO coefficient. The comparator is
  explicitly a same-data sibling, never an initialization ancestor.
- Actual run 008/007/006 training rows, counts 200/600/440, parent-chain
  commitments and zero ID/source/source-question overlap. Rehashed overlap
  receipts cannot override the underlying ancestor data.
- All 348 chosen/development token sequences rebuilt with the local approved
  tokenizer and unchanged prompt. Shifted assistant-only masking includes end
  tokens, target counts are positive, and truncation is prohibited. Comparator
  chosen tokenization must also match exactly.
- Tiny qualification uses the fixed synthetic token fixture, two finite
  updates, all 16 adapter tensors changed, scalar/tensor agreement, source and
  recipe binding, and exact original runtime-contract bytes. No real training
  or evaluation inputs belong to qualification.
- Exactly 225 updates and 900 chosen presentations. Every batch has four
  examples in seed-81173 epoch shuffle order. Each per-token sum reconstructs
  `0.5 * (-chosen_sum / chosen_target_tokens)` and its scalar/tensor claims.
  History field inventories prohibit DPO, rejected-target or reference terms.
  Rejected training token counts must be integer zero.
- Before the fresh optimizer, untouched-base and matched-parent output strings
  and generated token sequences must match the preserved run 009 baselines.
- Strict generated-response diagnostics, aggregate metrics and both answerability
  slices are rebuilt. Every checkpoint is retained and checked. Only epoch three
  can be eligible; no earlier-epoch fallback exists. Selected reload strings and
  token sequences must match exactly.
- Exact frozen/report/completion/supervisor inventories, source identity,
  parameter inventory, research boundaries and the 7,200-second runtime limit.

The combined audit has one declared serialization exception. The original
approved bytes have SHA-256
`20d4687cd24ac3bb2c19ed4284d90af59a698e09f0fd3aeb65338a1e9d219d6c`.
Run 009 serialized those same JSON values during its freeze, producing SHA-256
`463b0c7c5bb583a1e61537a1ec3e7192805a90804e9bc8a7044f1a069870c2a7`.
The matched run copies the original approved bytes. The reader pins both exact
raw hashes and requires parsed equality plus canonical-hash equality
(`83745a29cf3480e76b7291d39f0132ad4f0fdc60cf7828eaab04bb76563ce172`).
The comparator evidence records both raw identities and the canonical identity.
Every other shared frozen input still requires exact byte equality. This
exception neither rewrites run 009 nor accepts arbitrary audit formatting.

## Diagnostic and acceptance remain separate

`loss-recovery.json` records each epoch's online pre-update chosen CE, both as
an example mean and weighted by target tokens. These are optimization-time
observations, not checkpoint evaluations. Development CE includes overall,
supported and insufficient slices for the paired parent, comparator epoch three
and matched SFT epoch three.

Full parent-loss recovery means final overall development CE is no greater
than the paired parent's. Improvement over run 009 alone is partial recovery.
Neither result changes the existing formal gates or the separate requirements
of at least 46/48 complete semantic responses and zero fabricated premises.
Fresh blinded review and dispute-only adjudication must still preserve agreed
failures. The sealed 100-case final evaluation remains a separate later gate.

## Tests and limits

```text
python -B -m unittest discover -s scripts/learning -p test_qwen3_matched_sft_verifier.py
```

Adversarial fixtures cover token masks, sums, scalar/tensor disagreement, added
DPO/reference/rejected terms, missing or reordered updates, cumulative counts,
fixed qualification inputs, raw runtime bytes, counterfeit rehashed comparator
receipts, changed shared inputs, incomplete manifests, ancestor overlap, altered
independent audits, baseline string/token identity, formal thresholds and
epoch-three-only selection. The tests do not execute model inference.

A successful receipt establishes consistency of durable local evidence. It
does not independently attest physical execution, reviewer independence,
educator credentials, general accuracy or student outcomes. The receipt keeps
semantic validation, final validation and production eligibility false. One
deterministic comparison supports only a bounded observed result.
