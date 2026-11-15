# Independent review of v3 development fixtures

Recorded: 2026-09-28 16:20:34 UTC. The baseline-validation record existed; no adapter validation result had been observed by this reviewer. This review did not inspect the independently sealed 100-case final evaluation.

## Scope and limits

An independent AI reviewer read the 30 training topics and 24 validation topics in `scripts/learning/synthetic_lora_v3_data.py`, including each paired answerable and missing-evidence question. The four repeated training variants are not 120 independent topics. This is an engineering review, not qualified educator approval or a study of student learning.

No critical answerability mismatch was found in the paired development questions. Missing numerical values, absent authorship information, unresolved contradictory notes, and untrusted embedded instructions are generally handled explicitly. One mathematical scope ambiguity and three concrete scoring false negatives are recorded below.

## Narrow accepted quotations can reject relevant evidence

These examples were constructed during this review, before seeing adapter outputs. Each quotation is verbatim source text and relevant to the stated learner question, but it does not contain the single prescribed `acceptedQuotes` span. A local scoring check preserved each fixture's original `NEXT` line and confirmed the following for all three: `exactSourceQuoteOrAbstention: true`, `caseSpecificNextStep: true`, `relevantSourceQuoteOrAbstention: false`, `groundedCasePass: false`.

| Validation case | Learner question | Relevant exact source quotation rejected by the lexical check | Sole accepted span |
| --- | --- | --- | --- |
| `validation-v3-13-present` | What enzyme property should I track? | Enzymes speed up chemical reactions | without being consumed |
| `validation-v3-7-present` | What role does a topic sentence have? | the controlling idea that the paragraph develops | states the controlling idea |
| `validation-v3-10-present` | What argumentative move should I examine? | explains why its own claim remains supported | acknowledges a counterclaim |

The enzyme question is broad enough to invite either catalytic acceleration or preservation of the enzyme. The topic-sentence alternative identifies its relationship to the paragraph's controlling idea. The argumentative-move alternative identifies support following a counterclaim. These observations concern evidence relevance; they do not automatically establish that every accompanying next question is useful.

These are assessment limitations, not evidence that the model has achieved the target. They also do not establish that the observed model failures, once available, are caused by the scorer. The independent semantic audit must judge actual raw responses separately. Mechanical and semantic results must both remain visible.

## Mathematical scope and copy

- Training topic 6, including `train-v3-6-0-present`, states that an exponent counts copies of a base in repeated multiplication. That explanation should explicitly be scoped to positive integer exponents in a future development revision. It does not cover zero, negative, or fractional exponents. The current fixture does not state the restriction. The companion missing-value question is still genuinely unsupported because no base and exponent are supplied.
- Training topic 14 initially contained `a unfamiliar term`. It was corrected to `an unfamiliar term` before the training run began; the archived run source contains the corrected text. This copy issue does not affect answerability.

## Preserved experiment boundary

The v3 data, scoring function, fixed four-epoch recipe, 95% requirement, and sealed final test remain unchanged. Do not add accepted spans after examining v3 results or report a recomputed favorable score as the preregistered result. A future development dataset may correct the scope ambiguity and predefine multiple relevant quotation spans before its own run. That does not permit editing or repeatedly tuning against the sealed final test.

The separate verifier negative control also demonstrates the opposite scoring weakness: a source-valid quotation followed by an on-topic question with an invented 900-meter measurement can pass lexical checks. The semantic review correctly rejects the fabricated claim. Thus a lexical pass is neither a complete semantic assessment nor a production authorization.
