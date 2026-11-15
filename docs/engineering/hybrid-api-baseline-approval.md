# API tutor baseline: approved research run

**Completed and reviewed:** 95/96 complete responses passed (98.96%), with zero observed fabricated premises and no scoring disagreements between the two independent AI reviews. Conservative accounted cost was $5.12. This meets the development threshold only. See [results, limitations and next gates](hybrid-api-baseline-results.md). The run's authorization is consumed and its temporary plan gate has been removed.

## Approved scope

- **Research model:** GPT-6 Astra (`gpt-6-astra`), high reasoning.
- **Scope:** 96 original synthetic tutoring cases, one attempt each. Six subjects: math, reading, English, science, history and computing. Four stages: middle school, high school, introductory college and advanced undergraduate work.
- **Purpose:** measure whether a strong API tutor can provide useful, accurate teaching with appropriate source support and recognize missing or conflicting information. Results will inform the capability router and targeted local fine-tuning.
- **Conservative generation quote:** **$26.34 maximum reserved for these fixed inputs**, within a **$40 hard approval cap**. Four fixed batches remain below $10 each. No automatic retries or paid grader calls.
- **Separate safety requests:** up to 192 existing moderation checks, currently free according to OpenAI's documentation.
- **Data:** original authored exercises and fictional student attempts. No real student records or textbook extracts are sent in this run.
- **Deployment scope:** an isolated, authenticated research Edge endpoint restricted to the approved operator and exact frozen plan. The live student tutor model is unchanged.

## Frozen artifacts

Completed artifact directory: `artifacts/learning-engine/research/hybrid-api-baseline-002`.

Plan fingerprint: `9e1f0ae54f673e5c20fc973f321816674279acf1a2ee05b43b1f6e8af58ebdde`.

The plan binds the complete corpus, prompt, code dependency bytes, prospective scoring protocol, independent engineering audit, price evidence and deterministic request IDs. Price verification expires September 29, 2026 at 23:32:31 UTC; recheck pricing before execution if that window has passed. Execution began after explicit user approval. Per-attempt receipts in this directory are authoritative for progress and conservative usage cost.

Preparation 001 was superseded before any inference or reservation to support in-memory renewal of the same operator's login session. Inputs, model, prompt, cases, prices and approval scope are unchanged. The carryover record and zero-call supersession evidence are saved in the artifact directories. This is one 96-case run, not two runs.

All 13 deployed research files were compared with the frozen upload. The endpoint requires JWT authentication and the exact approved plan hash. All 96 requests completed, with 96 distinct provider response IDs, 96 settled reservations and 96 released outputs. Both local and database receipts total **512 cents under the conservative accounting rates**; this is not an invoice reconciliation.

The synthetic operator's temporary allowance was restored from 1,000,000 to 50,000 tokens with actual usage preserved. The temporary research plan secret was removed and its absence verified, closing the completed run's authorization. Exact executed source bytes were archived against the plan-bound closure before packet creation. Independent quality reviews are separate from these execution results.

## How results will be judged

The case-specific rubric checks accuracy, evidence, handling of missing information, teaching usefulness and avoidance of invented premises. All 96 cases stay in the denominator, including failures. Development acceptance requires at least 92 complete passing cases and zero observed fabricated-premise flags under the prospective review protocol. A passing development result would still require disjoint held-out evaluation before model qualification or production activation.

Independent AI engineering review found no blocking reference-answer errors in the 96 cases. This does not replace educator review or establish representative sixth-grade-through-college curriculum coverage.

## Authorization

The user approved: "Approve the research run, up to $40." This covers the stated model, fixed research run and isolated endpoint deployment. It does not authorize a new local model download, production model activation, a second benchmark run or paid GPU training.

References: [OpenAI pricing](https://developers.openai.com/api/docs/pricing), [moderation endpoint](https://developers.openai.com/api/docs/guides/moderation), [execution contract](hybrid-tutor-execution.md), [prospective review protocol](hybrid-benchmark-review-protocol.md).
