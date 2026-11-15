# Diana grounding acceptance: 95% target

The requested target is **at least 95% grounded responses**. It is a measured acceptance requirement, not a guaranteed training outcome. Earlier experiments and their original 80% threshold remain immutable historical records. This contract governs the new v3 research experiment.

## What a grounded response means here

The experimental task produces two lines: `EVIDENCE` and `NEXT`. A passing response must select an exact, relevant quotation from the supplied source, or correctly identify missing or unresolved conflicting evidence. Its next question must help the learner advance the actual task, without invented facts, unsupported assumptions, or giving away the solution. Instructions quoted inside a source are untrusted text.

This is a narrow source-bound coaching experiment. Its score is not accuracy on all school subjects, a complete retrieval-system benchmark, an OCR score, or evidence of student learning gains.

For semantic review, quoting the definition or concept requested by an extraction question is permitted. The no-solution criterion prohibits additional completed calculations, written answers or solutions beyond that requested evidence. Otherwise the assessment would reject the source-extraction task's own intended responses. This rubric clarification precedes the blinded semantic review and does not change any frozen mechanical score or training target.

## Acceptance sequence

1. Freeze the task, development examples, independent test, training recipe, scoring rules and source hashes before fitting.
2. Select checkpoints on validation only. Both the 95% mechanical grounding target and the declared nonregression gates must pass.
3. If validation rejects every checkpoint, preserve all checkpoints and leave the final test unopened. Diagnostic review of validation is allowed and explicitly labeled as development work.
4. Freeze an eligible checkpoint before the one final base-versus-adapter test. Use every declared case, including absent evidence, contradictions and distractors. Report all failures and all subject, level and answerability slices.
5. Reload the saved adapter and reproduce its outputs. Independently verify metrics, evidence hashes and selection.
6. Independently assess the meaning of both lines. A lexical match cannot establish relevance or instructional usefulness. The semantic gate requires at least 95% complete-case passes and no fabricated responses in the reviewed sample.

A test used to choose a recipe or a replacement checkpoint becomes development data. It cannot continue to support an untouched-test claim. Rejecting a model is a valid result; changing examples or the denominator to manufacture a pass is not.

The new prompt explicitly requests a question about missing or conflicting evidence instead of forcing the old generic missing-source question. Both the frozen base model and adapter receive the identical new prompt. Because the prompt, cases, answerability distribution and relevance checks differ from v2, percentages across these experiments are not a paired improvement estimate. Compare base and adapter within the same new evaluation.

## Reporting and review integrity

`scripts/learning/grounding_review_v3.py` builds counterbalanced A/B packets from verified saved outputs. The arm mapping is kept in a separate operator file. Reviewers save all ratings before unblinding. Every response needs five explicit judgments, a source-and-question hash, an exact response hash and concrete notes. Missing, repeated, mismatched or selectively supplied ratings reject the assessment.

The report distinguishes observed accuracy from uncertainty. For example, 95 successes in 100 authored cases meets the 95% point target, but its Wilson interval has a lower bound below 95%. Related cases can further reduce effective sample size. These intervals are descriptive and cannot establish a population-level guarantee.

AI reviewers are engineering aids. Their reviews do not create educator qualifications, training rights, student consent, production authorization or learning evidence. The research tooling always reports `productionEligible: false`.

## Engineering regression checks

The `Grounding research contracts` GitHub Actions workflow runs the v3/v4 standard-library contract tests without downloading weights, training, inference, student records or provider credentials. The equivalent local command passed 62 tests on September 28, 2026, including sealed-test isolation, threshold enforcement, continuation provenance, exact parent-output reproduction, tampered evidence, incomplete reviews and altered A/B assignments. The Windows sandbox initially denied access to temporary fixture directories; the same tests passed with reviewed ordinary local filesystem access. This local result does not claim that a remote CI run has occurred or that the model meets its quality target.

```text
python -m unittest discover -s scripts/learning -p "test_*v[34]*.py" -v
```

## Model and training scope

The new local experiment continues with the previously verified `Qwen/Qwen2.5-0.5B-Instruct` snapshot. It uses original authored research examples, no student records or textbook training text, and no paid provider calls. Rank and target-module changes are ordinary LoRA engineering, not evidence of a new proprietary algorithm. Adapter module configuration follows the [PEFT LoRA API](https://huggingface.co/docs/peft/en/package_reference/lora); training and evaluation are separate stages as supported by the [Transformers Trainer interface](https://huggingface.co/docs/transformers/main/main_classes/trainer).

A larger model would be a separate named experiment. The user has requested being told before a model change. No model change, deployment, paid compute reservation or activation is implied by this acceptance contract.

## Current result

### Subsequent Qwen3 research

The sections above preserve the original v3 acceptance contract. The approved Qwen3 run 006 also remains rejected under its original mechanical contract. Its two blinded semantic reviews found 37/48 and 42/48 complete passes, below the requested target. A separately preregistered [Qwen3 continuation](qwen3-grounding-revision-design.md) now distinguishes automatic format/evidence eligibility from the unchanged 95% semantic acceptance target. It requires two independent blinded semantic development reviews before final-test inference, and preserves agreed case failures through adjudication. The original scores, denominators and rejection records are unchanged.

The continuation has 600 newly authored records across 200 contexts. Independent content audits precede freezing and training. Software tests and content audits do not establish the trained model's accuracy. See [current experiment results](grounding-95-results-2026-09-28.md) for actual completed measurements.

The v3 run completed and was independently verified. Its best development checkpoint achieved 26/48 mechanical passes and 14/48 passes in a separate blinded AI semantic review. It was rejected, and the locked test remained unopened. The completed expanded-data v4 continuation also reached 26/48 mechanical passes; its separate blinded semantic review passed 23/48. Both remained rejected and inactive. The user has since approved preparation and download of Qwen3-4B-Instruct-2507 for a separate research experiment. See [the current execution evidence](grounding-95-results-2026-09-28.md). Historical v2 achieved 9/20 on a different mechanical evaluation and remains rejected; that percentage is not a paired comparison with v3.
