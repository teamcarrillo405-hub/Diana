# Diana learning engine: API dependence and completion review

Date: 2026-09-25. Reviewer: AI architecture review agent. This is a code and engineering review, not an educator endorsement or evidence of student learning gains. Scope is the current checkout; no deployment was made by this review.

## Finding

The intended architecture is sound: Diana should own the course material, source search, supported mathematical checks, learning records, practice scheduling and basic study flow. A hosted language model should provide optional language interpretation and conversation when those components cannot complete the task reliably. No API key should be needed for ordinary textbook reading or supported local practice. Some of those capabilities are implemented now, but the application is not yet a complete tutor for every topic in the full precalculus book.

Provider independence and offline operation are separate properties. A server action can avoid OpenAI and still require Supabase authentication, storage and database access. Only prepared device study packs currently offer the corresponding disconnected workflow.

## Provider call inventory

| Operation | Verified current behavior | Engineering decision |
| --- | --- | --- |
| Text PDF parsing | `lib/learning-engine/pdf.ts:14` and `pdf-worker.mjs:10` use PDF.js in a resource-limited worker. The parser does not call OpenAI. | Keep native parsing first. Sparse scans and diagram interpretation require confirmation or a different capture path. |
| Assignment upload extraction | `app/(app)/assignments/[id]/workspace/source-actions.ts:96` invokes `extract-assignment-source`; `supabase/functions/extract-assignment-source/index.ts:268` sends PDF/image content through the model adapter. | Connect the existing native PDF path before this provider extraction path for ordinary text PDFs. An uploaded text PDF should not require two independent extraction pipelines. |
| Source lookup | Before this review, `retrieveForAssignment` embedded every query before any lexical search. | **Fixed locally in this review.** `lib/learning-engine/server.ts:112` searches lexical/exact evidence first and validates its anchors. Lines 140-149 invoke embeddings only if no validated local evidence remains. A storage failure is not disguised by asking a model. |
| Source indexing | Non-PDF ingestion automatically invokes embeddings in `app/api/learning/ingest/route.ts:24`; the PDF job path builds a lexical index without doing so. | Make semantic indexing an explicit optional capability or deferred job. Preserve the prepared lexical source even if semantic work is disabled. |
| Embeddings | `supabase/functions/learning-embed/index.ts:62` calls the OpenAI embeddings endpoint. Its shared safety path also uses the moderation endpoint. | These are actual provider requests. Batch and reuse source embeddings; avoid per-query calls where lexical/exact search suffices. Do not bypass moderation or accounting to reduce dependency. |
| Practice preparation | `supabase/functions/learning-prepare/index.ts:31` reads source blocks and generates bounded templates locally. | No model is required. Current math generation recognizes one equation in x; reading uses six generic prompts from the first eligible passage. This is limited curriculum coverage. |
| Math checks | `learning-assess/index.ts:64` dispatches to exact local algebra/advanced-math functions. | No model is required for supported specifications. Unsupported responses return an explicit limit. |
| Reading checks | `learning-assess/index.ts:77` uses the provider-free exact quotation checker. | It checks source correspondence, not whether an interpretation is convincing or complete. |
| Learning estimates | `lib/learning-engine/learner.ts:15` and `support-policy.ts` are local bounded logic. | Preserve the distinction between assistance, correctness and independent evidence. These are not trained model weights. |
| Chat | Production `app/api/diana/study-buddy/route.ts:287` invokes `study-buddy`; the local linear-equation response is currently used only by the development QA branch at lines 249-280. | Free conversation still depends on the model. Offer genuinely deterministic, clearly identified next-step guidance before entering free chat, using trusted exercise specifications rather than arbitrary student text. |
| Offline | `offline-package.ts:38` searches saved chunks locally and line 45 checks equation/expression exercises. Reading responses are drafts with rubrics. | Extend coverage in chapter/section packs. Do not present the saved-pack feature as a full offline conversational model. |

## Implemented during this review

Changed `lib/learning-engine/server.ts` to execute lexical search and exact problem lookup before the optional embedding path. Owner, assignment, selected version and source-anchor checks still run before returning evidence. A model is consulted only after the validated lexical result is `no_evidence`. If the provider is unavailable, the result remains an honest empty evidence result.

Added `lib/learning-engine/retrieval-routing.test.ts` with six tests against the real `retrieveForAssignment` entry function and mocked storage/provider IO:

- Keyword match returns evidence without invoking the embedding function.
- Exact problem match works when lexical search is empty, without a provider call.
- Semantic search runs only after local evidence is absent.
- Missing provider configuration does not prevent a valid no-evidence response.
- Foreign owner, assignment and version candidates and fabricated anchors are rejected in both paths.
- Source storage errors do not trigger a model call.

Verification: `npx vitest run lib/learning-engine/retrieval-routing.test.ts` passed 6/6. Targeted ESLint and `npx tsc --noEmit` passed. This test proves request routing in the server function; it does not stand in for a deployed outage exercise or real retrieval relevance ratings.

## Full-book integration boundaries

The pure retrieval function already permits class-wide chunks with `assignmentId: null` when owner and class match (`retrieval.ts:32`). The SQL search also contains that branch (`20260924214937_learning_engine.sql:179`). However, the current assignment server loader selects only assignment documents (`server.ts:94`), and the document writer rejects null assignment IDs (migration lines 140-143). Reading all PDF chapters in a research script does not by itself connect them to student tutoring.

A maintainable route is a separate immutable licensed library with book/edition/chapter identities and a class-to-library attachment. Keep students' private assignment sources and public reference text as distinct storage domains. The server selects approved attached chapters, ranks assignment evidence first, returns versioned page anchors and merges only authorized reference excerpts into the tutor context. Preserve license attribution and the separate `trainingPermission` field. Do not create fake assignments solely to give textbook chapters somewhere to live.

All-chapter ingestion needs three distinct completion measures:

1. **Coverage:** each chapter is downloaded, hash pinned, parsed, searchable and cited back to its original page.
2. **Extraction quality:** equations, superscripts, plots, tables and worked-example boundaries are checked against rendered pages. PDF text extraction can be complete by page count while losing mathematical meaning. `pdf-worker.mjs:61` explicitly cautions against inferring diagrams from nearby prose.
3. **Instructional coverage:** each supported skill has reviewed problem specifications, support steps and assessment rules. Algebra parsers do not yet cover every precalculus topic. Advanced checking currently limits exact solution sets to degree two with rational roots; trigonometry, logarithms and general graph interpretation are not implemented by that checker (`advanced-math.ts:25-34`).

Offline export currently rejects a selection over 60 chunks, caps exercises at 30 and expires after seven days (`app/api/learning/offline-package/route.ts:20-34`). A full chapter can exceed those limits. Use explicit section selectors and bounded packs, not silent truncation or an unbounded full-book browser payload.

## Trust and policy boundaries to retain

- Source search is not semantic verification of a tutor's explanation. Exact anchors establish that the quotation exists, not that it supports the explanation (`server.ts`, `curriculumPromptContext`).
- Unconfirmed model extraction does not enter reliable chunks (`curriculum.ts:86`); retain the correction workflow.
- User supplied assignment IDs never authorize access by themselves. Current routes authenticate, resolve owned assignments, scope documents and query through RLS. Apply the same discipline to class/library attachments.
- Current attempt recording forces provisional knowledge status before the server checks reviewed references and independent sessions (`learning-assess/index.ts:85-95`). AI review must not mark educator approval.
- Deterministic preparation, assessment and independent-session endpoints currently ask for AI-green authorization. Revisit this as an explicit school policy design decision. Do not remove policy enforcement merely because the implementation stops using a hosted model.
- The offline package hash detects accidental/content change, not a malicious student's self-authored package. The current system correctly refuses to treat offline practice as independently observed mastery (`offline-package.ts:47-50`).

## Prioritized remaining implementation

1. **Remove redundant provider dependency at import.** Prefer native text-PDF extraction; call vision/OCR only when the source needs it and the student confirms the interpretation.
2. **Attach the full licensed library to Classes and retrieval.** Add edition/chapter manifests, attribution, server-side source selection and page-linked results. Parent task owns this work.
3. **Add a deterministic study controller.** Route typed supported problems to verified specifications, contextual hints and worked examples. Reserve chat for requests outside that bounded controller; do not silently label generated prose as verified.
4. **Expand skill coverage with explicit limits.** Build reviewed specifications chapter by chapter, starting with functions and linear/quadratic algebra. Track unsupported topics instead of implying full precalculus assessment from full-book ingestion.
5. **Add a no-OpenAI integration gate.** Disable provider access in a controlled test, then verify reading, lexical lookup, supported practice, saving/reopening, schedules and prepared offline packs. Assert no embedding/chat/moderation requests for those operations. Confirm that optional chat is clearly unavailable and student work remains intact.
6. **Run educator and learning validation.** AI expert reviews can find omissions and propose rubrics; they cannot count as licensed educators or substitute for independently measured student learning.

The core should be complete for a declared subject/skill scope and continue working when the provider is unavailable. That is an achievable engineering target. Unlimited tutoring across every subject without any model or human judgment is not what the current implementation establishes.
