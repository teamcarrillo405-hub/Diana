# Tutoring release candidate, September 29, 2026 UTC

## Scope and status

Current production is `dpl_HBXKsD78zJXyKB5iHFJHvfbmPiak` at
`https://diana-umber.vercel.app`, READY after the reviewed disclosure/policy release.
All 2,913 deployed source files match the frozen candidate, with no missing,
changed or extra files. Login and CSP checks passed. Authenticated QA opened the
saved quiz, restored its existing three responses and assignment link, and loaded
Recall's empty queue. No inference request or review submission was made.

This continuation implements assistance boundaries across the current application,
23 direct tutoring Edge Functions, and queued voice execution. Educator validation
is deferred at the user's request. It is not recorded as completed or substituted
with AI credentials.

The initial 34-file web release was deployed as
`dpl_7kuQjEpjxitMzXf7X6Y1cB9ZVdub`; all 2,893 source hashes and the login CSP check
passed. It has been superseded by the reviewed worker execution web release,
`dpl_7J1BfiVSyooabxm1UWonRK7X6Vc2`, which was verified before the current release.
Its 2,903 deployed files matched the frozen candidate;
one expected SQL test fixture was excluded by the inherited `tests/` upload rule.
The dry-run receipt reports 2,904 files but also lists this SQL fixture in its
ignored entries; that summary count did not establish the final uploaded inventory.
The verifier accepts only this named nonruntime exclusion and still reports one
missing file. No application import, build command or function trace references
the excluded SQL fixture. Login, CSP and production alias checks passed. The authenticated
Algebra workspace reloads successfully, and credential-free claim, authorize and
complete requests each return 401 without provider execution.
The 23-function Edge release is now deployed and verified; assistance enforcement remains off.
An isolated application preview was deployed
from the frozen manifest and all 2,893 remote source hashes matched. Its first
sign-in check exposed a preview-only configuration defect: a leading U+FEFF in
the public Supabase URL was trimmed by the client but excluded the intended host
from the generated CSP. The preview setting was corrected to the existing intended
URL; production settings, credentials and CSP code were unchanged. A rebuild of
the same frozen source is tracked separately from production rollout.

Automatic approval review rejected the first Edge deployment because it required
approval for the exact production bundle. That attempt changed no function. After
the user requested continuation of the explicitly listed outstanding release, the
original deployment connector accepted the retry. No alternate deployment method
was used to bypass review. Each of the 23 live versions was checked immediately
before mutation against the frozen baseline and then fetched again for exact
source comparison. All 250 files match, with zero missing, changed or extra files;
all 23 functions are ACTIVE and retain JWT verification. Independent live metadata
reconciliation passed. All 23 unauthenticated POST checks returned 401. Fresh
secret-name inspection confirms the assistance flag remains absent. No model was
called and no model/prompt selection changed.

Evidence: `artifacts/learning-engine/rollouts/edge-assistance-stage-002/rollout.json`,
`unauthenticated-postflight.json` in that directory, and
`artifacts/learning-engine/release/edge-assistance-independent-final-reconciliation-20260929-v2.json`.
The frozen candidate manifest retains its original pre-deployment status as
historical evidence; the rollout receipt records the subsequent deployment.

## Application changes

- Bounded initial algebra hints run locally for an owned, confirmed integer linear
  equation with empty saved work. Existing work, conversation, source conflicts or
  unsupported questions cannot silently enter that path.
- Eligible local hints disable semantic embedding fallback and report actual local
  origin and zero provider tokens. The response asks a next-step question without
  repeating its first instruction.
- Study Buddy's server-only provider-disable setting permits zero-provider testing
  and returns an explicit capability-unavailable result for broader requests.
- Assignment, note-linked reading, study artifacts, realtime and local fallback
  integrations preserve actual assignment scope and await assistance receipts when
  enforcement is enabled. Receipt failure does not release a fallback answer.
- Stream responses preserve origin/routing metadata and source-conflict clarification.
- Queued voice jobs recheck current consent, deletion state and class policy before
  transcript dispatch, before inference, and before result release.
- Voice status reads use authenticated owner and feature constraints on the service
  query. A separate forward migration removes direct raw-result/payload access,
  preserves owner-scoped status columns and retains service-worker access.

The 34-file application overlay is based on the recovered production deployment
`dpl_ECu1cE4rJ5q9GKKq9AMiUjH6nYZJ`, not the entire inherited dirty checkout.
All 2,881 baseline files were verified against Vercel content identities and
independently hashed. An independent agent reviewed the exact overlay and found no
blocking issue; deployed model adapters, model choices, prompts and token limits
remain unchanged. Final build receipts are stored with the release artifacts.

## Edge changes

All 23 functions have exact remote-derived candidates. The manifest binds 250 files;
existing non-entry dependencies match their deployed bytes, including line endings.
New boundaries wrap the same deployed provider recipes. Models and their prompts
are preserved. JWT verification remains enabled.

The read-only preflight matched all 23 baseline versions and source closures.
The subsequent deployment and postflight are recorded above: 23 deployed versions,
250 exact file matches and 23 credential-free rejections. The assistance activation
secret remains absent. These checks do not establish a successful paid authenticated
inference result or enabled assistance enforcement. A fresh local regression run
passed 100 actual-entry/boundary tests; the independent review separately passed
the overlapping 83 actual-candidate tests.

## Verification

- Final isolated application candidate: 315 tests passed across 28 scoped files.
  Temporary QA files were restored afterward; they are not in the runtime overlay.
  The production build passed lint, type checks, all 136 static pages and the strict
  function trace gate: 176 routes, maximum 39,720,236 bytes against a 240,000,000-byte
  limit, with no failing traces or public assets included in server traces.
- The final Vercel preview dry run matched all 2,893 source files and 429,548,079 bytes
  to the recovered baseline plus the approved 34-file overlay. Every upload file's
  SHA1 and SHA256 was verified; environment files, docs, artifacts and local build
  dependencies were excluded. No deployment was created by this verification.
- Local algebra, Study Buddy authorization and provider boundary sweep: 86 tests
  passed. After the next-question wording adjustment, the two affected suites
  passed all 79 tests. These overlapping results are not additive.
- Edge candidate and boundary verification: 115 tests passed, including actual
  saved baseline/candidate code with stubbed provider IO and exact-recipe comparisons.
- Worker release/claim/runner/scope/migration checks and queue/completion checks:
  51 tests passed. Repository typecheck and scoped lint passed at that checkpoint.
- The exact new SQL migration passed an isolated PostgreSQL 16 transaction that
  reproduced table, column and PUBLIC grants. Owner status visibility and service
  reads were retained; other-owner rows, raw payloads/results, anonymous access and
  whole-row projections were denied. The fixture was rolled back and the server stopped.
- A live read-only catalog audit found no worker result views or accessible alternate
  function. `claim_worker_job` execution is restricted to the service role.
- In the signed-in synthetic QA account, two manually created problems produced
  `Subtract 6 from both sides` and `Add 8 to both sides` while Study Buddy provider
  calls were disabled. The final response displayed `Next move: What equation
  remains?`. The first problem and its conversation survived reload. This tested
  local help and persistence, not independent learning or representative accuracy.
- The offline local gate passed 9 chapters, 13 checks and 34 skills; the course gate
  passed 67 collections, 112 authored activities and 67 competencies, with zero
  network attempts. Those counts do not mean complete disciplinary courses.

## Coordinated release order

1. Completed: the original Edge deployment connector accepted the retry after the
   user's continuation of the explicitly listed outstanding release.
2. Completed: refreshed live identities, deployed only the reviewed complete
   candidates, compared all deployed files and verified unauthenticated denial.
   Assistance flags remain off.
3. Completed: published the explicit scoped application candidates after strict
   build and source inventory checks. Deployment readiness and the recorded
   authenticated canary journeys passed.
4. Completed: applied the exact result-access SQL after the compatible status
   route became live. Supabase assigned version `20260929034718`; the workspace
   migration is now `20260929034718_worker_result_release_boundary.sql`. Its SHA256
   remains `063ab56b715321526570c0d9a1830217e177756dd6c9142d4ae495347dbda40a`.
   Live postflight confirms authenticated raw input/result and whole-table SELECT
   are denied, owner status remains granted, anon status/result are denied, and
   service result access remains granted. Earlier frozen manifests retain the
   pre-deployment expected filename `20260929040000` as historical evidence.
5. Ship the worker-runner check in its actual worker image. The Next claim boundary
   protects payload dispatch once deployed, but does not prove an old worker image
   contains the new pre-inference check.
6. Keep global assistance activation separate until all help paths and an actual
   operator-reviewed fresh-transfer workflow are verified. A new UUID alone does
   not establish independent work.

## Worker execution continuation

The reviewed execution-capability migration was applied as
`20260929035711_worker_execution_capabilities`, with unchanged reviewed SQL bytes
(`be7a0ce1a852d1a00233e1eb1dd18bf44a368ea6f119772a727a98b7e394b0bf`).
Hosted postflight matched the reviewed function definition, confirmed RLS,
and confirmed that the execution table and privileged function are restricted
to postgres and service_role. The earlier prepared version `20260929100000`
remains in frozen evidence as a historical identifier.

The web release adds one-use, lease-bound execution permits, current consent and
class-policy checks under database locks, bounded budget reservations, and
idempotent completion. The replica environment allowlist excludes database and
provider credentials. Tests reproduced the original consent-revocation race and
verified its correction. The combined candidate passed 410 tests in 41 files,
plus seven migration-inventory checks; its production build passed 137 static
pages and 177 function traces, maximum 39,722,848 bytes against 240,000,000.

This web and database release does not deploy the worker replica image or enable
managed inference. A configured worker host and deployment credential were not
found. Managed-worker, sidecar and durable-assistance activation remain off.

Saved quiz disclosure, legacy recall-card provenance and explicit Today assignment
scope were released in `dpl_HBXKsD78zJXyKB5iHFJHvfbmPiak` after the worker release.
Independent review also identified a shared kernel that returned default trust
without reading assignment/class policy, and a reading fallback that converted
explicit remote denials into local help. The deployed correction reads and validates
the owned stored policy and refuses fallback for all explicit HTTP error responses,
including 503 authorization/account-check failures. Reading and deterministic
assignment review also check actual consent, age eligibility and deletion status
before dispatch or local output. The exact 18-file change received independent
review and passed 102 tests; the isolated candidate with two additional QA files
passed 158 tests across ten files. These are overlapping counts.

The first isolated test invocation incorrectly overrode a test-owned provider flag;
the corrected runner passed without modifying the tests to weaken their checks.
The first isolated build used a dependency junction that the strict trace gate
rejected. Replacing the junction with an existing local dependency copy resolved
that error. Both failed receipts remain available. The corrected local build and
Vercel production build passed all 137 static pages and 177 trace checks. The live
build's maximum trace was 39,709,236 bytes against the unchanged 240,000,000 limit.
There were no new model downloads, paid inference calls or activation flag changes.

Durable assistance tracking remains disabled pending coordinated activation.
The release provides the checks needed when enabled; the browser canary does not
prove a live enabled receipt workflow. Generic Today realtime still relies on
prompt guidance and automatic tool selection for future turns. Explicit scoped
HTTP dispatch/session creation is guarded, but universal per-turn receipt capture
or direct speech interception is not claimed.

Saved-content receipt checks describe the guarded page paths. They do not erase
previously disclosed content, revoke existing offline packs, or remove the owner's
raw database/export access. No active reader of the legacy flashcard answer cache
was found. Those limits remain part of any eventual assistance-activation review.

## Remaining research boundaries

The completed API development experiment remains 95/96 passing responses (98.96%)
on authored development cases. Its $40 approval was consumed, with $5.12 accounted.
It does not establish 95% production grounding. All tested local language-model
adapters remain rejected and inactive. No new training, model download, model
activation or paid inference was performed in this continuation.

Further qualification needs a separately approved integrated disjoint evaluation,
then gap-driven training with new provenance-bound examples and an unchanged-base
comparison. No prior sealed test was executed or modified. A metadata search by
the planning agent accidentally exposed two case lines from the earlier sealed
independent evaluation module, plus schema lines from the newer fresh module.
The separate exposure audit records exact paths and lines without reproducing
case content. No fresh cases were authored afterward; future authors and reviewers
must honor that disclosure rather than claim every prior evaluator was unread.
Educator validation,
representative recognition samples and consented learning-effect evidence remain
distinct external evidence requirements; the educator portion is currently deferred.

## Evidence locations

- `artifacts/learning-engine/release/production-baseline-20260927/manifest.json`
- `artifacts/learning-engine/release/tutoring-candidate-ready-20260929.json`
- `artifacts/learning-engine/release/tutoring-candidate-ready-20260929.json.sha256`
- `artifacts/learning-engine/release/tutoring-overlay-approved-20260929-v3.json`
- `artifacts/learning-engine/release/tutoring-candidate-test-receipt-20260929-final.json`
- `artifacts/learning-engine/release/tutoring-candidate-test-results-20260929-final.json`
- `artifacts/learning-engine/release/tutoring-candidate-build-20260929-final.json`
- `artifacts/learning-engine/release/tutoring-candidate-deploy-inputs-20260929-final.json`
- `artifacts/learning-engine/research/edge-assistance-candidates-v1/manifest.json`
- `artifacts/learning-engine/rollouts/edge-assistance-stage-001/rollout.json`
- `artifacts/learning-engine/rollouts/edge-assistance-stage-001/rollback-reference.json`
- `supabase/tests/worker_result_release_boundary.sql`
- `artifacts/learning-engine/release/preview-source-parity-20260929.json`
- `artifacts/learning-engine/release/preview-auth-csp-root-cause-20260929.json`
- `docs/engineering/integrated-grounding-evaluation-plan.md`
- `docs/engineering/integrated-grounding-exposure-audit.json`
- `artifacts/learning-engine/release/worker-production-verification-20260929.json`
- `artifacts/learning-engine/release/worker-production-denial-canary-20260929.json`
- `artifacts/learning-engine/release/worker-production-authenticated-canary-20260929.json`
- `artifacts/learning-engine/release/worker-execution-hosted-postflight-20260929.json`
- `artifacts/learning-engine/release/disclosure-ready-20260929-v3.json`
- `artifacts/learning-engine/release/assistance-overlay-independent-review-20260929-v2.json`
- `artifacts/learning-engine/release/disclosure-production-verification-dpl_HBXKsD78zJXyKB5iHFJHvfbmPiak.json`
