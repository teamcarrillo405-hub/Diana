# Literacy and learning-science review

Date: September 25, 2026

**Reviewer identity:** AI agent assigned a literacy and learning-science review role. This is an engineering and instructional critique, not a credentialed educator's review, human rating, validation study or evidence of student benefit. No reviewer credentials or educator scores were created.

## Scope and decision

Reviewed the local reading quote checker, practice preparation, learner estimates, study protocol and all saved reading outputs in the two model smoke runs. Reviewed 11 actual provider responses: six Terra reading responses and five Luna reading responses. The Luna comparison response is absent. Inputs are authored engineering fixtures, not student work.

The low-API direction is appropriate. Diana can own source navigation, passage retrieval, structured reading routines, exact quotation checking, practice records and reviewed example selection. Generative explanations can be an optional escalation. The current local reading checker is a useful narrow capability; it is not yet a complete reading tutor or interpretation assessor.

**Review disposition:** retain the quote checker and its limits; repair source selection and align feedback before expanding reading practice. Human educators should review the resulting tasks and rubrics before any efficacy or grade-level claim.

## Prioritized findings

### P1: Reading practice can refer to an arbitrary paragraph instead of the visible passage

**Evidence:** `supabase/functions/learning-prepare/index.ts:29` fetches up to 100 blocks ordered by ID. IDs are hashes, not page order. Lines 45–49 generate all six reading questions from the first eligible block and stop. `components/learning/learning-material.tsx:108–111` selects a generated question by page if possible, but falls back to the first question. Lines 171–174 display the question and response field without displaying its actual passage.

**Effect:** a student may be looking at page 8 while being asked for the main idea of an unrelated block. Expanding a textbook corpus will make this mismatch more consequential. Neither an AI model nor a keyword index fixes this interaction by itself.

**Bounded improvement:** pass the selected page and block IDs to preparation; validate that the block belongs to the pinned document version and assignment; show the linked excerpt and page label beside the prompt. Generate questions only for the chosen passage. Use page/offset order for a fallback, with an explicit passage choice. Return an honest empty state when a suitable passage is unavailable.

**Acceptance check:** select two different pages with distinct passages and verify that both displayed excerpts, questions and saved attempts retain the respective block IDs. No provider call is needed.

### P1: A saved model hint introduces an unsupported assumption

**Evidence:** Terra `reading.comparison.01`, in `artifacts/learning-engine/research/model-smoke/gpt-5.6-terra/outputs.jsonl:12`, asks for a detail showing that the principal supported the project. The fixture says only that students proposed expansion and the principal requested a maintenance schedule. `lib/learning-engine/evaluation-corpus.ts:30–39` does not establish the principal's support.

**Effect:** the tutor's question can steer a student toward an inference presented as a fact. Exact quotation verification would not catch this because the quoted words themselves are present.

**Bounded improvement:** include a rubric dimension for unsupported assumptions inside questions, not just answers. A safer prompt asks how the responses differ, then asks whether the text gives enough information to infer the principal's attitude. Maintain separate fields for explicit information, possible inference and unresolved uncertainty.

**Acceptance check:** educator reviewers flag the existing output for correction and assess a revised response against the same passage. An automated regression should check this exact known failure, while broader interpretation quality remains subject to review.

### P1: The current output schema confuses withholding an answer with missing evidence

**Evidence:** all six Terra reading rows set `abstain: true` while giving substantive hints; all five Luna reading rows set `abstain: false` and also withhold the direct answer. Both sets use `answer: null`. The reading fixtures expect `abstain: false` at `lib/learning-engine/evaluation-corpus.ts:41`.

**Effect:** an abstention percentage can rank ordinary tutoring behavior as failure even when the model has adequate evidence. It cannot establish which tutor teaches better.

**Bounded improvement:** separate `responseMode` (`hint`, `explanation`, `clarification`) from `evidenceStatus` (`sufficient`, `missing`, `conflicting`) and `answerDisclosure`. Score whether the help matches the learner's request and support stage. Keep JSON validity, quote fidelity, unsupported claims and helpfulness as different measures.

**Acceptance check:** both existing sets can be annotated without treating a useful hint as an evidence refusal. Do not infer a model winner from these 11 related responses.

### P2: Generic local feedback is safe but does not yet provide a useful teaching sequence

**Evidence at initial review:** `supabase/functions/_shared/learning/reading.ts:5–11` maps each skill to one static question. `learning-prepare/index.ts:16` asks for two details or ideas within one passage, while the original `reading.ts:11` asked for evidence from each passage. Vocabulary and main-idea tasks receive the same quote-handling guidance at lines 32–42 even when a direct quote was not required. The narrow comparison wording mismatch was corrected during this review; the wider support-sequence work remains.

**Effect:** students can repeatedly receive the same prompt without a clearer next step. The comparison mismatch can make them search for a second passage that does not exist. Useful reading support should help a student act on the text, not merely produce another general question.

**Bounded improvement:** store task-specific, reviewed support steps with each exercise. For one-passage comparison: identify idea A, identify idea B, select a detail for each, then explain a similarity or difference. For vocabulary: select the word, inspect the surrounding sentence, propose a meaning, and substitute it into the sentence to check fit. Show one step at a time, with a reviewed example available after an attempt. Mark all scaffold use as supported practice.

**Acceptance check:** tasks that use one passage never ask for a second source; no-quote tasks are not presented as citation failures; the next step changes after the student has completed it.

### P2: Quote matching needs format-aware limits and clearer student-facing language

**Evidence:** `reading.ts:32–35` supports double quotation marks, quotes of 3–600 characters without line breaks, at most four quotes, and exact substring matches. Longer quotes, multiline quotations and a fifth quote are silently omitted. PDF layout whitespace can cause a valid visual quotation to miss. The reader button remains “Check my work” at `components/learning/learning-material.tsx:173`; the explicit interpretation limit is inside a disclosure at line 174.

**Effect:** students may think an interpretation has been checked or that a formatting difference means their quotation is unsupported.

**Bounded improvement:** use “Check quotes” for this reading operation, with a short visible statement that the explanation remains theirs to review. Report how many quotes were checked and any unsupported formats. Preserve original text and offsets; a whitespace-normalized candidate can say “Possible match; compare the original” rather than silently become an exact verified quote. Add a selection-to-quote action so students can insert accurately anchored source text without retyping it.

**Acceptance check:** multiline, curly quotes, fifth-quote and PDF line-break examples all receive explicit outcomes. An unrelated exact quote still does not produce a correct-interpretation claim.

### P2: Learner estimates are engineering signals, not validated mastery

**Evidence:** `lib/learning-engine/learner.ts:22–28` correctly excludes assisted, unconfirmed, ineligible and unknown outcomes. It then produces a smoothed success fraction and labels confidence solely by counts of fewer than 5, fewer than 15, or at least 15. It does not require distinct problem families, spacing or delayed transfer. The value for no eligible attempts is 0.5. Current reading assessments remain ineligible at `reading.ts:22`, which prevents accidental reading mastery updates. `lib/learning-engine/server.ts:164` includes estimates in tutor context.

**Effect:** a model could read “established” as established learning, although it currently means a count threshold. A number of 0.5 with no evidence is a prior, not a measured 50% skill level.

**Bounded improvement:** name this field `evidenceCountBand`, or include an explicit unvalidated-estimate qualifier in tutor context. Use `null` for a student-facing estimate without observations. Add family diversity and delayed independent tasks before making a mastery claim. Continue to exclude reading quote checks from knowledge estimates.

**Adjacent legacy risk:** `app/(app)/classes/[id]/mastery-panel.tsx:133–148` contains a self-selected practice rating that calls `mastery-actions.ts:53–98`, writing an `ai_quiz` event and changing mastery without a saved quiz response. Repository search found no current import of that panel, so this review does **not** claim it is active in the class UI. The concept page still presents `mastery_level` as “Mastery evidence” at `app/(app)/concepts/[id]/page.tsx:149–152`. Audit historical provenance and remove or relabel the unused writer before reusing it.

### P2: The reading research corpus has almost no passage diversity

**Evidence:** all six reading strata use the same school-garden paragraph. Variants alter the year at `lib/learning-engine/evaluation-corpus.ts:30–32`. Family labels vary by skill at lines 15–16 even though the passage is shared. Thus the 180 reading cases do not represent 180 readings or six independent source families.

**Effect:** comparisons and uncertainty calculations can exaggerate evidence if these cases are treated as independent documents. The corpus does not support claims about high-school literary interpretation, competing arguments, longer texts or struggling readers.

**Bounded improvement:** use one shared source-family ID for this passage across skills. Add independently sourced, permitted fiction, informational text and argument; include multiple acceptable interpretations and educator-authored rationales. Include tasks suitable for the actual grade bands and record language/accessibility needs without inferring them from demographics.

**Acceptance check:** partition leakage checks treat every garden variant as one family. Reports state the number of distinct passages and their grade/task coverage, alongside case counts.

## What a useful reading mode can do without a model

| Student action | Diana-owned behavior | Optional model escalation |
| --- | --- | --- |
| Open a chapter | Show the original, selected passage and source anchors | None |
| Find evidence | Lexical search, phrase search and cached retrieval; show exact matches | Semantic retrieval when ordinary search has insufficient results |
| Understand a passage | Reviewed gist, vocabulary and comprehension-monitoring routines | A tailored explanation after the student identifies the confusing part |
| Draft a response | Claim/evidence/reasoning fields with optional starters | Feedback on a draft when requested, with source context and limits |
| Check quotations | Exact offsets and original-page comparison | None |
| Practice again | Reviewed item bank, spaced scheduling and new task selection | New task drafting for later review, not automatic answer-key authority |
| Track progress | Record attempts, help used and independent reviewed evidence | None |

This is an architectural recommendation. This review did not implement these additions or prove that a no-model experience improves reading outcomes.

## Educational evidence and grade applicability

- The 2022 IES/What Works Clearinghouse reading-intervention guide covers **grades 4–9**. Its comprehension recommendations include knowledge building, questions, gist routines and comprehension monitoring. It also addresses decoding and fluency. Diana's current quote checker does not implement the entire intervention model and should not be described as a substitute for it. [IES grades 4–9 guide](https://ies.ed.gov/ncee/wwc/practiceguide/29)
- For grades 9–12, the older 2008 IES adolescent-literacy guide explicitly covers **grades 5–12**. It supports explicit vocabulary and comprehension instruction, discussion, engagement and trained specialist intervention where needed. These are instructional design references, not evidence that Diana's implementation works. [IES adolescent-literacy guide](https://ies.ed.gov/ncee/wwc/practiceguide/8)

Both sources were checked September 25, 2026. The first guide's evidence cannot simply be relabeled as a grades 10–12 result. Neither validates AI-authored feedback or this product.

## Human-review and study handoff

The existing protocol usefully separates assisted practice from delayed independent transfer. `lib/learning-engine/study-protocol.ts:58–70` excludes assisted or unreviewed primary outcomes, exposes missingness and always keeps `learningGainsEstablished: false`. Preserve those protections.

Before recruitment, educators and a study analyst should specify the target grades, reading profiles, source complexity, comparison condition, instructional exposure, scoring rubric, assessor blinding and planned analysis. The schema's minimum of 20 per arm is not a power calculation. A collection of approval IDs also requires real underlying approvals.

Give educators this AI review, the original passages, prompts and blinded outputs. Ask them to resolve unsupported inferences, task alignment, amount of help and acceptable interpretation ranges. Keep this report separate from `reviews.jsonl`; AI-authored judgments must never be entered as the required human ratings.

## Limits of this review

Static code and artifact review plus one bounded correction: the local comparison prompt now asks for evidence for two ideas within the selected passage. Two regression tests were added in `lib/learning-engine/reading-local.test.ts`, covering single-passage comparison and an unsupported interpretation containing a genuine quotation. All four tests in that file passed. The checker still returns `inconclusive`, `unknown` and `eligibleForKnowledge: false` when a quote matches; no interpretation-grading or provider call was added. This subtask did not deploy the correction.

No classroom observation, student recruitment, learner testing, credential verification or production UI testing occurred in this subtask. Model-output observations are specific to the saved responses and do not establish general superiority of either model.
