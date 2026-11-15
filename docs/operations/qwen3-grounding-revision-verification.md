# Qwen3 grounding revision verification

The revision verifier is read-only. It performs no training, inference, provider call, or final-case loading.

```powershell
& artifacts/learning-engine/research/local-lora-execution/venv/Scripts/python.exe scripts/learning/verify_qwen3_grounding_revision.py --run artifacts/learning-engine/research/REVISION_RUN
```

`verify(run: Path)` is also available to the blinded review utility. The run must be complete, with its report, completion receipt and supervisor artifact manifest. This verifier's implementation and passing fixture tests alone do not establish that an experiment completed.

## Independent checks

- Exact model, immutable publisher provenance, source inventories, reviewed GPU qualification and package evidence.
- Parent run006 is independently reverified; its report and protocol are pinned, epoch one is the prespecified stronger diagnostic parent, and every parent evidence/adapter hash must match.
- Recorded Windows and WSL absolute parent paths map to the actual local sibling. Relative paths, traversal, repeated separators, other drives and unrelated siblings are rejected independently of the host operating system.
- Original development annotations remain unchanged. Original-prompt parent responses must match all48 IDs, decoded outputs, generated token IDs and target-token counts.
- Exactly600 training records from200 contexts, three questions per context, balanced subjects and answerability, two300-record authored partitions, and no training/development ID or source overlap.
- An independent machine audit covers every training ID exactly once, passes every record, binds the canonical data and both source files, and preserves each copied audit artifact. Educator approval cannot be inferred.
- All648 masked token sequences are reconstructed. Prefix tokens receive no loss, targets stay outside generation prompts, and the768-token budget permits no truncation.
- Base and preserved-parent measurements under the revised prompt precede candidate comparisons in the recorded experiment. Raw token IDs must decode to recorded outputs, and diagnostics, formal counts and answerability slices are recomputed.
- Both epochs contain150 optimizer updates, each with four examples in the fixed deterministic order. All losses and gradient norms are finite, with exact cumulative example and token accounting.
- Model totals are derived from actual hash-verified tensor headers and the architecture, counting tied embeddings once. All36 layers and288 rank16 adapter tensors have the required shapes and byte spans.
- Checkpoint selection uses the lowest target loss among formally eligible candidates only. A selected saved adapter must reproduce its responses and retain formal eligibility after reload.
- Report, selection, completion and supervisor inventories must agree. No final-test artifact or semantic/production acceptance claim is permitted.

## Formal eligibility and semantic acceptance

Automatic checks require at least46 of48 correct answerability decisions,46 exact quotations or warranted abstentions,46 correctly formatted responses, zero answers on insufficient-evidence cases, and loss no worse than the untouched base. The historical lexical composite remains a diagnostic.

Even when these checks pass, this verifier returns `validationPassed: false`, `semanticQualityValidated: false` and `productionEligible: false`. Independent blinded semantic review and a later fresh final evaluation remain separate requirements.

Nine targeted synthetic negative-control tests cover audit omissions and duplicate IDs, changed evidence bytes, unsupported educator status, source/data hash mismatch, training imbalance/overlap, formal gate boundaries, false semantic claims, token masks, truncation, shuffle/accounting changes, parent output identity, and Windows/WSL path correspondence. The imported original verifier additionally covers immutable inventories, publisher/model geometry, environment and generated-output integrity.

Hashes prove local evidence consistency, not externally signed attestation of physical execution or educational effectiveness.

## Completed run007 integrity verification

On 2026-09-28, the complete run007 passed read-only verification after correcting host-dependent recognition of the recorded WSL parent path. The correction strengthened the mapped sibling check; no run artifact, frozen source or quality threshold changed.

The selected epoch is one. Both epochs recorded47/48 correct answerability decisions,47/48 exact quotations or warranted abstentions,48/48 formatting passes and zero answers on insufficient-evidence cases. Original parent reproduction and selected-adapter reload identity passed. These are automatic development eligibility results, with semantic validation, final evaluation and production eligibility still false.

Report SHA-256: `3cbb8856dda318f6e3da666ce23fa6c04a747b598683740fb74033f43892ce01`. The separate `artifacts/learning-engine/research/qwen3-run-007-verification.json` receipt binds the verifier source hash, report hash and aggregate verification result without changing the immutable experiment directory.
