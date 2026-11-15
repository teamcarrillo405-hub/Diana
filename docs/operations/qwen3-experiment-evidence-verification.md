# Qwen3 development experiment verification

`scripts/learning/verify_qwen3_4b_research.py` is a read-only verifier for the frozen Qwen3-4B development experiment. It performs no model inference, training, provider call, or final-test evaluation.

```powershell
& artifacts/learning-engine/research/local-lora-execution/venv/Scripts/python.exe scripts/learning/verify_qwen3_4b_research.py --run artifacts/learning-engine/research/qwen3-run-006
```

The verifier works from Windows or WSL: it locates the same approved local model snapshot, checks the recorded WSL runtime contract, and reconstructs tokenization locally. It does not claim that the Windows verifier itself ran the recorded GPU experiment.

## Checks

- Complete immutable protocol, source, data, model, qualification, and completed-run artifact inventories.
- Official model revision and all downloaded file hashes, with exact copied provenance.
- All 398 base tensor names and shapes derived from the approved Qwen3 configuration, exact shard/index alignment, BF16 byte spans, and tied embeddings counted once.
- Independently pinned numerical recipe, 440 training records, 48 development records, and system prompt.
- Reviewed WSL Python, ROCm/R9700/BF16 configuration, exact package versions, qualification hashes, PEFT overlay bytes, and successful deterministic numerical smoke evidence.
- All 488 token sequences reconstructed from the local tokenizer, no source loss, no target leakage into generation prompts, no silent truncation.
- Raw generated token IDs decoded back to the saved responses; diagnostics and aggregate metrics recomputed from those responses.
- All 36 layers and 288 rank-16 query/key/value/output adapter tensors, correct grouped-query dimensions, paired tensors, byte spans, and trainable parameter inventory.
- All 220 optimizer steps, deterministic example order, four-example accumulation groups, finite losses/gradient norms, and exact cumulative target-token counts.
- Independently recomputed 95% and nonregression gates, eligible-only checkpoint selection, and persistence reload identity when a checkpoint qualifies.
- Explicit exclusion of final-test, educator-validation, and production-activation claims.

Thirteen offline negative-control tests pass, including rehashed false diagnostics, output/token mismatch, data-order and target-count tampering, target leakage, missing adapter layers, incorrect projection shapes, malformed weights, escaping file paths, nonfinite values, CPU fallback claims, and incorrect base parameter accounting.

The frozen `qwen3-run-006` protocol independently passed pre-execution validation with SHA-256 `2ff6ce808c9e8bcf1d133831e37e20d90c6d5dff5535bd6ef014fbf160f9d6f8`. All model bytes and 488 tokenized/masked records were verified without inference. Final run verification requires a completed report, completion receipt, and supervisor manifest; preparation alone is not a completed experiment.

## Completed run verification and parameter-count correction

On 2026-09-28, the completed run passed all read-only integrity checks. Report SHA-256: `cfa06bdc14f8c9041a364f0612cae13eade9c462e231492197bf66e886e25943`. The verifier recomputed 220 optimizer steps and 20,888 training target tokens. Development mechanical passes were 26/48 for the baseline, 33/48 for epoch 1, and 30/48 for epoch 2. Both candidates remained rejected; no final evaluation or production activation occurred.

The first completed-run verification exposed an error in the verifier's original expected parameter count. The official shard index declares `metadata.total_size` of 8,045,591,552 bytes, but the hash-verified shard tensor headers and Qwen3 architecture account for 8,044,936,192 BF16 payload bytes. The 655,360-byte difference corresponds to 327,680 BF16 elements. Index metadata is therefore unsuitable for computing this model's parameter count. The cause of the publisher metadata discrepancy is unknown.

The corrected verifier derives each expected tensor from configuration and validates the actual shard headers and contiguous payload spans. Its unique base count is 4,022,468,096, including one shared input/output embedding matrix. Adding 11,796,480 independently counted LoRA parameters gives 4,034,264,576, exactly matching the recorded model. Tests reject the old index-derived total, duplicate output embedding storage, missing tensors, invalid shapes, and overlapping offsets. No experiment artifact, frozen runner, model byte, or training result was changed to resolve this verifier defect.

Hashes establish local evidence consistency, not an externally signed attestation that every physical operation occurred. A mechanical development pass also does not establish semantic teaching quality or 95% accuracy on a fresh independent final evaluation.
