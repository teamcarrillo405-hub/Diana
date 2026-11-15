# Prospective final evaluation for matched SFT

This document describes prepared support for run 010. Implementation and synthetic tests do not establish development acceptance or authorize opening the sealed final population.

`evaluate_qwen3_final.py` now uses the matched SFT runner's unchanged run-009 prompt and seed 81173. `verified_development` calls the independent `verify_qwen3_matched_sft.py` reader. Only an automatically eligible, independently verified run-010 epoch-three adapter with exact development reload identity can reach semantic review verification. Earlier epochs cannot substitute for epoch three.

## Prerequisites

Before a final freeze, retain the completed development report, independent verification receipt, all checkpoints and two fresh independently saved blinded reviews. The reviews must bind the selected epoch-three response strings and the paired untouched base. Any disputes require independent dispute-only adjudication. A case both primary reviewers reject remains a failure. At least 46/48 complete responses and zero fabricated responses are required. The selected checkpoint must be committed before proceeding with the final evaluation.

The semantic bundle retains distinct reviewer identities, review file hashes, affirmative independent-authorship and saved-before-unblinding attestations, and chronology. Software validates those records; it cannot independently prove human or agent independence. The final evaluator does not convert automatic development eligibility or reduced loss into semantic acceptance.

## Fitting ancestry and comparison exposure

The fitting chain is exactly:

```text
run 010: 300 chosen targets
  → run 008: 200 records
  → run 007: 600 records
  → run 006: 440 records
```

Every stage also exposes its 48 development records. Run 009 is separately identified as a same-data comparison sibling, with 300 training and 48 development records. It is not an initialization ancestor. Its training and development rows must be exactly equal to run 010's respective inputs.

The final freeze writes `comparison-exposure.json`, schema `diana-qwen3-final-comparison-exposure-v1`, and binds its contents and byte hash in the final protocol. The receipt includes:

- The local run-009 sibling path and immutable report, protocol and independent verification receipt hashes.
- Frozen training and development file hashes, canonical row hashes and exact 300/48 counts.
- `sameTrainingData: true` and `initializationAncestor: false`.

The reader reconstructs this evidence from run 010's frozen comparator commitment and the preserved run-009 inputs. The final protocol's development-file inventory additionally binds `comparator-evidence.json` and `comparator-verification.json`. Replacing the comparison with a parent, changing its role, altering its data or changing its verification receipt stops verification.

After the authorized final opening, overlap checks cover both the fitting chain and the separately recorded comparison exposure by ID, source and source/question pair. `overlap-counts.json` retains the combined counts plus `fittingAncestry` and `comparisonExposure` groups. All counts must be zero. Repeated same-data exposure does not become additional unique training examples.

## Seal and one-use execution

The original final manifest, audit, source and canonical-row seals remain fixed. Freeze hashes the opaque final source without importing its records. The exclusive global dataset claim is created before the worker can import final cases. An existing claim prevents another evaluation attempt across output directories, including after interruption. Never silently reuse a consumed final set.

The evaluator retains three inference arms: untouched base, selected adapter and selected adapter reload. Each has 100 cases, greedy decoding, the fixed prompt, no training and zero optimizer steps. The adapter and reload must produce identical raw strings and generated token lists. The existing offline Linux supervisor, 7,200-second ceiling and process-group cleanup remain active.

The unchanged final protocol/report schemas are `diana-qwen3-final-protocol-v1` and `diana-qwen3-final-evaluation-v1`, with the new required comparison exposure fields and artifact. Final reports remain research-only, production-ineligible and semantically unvalidated until independent final review establishes at least 95/100 complete responses and zero fabricated responses. No automatic metric can grant that acceptance.

## Operator commands after all prerequisites pass

These commands are prospective. Use the existing approved runtime and a new final-output directory. Do not invoke `_worker` directly.

```bash
"$RUNTIME_PYTHON" -m unittest discover -s scripts/learning -p 'test_evaluate_qwen3_final.py'
"$RUNTIME_PYTHON" -m unittest discover -s scripts/learning -p 'test_qwen3_final_verifier.py'

"$RUNTIME_PYTHON" scripts/learning/evaluate_qwen3_final.py freeze \
  --development-run "$RUN_010" \
  --review-bundle "$ACCEPTED_DEVELOPMENT_REVIEW_BUNDLE" \
  --output "$NEW_FINAL_RUN"

"$RUNTIME_PYTHON" scripts/learning/evaluate_qwen3_final.py run \
  --output "$NEW_FINAL_RUN" \
  --protocol-sha256 "$REVIEWED_FINAL_PROTOCOL_SHA256"
```

Use the actual new final protocol's reviewed hash. Keep final review and independent final verification separate from writer execution. Preparing this support does not open, freeze, evaluate or consume the final set.
