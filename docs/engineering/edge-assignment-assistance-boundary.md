# Direct Edge assignment assistance boundary

Status: locally implemented and tested; all 23 remote-based candidates prepared. No Edge deployment, flag activation, or provider requests were performed for this work.

## Contract

`DIANA_DURABLE_TASK_ASSISTANCE_ENABLED=true` requires an authenticated, durable `learning_begin_assignment_assistance` receipt before assignment help invokes its model, returns a model adapter fallback, starts an SSE response, or releases a realtime client secret. The existing database foundation must also be active. The staged database intentionally rejects protected help until activation.

The receipt binds owner, assignment, feature-specific request UUID, full effective prompt/configuration digest, channel and teaching kind. No raw source is persisted in the assistance ledger. The authenticated user client writes receipts; the service client never writes them. Replayed keys with changed content fail through the SQL identity contract. Receipt failure stops output. Ordinary authorship/cost logging keeps its existing behavior.

`assignment-help-receipt.ts` validates explicit assignment UUIDs and resolves actual owned note IDs back to assignment IDs through the authenticated database client. A synthesis using multiple assignment notes must obtain all receipts before invocation. The payload binds the complete sorted assignment set and source-note IDs; partial receipt success remains conservatively recorded if a later receipt fails. `note-synthesis` supplies the IDs of notes actually selected by its server query.

Assignment-review, assignment-realtime and assignment-realtime-reason require assignment scope. Study artifacts require an assignment UUID for assignment sources, or a verified note UUID for note sources (`noteId`, or the `sourceId` alias). General or course-only tools can remain explicitly unscoped. They receive no fabricated assignment receipt and cannot establish protected independent assignment evidence. Omitting the flag retains the prior path. This boundary cannot identify an assignment copied into an unscoped free-text request, and does not claim to do so; the existing generic AI-use/mastery guard remains necessary. Missing or malformed owned-note lookup results never degrade into unscoped help.

## Local coverage

| Path | Boundary |
| --- | --- |
| math-step, math-example, math-scaffold | Instructional adapter invocation; math photo source extraction retains its existing extraction path |
| reading-scaffold, reading-level, vocab-hover | Instructional adapter invocation |
| writing-aid, writing-cowrite | Instructional adapter invocation |
| science-scaffold, history-scaffold, cs-scaffold, language-scaffold | Text and applicable image/map instructional invocation |
| arts-scaffold, health-scaffold, ap-scaffold | Instructional adapter invocation |
| citation-gen, task-breakdown, visual-tools | Citation, task-guide and visual instructional invocation |
| study-artifacts, assignment-review, note-synthesis | Artifact/review invocation and actual selected-note scope |
| assignment-realtime-reason | Reasoning invocation |
| assignment-realtime | Exact complete session recipe before credential issuance |

`assignment-help-boundary.ts` delegates to the existing local homework adapter. It does not replace that adapter or change its model policy. `assignment-help-receipt.ts` is independent of model selection and can wrap deployed legacy calls without importing newer adapters. Source extraction and note tagging are not treated as pedagogical responses by this slice. Study Buddy and Next-local assistance are owned by the other integration slices.

## Live-source comparison and staged candidates

Read-only `get_edge_function` inspection of project `oitipayrriupcitgmzju` retrieved these complete deployed closures:

| Function | Observed version | JWT verification | Candidate scope |
| --- | --- | --- | --- |
| math-step | 23 | enabled | Existing text-model call wrapped; original SSE behavior retained |
| history-scaffold | 28 | enabled | Existing text call plus original map request guarded |
| assignment-realtime | 7 | enabled | Original complete realtime recipe guarded before secret issuance |
| math-example | 21 | enabled | Existing text-model call |
| math-scaffold | 28 | enabled | Existing instruction call after unchanged source-photo extraction |
| reading-scaffold | 26 | enabled | Existing text-model call |
| reading-level, vocab-hover | 21 | enabled | Existing text-model calls and downstream fallbacks |
| writing-aid | 26 | enabled | Existing text-model call |
| writing-cowrite | 22 | enabled | Existing text-model call |
| science-scaffold, cs-scaffold, language-scaffold | 27 | enabled | Existing text-model calls |
| arts-scaffold, health-scaffold, ap-scaffold | 27 | enabled | Existing text-model calls |
| citation-gen | 20 | enabled | Existing text-model call |
| study-artifacts | 29 | enabled | Existing adapter call and downstream scaffold fallback |
| assignment-review | 18 | enabled | Existing review call with actual retrieved source chunks |
| assignment-realtime-reason | 7 | enabled | Existing adapter call |
| task-breakdown | 22 | enabled | Existing text-model call |
| note-synthesis | 24 | enabled | Existing adapter and downstream source fallback, verified selected notes |
| visual-tools | 23 | enabled | Existing text and diagram-image calls |

The `remote-source.json` files preserve exact fetched source strings, including deployed CRLF. The generator restores baseline bytes from those snapshots and only normalizes the changed entry for patching. Tests verify every baseline hash against the original fetched content. Saved evidence is `artifacts/learning-engine/research/edge-assistance-candidates-v1/<function>/baseline`, with deployed metadata alongside. Each `candidate` directory contains that function's complete closure. `manifest.json` binds every file by SHA-256, includes the remote bundle SHA and version, and identifies inherited local differences. It explicitly records no deployment or activation.

The deployed math/history functions use the prior `callSafeStudentTextModel` stack. Their local working-tree entries already used a newer homework adapter before this boundary was added. The deployed dependency files also differ from local safety, authentication and model files. Deploying the entire local closure would therefore change unrelated behavior. These candidates change only the deployed entry plus new boundary files. Every existing non-entry dependency remains byte-for-byte identical to its saved remote baseline. No new homework adapter is introduced. Study-artifacts, note-synthesis and assignment-realtime-reason already use deployed homework adapters; those exact dependency files are retained.

For history map mode, the candidate preserves the deployed `gpt-4o` request, messages, image detail, token cap, JSON format, and usage callback. For realtime, the existing session model selection, voice, transcription, tools, turn detection, truncation, expiry and token cap remain identical. The candidate records the actual recipe object subsequently serialized for the provider. For legacy text calls, it preserves the exact original argument object and invokes the same deployed helper. There is no unavoidable provider-routing change in these 23 candidates.

`scripts/learning/prepare-edge-assistance-candidates.mjs` regenerates candidates offline from the saved baselines and the receipt helper, checks that existing dependencies are unchanged, and rewrites the hash manifest. Regeneration changes the reviewable hashes and requires a new review before use.

## Verification

`lib/security/assignment-help-edge-boundary.test.ts`: 17 passing tests using real bundled boundary code with mocked authentication, database and provider IO. Includes disabled behavior, exact digest, stable request identity, malformed receipts, owner mismatch, note resolution, multi-assignment failure, legitimate unscoped help and bundling of all 23 local entries.

`lib/security/assignment-help-remote-candidates.test.ts`: 83 passing tests executing actual saved baseline and candidate entry code with stub IO. Covers every function, math SSE, history and diagram images, photo extraction followed by gated instruction, note-derived artifacts, synthesis and actual source-chunk review, and realtime credentials. Tests compare provider argument objects or full HTTP options/bodies and successful response bytes against the deployed baseline; hold the receipt promise pending to prove no invocation occurs; reconstruct the exact receipt digest; reject mismatched receipts before any output or secret; and verify all candidate/dependency file hashes.

Repository TypeScript check passes. ESLint passes on the new boundary helpers and tests. Existing adapter-policy source assertions were updated narrowly to require the scoped wrapper and verify its delegation to the shared adapter. The combined four-suite run passes all 115 tests; root also resolved the separate Study Buddy logging assertion.

These tests stub auth, database and provider IO and do not demonstrate live RLS, deployed receipt RPC availability, model quality or a successful live invocation. Existing authenticated helper signatures were checked against the saved deployed source. No paid API or local model was called.

## Rollout boundary

All 23 exact candidates were deployed on September 29 after the user's outstanding-work continuation and acceptance by the original deployment connector. Each baseline version/bundle hash was refreshed immediately before its deployment. Every resulting remote file was fetched and compared against the manifest: 250 matches, zero missing/changed/extra files. JWT verification remains enabled for every function, all 23 unauthenticated POST checks return 401, and fresh secret-name inspection confirms the assistance flag is absent. No provider calls or model/prompt changes occurred. The immutable manifest remains a pre-deployment artifact; `artifacts/learning-engine/rollouts/edge-assistance-stage-002/rollout.json` records the deployed versions and hashes. Independent reconciliation is in `artifacts/learning-engine/release/edge-assistance-independent-final-reconciliation-20260929-v2.json`. Functions outside this 23-function inventory require a separate coverage audit.

Activation remains a separate coordinated gate: direct Edge coverage, Next-local output boundaries, trusted transfer provisioning, database enforcement and rollout smoke evidence must agree. Educator validity and representative curriculum coverage are not established by receipt engineering. No fabricated reviewed transfer or inferred task identity is introduced here.
