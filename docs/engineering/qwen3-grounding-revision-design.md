# Qwen3 grounding revision: frozen design before further inference

September 28, 2026. Run 006 remains rejected under its original contract. Its saved outputs, scores, source files and protocol are unchanged. This document defines a separate continuation before any revised model output exists.

## Evidence motivating the change

Two independent blinded AI reviews of run 006 epoch one found 37/48 and 42/48 complete semantic passes, compared with 33/48 for the lexical composite. They agreed on 37 passes and six failures, with five disputed cases. Both found the fine-tuned model better than its paired base (27/48 and 29/48 respectively). These are AI judgments, not educator approval.

Against the first review, the lexical composite accepted six semantically rejected responses and rejected ten accepted responses. Against the second, those counts were three and twelve. Exact-match word anchors therefore cannot serve as a reliable measure of relevance or instructional usefulness. Preserve that diagnostic for reproducibility; the new acceptance criterion measures meaning directly.

Agreed defects concern unsupported existence assumptions, repeating a learner's question without identifying a way to resolve it, and confusing a question about a source's stated action/limitation with a question about an unknown outcome. Additional reviewer disagreements concern abbreviated evidence and implicit assumptions in questions.

## Training revision

Use the same approved, immutable Qwen3-4B base and qualified local GPU environment. Continue only the verified research epoch-one adapter from run 006, chosen before any new fitting by its stronger original mechanical development result. This is a research parent choice, not acceptance. Bind all parent report, adapter and configuration hashes and reproduce its unchanged-prompt outputs before fitting.

Commission 600 new original records from 200 distinct contexts, authored by two agents that have not inspected development examples, final cases or model outputs. Each context has three questions with different evidence requirements. Balance 300 supported and 300 insufficient records across the five subjects. Emphasize complete relevant propositions, question-specific evidence sufficiency, conditional questions that do not invent instances/results/records, and actionable requests for missing evidence. Audit and correct the examples before freezing them. No teacher credentials, textbook rights or student consent are inferred from machine authorship.

Use a fresh AdamW optimizer, rank 16 and alpha 32 q/k/v/o adapters, learning rate 0.00002, weight decay 0.01, accumulation four, batch one, two fixed epochs, seed 69177, clipping 1.0, BF16, eager attention, nonreentrant gradient checkpointing for training, greedy cached evaluation, maximum sequence 768 and maximum 128 generated tokens. No example may be truncated. Freeze the exact resulting training rows and system prompt before baseline evaluation. Preserve all 48 development cases and their annotations unchanged. Record both untouched-base and preserved-parent performance under the revised prompt before new fitting.

Prompt additions are general constraints: do not imply an instance, violation, result or resolving record exists unless the source establishes it; use conditional language when appropriate; answer the question actually asked about the source; when evidence is missing, request a specific way to obtain it without repeating the learner's question.

## Revised measurement, unchanged 95% semantic target

Keep the original lexical-composite counts visible as diagnostics. Automatic eligibility requires at least 95% correct answerability over all development cases, at least 95% exact source quotation or warranted abstention, at least 95% two-line/single-question formatting, no generated answers on insufficient-evidence cases, and target-token loss no worse than the paired untouched base. Report supported and insufficient slices separately. These automatic checks cannot approve semantic quality.

Select the lowest-loss automatically eligible checkpoint, breaking ties by epoch. Select no checkpoint if none qualifies. A selected checkpoint must then meet the existing **95% complete semantic case target**, covering relevant source support, correct answerability, useful next question, no extra completed solution and no fabricated claims. Preserve separate rates for each dimension and the existing zero-fabricated-response descriptive gate. Two reviewers must save independent blinded ratings before unblinding. Report both reviews; adjudicate disputed judgments with a third blinded reviewer while preserving the original ratings. Agreement on a failure cannot be overridden by adjudication. No final cases may be evaluated until this development semantic gate passes.

The fresh final set remains unavailable to training authors and has not been evaluated by any model. Its content audit occurs before its final seal. After development eligibility, compare the same base and one frozen adapter on those final cases once, verify saved-adapter reproduction, and apply the same semantic 95% target with independently saved blinded ratings. If that final set is used to inform another change, retain its results and commission a new final set for a future claim.

## Limits

This is a preregistered revision prompted by development evidence. It does not retroactively accept run 006 or turn word-match accuracy into semantic accuracy. A passing authored-sample result would still not demonstrate 95% population accuracy, complete curriculum competence, qualified educator validation, improved learning or production readiness.
