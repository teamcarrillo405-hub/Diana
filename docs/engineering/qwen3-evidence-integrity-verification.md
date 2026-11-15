# Evidence integrity research verification

The independent reader is `scripts/learning/verify_qwen3_evidence_integrity.py`.
It does not import the evidence-integrity training runner, perform inference,
or import any final evaluation cases. It shares the separately tested strict
response diagnostics, but independently derives gates and accounting.

Run in the existing offline research Python environment after a bounded run:

```text
python -B scripts/learning/verify_qwen3_evidence_integrity.py --run artifacts/learning-engine/research/qwen3-run-009
```

The tokenizer and publisher snapshot must already be present. Verification reads
the preserved parent chain and checks the unchanged selected run-008 epoch-two
adapter with the version-two parent verifier.

## Checked evidence

- Exact model revision, source inventory, settings, prompt, protocol and raw
  runtime contract bytes; tiny objective qualification and environment identity.
- All 300 original preference pairs and their two independently authored,
  hash-bound 150-case audits. Subject/category/context balance and target syntax
  are checked independently of the runner.
- Every prior training partition: run 008 has 200 pairs, run 007 has 600, and
  run 006 has 440. Sibling paths, parent protocol commitments, frozen training
  hashes, canonical rows and zero ID/source/source-question overlap are rebuilt.
- Chosen/rejected prompts and masked target tokens, with no prompt loss or
  undeclared truncation. All 300 cached reference pairs bind to the verified
  parent adapter, prompt, tokenization and pre-optimizer receipt.
- All 225 updates and 900 pair presentations, deterministic shuffle order,
  per-token log probability sums, standard DPO margin, and 0.5 chosen-token
  supervised loss. Tensor objective claims are compared to scalar arithmetic.
- Base and parent paired evaluations, exact original-parent output/token
  reproduction, all three checkpoints and their recomputed strict gates.
  Only epoch three can be selected. A selected adapter must reproduce all
  48 output strings and token sequences after reload.
- Frozen, report, completion and supervisor manifests, no interrupted run or
  final-test artifacts, and the 7,200-second research runtime bound.

Tests exercise tampered tokens, objectives, reference caches, incomplete
training, shuffled histories, rehashed but altered audits, altered ancestry,
equivalent JSON with different runtime bytes, threshold/count types, and
earlier-epoch fallback. They use synthetic fixtures and current training data;
they never load final evaluation contents.

## Limits

A successful receipt establishes internally consistent durable local evidence.
It is not third-party attestation of physical execution, reviewer independence,
educator credentials, or learning outcomes. Formal eligibility is not semantic
acceptance. The 95% complete semantic quality and zero-fabrication requirements
still require the separately blinded review, followed by the sealed final test.
Every receipt keeps production eligibility and semantic validation false.
