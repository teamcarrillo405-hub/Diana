# Hybrid API development baseline results

Completed September 28, 2026 Pacific (September 29 UTC).

## Decision

The approved GPT-6 Astra research run passed the predeclared **development** threshold: **95/96 complete responses (98.96%)**, with zero observed fabricated premises. This qualifies the baseline for further integrated evaluation. It does not qualify a production model or establish 95% real-world grounding accuracy.

Two independent AI reviewers assessed all 96 responses without seeing producer identity, costs, scores or each other's assessments. They agreed on every scored dimension, so no adjudication was required. Both disclosed generic inherited project context and explicitly declined a fresh-context or credentialed-educator claim. Independence disclosures are attestations.

| Measure | Result |
| --- | --- |
| Complete response passes | 95/96 |
| Accuracy | 95/96 |
| Evidence, teaching, restraint, premise integrity | 96/96 each |
| Unresolved ratings or suspected reference errors | 0 |
| Useful clarification / scaffolding | 47 / 49 |
| Bare abstentions | 0 |
| Completed requests / distinct provider responses | 96 / 96 |
| Conservative accounted cost | $5.12 of $40 approved cap |
| Provider tokens | 163,302 |
| Recorded request latency, median / p95 | 19.70 / 33.28 seconds |

Five subjects passed 16/16 each. Math passed 15/16, with the single error in the advanced-college cell (3/4). Four cases per subject/stage cell are too few to establish curriculum coverage. Target skill and task type were provided to the model. This measures skill-conditioned responses to authored inputs, not unaided diagnosis, textbook retrieval, long conversations or student learning.

## Observed gap

On `hybrid-dev-math-college_advanced-markov-row-conflict`, the response preserved conflicting transition records and appropriately requested the authoritative version. However, it implied the conflict had to be resolved before determining whether the shared row was sufficient. The insufficiency can already be explained from stationary balance depending on both directional transition probabilities. Both reviewers retained the accuracy failure.

This is one observation, not a demonstrated recurring training gap. The next investigation should test **what remains inferable despite conflicting inputs**, using new problem families and an unchanged local/API comparison. Do not copy this evaluation response or reference into training or rewrite the historical score. A narrowly tailored special case would not demonstrate general improvement.

## Engineering and rollout status

- 349 focused tests across 20 files passed; TypeScript and focused lint passed. Tone audit has zero blocking violations and 67 inherited advisories.
- Assistance foundation migration `20260929003416` is installed with enforcement off. Live privilege and predecessor checks passed.
- Study Buddy Edge v15 is deployed with authorization, idempotency and gated assistance recording. All 12 deployed files matched the reviewed bundle; unauthenticated access returned 401. Model selection is unchanged.
- The scoped 34-file Next application release is deployed as `dpl_7kuQjEpjxitMzXf7X6Y1cB9ZVdub` and verified on `diana-umber.vercel.app`; all 2,893 source hashes match. The bounded initial algebra capability is live. The broader capability registry remains shadow-only. No local language model or new production API model was activated.
- Raw worker-result access protection is deployed as migration `20260929034718`, with live privilege postflight passing. Worker execution capabilities are applied as `20260929035711`; matching web routes are live in `dpl_7J1BfiVSyooabxm1UWonRK7X6Vc2`, with source verification and unauthorized endpoint checks passing. The worker image, host and activation remain separate and incomplete. The 23-function Edge assistance bundle is now deployed with exact parity for all 250 files, JWT retained and 23 unauthenticated 401 checks. The original connector accepted the retry after the user's outstanding-work continuation; assistance enforcement remains off.
- The temporary research plan secret was removed; the synthetic operator's normal allowance was restored while preserving actual usage. The run's approval is consumed. Cost is conservative usage accounting, not invoice reconciliation.

The subsequent disclosure/policy web release is now live as
`dpl_HBXKsD78zJXyKB5iHFJHvfbmPiak`. All 2,913 source files match the reviewed
candidate; 158 isolated tests and strict local/hosted builds passed. Saved-quiz and
empty-recall browser checks passed. These are engineering checks, not additional
model-quality observations; the 95/96 development result and its limits are unchanged.

## Remaining gates, in order

1. Complete and verify all assistance-producing routes before enabling the shared assistance ledger; provision a genuinely reviewed fresh transfer through the operator workflow.
2. Complete the remaining coordinated release checks. The scoped application is live and authenticated lobby/workspace checks passed; the Edge bundle, separate worker protocol and global assistance activation remain distinct. Paid escalation and assisted-versus-independent acceptance are not established by that read-only canary.
3. Freeze a new disjoint integrated evaluation, including retrieval/citation correctness, unsupported inputs, sustained tutoring and latency. Obtain a separate concrete approval for further paid inference. Preserve the existing sealed final test.
4. Collect representative permissioned textbook/recognition evidence. Educator validation is deferred at the user's request; it is not recorded as passed. Establish supported scope and measure student learning separately.
5. Run targeted local fine-tuning only after new disjoint examples, provenance, paired baseline and specific model/compute approval exist. This API result does not qualify any previous local adapter.

## Bound evidence

- Executed run: `artifacts/learning-engine/research/hybrid-api-baseline-002` (frozen).
- Original reviews and comparison: `artifacts/learning-engine/research/hybrid-api-review-002`.
- Validated report and training-exclusion gap queue: `artifacts/learning-engine/research/hybrid-api-gaps-002`.
- Operational rollout and cleanup: `artifacts/learning-engine/research/hybrid-operations-2026-09-29.json`.
- Final packet hash: `1a293ceab7b0335222d917e3bb486fce67eb10637c17798512c09b11db72f787`.
- Validated review hash in gap queue: `4f4554a80c8e6b284a3e8bc3074aa027a6314b3ce2e6fb8b8f393a81153cb693`.

No evaluation answers are exported as training examples. Production eligibility, educator validation and population-accuracy flags remain false.
