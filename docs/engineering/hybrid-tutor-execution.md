# Hybrid tutor execution

Status: the user-approved 96-case API development benchmark completed as `hybrid-api-baseline-002`, with 96 released responses and $5.12 in conservative accounted cost. Independent AI review is complete: 95/96 responses pass all dimensions (98.96%), with zero observed fabricated premises. See [reviewed results and remaining gates](hybrid-api-baseline-results.md). No new production model is activated, and no 95% claim is established by execution alone. See [approved scope and frozen plan](hybrid-api-baseline-approval.md).

## Accepted sequence

1. **Measure an API baseline.** Freeze an original 96-case development corpus spanning six subjects and four educational stages. Audit reference answers separately from authorship. Freeze the prompt, executable dependency hashes, prices, input identities and one-attempt spending plan. Run only after the user's exact model and spending authorization. Retain rejected and interrupted attempts. Review the actual responses against accuracy, evidence, teaching usefulness and unsupported-assumption criteria.
2. **Register capabilities and route explicitly.** Bind each capability to a subject, task type, input requirements, source requirements, version and actual validation evidence. Missing inputs and conflicting sources require clarification. Deterministic tools are eligible only within their documented mathematical bounds. A local language model needs evidence for the exact task before it can generate student help. API eligibility is a separate decision and does not confer correctness. Fixed numeric confidence labels must not be treated as measured probabilities.
3. **Connect the teaching workflow.** Preserve authentication, class policy, document ownership/version checks, budget enforcement and minor protections. Try supported local tools before provider calls. Persist assistance before returning help so it cannot be recorded as independent mastery. Validate evidence anchors and deterministic claims in API output, and reject unsupported output. An unavailable provider must return an honest limitation or a validated local action.
4. **Validate the complete system.** Test local-only operation, retrieval, missing/conflicting information, provider escalation, post-generation checks, budget exhaustion, interrupted requests and assisted-versus-independent mastery. Report results by task and stage, including abstention and escalation rates. A synthetic development average is not proof of representative curriculum coverage or improved student learning.
5. **Fine-tune only demonstrated gaps.** Categorize recurring accepted-baseline errors first. Create reviewed training examples with rights and provenance, separate by problem family from development and held-out evaluation, and compare against the unchanged base model. Preserve the untouched prior final test. Select model and training compute with the user's required approval before a new training run. Activate only a candidate that passes the predeclared evaluation and deployment gates.

Later stages depend on earlier evidence. Engineering that does not depend on model results may proceed while an approval or external input is pending; model qualification cannot be assumed.

## Benchmark commands

```powershell
npx tsx scripts/learning/hybrid-benchmark.ts prepare artifacts/learning-engine/research/hybrid-api-baseline-001 docs/engineering/hybrid-price-evidence-2026-09-28.json
npx tsx scripts/learning/hybrid-benchmark.ts verify artifacts/learning-engine/research/hybrid-api-baseline-001
```

Preparation creates an exclusive directory, full private evaluation corpus, a separate provider-input projection, code closure, price evidence, frozen quote, deterministic request identities and generated Edge registry. It makes no network calls and does not install the generated registry. The approved run's registry has now been installed in its isolated research endpoint and compared with the frozen upload.

Execution additionally requires:

- An independently produced `corpus-review.json` bound to the exact corpus hash, with `status: engineering-audit-passed`, `independentOfAuthor: true` and reviewer identity. This is an engineering audit, not educator approval.
- An approval file binding the actual user authorization, approving operator, timestamp, model, exact plan fingerprint and $40 hard cap. A prepared plan is not authorization.
- The identical generated registry installed in the research Edge function, with JWT verification and its exact plan-hash environment gate enabled for the approved operator.
- A `deployment-verification.json` recording an actual remote file comparison: exact plan/code/registry hashes, fixed endpoint, JWT enabled, remote-files-match result and verification timestamp. Local code hashes alone do not attest a deployed function.
- `DIANA_HYBRID_OPERATOR_ACCESS_TOKEN` supplied privately to the process. Never write access tokens into artifacts or command output.

```powershell
npx tsx scripts/learning/hybrid-benchmark.ts execute artifacts/learning-engine/research/hybrid-api-baseline-001 <approval-file>
```

Only the fixed Supabase research endpoint is contacted. The endpoint makes the provider call after existing authentication, policy, moderation and atomic budget checks. Four fixed batches contain 24 cases each, with a $10 ceiling per batch and no automatic retries. The reservation includes a conservative input allowance and up to 4096 output/reasoning tokens. Exact quote and validity are recorded in `plan.json`. A changed code closure, stale price record or modified input stops execution.

The 96 generation attempts also use up to 192 existing input/output moderation checks. The [official moderation documentation](https://developers.openai.com/api/docs/guides/moderation) lists this endpoint as free; these safety-service requests are recorded separately from the generation budget.

Each attempted request creates an exclusive local directory before network dispatch. Raw response, digest, timestamp, latency and disposition remain available. Missing or rejected receipts halt resumption for reconciliation. Resumption can skip only successful responses whose identity, raw bytes and cost still match the plan. Existing database reservations and provider-start fences prevent duplicate paid requests across processes.

An operator may retain a terminal rejected attempt as a **failure** and continue other cases after inspecting its actual database reservation and usage receipt. The resulting `reconciliation.json` binds the original request digest, model, plan, batch, settled cost, rejected output state, reviewer and timestamp. Unknown charges, unsettled reservations and overruns remain paused. Reconciliation never retries the failed case or converts it to successful teaching. Rejected model text may be withheld by the safety/content validation gate; its attempt and cost remain in the run. `execution-complete.json` reports completed responses and reconciled failures separately.

## Completion evidence

Current engineering additions include an inactive capability registry with shadow comparisons on existing tutor routes, stable worksheet provenance, staged durable assistance SQL, and pre-output assignment assistance integration in both the Next Study Buddy route and direct Edge handler. These deployment flags remain off until all help paths and reviewed transfer provisioning satisfy the activation gate. They are not production-complete merely because the new helpers exist.

After two independent response reviews and dispute-only adjudication, derive a content-free gap queue:

```powershell
npx tsx scripts/learning/plan-hybrid-gap-research.ts <packet-dir> <dispute-dir> <adjudication-or-dash> <new-output-dir>
```

This rebuilds the reviewed report from preserved evidence, records resolved failures by subject/focus/dimension, retains unavailable and unresolved cases separately, and excludes all development cases from subsequent training. It never exports evaluation answers, selects a model or grants training authorization. Repeated observations in authored cases are not independent-family prevalence estimates. New examples need separate family provenance and review.

Completion requires runtime evidence for the integrated system, an independently reviewed held-out quality result meeting the declared 95% criterion for the supported scope, and a production canary. Development cases may diagnose defects but cannot establish that result. Actual educator judgments, representative recognition samples and consented learning studies remain external requirements. Sixth-grade curriculum support also does not authorize bypassing the existing under-13 eligibility boundary.

The proprietary engineering contribution is the versioned evidence and teaching workflow: owned textbook evidence, bounded verifiers, support-state decisions, capability qualification, assistance provenance and improvement data. A new name for routing or a fine-tuned adapter alone does not establish uniqueness, patentability or a defensible commercial advantage.
