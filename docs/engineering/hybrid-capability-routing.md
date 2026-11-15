# Inactive capability registry and routing foundation

## Current implementation

`lib/learning-engine/capability-registry.ts` compiles the existing problem
specification variants and course `CAPABILITIES` into a read-only inventory.
Registry version is `diana-capability-registry-v1`. Entries record the actual
adapter implementation version, method, finite claim scope, declared limits,
source files and evaluator files. Local math limits come from
`LOCAL_SKILL_COVERAGE`; course limits come from the existing `CAPABILITIES`.
Runtime parsing and the existing checker still enforce the numerical bounds.

These entries are source contracts, not evaluator execution receipts. They
explicitly retain `executionVerified: false` and
`semanticQualityQualified: false`. A test filename is not proof that an
evaluation ran or that a tutoring method improves learning.

`lib/learning-engine/capability-router.ts` exports the pure asynchronous
`routeCapability(serverContext, request)` function and its input/output types.
Router version is `diana-capability-router-shadow-v1`. It invokes the existing
local or course tutor without network requests. Two API routes now invoke it
through the server-only shadow helper after their normal durable save; its
decision never selects or changes the student response.
The result always records inactive status, no provider call, no model
qualification, no production activation, no verified interpretation and no
knowledge/mastery eligibility.

## Input authority

The server context contains registry version, eligibility policy, the expected
owned record ID and version, and evidence state with source IDs, content
versions and origins. Requests contain either the existing local tutor input
or a versioned course activity plus the existing course response input.

An authenticated server resolver must establish ownership, policy, current
catalog identity, source hashes and confirmation status before calling this
function. Strict schema parsing cannot establish those facts from browser
JSON. The pure function is not an authorization endpoint. It accepts no
qualification record, model list, confidence score or API activation flag.
Unknown fields fail closed. A content hash supplied by a client is not trusted
evidence of that content or its ownership.

The expected record version must be resolved from current server storage,
including existing course activity validation and its version hash. The
router checks equality against that server value; it does not replace catalog
validation, recompute a course framework hash, or infer an exercise source
version from free text. Course and skill metadata remain presentation context,
not competence estimates or routing thresholds.

## Decision order and finite claims

1. Reject malformed context or denied eligibility.
2. Clarify missing/conflicting evidence, contradictory versions of one source,
   or unconfirmed model extraction.
3. Parse the existing request contract and verify current record identity,
   attempt identity, version and confirmation.
4. Look up the compiled capability; caller records cannot override it.
5. Run the bounded existing tutor. An unsupported specification or response
   goes to review. A registry entry cannot override the checker.
6. Emit only the applicable bounded observation or scaffold claim below.

| Route | Possible emitted claims | Meaning |
| --- | --- | --- |
| `unavailable` / `clarify` / `review` | None | No checked answer claim |
| `bounded_local_check` | `bounded_result_matches`, `bounded_result_needs_revision` | The existing checker compared this response within its stated bounds |
| `source_correspondence` | `source_correspondence_observed` | Quote-check observations exist, including missing/ambiguous matches; relevance or interpretation is not verified |
| `local_scaffold` | `scaffold_provided`, or none for saving | Existing guidance, rubric prompts or an authored example; no correctness judgment |

The full existing feedback is retained, including provisional educator-review
status and its limitations. A matching result on an unreviewed reference still
requires that review. Saved work emits no assessment claim. All decisions
retain the source provenance records and selected capability/version.

There is no grade cutoff and no probability/confidence label. The same
supported operation can be used at any course band; an unsupported operation
remains unsupported at every band. The checker validates operations and
representations, not the learner's age or presumed ability.

## Language model qualification and later integration

`QUALIFIED_LANGUAGE_MODELS` is a frozen empty array. There is no provider route,
automatic API fallback, or way to qualify a model through this API. API
eligibility would describe permission to request help, not correctness.

Before adding any model qualification, independently validate receipts binding
the exact candidate weights/model, prompt, tokenizer/configuration, source
manifest, evaluator version, corpus hashes and scoped operation to baseline
and disjoint held-out evidence. Record attempted, completed, error and
fabrication counts with fixed denominators and review identities. Invalidate
qualification when those identities or bounds change. A fabricated `passed`
field, a source path, or a SHA without independently checked bytes supplies no
qualification. The 96-case development benchmark alone cannot qualify a model.
Activation remains a separately authorized operation.

Only a later reviewed change may make the router authoritative. This
foundation does not assert production readiness.

## Server shadow observation

The existing `/api/learning/tutor` and `/api/learning/course-practice` response
paths invoke `capability-shadow.ts` after authorization, owned record/source
resolution, the original tutor/session call and a successful durable save.
The local context uses the stored exercise version, saved state and owned
document metadata/page interpretations. The course context uses the validated
catalog activity, saved versioned session and content hashes of its sources.
No request can supply a capability qualification or shadow routing context.
Policy-denied and unsuccessful-save requests emit no event. Course starts
continue to return their existing state without a shadow tutor call.

The helper recomputes pure tutor feedback once for comparison. It does not
call session reducers, increment support counts, save a second state or
dispatch a provider. A bounded `learning_capability_shadow` server log records
router/registry version, adapter, route/reason, claim scope, source count and a
feedback equality Boolean. It contains no student, class, assignment or
source IDs; no content hashes, input/output text or raw exception messages.
The JSON response remains unchanged. Inspected clients parse the existing
state/feedback shape, and no routing metadata or technical wording reaches UI.

An unreadable attempted answer can lead the shadow router to recommend review
while the current tutor still supplies its normal hint. The log reports that
shadow decision; it does not suppress assistance. Comparison is observational,
not a model-quality or correctness score. Matching recomputed feedback does
not establish that its pedagogy is correct.

Logs are best-effort observability, not a durable research dataset. A logging
or shadow evaluation error cannot undo the already successful tutor save or
replace feedback. The helper may add bounded duplicate local computation and
latency. This stage neither introduces a database migration nor proves log
delivery, unique event counts, production deployment or learner outcomes.
Retries can create repeated observations while the existing request-ID save
mechanism preserves assistance semantics. Any future durable receipt design
needs explicit retention and deduplication policies.

## Verification

`npx vitest run lib/learning-engine/capability-router.test.ts` checks all actual
registry methods, all four course-band labels for every course method, exact
match/revision results, unsupported mathematical boundaries, stale and foreign
versions, source contradictions, policy denial, caller qualification forgery,
source/rubric claim limits and saved-work behavior. Each test spies on network
fetch and requires zero calls. TypeScript and ESLint check the new modules.

These are engineering checks for the routing boundary, not independent
educator validation or student-learning outcome evidence.

The tutor and course-practice route tests also execute the real shadow router
with mocked storage. They verify unchanged response fields, single durable
save, one assistance increment, owned-record lookups, no observation before
successful save, no sensitive content in logs, and successful student responses
when the logger throws.
