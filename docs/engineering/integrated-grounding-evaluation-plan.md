# Integrated retrieval and teaching evaluation

## Decision and present status

The next research step is an **offline full-pipeline harness and exclusion registry**, followed by independently authored and reviewed evaluation families. Do not run another source-in-prompt benchmark and call it retrieval validation. Do not run models, author held-out cases, open an existing final set, or change deployed routing under this specification. Model choice, input/output ceilings, endpoint, quote and approval belong to a later executable freeze after the harness and corpus audit exist.

This is a proposed engineering protocol. It contains no newly authored evaluation cases, reviewer attestations, new final-set seal or claim of educator validity. The author's accidental prior-test search exposure is recorded without case content in `integrated-grounding-exposure-audit.json`. That agent is ineligible to author the fresh held-out families or attest fresh-context review. Metadata distinguishes the older v3 100-case test content exposure from constructor-only exposure in the newer Qwen3 final module; neither file is a source for this evaluation.

## Supported scopes and claims

| Scope | Available path | Claim an evaluation could support |
| --- | --- | --- |
| Owned assignment, confirmed text, fixed document versions | `retrieveForAssignment` in `lib/learning-engine/server.ts`; `retrieveCurriculum`; `curriculumPromptContext` | Authorized source selection, preserved anchors, and useful teaching from the evidence actually retrieved |
| Explicitly selected public reference | `retrieveTextbookForTutor` and `textbookTutorPromptContext` | Selected catalog book only: passage grounding and teaching, with public reference distinguished from the assigned problem |
| Broad grades 6 through advanced college tutoring | Six subjects/four bands in the existing synthetic development benchmark | An engineering coverage target; fresh source collections and family review are still needed for an integrated claim in each subject/band |
| OCR, handwriting, equations in figures, audio/voice | Extraction/confirmation boundaries and modality-specific tools | Separate strata only after source truth and confirmation events exist; text-only checks cannot qualify visual interpretation or spoken delivery |
| Hosted semantic fallback | `learning-embed`, then `learning_search`, only when validated local/reference evidence is absent | A separately identified, budgeted path; an offline lexical run cannot stand in for it |

The current textbook selection schema supports the pinned Precalculus catalog, chapters 1 through 9. It is not a general six-subject reference library. Public source rights, edition, PDF bytes and index hashes must remain pinned. Private assignment material must stay in its authorized owner/assignment domain. Use authored synthetic assignment material for the initial harness; actual student material would require a separate rights/consent workflow.

The first release claim is narrowly stated: **at least 95% complete-case success on the frozen integrated evaluation for the named supported scope**. It does not establish student learning gains, population accuracy, representative curriculum coverage or educator approval.

## Reusable code and its limits

| Existing code | Reuse | Required extension or limitation |
| --- | --- | --- |
| `lib/learning-engine/experiments.ts`: `validateEvaluationCorpus` | Unique IDs and document/template family split rejection | Trusts supplied family labels. Extend with reviewed family registry and connected-component exclusion; its existing math/reading/stress types are not the broad tutoring contract |
| `lib/learning-engine/curriculum.ts`: `structureDocument`, `validateDocumentAnchor` | Versioned source construction and exact anchor validation | Verify original source bytes and confirmed interpretation, not merely self-consistency of a generated index |
| `lib/learning-engine/retrieval.ts`: `retrieveCurriculum` | ACL/version filtering before ranking, exact problem selection, capped six results | Pure ranking is not the authenticated database/embedding pipeline |
| `lib/learning-engine/server.ts`: `retrieveForAssignment` | Actual version selection, lexical/exact lookup, anchor validation, optional reference, semantic fallback | Harness needs injected test IO or isolated owned fixtures; record actual branch and unavailable/conflict states |
| `lib/learning-engine/evaluation-pipeline.ts`: `evaluationContext`, `scoreEngineeringOutputs` | Engineering lexical smoke pattern and post-response algebra checks | Uses authored placeholder student state and lexical fallback. Quote containment alone is not passage relevance or semantic support |
| `lib/learning-engine/retrieval-benchmark.ts`: `assessTextbookRetrieval` | Run completeness, timings, chapter localization, negative retrieval and anchor diagnostics | Chapter hit is a topic proxy, not answerability; never use its success count as the 95% teaching numerator |
| `lib/learning-engine/textbook-pdf-audit.ts`: `auditRankedPdfResults` | Independently re-extract every returned PDF passage and compare text/offsets | Does not verify diagrams, equation layout or interpretation |
| `lib/learning-engine/retrieval-review.ts` | Blinded candidate pool, ranking-hidden mapping, question-status/relevance/support judgments | Existing qualified-reviewer registry rules must remain truthful; AI engineering review cannot impersonate an educator. Pool-relative recall is not whole-corpus recall |
| `lib/learning-engine/hybrid-benchmark-contract.ts` and `scripts/learning/hybrid-benchmark.ts` | Canonical hashing, frozen code closure, exact request identities, budget reservations, deployment parity, resumable settled-failure accounting | Existing contract fixes 96 source-in-prompt development inputs and a particular model/price policy. Build a new contract rather than mutate frozen plans or pretend this runner executes retrieval |
| `scripts/learning/review-hybrid-benchmark.ts` | Full-denominator packet, exact response hashes, independent first passes, disputed-dimension adjudication | New packet must include the full evidence trace and separate retrieval from teaching judgments; preserve existing frozen rubric unchanged |

Existing CLI entry points are `scripts/learning/benchmark-textbook-retrieval.ts`, `scripts/learning/review-textbook-retrieval.ts`, `scripts/learning/hybrid-benchmark.ts`, and `scripts/learning/review-hybrid-benchmark.ts`. None is currently an executable integrated release evaluation. Do not pass fresh cases to a frozen runner by replacing its corpus module.

## Development exclusions and disjoint-family enforcement

The following are **known exclusion seeds**, established from frozen metadata without reading case content. They are not a complete exclusion registry:

| Existing material | Frozen identity | Handling |
| --- | --- | --- |
| Broad 96-case synthetic development corpus | Canonical corpus `0bbffe2bd2b70db3ebe4995d1d3e6bc12affc951239ce3a73d7781d8be45762f`; source `80ee82fc2bee2d266369c2b91b17ce74bbcfcde2a7c1018a801e50788c75fc3e`, from `hybrid-benchmark-corpus-audit.json` and baseline-002 plan | All cases, source material, template variants and descendant revisions excluded from fresh families |
| Local 48-case development set | Canonical `a76d8bcb1735b9b721308cd925dfa187d44af4481c799307971e82e9f2b3aad5`; raw `0f09fa0804c4f1b6e50c5479a8463c96eeefbd678f6427a8ea9dab59bbc599ae`, from local-large-model-run-001 protocol | Preserve as development; include preceding training/development lineage in registry before freeze |
| Visible textbook topic probes | `lib/learning-engine/textbook-retrieval-probes.ts`, probe digest in retrieval reports | Visible engineering material, never a held-out claim; inventory hashes offline without publishing case text |
| Earlier and current sealed local tests | Existing manifests identify their module/canonical seals; exposure audit records exact metadata | Do not open, reuse, relabel or overwrite. Independent custodian supplies exclusion references; no held-out content needed in this plan |

Required registry schema: `artifactId`, raw and canonical digests with named serialization, role (`train`, `development`, `visible_probe`, `consumed_test`, `reserved_test`), lineage parents, exposure records, `documentFamilyId`, `taskTemplateFamilyId`, `reasoningFamilyId`, registered aliases, and reviewer decision references. Existing hashes identify bytes only. Two different digests can be the same problem family; a new identifier cannot establish independence.

Enforce the split in this order:

1. A custodian inventories all prior training, tuning, demonstrations, smoke cases, reviewed outputs and visible probes, including ancestors of the two seed datasets. Current registry incompleteness is a freeze blocker.
2. A fresh author proposes source/document families and teaching-task families without consulting existing final-case content. No author substitutes names, numbers or surface wording to manufacture novelty. References and rubrics stay separate from model-visible inputs.
3. A separate reviewer compares family-level derivation, solution structure, misconception pattern, source relationships and task demand against development. Record related/uncertain decisions and rationale. An uncertain relationship joins the exclusion component or blocks the candidate; it is not accepted by default.
4. A deterministic checker rejects exact/normalized text matches, repeated source assets, repeated provenance parents, family aliases crossing splits, and graph-connected lineage/template families across development and evaluation. A shared approved reference book is allowed only in a separately labeled same-source/generalization scope; it cannot support a document-disjoint claim. Semantic similarity is a screening signal, never a certificate of independence.
5. Freeze all connected family components to one partition. Save component IDs, graph digest, author/reviewer attestations, code hashes and overlap report. The independent custodian may run sealed comparisons and return opaque collision IDs/counts without exposing protected text to the model developer.

No reusable semantic-family classifier is currently established by these interfaces. `validateEvaluationCorpus` is the starting mechanical guard, not a substitute for steps 1 through 3. No fresh corpus size, family allocation or identities have been authored here.

## Full-pipeline execution contract

A case contains opaque ID; subject/band; source collection and version references; owner/assignment scope; student attempt; actual user request; supported modality; and family IDs. Private evaluation fields contain source sufficiency, admissible passage/claim supports, expected teaching action and rubric. Keep target-skill conditioning explicit if used; otherwise omit it from visible input. Descriptive IDs must not hint the intended diagnosis.

Run one frozen product configuration per declared condition. The primary condition executes retrieval and response delivery as the product does. A gold-evidence/oracle condition can diagnose retrieval loss but is separately labeled and never contributes to the primary numerator. Do not give the primary condition gold passages or expected answers. Use the same cases, student attempts and versioned source collections for any matched condition; cap cost for all conditions before authorization.

Required per-case trace, saved before moving to the next case:

1. **Ingestion:** original asset digest, permitted use, page text/interpretation and confirmation status, document/version/block/chunk digests, index/extractor versions. A stale or ambiguous version is an explicit state.
2. **Retrieval:** actual bounded query, owner/assignment/version filters, all candidate IDs/ranks/scores returned by the retrieval APIs, lexical/exact/reference/semantic branch, selected IDs, no-evidence/conflict/unavailable status, and timing. Record embedding/model requests and costs if that branch is approved. Never silently replace unavailable retrieval with oracle source text.
3. **Evidence supplied:** exact post-truncation anchors and context actually sent to teaching, full immutable system/user recipe and digest, source-domain labels, and verifier/learner state provenance. Current context builders truncate to six anchors and 1,000 characters each; score the surviving material, not the longer indexed passage.
4. **Teaching and delivery:** route selection including deterministic/local versus API, exact actual provider identity/configuration, raw completion and stop state where available, safety disposition, fallback provenance, response delivered to the student, claim/citation mapping, support/assistance receipt status, latencies, token usage and settled cost. Label model-only and delivered-pipeline scores separately. A fallback cannot replace raw model output in model accuracy.
5. **Independent verification:** reconstruct expected request and evidence hashes; validate ownership/version/offsets and original-PDF matches for every returned citation; reject missing, duplicate, extra or mismatched records. Verify no key/reference fields crossed the input allowlist.

Treat a content-free ledger digest as proof of committed assistance identity only. It does not prove the response was grounded. Test permission/policy/receipt failures with mocked providers first; learning credit must remain blocked for assisted assignment attempts across new sessions. Do not activate production enforcement as a side effect of research.

## Required offline tests before a model run

| Boundary | Required test and expected result |
| --- | --- |
| Scope | Another owner, assignment, class or unselected version appears in ranked input; no unauthorized anchor reaches the prompt |
| Versions | Two editions of one source, stale index or mutated page; conflict/unavailable, no invented provenance |
| Source attacks | Instructions inside retrieved text cannot alter routing, reveal keys or override tutoring policy |
| Answerability | Sufficient, missing, conflicting and figure-dependent sources remain distinct; empty retrieval and service failure are distinct |
| Retrieval loss | A relevant source exists but ranks out or is clipped from the actual context; count primary failure, preserve diagnostic oracle result separately |
| Citation | Correct source but irrelevant passage; exact quote with false interpretation; invented page; wrong offsets; cross-version anchor; uncited factual premise inside a question; each is caught by the appropriate mechanical or semantic gate |
| Teaching | Actual student attempt changes while source stays fixed; evaluate response to the attempt, useful next action, appropriate direct explanation versus scaffolding, and unsupported premises |
| Delivery | Local answer, API answer, adapter fallback, timeout, safety rejection, partial stream and realtime capability boundary; retain route-specific provenance and denominator membership |
| Completeness | Lost response, duplicate request, changed model/prompt/index, retry after uncertain charge, missing review, altered family alias, and review disagreement all prevent a manufactured pass |

Equation/figure layout requires original-page inspection or an independently validated modality verifier. Exact extracted text is insufficient. A question containing a false premise can fail grounding even if the response contains no false declarative sentence.

## Denominators and the 95% gate

Freeze `N` before generation and require one terminal record for every case per condition. Report `N`, attempted, completed, delivered, rejected, timed out, truncated, unavailable-text, fallback and unreviewed counts. No drop/replacement/retry-to-improve. A financially reconciled failed request remains a failed case. Missing responses remain in `N`; missing review prevents acceptance. All-abstention cannot pass the answerable teaching cases.

Primary complete-case pass requires **all** of: permitted and valid source provenance; correct handling of available/missing/conflicting evidence; all material claims and question premises supported or clearly marked as general guidance where allowed; accurate instruction responsive to the attempt; useful required teaching action; and appropriate restraint for the declared task. A legitimate request for a definition or worked explanation is judged by its frozen task rubric, not by a blanket ban on direct teaching. A useful clarification can pass a truly missing-input case. Bare refusal is not automatically useful clarification.

The declared-scope release threshold is `passes / N >= 0.95`, equivalently `passes >= ceil(0.95 * N)`, with **zero confirmed fabricated claims/premises, unauthorized evidence disclosures or falsified citations**. All cases with usable text receive two independent first-pass reviews; reviewers disclose context and identity. Save reviews before comparison. Independently adjudicate only disputed dimensions; agreed failures stand. Unresolved disputes cannot become passes. Do not infer absence of fabrication in inaccessible text. Inaccessible or incomplete evidence that prevents the integrity gate from being assessed blocks release even if the numeric threshold could still be reached.

Report subject/band, answerability, source-domain, modality, family and delivery-route denominators and pass counts; state unsupported or empty strata. Freeze any additional scope-specific minimums before viewing outcomes. A pooled 95% across unlike scopes cannot silently certify each individual scope. Report evidence-retrieval hit, passage precision, answerability and citation validity separately with explicit applicable denominators. Report overall retrieval-plus-teaching success out of `N`, not just successes conditional on good retrieval.

Report the observed proportion and a Wilson interval for case-level description, plus family counts and a family-aware uncertainty analysis when sample design supports it. The release target is a point threshold unless a stricter confidence-bound requirement is separately preregistered. Related cases do not provide independent population evidence; do not claim a 95% population guarantee from a 95% observed score.

## Implemented offline contract and CLI

`lib/learning-engine/integrated-grounding-evaluation.ts` now exports strict external manifest, exclusion and trace schemas; canonical hashing; deterministic evidence-input rendering; and `verifyIntegratedEvaluation`. It accepts authored, confirmed text only. Existing final modules and corpus code are not imported. The only reused benchmark dependency is the pure canonical hashing utility.

`scripts/learning/integrated-grounding-evaluation.ts` is validate-only. It accepts one explicit regular JSON file up to 16 MiB, checks separately supplied trusted manifest/exclusion digests, and creates a new report exclusively. It has no retrieval, network, model, secret, upload or deployment path. Unknown fields including routing URLs and learned confidence are rejected by the closed schema. Example syntax, with placeholders rather than a prepared run:

```powershell
npx tsx scripts/learning/integrated-grounding-evaluation.ts verify <external-bundle.json> --manifest-sha256 <trusted-manifest-digest> --exclusion-sha256 <trusted-exclusion-digest> <new-report.json>
```

The bundle contains `manifest`, `exclusions`, `traces` and an optional `claimedThresholdMet` assertion. The manifest pins externally supplied case inputs, source page hashes/versions, owner/assignment, families, model/options and system message. Each trace binds retrieval/candidates/selected evidence, exact request, normalized response envelope, execution receipt and two submitted AI-engineering judgments. The normalized envelope is the current narrow response interface; raw provider payload archival and an authentic execution collector remain separate required work. Hashes cannot prove that a provider executed those bytes.

The verifier preserves all manifest cases in the denominator, rejects trace/source/request/receipt tampering, validates selected source text against versioned page offsets, and checks declared family/component exclusions. It rejects silent length-limit completion, duplicates and forged threshold claims. Missing traces or judgments and unsettled execution remain incomplete. It does not implement semantic-family discovery, production prompt construction, signed reviewer credentials, adjudication or execution attestation.

`submittedJudgmentThresholdMet` reports only the point-threshold arithmetic of complete, internally consistent submitted judgments. `thresholdMet`, `productionEligible`, `educatorValidated`, `reviewerAuthorityVerified`, `executionAuthorityVerified` and `semanticFamilyIndependenceProven` remain false. Valid bundles still return `status: incomplete` with explicit reviewer/family/execution authority gaps, and the CLI exits nonzero. Supplying `claimedThresholdMet: true` is rejected. Self-supplied attestations cannot qualify an actual 95% release. Trusted digest selection itself is an external operator responsibility.

`lib/learning-engine/integrated-grounding-evaluation.test.ts` contains 20 opaque contract-integrity tests, not an evaluation or training corpus. Tests cover 19/20 arithmetic, missing denominator members, missing receipts, family overlap, resealed source-version/quote/prompt/model/receipt tampering, truncation, reviewer disagreement, fabrication flags, size bounds, exclusive output, reused provider-response receipts and global integrity failures that invalidate every row score. No newly authored teaching problems or model calls are present.

## Offline Responses API capture parser

`lib/learning-engine/integrated-provider-response.ts` parses bounded saved HTTP JSON
captures without network or corpus access. It retains the exact request/response
strings and UTF-8 SHA256 digests, verifies a separately pinned request digest,
model mapping and token ceiling, and reads assistant text in output order. The
supported subset is text messages, refusals and reasoning metadata. Tool or other
modal output cannot qualify as a complete text response; reasoning is never
substituted for the answer.

The parser distinguishes complete text, refusal, empty output, HTTP/provider
error, cancellation, incomplete output, token truncation, safety filtering and
nonterminal responses. It checks usage totals/detail bounds, duplicate IDs,
terminal contradictions and unfinished messages. Missing usage remains unknown
on unsuccessful responses. Reaching the output ceiling alone does not prove
truncation. Field shapes follow the official [Responses reference](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create)
and [refusal documentation](https://developers.openai.com/api/docs/guides/structured-outputs).

These checks establish capture consistency only. Header IDs, timestamps and
hashes are caller-supplied declarations, so `executionAuthorityVerified` and
`productionEligible` remain false even for a valid completion. Independent
execution attestation, financial settlement, SSE assembly/timeouts, production
adapter integration and reviewer/family authority remain separate work. No
release threshold or existing frozen runner is changed. The 35 opaque protocol
tests contain no teaching cases and make no model calls.

The validate-only `scripts/learning/integrated-provider-response.ts` CLI accepts
one explicit capture file and one expectation file. Pin the expectation file's
exact UTF-8 SHA256 separately; its contents pin the actual request-body digest,
requested model, expected response model and output-token ceiling:

```powershell
npx tsx scripts/learning/integrated-provider-response.ts verify <capture.json> --expectation <expectation.json> --expectation-sha256 <separately-trusted-file-digest> --out <new-evidence-report.json>
```

Both inputs must be regular UTF-8 JSON files. Capture files are capped at 16 MiB,
expectation files at 16 KiB, and each inner provider body at 4 MiB. The parser
rejects streaming captures. The CLI rejects symlinks and changed/oversized input,
verifies the expectation digest before reading the capture, and creates output
exclusively with mode `0600` where supported. Windows ACLs still govern actual
access there. Keep the output directory private: the report contains the exact
raw request and response. Stdout/stderr expose only status, safe error codes and
digests. Existing reports and input files cannot be overwritten. A zero exit
means the capture was parsed and saved, including a preserved refusal/truncation;
it does not mean the model succeeded or execution authority was verified.
Thirteen synthetic CLI tests include a real local subprocess, exclusive-write
checks, changed expectations, regular-file/size/UTF-8 rejection and private-text
non-disclosure. No corpus discovery or provider path exists in this command.

## Offline authored assignment lexical capture

`lib/learning-engine/offline-assignment-retrieval.ts` accepts only explicitly
supplied authored synthetic confirmed text pages, declared owner/assignment/class,
and pinned version IDs. It reuses production `structureDocument`,
`validateDocumentAnchor` and `retrieveCurriculum`. It rejects foreign ownership,
other assignments, class-wide sources, duplicate pins/pages, and selected source
hash/version changes. Every supplied source is scope-checked; unpinned versions
are intentionally ignored and listed in `excludedUnpinnedVersionIds`. Multiple
selected editions of one source produce `source_conflict`; missing pinned versions
produce `index_unavailable`, rather than silently using an available subset.

The capture records reconstructed source pages/blocks, all eligible input chunks
before ranking, the ranker's selected chunks/scores, actual clipped prompt anchors,
the exact prompt string and named canonical digests. Its input candidate pool is
not a hosted search ranking. `lib/learning-engine/curriculum-prompt-context.ts`
now supplies the same pure six-anchor, 1,000-UTF-16-character projection and prompt
composition to this adapter and production `server.ts`. The server continues to
use its existing public-reference renderer. This extraction changes no prompt
wording or model recipe; focused parity includes unavailable/conflict states,
reference composition, ordering, escaping and UTF-16 clipping.

This is **offline local ranking**, not hosted database full-text search,
authenticated RLS, a provider response, or end-to-end product execution. Source
confirmation and scope remain externally supplied declarations. Authentication,
execution authority and production eligibility stay false. No reference catalog,
held-out corpus, model, network or data-store IO is performed. A later isolated
server adapter must separately record real version selection, DB lexical ranks,
policy/receipt checks and any approved semantic branch.

## Exact remaining work before an executable run

1. Extend the implemented offline contract with a complete externally reviewed family/lineage registry and authenticated evidence inputs. Its declared-component checks cannot establish semantic independence. The bounded Responses API raw-payload parser now exists; integrate it through an independently attested execution path and retain original envelopes and receipt hashes. The fixed 96-input runner remains unchanged.
2. The authored-text local-ranking capture, authenticated lexical server capture, exact primary prompt/request preparation and synthetic receipt/delivery seam now exist (see below). Complete paid-ledger authorization and raw provider dispatch capture for a separately approved run, plus independently verified execution authority. Freeze the supported route subset and verifier state; inventory embedding/moderation costs before enabling those branches.
3. Complete the exclusion registry and arrange a fresh independent author and family reviewer. Independently audit actual references, student attempts, source sufficiency and task rubrics before sealing. No such new corpus or review is represented by this document.
4. The offline text review-packet builder and explicit CLI are implemented in `integrated-review-packet.ts`; see [packet handling](integrated-review-packet.md). They join exact question/attempt, full declared source pages, retrieved/selected evidence and response while keeping model, cost, other reviews and raw termination metadata in the operator mapping. Fresh actual corpus preparation, authenticated reviewer submission/adjudication and original-page verification for other modalities remain separate. Exact content can identify its origin, so blinding is structured-metadata-only. No packet grants human authority or production acceptance.
5. Lock the supported scope, `N`, family allocations, strata, rubric, numerical thresholds, conditions, model/configuration, timeouts and cost cap. Only then prepare a new bounded quote and obtain the specific authorization required for execution. Retain exclusive output directories and independent result verification.
6. Run once under that freeze; review every case; diagnose failures after the result. Any subsequent retrieval/prompt tuning consumes the evaluation for that recipe and requires fresh families for another untouched-evaluation claim.

The deferred educator gate remains deferred, not satisfied. Engineering can now establish deterministic integrity, coverage of failure behavior, truthful accounting and disclosed AI review. It cannot self-issue educator credentials, validate age/grade appropriateness, certify curriculum coverage or establish learning benefit. A later educator study can use the separate qualified-reviewer/permission contracts without rewriting the engineering result.


## Authenticated lexical capture and primary request preparation (2026-09-29)

The new `integrated-assignment-capture.ts` orchestrator executes the real
`studyBuddyEligibility`, `retrieveForAssignment` and curriculum renderer with an
internal authenticated Supabase client. The optional client/observer argument in
`server.ts` is internal code only. The isolated research route is default off
(`DIANA_INTEGRATED_RETRIEVAL_CAPTURE_ENABLED`) and additionally requires the
signed-in user UUID in `DIANA_INTEGRATED_RETRIEVAL_OPERATOR_IDS`. It does not expose
client injection, a model selector, generation, or mock delivery through HTTP.

The CLI signs into an existing account with process-only
`DIANA_CAPTURE_QA_EMAIL`/`DIANA_CAPTURE_QA_PASSWORD`. It parses only public Supabase
configuration from `.env.local`. Its transport allows authentication, designated
read tables and lexical `learning_search` RPC arguments only. Function endpoints,
embeddings, writes, foreign origins and redirects are rejected. Captures record
real selected documents/pages, candidates, validated blocks, lexical query/rank
traces, selected chunks, clipped anchors and prompt digests. Pins require every
requested version/hash; normalized page hashes and stored metadata must agree.
No assistance is released and no assistance receipt is requested in this mode.

```powershell
node --conditions=react-server --import tsx scripts/learning/integrated-assignment-capture.ts authenticated-retrieval <inputs.json> --input-sha256 <sha256> --out <new-report.json>
node --conditions=react-server --import tsx scripts/learning/integrated-assignment-capture.ts dry-run --out <new-synthetic-report.json>
```

Input is an explicit array of `integrated-assignment-retrieval-request-v1` records:
`caseId`, `expectedOwnerId`, `assignmentId`, `query`, and `versionPins` entries
`{id,contentHash}`. Empty pins are allowed for inspection but produce an unfrozen
snapshot that cannot prepare matched requests. Dry-run constructs one opaque
protocol graph with fake auth/database responses and real product helpers; it
never claims authenticated RLS or hosted FTS. Every batch preserves planned rows,
including rejected/error rows, in the denominator. Output is exclusive, mode0600
where supported; its raw source text requires private storage. Console summaries
contain status/counts/hashes only.

The primary Edge `buildUserPrompt`, prompt constant and result parser now live in
`supabase/functions/_shared/study-buddy-prompt.ts`. The exact Responses body builder
lives in `student-response-request.ts`; existing Edge code delegates to these
functions. Model environment resolution and default models remain unchanged.
Frozen disclosure-v3 **source artifact** parity tests execute 18 prompt variations,
18 serialized request variations and valid/invalid output parser cases. This
proves source equivalence to that artifact; it is not a live Edge deployment
inspection. The sidecar's separate 800-character recipe is not used.

`integrated-primary-recipe.ts` prepares the bounded curriculum-only, empty-work,
empty-conversation hint path. It captures the final 20,000-character source clip,
exact system/user/request strings and only whole anchor records still supplied
after clipping. It does not reconstruct the full Work UI, personalization,
student-state policy, specialist context or reference-book branch. The internal
synthetic delivery seam rechecks policy, awaits and verifies the actual durable
assistance receipt helper, then parses a supplied mock Responses envelope and the
primary tutor JSON. Truncation/refusal/provider errors or invalid tutor shape do
not become successful delivery. Usage is retained as synthetic, and no mastery
or execution-authority claim is made.

```powershell
npx tsx scripts/learning/integrated-request-plan.ts prepare <capture.json> --capture-sha256 <sha256> --configuration <config.json> --configuration-sha256 <sha256> --out <new-plan.json>
```

Configuration is strict `integrated-request-plan-configuration-v1` with `id`
(UUID), exact `model` and `expectedResponseModel`, `expectedCaseCount` (1-100),
`maxOutputTokens:800`, `maxRequestBytes` (at most128000), and `captureFileSha256`.
Preparation validates file/row/input digests and reconstructs the shared prompt
projection. It emits exact request bytes, token ceiling, byte count and all-case
denominator. Nonmatched/rejected rows are explicitly unscheduled. **This is not
abstention evaluation:** no-evidence cases are not sent to a model. Neither file
hashes nor a self-supplied authenticated label establish execution authority.
`dispatchAuthorized`, `paidLedgerReserved` and `productionEligible` stay false.

A new96-case execution proposal still requires fresh independently reviewed
families and scope-appropriate source pins/attempts; fixed rubric/thresholds;
operator-verified model identity and pricing; an exact cost/time quote; an
independently checked capture/code manifest; and a paid-ledger authorization,
reservation, dispatch, raw-envelope capture and settlement path for that new
manifest. The existing fixed96 runner and its sealed inputs are unchanged. No
model run, release threshold, educator qualification or production activation is
implied by these engineering checks.

The approved existing synthetic QA account exercised actual authenticated hosted
lexical retrieval. Its initial capture exposed all-term FTS missing source evidence
when a conversational directive was absent from a chunk. Product retrieval now
retries only after an empty original lexical search, removing leading/coordinated
chat directives while retaining every subject token with AND semantics. Quoted
phrases, minus/negation and OR syntax decline fallback. Both attempts are captured;
owner, assignment and version filters are unchanged. The revised QA report has
matched, matched, no_evidence for the two available topics and absent topic.
These smoke observations do not estimate general retrieval quality.
