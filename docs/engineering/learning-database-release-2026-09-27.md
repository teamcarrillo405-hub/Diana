# Learning database release: September 27, 2026

## Authorization and scope

The user explicitly approved the database rollout after the previous automatic approval review blocked it. This release applies the two specifically identified migrations to the production-linked Diana Supabase project `oitipayrriupcitgmzju`. It does not apply the separate educator-review migration chain or enable experimental models. September 28 migration timestamps below are UTC; the release occurred September 27 in America/Los_Angeles.

| Change | Applied migration version | Result |
| --- | --- | --- |
| Recognition provenance guard | `20260928043131` | Applied successfully |
| Experiment provider usage receipts | `20260928043147` | Applied successfully |

The local migration files were renamed to match these actual remote ledger versions. SHA-256 before and after each rename was identical. No applied migration SQL was edited. The historical September 26 handoff and release documents remain unchanged as records of the earlier blocked state.

| File | Unchanged SHA-256 |
| --- | --- |
| `20260928043131_learning_recognition_provenance_guard.sql` | `7bccfbb149f987ca8d625a858077ee1830f2ec98843cbb1e759b6d2dc4cf118c` |
| `20260928043147_learning_experiment_usage_receipts.sql` | `a498c2ab32d8a790ea6c1013fbb09af51f23ef0ab790c77dad59e93c928b5227` |

## Database verification

The rollout operator executed `scripts/learning/verify-production-learning-rollout.sql` after applying the migrations. Catalog results matched the reviewed expectations:

- Provider receipt table exists with row-level security enabled.
- Anonymous and authenticated roles cannot read receipts or execute accounting RPCs.
- Service role can select receipts and execute the three bounded accounting RPCs; direct table writes remain unavailable.
- Recognition readiness is callable by authenticated users. The private trigger function, schema and key table remain inaccessible to anonymous and authenticated users.
- The recognition provenance trigger is enabled on `learning_problem_revisions` before inserts.

The bounded transaction in `scripts/learning/probe-production-recognition-rollback.sql` used the existing synthetic QA owner and class. A typed answer and a student-entered voice draft saved successfully. An unsigned machine-origin response was rejected with `recognition_proof_required` and left no parent record. The transaction rolled back all synthetic notebook writes. No auth identities, signing keys, real student records, or monetary reservations were changed by this probe.

The signing key was not provisioned by this release. Browser recognition continues to use student-confirmed drafts. Trusted local-server recognition still needs its separate reviewed configuration and matching key before it can issue verifiable machine claims.

## Edge deployment

After database verification, `learning-experiment` version **8** became **ACTIVE**, with `verify_jwt=true`. Its reported deployment source hash is:

`b0afd98abcafee7c743876a363497021248fec0da5f103c673ff12c1d55b2676`

The deployed source closure includes the new `experiment-accounting.ts` helper. Consumed provider usage is recorded with cents settlement before output moderation can withhold an answer. The deployment preserves operator authorization, synthetic-input allowlists, safety checks, token budgets, monetary ceilings, and current-price requirements. No paid provider request or model activation is implied by this release.

The rollout operator's unauthenticated POST to the deployed Edge Function returned HTTP 401 with `UNAUTHORIZED_NO_AUTH_HEADER`. This confirms that request did not enter an authenticated experiment flow. No paid provider request was used as a health check.

A fresh download of the deployed v8 source closure matched all eleven local deployment files exactly, with no missing or differing file. JWT verification and ACTIVE status were rechecked at the same time.

## Local verification and remaining boundaries

- Before deployment review: 15 focused tests passed across recognition, recognition provenance and experiment accounting.
- After local migration filename reconciliation: 18 tests passed across `migration-release.test.ts`, `experiment-accounting.test.ts`, and `recognition-provenance.test.ts`. The expected forward-migration list remains chronologically sorted and matches the local files.
- The existing isolated PostgreSQL accounting and recognition suites remain local-only fixtures. They were not run against production.
- The historical one-cent uncertain experiment hold remains unchanged. No historical usage or price metadata was invented to settle it.
- `learning_response_review_delivery`, `learning_response_review_seal`, and `learning_response_review_invitations` remain outside this approved release and are not prerequisites for it.
- Curriculum completeness, educator validation, representative recognition accuracy and a release-qualified fine-tuned tutor require their own evidence. This database rollout does not mark those goals complete.
