# Gated Qwen3 final evaluation

This evaluator is a prospective research tool. It does not train, select another adapter, infer semantic success from lexical metrics, or authorize production use. A completed final run still needs independent blinded semantic review.

## Preconditions

The selected preference candidate must pass `verify_qwen3_preference_v2.verify`, its fixed automatic eligibility rules, and saved-adapter development reproduction. Only its prespecified final epoch two is eligible; epoch one cannot be used as a fallback. The writer uses `train_qwen3_preference` for the selected system prompt, tokenization, and mechanical diagnostics. Its 48 development responses must have two complete, independently saved blinded reviews bound to the exact report, selected epoch, source, question, response, case hash, and committed arm mapping.

The v2 verifier corrects the runtime-contract comparison: it checks the original approved contract's raw SHA-256 and requires canonical equality with the reformatted frozen copy. The original verifier and run-008 frozen sources remain preserved. Final freeze includes both verifier versions in its dependency snapshot; the training module, selected system prompt, seed, and acceptance thresholds are unchanged.

Use a third independent blinded reviewer only for disputed dimensions, through `grounding_adjudication.prepare` and `assess`. Agreed dimensions cannot change. A response both original reviewers reject overall cannot become a complete pass through adjudication. Development acceptance requires at least 46 complete cases out of 48 and zero fabricated responses after resolution. Preserve both original reviews and adjudication evidence.

The runner checks recorded identities, file hashes, completeness, and receipt ordering. Software cannot prove reviewer independence, actual blinding, the truth of timestamps, or educator qualifications. Preserve the external coordination record supporting those claims. Never backdate a receipt or assert blindness retrospectively without evidence.

## Review bundle

Save an immutable JSON document with schema `diana-development-semantic-gate-bundle-v1`. `files` maps each role to an absolute execution-host path and its raw file SHA-256. Required roles are `packet`, `key`, `first`, and `second`. When any dimension differs, also supply `disputes` and `adjudication`. These files use the existing semantic-review and adjudication schemas.

`reviewerReceipts` contains one object for each reviewer role: `first`, `second`, and, when needed, `adjudication`. Each receipt has:

- `role`, `reviewerId`, and `reviewFileSha256`, bound to that exact rating file.
- `independentlyAuthored: true` and `savedBeforeUnblinding: true`, supported by the coordination record.
- `savedAtUtc`, a timezone-aware ISO timestamp when the review was saved.
- If the reviewer was actually unblinded, `reviewerUnblindedAtUtc` records that event and must be at or after `savedAtUtc`; `stillBlinded` must be absent or false.
- If the reviewer remains blinded, use `reviewerUnblindedAtUtc: null`, `stillBlinded: true`, and a timezone-aware `receiptRecordedAtUtc` at or after `savedAtUtc`. Reviewers can remain blinded indefinitely. Do not reveal the key or invent an unblinding event merely to fill a receipt.

Both complete primary reviews must be saved before preparing adjudication. Keep the arm key unavailable to each reviewer until their ratings are saved. The evaluator reports original review results alongside the resolved result.

## Freeze and review

Use the same reviewed WSL ROCm interpreter and process environment as preference training, including `HSA_ENABLE_DXG_DETECTION=1`, `LD_LIBRARY_PATH=/opt/rocm-7.2.1/lib:/usr/lib/wsl/lib`, the isolated PEFT `PYTHONPATH`, `TORCH_BLAS_PREFER_HIPBLASLT=0`, and `PYTHONDONTWRITEBYTECODE=1`. The runner applies Hugging Face offline flags and a Python socket guard. This is not an OS network sandbox claim.

From that environment:

```text
python scripts/learning/evaluate_qwen3_final.py freeze --output <new-final-run> --development-run <verified-preference-run> --review-bundle <review-bundle.json>
```

Freeze verifies development acceptance and the approved final manifest/content-audit/module hashes. It hashes the final source as opaque bytes and does not import its cases. It freezes evaluator dependencies, environment, qualification, exact adapter identity, review role files, final metadata, and the selected development system prompt. The unchanged `diana-qwen3-final-protocol-v1` schema now requires a `trainingAncestry` inventory ordered from the preference candidate through its revision parent to the original training run. Each entry records `root`, `protocolSha256`, `trainSha256`, `developmentSha256`, `trainRows`, and `developmentRows`. Review the written `protocol.json` and its printed SHA-256 before running.

Ancestry comes from each protocol's `parent.root` and the child's recorded parent protocol hash. The required sequence is preference, grounding revision, and original grounding, with 200, 600, and 440 training rows respectively and 48 development rows in each run. All paths must resolve inside the current checkout's research directory. Frozen dataset hashes, schemas, counts, and parent bindings are checked at freeze and rechecked before inference and after evaluation. Missing, cyclic, additional, or changed ancestors are rejected. The output directory must sit outside every preserved ancestor run.

```text
python scripts/learning/evaluate_qwen3_final.py run --output <same-final-run> --protocol-sha256 <reviewed-digest>
```

Output must be a new directory under `artifacts/learning-engine/research`, outside immutable development evidence. No final run is authorized merely by preparing this tool.

## One attempt and preserved interruptions

Before importing final cases, the supervisor exclusively creates a dataset-wide consumption claim under `artifacts/learning-engine/research/qwen3-final-consumption`. Its filename is the final rows' canonical hash. It also writes the run's `started.json`. A second run in any output directory is rejected. The claim stays present after timeout, process error, invalid final rows, or incomplete output. Preserve partial evidence; do not delete the claim to retry. Further iteration requires a newly authored and audited final dataset and a new protocol.

The Linux process supervisor limits the complete worker to 7,200 seconds. On timeout, Ctrl+C, SIGTERM, or launch failure, it terminates and reaps its owned process group where one exists, preserves the claim, and writes an interruption record. It escalates from SIGTERM to SIGKILL if needed. The worker separately checks elapsed time. No optimizer is created and optimizer steps remain zero.

## Evidence produced

The selected preference prompt and inference recipe are retained: native BF16, eager attention, strict deterministic algorithms, seed 71313, greedy generation, cache enabled, sequence limit 768, and at most 128 generated tokens. Input truncation is forbidden. The final rows must match the existing sealed canonical hash and have no ID, source, or source-question overlap with the entire ancestry: all 200 new preference pairs, 600 run-007 training examples, 440 run-006 training examples, and each run's development rows. Only overlap counts are summarized. The sealed final hashes and dataset-wide one-use consumption claim are unchanged by this backend update.

The evaluator records 100 untouched-base responses, 100 selected-adapter responses, and 100 responses from a freshly reloaded copy of the same adapter:

- `baseline-final.jsonl`, `adapter-final.jsonl`, and `reload-final.jsonl` contain raw responses, generated token IDs, target-token losses, target-token counts, and mechanical diagnostics.
- Corresponding `*-metrics.json` files contain recomputed mechanical metrics and answerability slices.
- `final-rows.json`, `tokenization.json`, `overlap-counts.json`, `final-opened.json`, and frozen evidence support verification.
- `report.json`, `completion.json`, and `supervisor-artifact-manifest.json` bind final evidence, including the completed execution log.

Reload must reproduce all adapter response strings and token IDs. Mechanical metrics are descriptive; the report remains `awaiting-independent-final-semantic-review`, with `finalSemanticQualityValidated: false` and `productionEligible: false`.

## Subsequent semantic review

Run the independent `verify_qwen3_final.py` artifact verifier before preparing a final review packet. It verifies saved evidence without importing the sealed source or running a model. Keep review files outside the immutable final-run directory. Use `grounding_review_v3.build_packet` directly with the saved final rows, paired base/adapter outputs, the verified final report's raw SHA-256, partition `test`, and no diagnostic epoch. Save two independent blinded reviews before unblinding, then resolve only disagreements with a third reviewer. Preserve agreed overall failures.

The final semantic target is at least 95 complete cases out of 100 and zero fabricated responses, covering all five existing dimensions. Report each original review, resolved results, dimension rates, and uncertainty. Passing an authored sample does not establish 95% population accuracy, qualified educator validation, curriculum coverage, learning gains, or production readiness.
