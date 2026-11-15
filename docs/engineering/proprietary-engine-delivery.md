# Diana owned learning engine

This work extends the existing Diana application and its student workflows. It does not replace the app or its visual design. Authorship of software is not evidence of patentability, a defensible commercial moat, or improved student learning.

## Delivery contract

September 29 current status: the existing Diana evidence-to-action method remains
the architecture being extended. The independently reviewed API development run
passed 95/96 synthetic cases; this is separate from production grounding and from
the rejected local adapters. The integrated hosted diagnostic exposed and repaired
an actual provider-usage accounting defect, with its original unsuccessful delivery
preserved and 3 cents reconciled without retry. See [the current roadmap](roadmap-execution.md)
and [diagnostic evidence](roadmap-diagnostic-2026-09-29.md).

The latest independently reviewed product additions are exact probability-matrix
preconditions before teaching and manual on-device handwriting crop before
recognition. They extend Diana's authored controller and student workflow. Neither
addition is a new foundation model or proof that handwriting accuracy, curriculum
completeness, exclusive rights, or the 95% integrated target has been achieved.
The web candidate preserves every prior activity version and awaits the complete
isolated regression/release gate. Educator validation remains deferred by the user.

September 28 research update: five actual local LLM LoRA experiments have now completed. The two newest used a fixed 95% grounding gate and remain rejected: best mechanical development scores were 26/48, with the independent final test still unopened. V3's blinded semantic review passed 14/48; V4 passed 23/48 in its own blinded semantic AI review; separate reviewers produced different base judgments, so cross-run semantic rates are descriptive. The new data, continuation provenance, immutable evidence and review tooling are authored engineering, but ordinary LoRA configuration is not a new proprietary algorithm and the measured quality gap remains open. See [grounding results](grounding-95-results-2026-09-28.md).

September 27 update: the original evidence-to-action method is specified in [the method contract](../architecture/diana-teaching-method.md). Current production includes 112 authored activities, source-version-bound retrieval, bounded subject checks, assistance-aware decisions, saved revisions, exact-concept practice links and separate approval gates. Actual browser speech/handwriting inference and three local LLM LoRA experiments have executed. All three LoRA candidates were rejected and remain inactive. The third improved on its fresh synthetic evaluation but did not meet the locked grounding threshold. See [current release evidence](roadmap-release-2026-09-27.md); the older verification log below retains its original scope.

Diana-specific work consists of its authored integration, curriculum content, decision rules and implementation. Contributor agreements and legal ownership have not been audited here. Whisper, TrOCR, Qwen, Transformers.js and the other listed dependencies remain third-party technology. The custom method's advantage still needs independent comparisons and learner evidence; using or fine-tuning those models does not create ownership of their base technology.

| Layer | Concrete implementation | Acceptance evidence |
| --- | --- | --- |
| Curriculum intelligence | Content-bound skill graph, prerequisites, misconception prompts, authored teaching routines; all nine reference chapters and six reading skills | Broken links, cycles, duplicate IDs, stale digests and unsupported verification claims rejected |
| Specialized retrieval | Exact passage ranking followed by bounded curriculum graph reranking; original edition/page/hash retained | No cross-owner evidence; tags alone cannot create relevance; private assignment evidence remains distinct from public reference |
| Local tutoring | Server-selected structured exercises, progressive hints, exact bounded checks, examples and fresh practice | All nine chapter practice families exercised without a provider; unsupported inputs are not graded as valid |
| Multimodal state | Immutable problem revisions with typed work, PDF regions, image/handwriting transcriptions and spoken-reasoning transcriptions | Exact confirmation hashes, conflict detection, source-region integrity, tenant ownership and optimistic revision checks |
| Learned decision model | Regularized multinomial model trained locally on help-selection trajectories; immutable datasets and artifacts | Actual fitted numeric weights; held-out learner/source/template/time splits; explicit baseline; synthetic artifacts cannot deploy |
| Evaluation and operations | Separate evidence sufficiency, teaching mode and answer disclosure; reproducible local gate; rights/review/consent receipts | No evidence of student gains inferred from unit tests, model grading or synthetic trajectories |

## Operational rules

- Authenticated class ownership is required for saved chapter practice. A textbook question is an authored Diana exercise, not a claim that the textbook publisher or an educator reviewed it.
- Exact checking covers declared mathematical families only. General proofs, arbitrary diagrams and unconstrained handwriting interpretation are outside that claim.
- Student confirmation records what the student intended. It does not provide educator approval or independent mastery evidence.
- Multimodal transcriptions retain their original modality and provenance. Local storage and comparison do not imply that offline OCR, speech recognition or scene understanding was performed.
- A saved problem notebook is student-controlled data. It is never a trusted answer key, review receipt or automatic training label.
- The learned model chooses among permitted teaching actions. It cannot bypass source confirmation, evidence or fixed safety constraints. Current engineering fixtures remain ineligible for deployment.
- Hosted language-model training is a separate capability. Training a small decision model does not change an LLM's weights.

## External research gates

Human educators must review the authored curriculum and rubric content. Approved, consented student trajectories are needed for useful policy fitting. A prospective student study is needed to establish learning effects and compare the system against simpler approaches. These cannot be truthfully substituted with simulated students or AI reviewers.

## Verification log

Verified September 25, 2026 against the current local checkout:

| Check | Result |
| --- | --- |
| Integrated learning, material API, component and offline tests | 169 tests in 37 files passed |
| Final saved-response regression tests | 3 passed: restore the same record/revision, preserve typing during loading, reject another source version |
| TypeScript and targeted ESLint | Passed, including the final assignment-help resume changes |
| Production build | Passed; subsequent small copy, layout and assignment-resume changes also passed type checking and focused lint |
| Provider-independent core gate | All 9 chapters, 13 bounded answer checks, 34 skills; 0 network attempts with network calls forbidden |
| Database integrity checks | Ownership isolation, exact source quotes, UTF-16 offsets, idempotent retries, conflicting revisions, protected writes and historical assistance checks passed; fixture transactions rolled back |
| Live chapter practice | Chapter 9 hint, exact center check and saved response restored after reload |
| Phone layout | 375px viewport, 375px document width; no horizontal overflow |
| Live assignment practice | Confirmed source, local hint for `3x + 5 = 20`, and a distinct worked example `2x + 3 = 7` displayed successfully; after reload the saved step `3x = 15` returned to the response field and hint history retained its progression |

The reproducible core report is `artifacts/learning-engine/research/local-gate/gate-1790367550600.json`. Run `npm run learning:local-gate` to produce a new report. This is an integration gate, not a model-quality comparison or learning-outcome study.

### Learned policy experiment

`artifacts/learning-engine/research/learned-policy/policy-9d8c1bbcaf8962f8.json` contains actual fitted weights from 120 authored trajectories, 40 in each partition. On these authored labels, the fixed baseline scored 0.50 action accuracy and the fitted policy scored 1.00. These figures only demonstrate that the training pipeline learns the authored pattern. They do not establish better tutoring, generalization to real learners or learning gains. The artifact is ineligible for deployment and has not been activated.

Evaluation v2 separates teaching action from evidence sufficiency and answer disclosure. Older saved outputs were retained unchanged; outputs without the new fields do not receive fabricated confidence or calibration scores.

### Connected product paths

- Classes > Materials > reference textbook > **Practice this chapter**: versioned questions, progressive hints, distinct examples, bounded checking and saved sessions.
- Classes > Materials > assignment source > **Practice this material**: source-confirmed local help and saved problem revisions. Typed work and explicit handwriting or spoken-work transcriptions preserve their origin.
- Saved assignment help restores its response and original response format when the question is reopened. A late restore never overwrites new typing; source confirmation is requested again.
- Existing **Ask Diana** remains available for conversational explanations through the authorized hosted-model path.
- Local support is recorded before feedback is returned. The database excludes previously assisted questions from new independent sessions and prevents supported attempts from becoming independent learning evidence.

### Release scope

The frontend is running locally at port 3027. No new Vercel frontend release was published in this continuation. Three additive migrations were applied to the existing Supabase project: `20260925201612_learning_problem_records`, `20260925202654_learning_local_support_evidence` and `20260925203216_learning_assisted_history`. The shared project's name is `diana-staging`; it is not evidence of an isolated production-safe database. Verification used the existing synthetic QA scope.

No coding-model switch, hosted LLM fine-tuning job or additional paid model-comparison batch was performed. Human review, consented student data and prospective learning evidence remain the external research gates described above. Full offline handwriting/speech recognition and arbitrary diagram reasoning are not implemented by the transcription workflow.

## Universal course continuation, September 25, 2026

### Implemented

- A strict V2 competency/course framework with 41 skills: the 34 existing skills retain their IDs and content digests, and seven new competencies extend English, science and math foundations. Course, source edition and proposed outcome mappings are separate from skill identity. The existing retrieval reranker now uses the compatible shared prerequisite traversal.
- Server-selected activity contracts and six declared checking methods. Content hashes bind the activity, course, competency and capability limits. Unknown methods, untrusted answer keys, unsupported quantity specifications and client-supplied approval claims are rejected.
- Nine initial practice collections, with 20 activities across grades 6–8, grades 9–12 and introductory college. These counts describe small collections, not complete curricula. Advanced college is explicitly unavailable in this collection.
- Reading/English checks exact quotations across multiple original passages and offers writing revision criteria. It does not grade interpretation, grammar, originality or writing quality. Science checks a requested single unit, significant figures and atom conservation for the stated species; explanation tasks offer source observations and criteria without certifying scientific understanding.
- **Classes > Materials > Guided practice** is connected to class ownership, account enrollment and the class's current tutoring policy. Saved responses, transcription origins and assistance counts use the existing immutable problem notebook. Switching questions saves a changed draft first; reopening a question restores its compatible record. Save failures retain the draft and request identity. A restored transcription requires confirmation again.
- Practice uses the class context as its initial subject filter; a saved question takes priority. Course levels are selectable context, not an inferred ability score. All current activities remain educator-review-pending and ineligible for mastery or automatic training.

### Executed verification

| Check | Result |
| --- | --- |
| Learning engine, material APIs, learning components, offline store and deterministic science helpers | **200 tests in 43 files passed** |
| TypeScript and targeted ESLint | Passed; final production build also completed type and lint checks |
| Production build | Passed after the requested-unit correction and final module formatting |
| Legacy compatibility | Every original skill's prerequisite order and digest preserved; existing retrieval and saved-session tests passed |
| Provider independence | All 20 activities' authored hints and examples executed with network access forbidden in the test; focused reading, writing, math and science checks passed |
| Live class entry | Materials link opened Guided practice in the existing synthetic QA class |
| Live reading and writing | Two source quotations located without an interpretation grade; writing feedback offered revision criteria; draft restored after reload and after changing questions |
| Live science | Original `0.0750 kg` required the requested grams; `75.0 g` passed value/unit/precision checks; `2H2 + O2 -> 2H2O` displayed H:4 and O:2 on both sides |
| Phone layout | Requested viewport 375px; 360px client/document content width including the scrollbar allocation; no horizontal overflow; full page inspected |
| Unsupported level | Advanced college displayed its unavailable state rather than opening a claimed advanced activity |

At this stage, the separate `npm run learning:course-gate` reporting command was **not executed**: Codex's automatic approval service returned an authentication error before authorization. The later owned-material continuation resolved the execution/report issue, as recorded below.

### Scope still open

The shared framework and initial subject workflows are implemented locally. The broader roadmap remains in progress: reviewed course content and rubric judgments, V2 mappings for arbitrary uploaded textbooks, module publishing, wider math/science/history and advanced college coverage, robust diagram/recognition workflows, operational policy activation, requested language-model fine-tuning, completed model comparisons, learner studies and production rollout. Unit tests and authored examples do not replace those outcomes.

No additional database migration, Vercel release, language-model switch, paid provider call or training run was performed in this course continuation. The existing hosted conversational tutor remains separate. Provider-independent practice still needs the server/database to save and resume; it is not an entirely disconnected application.

## Owned-material continuation, September 25, 2026

### Implemented

- Expanded source document/chunk subjects to the shared domain registry. Legacy math/reading assessment events and existing source versions remain unchanged. Retrieval skill matching returns no match for domains outside the legacy graph rather than assigning a math/reading skill by default.
- Connected **Classes > Materials > prepared source > Practice with passages**. A student selects up to three exact passages, a course level and reading, argument or science-explanation practice. Browsing and local keyword retrieval use the pinned source version; the practice search has no hosted embedding fallback.
- Added immutable material bindings, source provenance and page references to the shared activity/notebook path. The server reloads source blocks, verifies ownership, class/assignment scope and exact text before generating a task specification. Textbook prose cannot supply an answer key or educator approval.
- Quotations carry exact source anchors, including page-relative offsets. Ambiguous repeated wording is not given a fabricated unique citation. A quotation match is not a grade for its relevance or interpretation. Source links preserve older versions even when they fall outside the recent list.
- Saved responses, assistance counts and manual transcription origins share the existing notebook. New-passage navigation and the return-to-materials action save changed work first. Failed saves keep the draft and retry identity. Reopened speech/handwriting transcriptions need confirmation again. The workflow makes no automatic handwriting or speech-recognition claim.
- Applied `20260926035237_learning_material_subjects` to the existing shared Supabase project. It expands accepted subjects, includes subject in PDF job identity, retains lease/ownership guards and verifies the completed version's subject and original PDF byte hash. Existing rows and prior source versions were retained.

### Executed verification

- **223 tests in 47 files passed**, covering learning logic, material/course APIs, UI recovery, offline store and deterministic science helpers. Cases include forged text, cross-owner/class/assignment input, source changes, duplicate passages, unconfirmed sources, unknown tasks, older pinned versions, response retries and durable-save-before-feedback.
- TypeScript, targeted ESLint and the production build passed. This remains a local frontend delivery, not a new Vercel deployment.
- `supabase/tests/learning_material_subjects.sql` executed successfully against the existing synthetic QA source and rolled back every test-row change. It checks subject-specific deduplication, retry identity, null/unknown subjects, foreign ownership, mismatched subject/asset, null/reused leases and anonymous RPC denial.
- In the running browser, the algebra source opened passage practice; a real quotation matched its stored page span; the citation opened the pinned source version; the saved response returned after reload. A separately labeled engineering-only science sample was prepared as science text and searched for `room`, returning the two relevant passages without requesting semantic indexing.
- Science practice located two quoted spans and showed explanation/revision criteria without assigning a correctness grade. Reopening its saved session and reloading restored the exact response. Live verification exposed a session-URL refresh issue; replacing manual history mutation with the application router fixed it, and reload was verified again. The return action preserves the source, version and page.
- Phone inspection used a 375px requested viewport, with 360px document/client content width after scrollbar allocation and no horizontal overflow. Both passage selection and the restored response screen were visually inspected; the temporary viewport override was reset.

The science sample is original synthetic QA text in the existing QA assignment. Its title and opening explicitly identify it as a test sample; it is not a textbook license receipt, educator-approved curriculum or student learning evidence. The sample and browser practice records were retained for review; database contract-test fixtures were rolled back.

The original course-report command was retried through the same approval process after its contents were inspected. Approval succeeded; execution then exposed a top-level-await/CommonJS startup error. Wrapping the runner in an async entry function fixed that error. The same command now passes: **41 competencies, 9 collections, 20 activities, zero network attempts**. Its actual report is `artifacts/learning-engine/research/course-gate/gate-1790395577685.json`. This is a local authored-fixture integration report, not a model comparison or learning-outcome result. No alternate command or approval bypass was used.

This completes the selected-passage integration step. Educator review/publishing, automatic competency mapping, wider supported courses, offline recognition, language-model fine-tuning, complete model comparisons, learner studies and production rollout remain open. No model change, paid model call or training run was made.

## Full-roadmap engineering continuation, September 25 local / September 26 UTC, 2026

The preceding sections retain historical results. The current stage-by-stage status is `docs/engineering/roadmap-execution.md`.

### Delivered

- Added trusted, subject-scoped educator/operator access, independent course reviews, immutable version publication and withdrawal, and fresh student-side enforcement. Two additive migrations were applied to the shared Supabase project. They do not provision any real reviewers. SQL contract tests covered direct-write/anonymous denials, duplicate/self reviews, missing criteria, changed payloads, revoked credentials, suspension and withdrawal; all synthetic actors/rows were rolled back.
- Expanded the catalog to **45 competencies, 18 collections and 31 activities**, with history-source analysis, geometry, compound units/precision and explicit ionic atom/charge conservation. Preserved every original activity version hash. All new content remains educator-review-pending.
- Added exact-source competency proposals. A live check exposed false-positive suggestions from generic “both sides” wording; the filter was tightened and a regression test plus live recheck passed. The algebra source now suggests linear equations without absolute-value/system suggestions.
- Added versioned response rubrics to student practice and educator course inspection. An offline assessment workflow verifies response/source/rubric hashes, exact cited spans, fresh permission/qualification records, two independent ratings and distinct third-reviewer adjudication. It neither messages educators nor creates automatic quality grades, mastery or training eligibility. Real review and live assigned-response delivery remain open.
- Added Materials preparation progress, page-quality disclosures and resume controls. The separate bounded worker command uses owner sessions and existing durable leases; production scheduling and independent long-document execution remain unverified.
- Connected optional private learned-policy loading to active-problem context, with current receipt checks, bounded files, rollback and baseline fallback. No policy bundle was activated.
- Implemented local-only recognition adapter code and hash-bound confirmation contracts. The first adapter targets are single handwritten lines and short PCM speech. No model download, recognition inference, measured recognition accuracy or student upload integration was completed; the required model-change decision remains pending.
- Added immutable model-comparison integrity reports. Fresh Supabase reads confirmed **11 Luna outputs / 18 Terra outputs, 11 paired cases, $0.29 accounted for and one unresolved $0.01 Luna reservation**. The unresolved request is `a262a6d7-e023-48ea-8d45-7130706445c2`; it was not refunded or replaced without evidence. No new provider call was made.

### Verified

- **261 tests in 58 files passed**, plus four Python adapter contract tests that do not load neural models.
- Type checking, targeted ESLint and the final production build passed.
- Latest course gate: `artifacts/learning-engine/research/course-gate/gate-1790403139735.json`, **18 collections, 31 activities, 45 competencies and zero network attempts**.
- Saved provider evidence report: `artifacts/learning-engine/research/model-smoke/comparison-1790403011683.json`. Integrity is valid but execution is incomplete; no teaching-quality winner or learning improvement is established.
- Live density checks distinguished `g/cm^2` from `g/cm^3`; the requested density value and precision passed. Ionic practice checked Cu/Zn atom counts and total charge. History practice located two quoted source passages and restored the saved response after reload. Materials preparation showed Ready, page counts and quality signals. An ordinary student was denied course-review access. Desktop and phone layouts were inspected; temporary viewport overrides were reset.

No frontend production deployment, active fine-tuned language model, active recognition model or real learner study was created. The entire research roadmap is not complete. Refer to the execution ledger for the outstanding engineering, model decisions and external evidence gates.
