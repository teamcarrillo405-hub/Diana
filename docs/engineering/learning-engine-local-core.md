# Diana: a durable learning core with optional model help

Updated September 25, 2026. This improves the existing application and preserves its accounts, classes, assignments and current gamer interface.

**Latest continuation:** [owned learning engine delivery and verification](proprietary-engine-delivery.md) adds the 34-skill graph, chapter practice, saved multimodal problem revisions, local assignment help, fitted support-policy experiment and evaluation v2. The verification counts below describe the preceding checkpoint.

## Architecture decision

Diana owns course material, source locations, progress records, supported answer checks, practice preparation and study scheduling. A hosted model supplies flexible explanations, dialogue and difficult visual interpretation. Failure of that model must not erase work or make ordinary reading and supported practice depend on a chat response.

An operation can use Diana's server, authentication or database without calling OpenAI. Provider independence is not the same as full offline operation. Prepared device study packs provide a smaller offline workflow; the entire book is not automatically cached on the device.

| Capability | Current implementation | Model required? |
| --- | --- | --- |
| Read the reference book | Original PDF pages in Classes > Materials | No |
| Search the reference book | Local passage index with chapter/page links | No |
| Extract a readable assignment PDF | Native PDF worker first; bounded by resource and source limits | No for usable text; scanned or unsupported files retain the existing model fallback |
| Prepare text material | Versioned local source index | No; expanded semantic indexing is a separate optional action |
| Search assignment sources | Validate lexical/exact results first | Only an optional semantic fallback after no local evidence |
| Prepare practice | Source-position ordering and bounded templates | No |
| Check supported math | Deterministic algebra/geometry rules | No; unsupported topics remain explicitly unsupported |
| Check reading quotations | Exact source correspondence | No; this does not judge interpretation |
| Track learning and schedule study | Diana records and bounded logic | No; these estimates are not validated mastery measures |
| Explain an unfamiliar question conversationally | Authenticated, budgeted model route with source context | Yes |

## What OpenAI is changing

The restriction concerns **self-service fine-tuning**, the service that creates customized model versions. It is not a shutdown of ordinary model access or Diana's chat API. The published schedule restricts new organizations from May 7, 2026, organizations without recent fine-tuned inference from July 2, and new jobs for active existing customers from January 6, 2027. Existing fine-tuned inference follows the underlying model's lifetime. Our organization's specific eligibility is unverified. [OpenAI deprecation schedule](https://developers.openai.com/api/docs/deprecations), [ordinary text generation](https://developers.openai.com/api/docs/guides/text).

Hosted fine-tuning would still require API inference. It does not create an offline model. Diana's current policy optimizer changes bounded support rules; it does not train language-model weights. Any future weight training needs a supported training route, reviewed data, rights for that use and evidence that it improves the target task.

## Full textbook implementation

The complete main book, **Precalculus: An Investigation of Functions**, David Lippman and Melonie Rasmussen, edition 2.3, is now included: **9 chapters, 640 PDF pages and 4,037 indexed chunks**. The original PDFs total 25,400,384 bytes. File hashes, source versions, attribution and index hashes are recorded. Downloads, parsing and index construction used no model calls.

The publisher lists the main book under CC BY-SA 4.0. The separately licensed detailed solutions manual is excluded. Textbook content is excluded from training exports by default. [Publisher and chapter list](https://www.opentextbookstore.com/precalc/), [license](https://creativecommons.org/licenses/by-sa/4.0/).

| Chapter | Pages | Indexed chunks |
| --- | ---: | ---: |
| 1. Functions | 100 | 513 |
| 2. Linear Functions | 58 | 355 |
| 3. Polynomial and Rational Functions | 90 | 608 |
| 4. Exponential and Logarithmic Functions | 88 | 532 |
| 5. Trigonometric Functions of Angles | 58 | 321 |
| 6. Periodic Functions | 58 | 291 |
| 7. Trigonometric Equations and Identities | 44 | 364 |
| 8. Further Applications of Trigonometry | 82 | 489 |
| 9. Conics | 62 | 564 |

The reader searches all chapters and opens each result at its original page. Ranking uses the exact quoted passage, preventing unrelated neighboring blocks and broad skill tags from becoming misleading search snippets. Paging within a chapter reuses the PDF instead of downloading it again.

**Ask Diana about this chapter** explicitly selects the book and chapter. The tutor checks class or assignment access, searches the approved local index, and sends only relevant, attributed excerpts to the existing model route. Private assignment evidence remains separate and comes first. No book is silently added to an unrelated chat. Reference quotations do not certify an explanation, and equations in reference examples cannot be substituted for the student's current problem.

Operational assets live in `content/textbooks/precalculus-2.3` and `public/assets/textbooks/precalculus-2.3`, not only in ignored research artifacts. The application build traces the source indexes into the reader, search and tutor routes.

### What complete book access does not establish

Page coverage and source hashes establish availability and traceability. They do not establish perfect equation extraction, diagram understanding, retrieval relevance, or teaching quality. Original pages remain visible for mathematical layout. The latest continuation adds bounded checks for integer logarithms, rational special-angle values, sinusoid measures and canonical conics. This does not cover every topic or arbitrary problems in those chapters. Each added skill still needs educator review and independent validation.

## Three expert-agent reviews and corrections

The reviews are AI engineering and instructional critiques. They are not credentialed educator reviews or learning studies. The user will recruit educators.

- [Math education review](../research/reviews/2026-09-25-math-ai-review.md): inspected saved model responses, answer disclosure, preparation and full-book skill coverage.
- [Literacy and learning-science review](../research/reviews/2026-09-25-literacy-ai-review.md): inspected eleven saved reading responses, unsupported assumptions, reading tasks and evidence claims.
- [Architecture review](../research/reviews/2026-09-25-engine-ai-review.md): traced actual provider calls, source access and remaining scope.

Corrections made from those reviews:

1. Native PDF extraction precedes model extraction for readable uploads, retries and LMS materialization. Extracted math/diagrams still require review; no trusted problems are silently inferred.
2. Source retrieval tries validated local evidence before embeddings. Public reference search also precedes that fallback.
3. Basic text indexing no longer automatically requests embeddings. Optional expanded search remains available.
4. Practice preparation reads the complete bounded source, then orders blocks by page and position. Sources beyond the bounds are rejected with an explicit limit instead of silently using the first hash window. Exercise count remains capped at 30.
5. Reading questions display their exact source excerpt. Existing unreviewed prompts receive their source at display time; reviewed educator prompts and historical records remain unchanged.
6. One-passage comparison feedback consistently asks about two ideas in that passage. A genuine quotation cannot certify an unsupported interpretation.
7. Tutor support no longer treats an unrelated latest assignment attempt as the current problem. Without a selected problem it uses neutral guidance.

## Approval and fine-tuning status

The earlier approval rejection concerned transmitting student work and source excerpts through the proposed assessment path. The revised reading assessment performs local quotation checks and leaves interpretation unverified. Approval protections remain in force. No security control was disabled to make deployment possible.

The fine-tuning limitation is a provider offering constraint, not an application bug that can be bypassed. Current work strengthens retrieval, deterministic checks, prompt context and evaluation. No new fine-tuned weights or model-performance improvement are claimed.

## Remaining completion gates

- Educators review the curriculum, task specifications and saved response packets. AI critiques must not populate human reviewer approval fields.
- Expand bounded skill coverage chapter by chapter and test mathematical layout and diagram extraction against original pages.
- Revise future evaluation schemas to distinguish withholding an answer from insufficient evidence. Existing saved outputs remain immutable.
- Correct future benchmark family assignments: reused reading passages do not count as independent source families.
- Complete paired model trials within the approved budget, then collect blinded educator ratings before naming a quality winner.
- Measure API calls and costs over real workflows before claiming a percentage reduction.
- Run an approved student study with independent delayed tasks before claiming learning gains.

The current model smoke records contain 29 outputs and 11 paired cases. They do not establish a winning model or student benefit. Research and operational limitations remain visible instead of being replaced by an assertion that the whole roadmap is finished.

## Verification

Targeted tests cover all nine book assets and direct passage searches with network access forbidden, native PDF extraction, reference authorization, immutable practice prompts, local-first retrieval and selected-reference UI behavior.

- Integrated suite: **161 tests in 30 files passed**. The tutor client/API subset was rerun after adding bounded conversation history: **25 passed**.
- TypeScript and targeted ESLint passed. Production compilation, route generation and file tracing passed. The search, reader and tutor traces include all nine compressed chapter indexes and the manifest.
- Browser check: all-chapter search, Chapter 4 page selection, Chapter 9 reading, phone layout at 390 × 844, chapter-to-chat navigation and citation-to-reader navigation. The retired `/study-buddy` redirect remains; the new tutor is under `/classes/[id]/reference/[bookId]/ask`.
- One ordinary live tutor request used a public ellipse question and the selected Chapter 9 reference. It returned an explanation labeled **AI guidance** with a citation to PDF page 3. Following the citation opened **Ellipses Centered at the Origin**, printed page 581. This checks connection and traceability for that example, not general answer quality or learning outcomes.
- `learning-assess` and `learning-prepare` were deployed and confirmed ACTIVE, inventory version 8. Assessment digest: `946aadd32027365028441db9c8624bc3429d1da923d23cf15d6ac6ccd8fa5ffa`. Preparation digest: `13f39f5904ad4fe1707e3560a6187cf86bbafb229272fdc038a684bbc082ffb6`.
- The frontend changes are available in the running local application. This continuation did not publish a new Vercel frontend release. No additional model-comparison experiment was run.
