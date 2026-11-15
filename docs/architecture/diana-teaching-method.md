# Diana evidence-to-action teaching method

Status: implemented in part and under evaluation, updated September 27, 2026. This is the technical contract for Diana's original integration of source retrieval, bounded subject checking and assistance-aware tutoring. It describes authored code and behavior, not a claim of patentability, exclusive rights, educator approval or measured learning gains.

## The method

September 29 engineering extension: the independently reviewed row-stochastic
checker validates explicit matrix/vector constraints before any hint, example or
calculation. Contradictory givens stay unverified and prompt a source check; the
controller never silently normalizes or transposes them. The handwriting path now
prepares an explicitly selected local image region before recognition, using the
same displayed orientation for preview and crop. The student must still confirm
the transcription. These bounded additions are recorded in the current
[roadmap](../engineering/roadmap-execution.md); they do not extend the claim to
arbitrary source interpretation, complete course coverage or qualified recognition.

The September 26 implementation expansion and measured recognition/training runs are recorded in `docs/engineering/curriculum-recognition-release-2026-09-26.md`. Browser recognition is available after an explicit model download; drafts enter the same confirmation boundary as other student transcriptions. The September 27 database rollout enforces machine-origin provenance and adds atomic provider-usage receipts. The original two LoRA candidates were rejected by their comparisons and do not replace the fixed teaching controller or its source/evidence gates. Subsequent experiments retain their own versioned reports and rejection criteria.

For a declared course task, Diana chooses a bounded teaching action from the student's confirmed work and the strongest evidence it can actually verify. Every source claim and check retains its basis. Unconfirmed input, thin source matches and unsupported tasks stop before they can become a correctness or mastery claim.

```text
authorize student, class, task and source edition
  -> retrieve eligible passages from that exact source scope
  -> inspect evidence sufficiency and exact citation anchors
  -> confirm the student's problem statement and any machine transcription
  -> dispatch only to the task's declared subject checker or review rubric
  -> choose clarify / orient / hint / related example / fresh attempt
     from the active problem and recorded assistance
  -> save the response, source versions, check limits and assistance as a new revision
  -> consider independent skill evidence only on a fresh, confirmed,
     unassisted, eligible problem
```

This is a product method implemented across modules. A single successful citation, exact calculation or favorable model phrase cannot skip the remaining gates. Source quotations establish that words occur in a source, not that an interpretation is sound. A correct assisted answer does not establish independent knowledge.

## Current algorithm and boundaries

| Decision | Implementation | Invariant and limit |
| --- | --- | --- |
| Who may use a source | `server.ts`, `retrieval.ts`, `textbook-tutor.ts`, database policies | Assignment sources require owner/class/version scope; the public licensed reference remains separately attributed. |
| Which edition may be combined | `server.ts` assignment retrieval | The default selects one latest indexed version per source. An explicit request naming two versions of the same source returns `source_conflict` before ranking or a model call. A future comparison task needs its own review contract. |
| What passage is eligible | `textbook-search.ts`, `textbook-graph.ts`, `graph-retrieval.ts` | An exact anchor must contain enough query content words. For the public reference, a multiword query requires at least `ceil(0.6 × content terms)` together in the quoted passage. A one-term topic is still searchable. Book-wide graph boosts do not infer a skill; an explicit skill or selected chapter can break lexical ties only. |
| What an anchor means | `curriculum.ts`, `contracts.ts`, `textbook-server.ts`, `textbook-pdf-audit.ts` | Version and content hashes, block IDs, page spans and source assets are bound. The benchmark freshly extracts all returned rank-1-to-6 quotes from the pinned PDFs and compares exact text/offsets. It does not assess rendered PDF pixels, equation layout or diagrams. |
| When a reviewed mapping may affect ranking | `competency-mapping-review.ts`, `reviewed-mappings.ts` | Offline mapping resolution requires separate current operator publication state, complete current competency/source content, exact human review hashes and live permission expiry. Only equal lexical-score ties can move. No real educator mappings or production activation exist yet. |
| What is the current problem | `problem-state.ts`, `activity-session.ts`, `problem-store.ts` | Confirmations and notebook revisions are immutable. New or changed transcriptions need confirmation before targeted help. |
| What can be checked | `course-activities.ts`, `course-tutor.ts`, `local-tutor.ts`, bounded shared verifiers | Checkers declare input and limits. Numeric equality, quotation existence and rubric-guided reasoning remain distinct. Unknown methods and unsupported forms receive qualified guidance. |
| Which teaching action follows | `learner.ts`, `support-policy.ts`, `policy-runtime.ts` | Missing confirmation/evidence asks for clarification. Hints and different worked examples precede a fresh attempt. The learned candidate remains inactive and cannot bypass fixed gates. Assignment-wide history is not treated as the current problem. |
| Which practice comes next | `course-sequence.ts`, `course-path-schema.ts` | Available questions have explicit next, new-context and exact prerequisite links. Navigation saves changed work first, filters paused publications, and never treats navigation or assisted practice as mastery. |
| What counts as learning evidence | `learner.ts` and protected attempt records | The first eligible independent revision per problem may inform a provisional skill estimate; assisted work does not. No prospective learner outcome has yet been measured. |
| What is published | `course-publication.ts`, `publication-store.ts`, review API and database controls | Exact content versions require trusted, current, independent educator approvals. No real course publication or educator review receipt has been created. |

The latest retrieval correction was driven by a measured regression: automatic graph skill inference from an unrestricted question moved two chapter topics below the plain lexical result. Restricting graph influence to explicit skill selection or a chosen chapter and using it only for lexical ties restored the lexical chapter ranking. The stricter content-word overlap removed four out-of-scope passage matches in the engineering probe. This is an evidence-quality improvement, not evidence that arbitrary textbook questions are answered correctly.

The Work chat includes the selected `assignment_problems.id` when asking Diana. The server validates the unit against the signed-in owner and assignment, loads that saved text with an explicit source-state label, then looks up a matched assessment. This closes the prior gap where the chat displayed a specific math problem but the teaching controller received only assignment-wide context. A matched assessed attempt is still required for problem-specific adaptation; free-form conversation alone does not prove a skill or create an assessment. Student confirmation of an imported **problem** has distinct provenance; a work review timestamp is never used as source confirmation. Automatically seeded problem lines can be confirmed against the assignment in Work and are locally reindexed afterward. Generated source-analysis and writing work steps stay task prompts, not verified passages.
For targeted Ask Diana requests, an imported problem that still needs wording confirmation now returns a 409 clarification before any provider request. Student-entered and explicitly confirmed problem text can proceed. This gate applies to a selected work problem; general assignment conversation has a separate context boundary.

When a student selects the public reference in Ask Diana, the displayed anchor now comes from the retrieved textbook result rather than the provider's free-form label. If the selected book has no matched passage or is unavailable, the anchor says so. This validates the displayed locator, not the truth of every claim in the provider's explanation; the response remains marked as AI guidance.
The reference payload explicitly reports `answerabilityVerified: false`, and the model prompt describes passages as search matches that have not been reviewed as answers.

## Reproducible retrieval comparison

Run `npm run learning:retrieval-benchmark` in this checkout. The local runner loads all nine pinned public textbook chapter indexes, evaluates the same 18 chapter-topic prompts and four synthetic out-of-scope questions under two conditions, checks returned index anchors and writes an immutable report. The book catalog supplies the chapter labels. They are visible engineering proxies, not held-out educator passage labels.

| Condition | Chapter hit at first result | Chapter hit within six | Clean out-of-scope searches | Index anchor violations |
| --- | ---: | ---: | ---: | ---: |
| Before stricter passage evidence, lexical | 17/18 | 18/18 | 0/4 | 0 |
| Before correction, inferred graph | 15/18 | 17/18 | 0/4 | 0 |
| Current lexical | 17/18 | 18/18 | 4/4 | 0 |
| Current graph, no selected skill/chapter | 17/18 | 18/18 | 4/4 | 0 |

Initial report: `artifacts/learning-engine/research/retrieval-benchmark/textbook-1790404623897-06ca0fe9.json`. After the passage threshold: `textbook-1790404774257-5d32b108.json` in the same directory. The current report is `textbook-1790415843173-1af63a42.json`. It preserves query labels, returned chapter order, timings, source asset/index hashes and explicit limits. The runner verified all nine original PDF byte hashes and freshly extracted every returned passage across ranks one through six: 214 result occurrences, 103 distinct full anchor tuples and 88 PDF pages, with zero anchor conflicts or text-offset violations. Visual page layout was not independently rechecked. The run blocked `fetch` and observed zero attempts. The graph and lexical conditions currently tie on these book-wide probes because no reviewed skill was selected. That is the intended safe behavior. Chapter seven's "trigonometric identities" topic first finds chapter five; both chapters discuss trigonometry, so a chapter proxy miss is not an expert judgment that the passage is useless.

These results do **not** measure passage relevance, answerability, citation truth against the rendered page, factual correctness of an explanation, improved tutoring or student learning. The PDF audit validates extracted text for the returned results only. These are small development probes on one public textbook. Use separate held-out sources and human labels before a quality claim.

## Ownership and dependencies

| Asset | Diana authored or controlled | External dependency / rights boundary |
| --- | --- | --- |
| Source binding, graph traversal, decision gates, notebook and evaluation tools | Diana code and versioned method contracts | Third-party libraries and generic retrieval concepts are not exclusive. |
| Practice questions, hints, example selection and rubric drafts | Authored Diana content with stable hashes | Human subject review remains pending. |
| Precalculus reference | Diana extraction/indexing and page-linked integration | Lippman and Rasmussen, *Precalculus: An Investigation of Functions*, edition 2.3, CC BY-SA 4.0. Source text and license are not Diana's exclusive property; training permission is excluded. |
| Student responses and prospective trajectories | Diana can protect and analyze only permissioned records | Student ownership, privacy, consent, institution rules and actual study approval govern use. No learner dataset or outcome can be inferred from fixtures. |
| Language models and recognition models | Diana can own routing, lawfully trained adapters, confirmation boundaries and evaluation | Foundation models, vendor APIs and open-weight licenses remain third-party. No LLM adapter is active. Pinned Whisper and TrOCR browser inference is available after download consent; its output remains an unverified draft requiring student confirmation. |

The integrated decision policy and its source/assistance constraints are the candidate proprietary method. Defensibility depends on implementation quality, reviewed teaching content, lawfully accumulated feedback data and comparative outcomes. Writing this method down alone does not establish a commercial moat.

## Evaluation required to establish value

1. Assemble consented and licensed source families across multiple books and subjects. Reviewers label relevant **exact passages**, answerable/unanswerable questions, edition conflicts, figure/table dependence and prerequisite explanations without seeing the system's rankings.
2. Hold out whole books, families and topic templates. Compare ordinary keyword search, generic RAG, the source-bound Diana retriever and explicit-skill/chapter graph routing at fixed candidate counts and cost limits. Report recall at k, passage precision, false evidence, exact citation verification, abstention and latency with confidence intervals where sample size permits.
3. Compare the full Diana teaching action to fixed hints and ordinary retrieval-only guidance. Remove one component at a time: source provenance, prerequisites, bounded checker, confirmed state and assistance history. Keep evaluation inputs and tutor budgets identical.
4. Have two qualified educators assess instructional correctness, support timing, alternative valid reasoning, accessibility and whether the guidance leads to an independent next step. Adjudicate disagreements with a separate reviewer. AI reviews are preparatory only.
5. With approved consent, prospectively measure fresh and delayed independent tasks plus completion and frustration. Retain mixed or null results. Do not infer impact from synthetic trajectories, unit tests or ratings of a single output.

The offline teaching-action ablation in `lib/learning-engine/teaching-ablation.ts` now executes the current decision policy, a fixed-hint baseline and a source-unaware variant on the same held-out cases. Its six authored smoke cases exercise distinct branches and surface one evidence-gate violation in the source-unaware arm. The report separates fixed-gate cases from discretionary choices and withholds case-level details for student or purported educator data. These authored labels test code paths only. A reviewed result still needs an independently authenticated corpus and rights/reviewer records, genuine held-out source families and real educator action labels; a learner-effect claim still needs the prospective study above.

## Completion condition

The method is complete for a **declared** course/task scope when source retrieval and citations are validated for that scope, trusted content and subject checks are reviewed, the student workflow is connected, model failures retain useful local behavior, real educator assessments exist and a prospective study supports any learning-effect claim. Additional subjects and grade levels are explicit modules with their own evidence, not silent extensions of this contract.
