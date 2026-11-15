# Prepared hybrid tutoring API baseline

This is a development experiment contract, not authorization to spend, change
models, or activate an app model. The user asked to stop before changing models.
The operator must present the exact model, frozen corpus and prompt, quoted
budget, and scope for approval before any API generation. The prepared plan
always says `prepared-awaiting-model-and-budget-approval`.

## Fixed scope

| Item | Frozen value |
| --- | --- |
| Model | `gpt-6-astra` |
| Cases | 96 original authored development cases |
| Paid generation requests | At most 96 `gpt-6-astra` requests |
| Safety service | Existing `omni-moderation-latest` guard, at most 192 requests, zero retries |
| Safety service price | Zero cents per moderation request |
| Reasoning | `high` |
| Service tier | `default`, standard pricing |
| Provider retention request | `store: false` |
| Provider tools | Empty tools list |
| Maximum output | 4,096 tokens, including billable reasoning within that limit |
| Input limit | 12,000 UTF-8 bytes, system plus user content |
| Framing allowance | 1,024 additional input tokens |
| Retries | Zero; one attempt per case |
| Batch layout | Four fixed batches of 24 cases in corpus order |
| Batch cap | 1,000 cents each |
| Whole-plan hard cap | 4,000 cents |

The contract does not assume the previous two-line evidence-extraction task.
Inputs may cover tutoring, misconceptions, missing information, conflicting
evidence and transfer. The corpus author must render a strict allowlist of
student-facing input fields. Reference answers, rubrics, grading labels and
expected teaching actions must never be added to the request.

The plan fingerprints the fixed `safetyServices` configuration separately from
the paid generation request. Input and output moderation can add up to 192
requests, for at most 288 external requests overall. The existing moderation
service is documented as free in the [official moderation guide](https://developers.openai.com/api/docs/guides/moderation).
The operator must verify that free pricing before execution; a price change
requires a new reviewed contract and quote. This preparation does not change
the app's production model.

## Quote and price evidence

Reserve each request using integer cents:

```text
ceil(((UTF8(system) + UTF8(user) + 1024) * 1250 + 4096 * 5000) / 1,000,000)
```

The input ceiling of 1,250 cents per million tokens conservatively covers the
reported cache-write price. The output ceiling is 5,000 cents per million.
No cache discount or shorter-output assumption reduces reservations. At the
maximum input size, a request reserves 37 cents, a 24-case batch reserves
888 cents, and all 96 cases reserve 3,552 cents ($35.52). Smaller frozen inputs
can have a lower quote. Any above-cap quote or changed policy is rejected.

A caller supplies a dated official price snapshot with separate normal input,
cache-write and output prices, source URL, and SHA-256 of retained source
evidence. Only the exact official model or pricing URL is allowed. Prices above
the fixed ceilings, future timestamps, or evidence at least 24 hours old are
rejected. The plan expires 24 hours after price verification. The contract
does not fetch prices or independently prove the caller's price evidence.
The operator must recheck actual official prices before an approved run and
must not reuse a stale plan or silently increase its limits.

The byte-to-token bound assumes the approved model's byte-based tokenizer and
1,024 tokens suffice for fixed message framing and the approved structured-output schema. Root execution must use only
the frozen system/user messages and request fields, with no hidden content,
extra history, provider tools or multimodal attachments. If tokenization or
framing cannot meet that bound, prepare a new reviewed contract before spend.

## Pure helper interface

`lib/learning-engine/hybrid-benchmark-contract.ts` exports:

- `buildHybridBenchmarkPlan(spec)`: snapshots 96 rendered inputs, computes
  per-request SHA-256 and integer quotes, builds batch assignments, and deeply
  freezes the plan. Inputs are `{caseId, system, user}`. The spec also requires
  `corpusSha256`, `promptSha256`, `codeSha256`, `priceSnapshot`, and `createdAt`.
- `canonicalHybridJson` and `hashHybridValue`: deterministic sorted JSON and
  SHA-256 using Web Crypto. No network is used. Corpus authors and the operator
  must hash the complete corpus and exact prompt/code versions independently.
- `validateHybridBenchmarkPlan(plan, inputs, at)`: reconstructs the plan from
  actual messages and rejects changed inputs, order, fingerprints, request
  options, prices, quotes, or expired timestamps. Validation grants no approval.
- `hybridInputBytes` and `reserveHybridCallCents`: enforce actual UTF-8 size,
  well-formed text, strict field types, and conservative integer reservations.
- `emptyHybridAttemptLedger`, `reserveHybridAttempt`, `settleHybridAttempt`:
  immutable state transitions for one attempt per case. Persist the reservation
  before dispatch; unknown provider outcomes keep their full reservation.
- `summarizeHybridBenchmark`: reports cost, errors, uncertainty, response
  coverage, completed-response latency, abstentions and response-bound quality
  ratings separately. Missing cases remain in the 96-case denominator.

Timestamps must use canonical UTC ISO strings with milliseconds, such as
`2026-09-29T00:00:00.000Z`. All hashes are lowercase SHA-256 hex strings.
The plan fingerprint binds its timestamp, schema version, all evidence hashes,
pricing, request configuration, case order, input hashes, quotes and batches.

## Durable execution responsibilities

All external model calls belong in the authorized Supabase Edge Function.
The pure module reads no secrets, sends no requests, opens no final-test cases,
and changes no database or deployment. The caller must validate the immutable
plan and verify exact user approval before dispatch, then use the existing
database reservation mechanism for each fixed batch. It must atomically
persist the ledger and protect it against deletion, replacement, concurrent
double-dispatch and process restarts. Pure transitions cannot enforce storage
durability or prove that a caller preserved its prior ledger.

Persist every request attempt ID, content-free usage receipt, latency and error,
including incomplete, failed, uncertain and timed-out attempts. Retain safe,
complete usable responses. Rejected text from incomplete, malformed or
safety-blocked responses is withheld; its attempt, usage receipt and failure
count remain part of the run. Do not retry a case, omit a failure, select a
preferred answer from multiple attempts, or release uncertain reservations.
Record cost overruns durably and
stop dispatch for reconciliation; the contract will reject an overrun as a
normal settlement. A successful HTTP response without a complete usable model
answer is not a completed teaching response.

## Interpretation

Response completion is not teaching quality. Abstention, clarification,
scaffolding and direct teaching are recorded separately. Quality judgments
must bind the exact response hash; they cannot be attached to absent or failed
attempts. All-abstention output has zero successful teaching cases and cannot
be labeled quality success. Summaries always keep `qualitySuccess`, production
eligibility and population-accuracy proof false. Independent rubric-based
semantic acceptance, educator review and student-learning evidence remain
separate requirements; this accounting contract supplies no replacement gate.
