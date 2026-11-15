# Research findings and product corrections

September 25, 2026. This work improves the existing Diana application. The remaining research requirements are described below in practical terms, with completed work separated from evidence still to collect.

**Later September 25 update:** all nine main-book chapters are now included, and the three AI expert reviews produced additional source, practice and API-dependency corrections. See [the current local-core implementation](../engineering/learning-engine-local-core.md). The single-chapter measurements below document the earlier checkpoint.

## Product corrections

- Removed the shared robot, “I'm stuck” control, floating Capture control and their obsolete component files. The current header Add menu and profile settings remain.
- Materials now live under **Classes → class → Materials**. Assignment files are collected there with their assignment names. The assignment workspace has a **Class materials** link; the reader has **Open assignment** and a class breadcrumb.
- Existing `/study/material/[assignmentId]` links redirect to the class reader when the assignment has a class. Original files remain readable without experimental AI enrollment. Experimental preparation, retrieval, practice and offline tools retain their enrollment checks.
- Notes have their own tab. Rubric and syllabus controls are collapsed within Materials. Algebra/precalculus classes offer a clearly labeled public reference textbook.
- Files retain their existing assignment and owner records. This is navigation and access correction, not a destructive storage migration.

## What the research terms mean

| Term | Plain meaning | Completed here | Still needed |
| --- | --- | --- | --- |
| Licensed textbooks | Books whose terms permit the intended reuse; buying a PDF alone does not settle this | Selected an explicitly licensed algebra reference and processed an actual chapter | More subjects, editions and page layouts with recorded rights |
| Qualified reviewers | People with relevant teaching/assessment experience who can judge the help Diana gives | Prepared 18 blinded output packets and a reproducible review process | Recruit and verify two subject reviewers and an adjudicator |
| Actual model comparisons | Send the same cases to named models and save their real responses, settings and costs | 29 saved responses from two OpenAI models, including 11 paired cases | Complete the interrupted run, educator scores and retrieval/adaptation comparisons |
| Student learning evidence | Show students can solve unfamiliar problems independently later | Implemented study allocation and reporting tools; researched teaching guidance | An approved, powered study with real participants, consent and delayed assessments |

### A real textbook, with recorded rights

The selected book is **Precalculus: An Investigation of Functions**, David Lippman and Melonie Rasmussen, second edition 2.3. The publisher lists the main book under CC BY-SA 4.0. That license permits commercial reuse subject to its terms, including attribution and share-alike obligations for adaptations. The separately licensed detailed solutions manual was excluded. See the [publisher](https://www.opentextbookstore.com/precalc/) and [license](https://creativecommons.org/licenses/by-sa/4.0/).

Downloaded and processed Chapter 2, Linear Functions: **58 pages, 429 structured blocks, 355 retrieval chunks**. Three topic searches returned six results each; every returned anchor matched its stored source span. This checks parsing and traceability. No expert relevance labels were supplied, so it does not establish retrieval accuracy. The chapter was processed locally and was not sent to model experiments or training.

Artifacts: `artifacts/learning-engine/research/open-textbook/linear-functions.pdf`, `ATTRIBUTION.md`, and `textbook-check.json`. SHA-256: `b4a43ce237751b4b40aa6955bee8d375d11fbda778d1b461ba99aa9eb329efe4`.

OpenStax was excluded from this import: the reviewed College Algebra preface and current footer give inconsistent reuse signals, and the footer states AI-related permission restrictions. We did not assume that older license text authorized this use. [Reviewed page](https://openstax.org/books/college-algebra/pages/preface).

### Teaching research and reviewer requirements

The IES algebra guide supports analyzing solved problems, recognizing algebraic structure and choosing among strategies. Its evidence ratings differ: the first two recommendations carry minimal evidence and strategy selection carries moderate evidence. This informs what to test; it is not evidence that Diana improves learning. [IES algebra practice guide](https://ies.ed.gov/ncee/wwc/practiceguide/20).

The reviewed IES reading intervention guide targets grades 4–9. It can inform overlapping grade 9 needs, but must not be generalized as validation for all grade 10–12 reading work. [IES reading guide](https://ies.ed.gov/ncee/wwc/practiceguide/29).

Reviewer selection criteria for the pilot: current or recent teaching/assessment experience in the specific high-school subject, familiarity with the target standards, ability to explain the rubric, and declared conflicts. Use a math educator for algebra/geometry, a secondary literacy educator for reading, and a third qualified adjudicator for unresolved differences. These are proposed study criteria, not an assertion that reviewers have already been hired or certified.

The 18 Terra output packets are ready in `model-smoke/gpt-5.6-terra/reviewer-packets.json`. Keep `operator-mapping.json` away from raters. Have reviewers independently score correctness, source support, instruction quality, appropriate help and safety; resolve disagreements before comparison. No educator ratings are fabricated.

### Actual provider runs

Both models received the same pinned synthetic source-baseline cases and tutoring policy, with reasoning set to `none`. No student records or textbook chapter content were used. Each planned run sampled one case from each of 18 strata.

| Model | Saved results | Status | Accounted cost |
| --- | ---: | --- | ---: |
| GPT-5.6 Luna | 11 / 18 | Incomplete: moderation service unavailable on the next request | $0.11 |
| GPT-5.6 Terra | 18 / 18 | Smoke run complete | $0.18 |

There are **11 paired cases**, with valid structured output on both sides. The unresolved Luna request retains a **$0.01 reservation**. Costs use the endpoint's per-request cent accounting, provider token counts and configured official rates; they are not an invoice reconciliation. The overall $10 batch and $100 monthly caps remain. Experiments are switched off again.

Rates checked: Luna $0.20 input / $1.20 output and Terra $2 input / $12 output per million tokens. [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra).

**No model winner is established.** The existing tutoring policy often withholds final answers. Answer-key accuracy therefore cannot serve as a teaching-quality score. Luna supplied two math answers, both matching after unit normalization; Terra supplied none. Missing answers are now explicitly recorded, and empty quote lists are no longer counted as citation passes. Educator ratings must evaluate the hint itself. These runs do not compare retrieval arms, adaptive policies or student outcomes.

Reproducible records: `artifacts/learning-engine/research/model-smoke/comparison.json`, per-model `experiment.json`, `requests.json`, `outputs.jsonl`, and `summary.json`. Do not replace the unresolved request with a new ID just to obtain a result.

## Fine-tuning decision and implemented alternative

OpenAI's current deprecation schedule restricts new fine-tuning jobs: new organizations lost access May 7, 2026; organizations without recent fine-tuned inference lost access July 2; active existing customers lose new-job access January 6, 2027. Existing inference is tied to the underlying model's lifetime. This is a provider access constraint, not a Diana code defect. Our account-specific eligibility remains unverified. [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations).

The same schedule retires the hosted Evals platform in November 2026. Diana therefore keeps its experiment manifests, outputs, scoring and policy selection in its own repository and database. Retrieval, task instructions and measured prompting remain supported optimization approaches. [OpenAI model optimization guidance](https://developers.openai.com/api/docs/guides/model-optimization).

Implemented `learning:optimize-policy`: compare bounded support policies over separate train/development/test document families. Confirmation, source-evidence and unsupported-result checks cannot be optimized away. The test partition cannot select a candidate. Promotion requires two reviewers, at least five held-out families and improvement. No candidate is deployed automatically.

The engineering fixture selected the **existing policy**. It showed no improvement, had only one held-out family and lacked educator review. The report correctly retained the current behavior. See `artifacts/learning-engine/research/policy/policy-report.json`.

**Policy optimization is not model fine-tuning.** No language-model weights were trained. Content-bound rights, consent and review receipts still protect training exports; a future supported OpenAI training route would require verified eligibility and its own bounded run.

## Automatic approval review resolution

Automatic approval review had rejected assessment deployment because the reading path could transmit student responses and source excerpts to OpenAI. The reading assessment now performs exact source-quote checks inside the assessment service without a provider call. Unconfirmed extraction is excluded. It explicitly keeps interpretation and mastery unknown.

The revised `learning-assess` is ACTIVE, with bundle digest `45617efcab63cb4b0e238a48723002730f9c0548fb37d1e8df85686e78159179` (current inventory version 7). The extended deterministic math checkers are included. Browser QA submitted the synthetic answer 5 to `3x + 5 = 20` and received “The calculation checks out.”

Approval protections were preserved. The earlier experiment block was resolved by restricting inputs to pinned authored fixtures. A separate cross-task sharing request remains unused; no other task received private workspace details, and that sharing is not needed for these corrections.

## Updated execution order

1. **Curriculum:** expand the verified-license corpus across algebra, geometry and grade-appropriate reading; annotate held-out chapter families and difficult layouts. Measure relevance and source fidelity separately.
2. **Expert evaluation:** verify reviewers, calibrate on separate examples, rate the prepared packets and resolve disagreements. Keep teacher-facing answer checking distinct from student-facing hints.
3. **Model and policy comparisons:** reconcile the reserved request, complete paired sampling, then test retrieval, verifier and learner-state ablations with recorded cost and latency. Select a policy using development data before inspecting held-out results.
4. **Multimodal validation:** collect authorized real scans, handwriting and diagrams, record gold regions and corrections, measure extraction error and confirmation burden. Existing native PDF tests do not cover these modalities.
5. **Learning study:** preregister an educator-reviewed delayed-transfer assessment and analysis, determine sample size, obtain the applicable consent, and collect independent outcomes. Publish effect estimates and missing-data limits before making learning-gain claims.

OpenAI Startup Fund describes transformative AI companies and includes education; its published about page does not require every applicant to have RAG or a fine-tuned model. The defensible case is measurable product value, distinctive engineering and credible evidence. This work does not guarantee funding. [Startup Fund](https://openai.fund/about).

## Verification and release scope

The focused learning/material-access suite passed 16 files and 68 tests. TypeScript, changed-file lint and scoped patch-format checks passed. Browser QA verified class navigation, selected PDF rendering and live deterministic feedback. The final production build passed and is recorded in `artifacts/learning-engine/build-design-research-correction-20260925.log`.

A temporary production server with retrieval explicitly disabled rendered the original PDF successfully under Classes. Its phone-width view had no document overflow (375 CSS pixels of content and viewport). The temporary server was stopped after verification; the corrected class library is left open on port 3027.

Interface changes run locally on port 3027. Assessment and experiment services are deployed to the existing Supabase project; experiments are disabled. No frontend production release, educator review, student efficacy study or language-model fine-tuning is claimed.
