# Independent final research verification

Run this only after the approved one-use final evaluation completes. Use the
qualified local environment and preserve the original development, review,
qualification and model directories referenced by the frozen protocol.

```bash
python scripts/learning/verify_qwen3_final.py --run artifacts/learning-engine/research/FINAL_RUN_DIRECTORY
```

The callable interface is `verify_qwen3_final.verify(Path(run_directory))`.
It returns `verified: true` only after all checks pass. It writes no evidence,
downloads no model, runs no inference and never imports the sealed final-case
source module. It reads the already persisted final rows, reconstructs the
tokenizer evidence locally, and decodes the saved generated token IDs.

Development verification uses `verify_qwen3_preference_v2.py`. This version
corrects the environment-contract check by binding the original approved file's
raw digest and comparing its parsed content with the frozen copy. Run 008's
original frozen files and verifier snapshot remain preserved. Future final runs
freeze and check both `verify_qwen3_preference.py` and
`verify_qwen3_preference_v2.py` so the correction itself is included in the source
inventory. The prompt, seed, checkpoint and semantic prerequisites are unchanged.

Verification covers:

- Exact frozen, worker and supervisor file inventories and hashes; the preference
  prompt, model, seed 71313, epoch two selection and research boundaries.
- The dataset consumption claim, matching worker protocol, claim/opening
  chronology, completion receipt and absence of interrupted or extra artifacts.
- The independently verified preference development run and its ancestors, official base and
  adapter evidence, and the complete blinded development review/adjudication
  bound to that selected checkpoint. The same 95% and zero fabrication
  prerequisite is recomputed from the saved judgments.
- The frozen `trainingAncestry` inventory in exact preference, revision, initial
  order: 200, 600 and 440 training rows, with all 48 development rows from each
  stage. Every entry binds the run root, protocol digest, training and development
  file digests, and both row counts. The verifier follows the committed parent
  paths, checks each child commitment to its parent's protocol, and independently
  checks stage schemas, counts and frozen data hashes. Windows and WSL aliases
  are mapped to the same checkout without rewriting saved provenance.
- The sealed canonical 100 rows and overlap with every training and development
  row in that complete ancestry. The inventory is checked before parsing the
  saved final rows and again after reconstructing all three arms. The evaluation
  writer separately binds this inventory before importing the final case module.
- Tokenizer reconstruction, prompt/target separation, assistant loss masks,
  positive target counts, sequence limits and all 300 ordered arm records.
- Decoded raw output equality, finite recorded loss, recomputed diagnostics,
  weighted loss aggregates, answerability slices and complete adapter/reload
  response and generated-token identity.

The verifier is separate from the writer and does not call the writer's final
verification or execution functions. Reviewed scoring and development-verifier
helpers remain shared, frozen dependencies. Contract tests use synthetic cases
and stub the existing model/development prerequisites; those tests do not verify
an actual final run.
The synthetic regressions include omitted and reordered ancestors, ancestor-only
overlap after fixture hashes are recomputed, data and protocol substitutions,
invalid stage counts, and ancestor changes during reconstruction.

Successful verification establishes local evidence consistency. Recorded losses
are validated and aggregated, not independently recalculated by model inference.
Hashes do not attest that physical model execution occurred. Reviewer identities,
independence and chronology remain recorded attestations. The returned result
retains false semantic-quality, educator-review and production-eligibility flags.

Build the blinded final review packet only after this verification succeeds, using
the returned report hash, persisted `final-rows.json`, `baseline-final.jsonl` and
`adapter-final.jsonl`. Keep review artifacts outside the immutable final run.
Final semantic judgments, qualified educator review and learner-outcome evidence
remain separate requirements. An interrupted consumed dataset is not retryable.
