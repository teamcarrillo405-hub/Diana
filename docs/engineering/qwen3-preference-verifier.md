# Preference experiment verification

`scripts/learning/verify_qwen3_preference.py` independently verifies the durable evidence of the fixed local DPO plus chosen-response SFT experiment. It performs no inference, fitting, downloading, final-case loading, or writes to the run directory.

Run it in the approved local runtime, where the pinned tokenizer and existing model snapshot are available:

```text
python scripts/learning/verify_qwen3_preference.py --run <research-directory>/qwen3-run-008
```

The Python API is `verify(run: Path)`. It raises `ValueError` on an evidence inconsistency and returns a verification summary only after all checks pass. Missing or malformed files also stop verification. The parent must be the local sibling `qwen3-run-007`, pinned to the report and protocol hashes in the design. Canonical Windows drive paths and their `/mnt/<drive>/...` equivalents map to the same identity. Relative, traversing, noncanonical, UNC, different-drive, and different-directory paths are rejected.

## Checks

- Exact model, settings, prompt, objective, source files, frozen data, independent audit coverage, copied audit evidence, and qualified runtime bindings.
- Original development annotations and parent-chain verification, including reproduction of all 48 parent outputs under its original prompt.
- Independent reconstruction of chosen, rejected, and development token sequences using the pinned local tokenizer. Every prompt position is masked from loss; generation prompts contain only system, source, and question. All target counts and sequence budgets must agree.
- All 200 frozen reference records: target-token counts, finite nonpositive per-token log probabilities, their sequence sums, and parent/prompt/protocol/tokenization bindings. The durable progress file must equal the completed cache. The fresh-optimizer receipt and every update must reference that same cache hash.
- Exactly 100 updates, four pairs per update, the prescribed two deterministic epoch shuffles, and 400 presentations. Both chosen and rejected cumulative token counts are checked.
- For every presentation, independent scalar recomputation of summed-log-probability DPO, mean chosen-token cross entropy, their weighted sum, and the corresponding recorded tensor losses. Reference scores must equal the precomputed values. Probability sums use a `1e-6` relative / `1e-4` absolute tolerance; objective comparisons use `1e-5` relative / `1e-4` absolute tolerance for float32 reductions.
- Recomputed baseline/parent/checkpoint development metrics, formal gates, both adapter inventories and tensor structures, epoch-two-only selection with no fallback, and exact selected-adapter reload reproduction.
- Exact run artifact inventory, completion/report/supervisor hashes, execution protocol binding, and the 7,200-second runtime bound.

The two-step tiny-model objective qualification is independently checked for its source/recipe/runtime bindings, finite recorded arithmetic, initial DPO loss of log(2), complete trainable-tensor change counts, and research boundaries. Its recorded gradient-direction assertion is a qualification claim, not a fresh gradient computation by this read-only verifier.

## Limits and acceptance

Local hashes and coherent receipts establish evidence consistency. They do not provide an external attestation of physical execution or cryptographically prove wall-clock ordering against an adversary who can replace the entire evidence directory. Frozen source inspection and the optimizer/cache receipts establish the intended ordering within this bounded runner.

`verified: true` and `automaticEligibilityPassed: true` do not establish semantic acceptance. `validationPassed`, `semanticQualityValidated`, `finalQualityValidated`, and `productionEligible` remain false; `testOpened` remains false. Blinded semantic review, educator review, final evaluation authorization, and student outcomes are separate gates.

## Tests

```text
python -m unittest discover -s scripts/learning -p test_qwen3_preference_verifier.py -v
```

The tests use synthetic token/log-probability/qualification fixtures and the independently authored preference rows. They exercise mutations of masking, reference bindings and sums, objective terms, shuffled pair order, cumulative accounting, audit coverage and approval, path mapping, numerical qualification, and final-epoch selection. No GPU training or final evaluation data is used.
