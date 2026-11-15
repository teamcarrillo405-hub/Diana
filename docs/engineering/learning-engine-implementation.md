# Diana learning engine implementation

September 25 continuation: [current local core, full textbook, expert reviews and remaining gates](learning-engine-local-core.md).

Latest September 25 implementation and verification: [owned learning engine delivery](proprietary-engine-delivery.md). This extends the earlier checkpoints below with curriculum graph retrieval, provider-independent chapter and assignment help, immutable multimodal problem state, fitted policy artifacts and evaluation v2.

## Approved direction

Improve the existing Diana application. Preserve accounts, classes, assignments, tutoring, the approved gamer interface, accessibility supports and explicit submission confirmation.

The initial audience is grades 9–12. Start with Algebra I/II, geometry and six reading skills. OpenAI is the only hosted AI provider. Offline mode provides prepared material and deterministic checking; it does not generate freeform AI responses. Additional experiment spending is limited to $100 per month and $10 per batch.

Actual fine-tuning, educator adjudication and student studies are later gates. Engineering tests cannot establish learning gains or investment readiness.

## Delivery ledger, September 25, 2026

| Area | Implementation | Verification |
| --- | --- | --- |
| Versioned contracts and owner cohort flags | Implemented; default off, explicit cohort or environment enrollment | Unit checks and live owner isolation checks pass |
| Exact source identities and bounded retrieval | SHA-256 versions, page offsets, source anchors, numbered questions, lexical/vector rank fusion | Live embeddings and retrieval of worksheet Problem 2 verified |
| Persistent curriculum index and protected ingestion | Assignment sources, directions, rubrics, actual worksheet questions; isolated native PDF parser; resumable embedding batches | Native PDF tests, production worker tracing, staging writes verified |
| Rational/polynomial verification and attempt evidence | Bounded exact arithmetic, immutable revisions, reviewed first-attempt sessions, assistance-aware skill estimates and support ladder | Generated equation checks, live answer feedback and session/replay SQL assertions pass |
| Multimodal confirmation and offline isolation | Extracted text is excluded until confirmed; corrections create new versions; account/device scoped study packs; offline checks and drafts | Real offline reload, calculation, draft recovery and one synced note verified |
| Independent evaluation and experiment budget | Separate 480 authored cases, five explicit pipeline configurations, strict evidence output validation, durable request IDs, 25-case batches, atomic $10/$100 limits | Corpus and all 2,400 permitted input hashes verified; 29 actual model outputs saved, one run incomplete; no quality ranking |
| Training data readiness and disabled training boundary | Rights, consent, review, duplicate and held-out family checks; fail-closed JSONL export | Boundary tests pass; no training endpoint or trained model |
| Staging migration and connected runtime | Seven additive learning migrations, five protected Edge Functions; test-account pilot | Database assertions roll back their fixtures; local production build passes |

## Release controls

### Research roadmap continuation

The September 25 continuation adds version 2 textbook structure, chapter context, explicit continuation anchors, table cells, native PDF regions, a resumable ten-page ingestion worker, and original-page region confirmation. It also adds exact complete rational root sets, domain-sensitive rational expressions, two-variable systems and bounded geometry checks; blinded educator review, media-byte/error/region evaluation, study allocation/reporting, and content-bound training evidence receipts.

See [the research execution protocol](../research/learning-research-protocol.md) for commands, supported cases, limits and external gates, and [the current findings](../research/research-findings-2026-09-25.md) for executed research. These additions continue the existing app. Extended mathematics and provider-free reading quote checks are deployed; the assessment approval block is resolved.

The new ingestion lease migrations are applied as `20260925171820` and `20260925172424`. Rollback-only SQL checked deduplication, exclusive claims, stale-token denial, checkpoint replay, saved-page recovery, guarded completion and foreign-owner denial. Browser QA uploaded an authored synthetic PDF through the existing assignment flow and prepared it with the new worker; the database recorded a completed page and three native source regions. Browser region review renders the original PDF with a local canvas and highlights the selected equation.

Six real native PDF files containing synthetic authored material were generated and extracted. All six match after whitespace normalization, while raw character errors retain the parser's trailing whitespace differences. A separate licensed 58-page textbook chapter was also parsed into 429 blocks and 355 chunks, with source anchors checked on three searches. Human review, region accuracy calibration, handwriting recognition and learning gains remain unestablished. The earlier continuation covered 16 files and 78 tests; its build log is `artifacts/learning-engine/build-research-20260925.log`. The latest correction evidence is listed in the research findings.

Retrieval, assessment and offline features require either an explicit entry in `learning_rollout_cohorts`, or both a true server feature flag and the exact owner in `DIANA_LEARNING_OWNER_IDS`. An explicit false flag overrides cohort enrollment. Individual flags are `DIANA_LEARNING_RETRIEVAL_ENABLED`, `DIANA_LEARNING_ASSESSMENT_ENABLED` and `DIANA_LEARNING_OFFLINE_ENABLED`. With no enrollment, all are off. Disabling retrieval restores the existing tutoring path. Offline queue repair remains available so a rollout change cannot strand drafts.

Experiments require `DIANA_LEARNING_EXPERIMENTS_ENABLED=true`, an exact operator in `DIANA_LEARNING_OPERATOR_IDS`, an exact configured model and token prices reviewed within 30 days. The deployed endpoint accepts only the byte-exact authored fixture inputs pinned in `approved-fixtures.ts`. Private student/source payloads are rejected before a provider call. The experiment endpoint remains disabled. Fine-tuning remains disabled separately.

Source content is untrusted data. An exact citation proves the quoted span exists in an authorized version; it does not prove the model's interpretation. OCR output requires confirmation before deterministic assessment. Independent, hinted and example-assisted attempts remain distinguishable. Private content is excluded from training by default.

Preserve the existing 996-case evaluation corpus. New high-school evaluations require separate document/template splits and real provider output provenance. A stopped or unrun evaluation must never be reported as passing.

## Connected paths

- Classes: open the class, choose **Materials**, then a file. The canonical reader is `/classes/[classId]/materials/[assignmentId]`. Existing Study links redirect there for assigned classes. Original files are available without AI enrollment; enhanced tools remain gated.
- Choose worksheet questions, directions, rubric, or an existing uploaded source. Preparation saves immutable versions. Native PDFs retain page labels and offsets. Scans and other model extractions need text confirmation.
- **Search material** uses owned, assigned versions only. **Continue search indexing** resumes chunks that still lack vectors; keyword search remains available.
- **Practice this material** prepares bounded equation checks or one of six reading prompts. Reading feedback checks exact quotations but remains provisional.
- **Try independently** appears only for reviewed math references with no prior attempt. The database checks the one-use session, expiry, source ownership, first revision and recorded AI use. It cannot prove that no help occurred outside Diana.
- **Save for offline** creates a seven-day device pack. `/offline` can reload without a network connection. **Save draft** retains a response locally and replays it as a practice note on reconnection. It does not submit an assignment or manufacture an independent learning event.
- Existing Diana tutoring receives versioned source context and a bounded support decision for enrolled accounts.

## Engineering evidence

- Production build passed, including new routes and PDF worker asset tracing.
- Targeted checks: 12 files, 64 tests passed, including source identities, exact arithmetic, quote validation, all approved benchmark hashes, offline partitions, learner evidence, tutor integration, function inventory, security wrapper and migration contracts.
- Full regression run: 3,267 tests passed, four skipped; it initially found four integration issues plus one lifecycle timeout. The integration issues were fixed and their suites passed. The lifecycle suite subsequently passed all five tests alone with the repository's standard timeouts. A second full run has not been claimed.
- Targeted lint passed. Tone audit passed with zero blocking findings; it reports 65 existing advisory uses of “deadline.”
- Staging SQL verifies foreign-owner denial, protected assessment writes, exact source lookup, immutable revisions, note replay, explicit status confirmation, atomic budget limits, and reviewed one-use independent sessions. These fixture transactions roll back.
- Browser verification used the synthetic QA account. A real OpenAI embedding exists for the indexed worksheet. The browser retrieved Problem 2, checked the response 8 for `5x - 7 = 3x + 9`, reloaded a saved pack offline, checked locally, saved a draft, restored it after reload, and synced exactly one note on reconnection.
- The existing 996-case corpus was preserved. Its test-harness fixtures are not new real model or educator evidence.

## Evaluation operations

`npm run learning:evaluate -- validate` checks the seed corpus without provider calls. `fixtures` writes the seed corpus and its qualification. `approve-fixtures` regenerates allowed synthetic input hashes; tests must pass and the experiment function must be redeployed before changed fixtures can run.

For actual runs, prepare `experiment.json` using the strict manifest schema and the printed corpus hash, exact model, code revision and prompt version. Set the operator's evaluation access token locally. `npm run learning:evaluate -- run <directory>` executes at most one preassigned batch of 25 cases. Repeat to advance through saved batches. Each invocation resumes durable IDs and never replaces an uncertain request with a fresh charge. An exhausted or uncertain batch pauses for reconciliation. The global database cap remains $100 per UTC month and each batch is capped at $10. Reported costs use measured provider tokens and configured rates, not invoice reconciliation.

The baseline receives the full fixture source. Retrieval arms execute the production lexical fallback and preserve its actual result, including no-evidence outcomes. Adaptive arms receive an explicitly synthetic learner state and the support decision. Verifier and learner-state ablations remove those respective fields; `retrieval_fixed` and `without_learner_state` are equivalent controls in this first protocol. This seed protocol does not establish hosted semantic retrieval quality or human reading judgment. Output scoring checks structured response format, exact math answers, abstention and quoted text; reading interpretation still needs human adjudication.

## Remaining research and release gates

This is the first engineering implementation and controlled pilot. It does not complete the full research roadmap or establish investment readiness.

1. **Textbook depth:** deterministic hierarchy, tab/pipe tables, native text boxes, explicitly continued problems and leased cooperative PDF preparation are implemented. Arbitrary scanned tables/diagrams, ambiguous columns, calibrated extraction and an independently scheduled ingestion service remain future work.
2. **Math and learning validity:** the extended exact checkers are implemented and deployed for rational quadratic solution sets, bounded rational domains, unique two-variable systems and selected geometry formulas. Geometry proofs, irrational roots and broader solution sets remain unsupported. Educator-reviewed references and independent validation are still required.
3. **Multimodal coverage:** original PDF rendering and region corrections are implemented and connected. Native PDF extraction has run on six authored files. Handwriting/photo/diagram/audio recognition evaluations remain unrun. No offline generative AI was introduced.
4. **Evaluation and adaptation:** blinded adjudication, clustered comparisons, calibration reports, bounded policy optimization and a delayed-transfer study workflow are implemented. The 480 cases remain parameterized seeds. Actual model smoke runs saved 29 outputs, including 11 paired cases; one run is incomplete. Completed comparisons, diverse reviewed textbook cases and actual student outcomes are required before efficacy claims. The policy optimizer retained the current behavior.
5. **Training:** content-bound rights, consent and educator-review receipts now gate exports. Current OpenAI documentation says its fine-tuning platform is winding down and closed to new users. Account access and a supported route require verification before any separately authorized run. No fine-tuned model exists from this work.

## Deployment and rollback

The database and Edge Functions are applied to the existing project named `diana-staging`; only the synthetic QA owner is enrolled. The name does not imply a separate private database from the current app. No frontend production deployment was made by this implementation task. The locally verified production build used port 3031; that temporary test server was stopped after verification. Active development remains on port 3027. The final learning build log is `artifacts/learning-engine/build-20260925.log`.

Automatic approval review previously rejected assessment deployment because its reading path could send student responses and source excerpts to OpenAI. The updated reading path now checks exact quotations directly without any provider call, and the revised assessment is deployed. Current bundle digest: `45617efcab63cb4b0e238a48723002730f9c0548fb37d1e8df85686e78159179`. The experiment deployment was initially rejected for accepting arbitrary private input; restricting it to 2,400 exact authored fixture/arm hashes resolved that block. Both changes preserve approval protections. Experiments were enabled for the documented synthetic comparison and are now disabled again.

A separate landing-page task requested deployment coordination. Automatic review rejected sharing workspace/deployment details between tasks without specific authorization; that permission is also pending. No frontend deployment is in progress from this task.

The landing task's two scoped source corrections were preserved locally: the cinematic root now carries `data-public-shell="cinematic"`, and its chapter colors are explicit. These prevent student-shell typography from overriding the public landing design. The landing task owns its public deployment and browser regression verification; its changes were not used as permission to publish this dirty worktree.

Migration filenames use the actual connector-assigned ledger versions. The preexisting personal-calendar migration filename was also aligned after its SQL digest matched the applied statement text exactly; its contents were preserved.

Roll back access by removing cohort features or setting the corresponding server and Edge flags to false. Keep additive tables and attempt/source history intact. Do not drop data to disable the pilot. Experiments have a separate operator/flag gate. Signing out preserves unsynced drafts in their account partition; the store denies another account access. These local partitions are not encryption against someone with browser-profile or developer-tool access.
