# Diana mathematics review

Date: 2026-09-25  
Reviewer: AI agent assigned to mathematics education analysis  
Status: preliminary AI review; no credentialed human educator review has occurred in this report

## Scope and conclusion

I inspected the pure mathematical checkers, practice preparation, support policy, learner evidence aggregation, experiment construction/scoring, and all six mathematics outputs from each saved model run. The twelve outputs are actual provider responses to authored engineering fixtures. They are not responses from real students. I did not conduct a classroom study, assign human reviewer receipts, alter runtime code, or independently execute the tests in this review.

Diana has useful mathematical engineering: exact rational arithmetic, bounded parsing, domain checks, explicit unsupported results, and restrictions on what can become knowledge evidence. Its current automatic checker and practice preparation cover a limited subset of algebra. Loading a full precalculus book can make all chapters readable and searchable. It does not make every exercise automatically assessable or establish that students learn more.

## Priority findings

### P1. The model comparison confuses tutoring behavior with ability to solve

**Evidence:** `lib/learning-engine/experiments.ts:62–66` asks for an answer field alongside student-facing feedback. `supabase/functions/_shared/system-prompts.ts:19–22` instructs study help to explain the next concept without final work; the composed prompt includes that rule at line 92. `lib/learning-engine/evaluation-pipeline.ts:33–45` scores missing answers as false and compares a single abstention flag against the fixture's answerability.

All six Terra mathematics outputs use `answer:null, abstain:true`, while providing mathematically useful hints. Luna uses `abstain:false` on the same six cases and supplies two final answers. Therefore the current result cannot rank mathematical competence or instructional effectiveness.

**Bounded fix:** Use separate evaluation contracts for answer verification and tutoring. In tutoring evaluation, score next-step correctness, relevance to the current attempt, appropriate help, source support, and answer leakage. Record clarification reason separately from deliberate answer withholding. Preserve the frozen original artifacts and version any new prompts, fixtures, and allowlisted hashes. Do not silently reinterpret the current benchmark as a teaching-quality score.

**Acceptance evidence:** A useful hint on an answerable problem is not counted as factual inability; a missing source is counted as a clarification need; revealing a final answer in hint mode is flagged independently.

### P1. Hint mode leaked final answers in two saved Luna responses

**Evidence:** `artifacts/learning-engine/research/model-smoke/gpt-5.6-luna/outputs.jsonl:3` gives the complete solution to `x+y=5, y=3`, and line 5 gives the full rectangle area calculation. Both are mathematically correct. Both expose the final result in the student-facing `feedback` field, so hiding the separate `answer` field would not prevent disclosure.

**Bounded fix:** State the intended instructional mode explicitly. Permit a complete, educator-approved worked example with different values; retain a next-step prompt for the student's current task when the goal is an independent attempt. Add answer-disclosure checks on feedback, not just the structured answer field. A text match alone will not detect every equivalent mathematical answer, so combine deterministic checks for supported forms with educator review.

**Acceptance evidence:** A hint requests one meaningful student action. A related worked example teaches a method and then returns to the original problem. A check after a student answer can acknowledge a verified result without falsely calling it unaided understanding.

### P1. Full-book ingestion currently exceeds automatic practice coverage

**Evidence:** `supabase/functions/learning-prepare/index.ts:29` selects at most 100 blocks ordered by their hashed ID. Lines 36–44 accept one detected x-equation and construct a candidate-value question. Lines 51–57 cap and store unreviewed exercises. The assessment endpoint supports more specifications at `supabase/functions/learning-assess/index.ts:19–26`, but the preparer does not create those other mathematical kinds. `lib/learning-engine/offline-package.ts:10–14` supports a still narrower exercise contract.

**Impact:** A full book can appear available while only an arbitrary subset of equation blocks produces practice. The same chapter may contain graphs, interpretation, functions, proofs, or systems which the preparation path cannot assess. A correct result for one x-value does not answer a task asking for all roots, a graph, or a modeling explanation.

**Bounded fix:** Give each chapter separate reading, retrieval, practice, and assessment capability statuses. Select practice by section and source-page order, not hash order. Create an explicit exercise manifest that retains the original task, section, assumptions, response type, and checker capability. Keep unreviewed extracted exercises visibly provisional. Expand the offline contract only alongside matching deterministic checks.

**Acceptance evidence:** Chapter-level counts distinguish available source pages from reviewed exercises and supported checker types. An unsupported task offers its source and appropriate help, without a fabricated verified grade.

### P1. Support selection can use a different problem's result

**Evidence:** `lib/learning-engine/server.ts:151–163` accepts assignment ID but no current problem or skill, reads recent attempts for the entire assignment, and passes the newest assessment to `chooseSupport`. At `lib/learning-engine/support-policy.ts:17`, any supported outcome selects a new independent attempt. The caller is `app/api/diana/study-buddy/route.ts:241`.

**Impact:** If a student solves one problem and then asks about another, the first problem's successful result can control the second problem's support decision. This is an instructional relevance risk, not evidence that an actual student encountered it.

**Bounded fix:** Pass current problem ID and source version where known, scope the latest assessment and help count to that problem, and use orientation when the current problem is unknown. Preserve assignment-wide skill estimates separately.

**Acceptance evidence:** A supported attempt on problem A cannot suppress orientation or a hint on unattempted problem B. Moving between source versions does not carry an old assessment into a revised question.

### P2. Misconception handling is not established by these checks

**Evidence:** `supabase/functions/_shared/learning/algebra.ts:164–169` returns generic value-difference feedback. `lib/learning-engine/support-policy.ts:14–21` uses confirmation, evidence, a supported boolean, assessment presence, and help count. Neither contract contains intermediate reasoning or a supported misconception hypothesis. The sample student response is always `0` for math at `lib/learning-engine/evaluation-pipeline.ts:16`.

**Bounded fix:** Add authored cases with a student step and a known mathematical error pattern, such as changing only one side of an equation or omitting a cross term. Check the actual step where possible, ask one discriminating question, and use provisional language. Do not diagnose a misconception from one final number alone. Include valid alternative strategies and correct answers with weak explanations.

**Acceptance evidence:** Feedback identifies the relevant operation or representation without inventing a student's thinking. Two different errors on the same problem need not receive the same hint.

### P2. The support ladder is a bounded heuristic, not a validated teaching policy

**Evidence:** `lib/learning-engine/support-policy.ts:8` sets example help after two support events and a fresh attempt after three. Lines 39–55 correctly separate partitions and prevent automatic promotion without reviewed examples and held-out improvement. `lib/learning-engine/learner.ts:28` derives its confidence label from event count thresholds rather than a measured calibration study.

**Bounded fix:** Keep the current conservative policy until educator-reviewed trajectories support a change. Evaluate multiple turns, not just isolated output labels. Track whether the student can explain a step, select an alternative method, and solve a new problem after help. Label the current skill estimate as a product heuristic with its evidence count, not a calibrated probability of mastery.

### P2. One geometry benchmark sentence invites avoidable clarification

**Evidence:** `lib/learning-engine/evaluation-corpus.ts:26` says two triangle angles measure a number “and 60 degrees.” This is conventional classroom shorthand, but Terra's output at `artifacts/learning-engine/research/model-smoke/gpt-5.6-terra/outputs.jsonl:6` asks whether the first angle is in degrees.

**Bounded fix:** In the next version of the ordinary geometry fixture, put units on both angles. Retain deliberate missing-unit cases in an ambiguity stratum. This avoids penalizing caution on a fixture intended to measure geometry.

## Saved mathematics sample review

All source quotations in these twelve mathematics responses match the supplied short fixture source. That is text provenance, not a proof of instructional quality.

| Case | Terra observation | Luna observation | AI review judgment |
|---|---|---|---|
| Linear equation | Asks which operation removes +3 | Asks what to subtract first | Appropriate first step; neither tests why equality is preserved |
| Polynomial expansion | Asks for two distributed products | Asks for four products after rewriting a square | Both can be valid stages of distribution; clarify the expected intermediate form |
| Substitution system | Substitutes y=3 and asks for the resulting equation | Gives x=2 with a check | Correct mathematics; Luna completes the current task |
| Function evaluation | Shows substitution and asks for arithmetic | Same core next step | Appropriate procedural help; does not assess meaning of a function |
| Rectangle area | Requests multiplication and square units | Gives 6 square centimeters | Correct rule and units; Luna completes the current task |
| Triangle angle sum | Requests unit clarification, then states method | Requests evaluating 180 minus both angles | Correct method; ordinary and ambiguity cases should be separated |

This is a qualitative AI inspection of six matched cases, not a statistical comparison or a human educator rating.

## Full textbook suitability and limits

The publisher presents the book as a precalculus sequence, with substantial modeling, graph interpretation, and trigonometry. Its main text has an Attribution-ShareAlike license; the separate detailed solutions manual has different noncommercial terms. The publisher also notes accessibility limits for some exercise images. Use source and license metadata for each asset, and verify accessible representations rather than treating PDF text extraction as complete understanding. [Publisher's book page](https://www.opentextbookstore.com/precalc/)

The table below is my mapping from the publisher's contents to the inspected code. It is not a claim that I reviewed every exercise or diagram.

| Chapter | Useful access now | Current automatic assessment limit |
|---|---|---|
| 1. Functions | Read/search definitions and examples | Bounded polynomial calculations; no general graph, interval-domain, composition, or inverse assessment |
| 2. Linear functions | Read/search and selected x-equation practice | Does not cover regression, all graph tasks, absolute-value cases, or modeling explanations |
| 3. Polynomial and rational functions | Read/search; bounded expressions and selected root/domain checks | Full solution sets require rational roots of degree at most two; complex numbers and radicals unsupported |
| 4. Exponential and logarithmic functions | Read/search | No exponential or logarithmic checker |
| 5. Trigonometric functions of angles | Read/search | Limited explicit right-triangle measurement; no general trig assessment |
| 6. Periodic functions | Read/search | No periodic graph or trig-equation assessment |
| 7. Trigonometric equations and identities | Read/search | No identity or full trig solution-set checker |
| 8. Further applications of trigonometry | Read/search | No general vectors, polar, parametric, or non-right-triangle checker |
| 9. Conics | Read/search | No general conic or nonlinear-system assessment |

Checker evidence: `supabase/functions/_shared/learning/algebra.ts:23,55–71,138–160,197–213`; `supabase/functions/_shared/learning/advanced-math.ts:4–8,25–37,62–68,98–121`. The boundary behavior deliberately reports unsupported results for many unhandled cases. Preserve that property as coverage grows.

## Education evidence and educator handoff

The IES algebra guide recommends analyzing solved examples, noticing algebraic structure, and deliberately choosing among solution strategies. It labels evidence for the first two recommendations minimal and the strategy-choice recommendation moderate. These are useful design directions, not evidence for Diana's effectiveness. Diana's related-example action is consistent with part of that direction; its current one-step samples do not test strategy comparison or transfer. [IES algebra practice guide](https://ies.ed.gov/ncee/wwc/practiceguide/20)

Ask the human mathematics educators to review: mathematical accuracy and domain assumptions; whether the help matches a learner's visible step; the amount and timing of help; alternative valid methods; accessible graph descriptions; and independent transfer questions. Include separate reviews of source extraction and tutoring output. Use blinded model packets and preserve disagreement for adjudication. This AI report must remain separate from educator qualification records and approval receipts.

## Suggested implementation order

1. Scope tutoring state to the current problem and publish explicit chapter capability statuses.
2. Complete full-book ingestion with immutable source anchors, license records, accessible page access, and chapter/section navigation.
3. Introduce a versioned tutoring evaluation contract and disclosure checks before another comparative model claim.
4. Have educators review a representative exercise set and multi-turn tutoring trajectories across supported algebra skills.
5. Expand deterministic checkers and offline practice by skill family, with independent reference cases and clear unsupported behavior.
6. Measure delayed independent performance on new questions before making learning-improvement claims.

No model winner, trained model, qualified human review, or student learning benefit is established by this report.

## Implementation follow-up in this worktree

The source-selection part of the third finding was subsequently addressed in `supabase/functions/learning-prepare/index.ts` and the new pure helper `supabase/functions/_shared/learning/practice-source.ts`. Preparation now retrieves the complete bounded source with stable pagination before ordering eligible blocks by numeric page and source offset. It explicitly refuses documents exceeding 10,000 blocks or eight million source characters, instead of preparing from a silent partial window. Successful results report the source scope and whether the 30-question cap omitted further supported equations. This does not expand the types of mathematics the preparer can assess.

New reading exercise prompts contain the exact selected source excerpt, a source-page label, and a continuation notice when the excerpt is shortened. Questions explicitly refer to that excerpt. Existing IDs and `ignoreDuplicates` are preserved: previously saved reading exercises retain their original immutable prompts. Showing a source excerpt for those historical records requires a separate display-time attachment or an explicit migration; this change does not silently rewrite prior references.

Verification for this bounded implementation: five focused tests passed in `lib/learning-engine/practice-source.test.ts`, covering shuffled hash IDs, numeric page/offset ordering, unconfirmed and unlocated blocks, exact excerpts, unsupported/ambiguous equations, and source/exercise caps. Targeted ESLint and whitespace checks passed. This reviewer did not deploy the function or claim production activation.
