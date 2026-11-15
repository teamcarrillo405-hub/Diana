# Durable assistance foundation

Status: implemented, tested and deployed in **staged mode** to `oitipayrriupcitgmzju` at 2026-09-29 00:34:16 UTC. Enforcement remains false. Live postflight verified the intended privileges and staging state. No provider/model requests are part of these database tests. The forward migration received version `20260929003416`; its earlier local preparation name is retained in the read-only preflight record.

The deployment receipt is `artifacts/learning-engine/research/hybrid-operations-2026-09-29.json`. It records the applied migration hash, `enforced=false`, successful live privilege postflight and Study Buddy Edge v15 with matching deployed files and durable assistance disabled. The current Next integrations remain local. These are the last recorded deployment facts, not a claim that subsequent local edits have shipped. Educator validation is explicitly deferred by the user and remains incomplete; no educator-dependent publication or eligibility gate is approved by these engineering checks.

## Staged rollout and compatibility

`20260929003416_learning_task_assistance.sql` installs provenance and assistance tables plus wrappers with the existing `learning_start_independent(uuid,uuid,text)` and `learning_record_attempt(uuid,jsonb,text,jsonb)` signatures. Its database-owned control row defaults to `enforced=false`. While staged, those wrappers delegate to the unchanged previous implementations. Both new protected-help RPCs reject with SQLSTATE `55000` while staged. A caller must not return pedagogical output after that rejection.

Index preservation can be enabled first. It grants no independent credit. Before activating enforcement, integrate every substantive-help path, provision an authorized fresh transfer, and verify the student can reach that transfer. Then the PostgreSQL operator calls `learning_activate_task_assistance()`; runtime service/authenticated roles cannot execute it. Activation requires a provisioned reviewed reference with a matching operator authorization. There is no runtime disable RPC. This readiness check cannot itself prove that all app callers have been deployed; that is a release gate.

Once active, previously unbound/legacy exercises cannot start a new independent session, and attempts from old unbound sessions remain recordable but cannot gain knowledge credit. Preserve the learning activity and offer the separately reviewed fresh transfer. Historical attempt assessments and exact replay results are not rewritten.

## Identities and write authority

- `learning_task_origins`: stable owner/assignment task identity. Worksheet UUIDs persist across edits and reindexing. Worksheet origins are always `legacy_unresolved`.
- `learning_task_sources`: immutable worksheet UUID/task to document version/page mapping, captured while the indexer still has the real worksheet UUID. Verifies exact current problem text hash and indexed page text.
- `learning_exercise_bindings`: immutable task to actual stored exercise/version/reference digest mapping. Worksheet math bindings additionally verify a stored source block, page, equation and generated prompt. Unknown provenance is rejected.
- `learning_assistance_events`: immutable task-scoped pre-output receipts for local or API help. Starting help permanently blocks independent evidence on that task, including aliases. Timeout/disconnect does not erase the event.
- `learning_assignment_assistance`: immutable broad-scope receipts. Current Study Buddy supplies assignment context even when a problem is selected, so its scope must always be assignment-wide. The selected problem is contextual metadata, not a claim of narrow exposure.
- `learning_transfer_authorizations`: operator-only review records for genuine new transfer content. Runtime service and authenticated roles cannot write these records.
- `learning_task_assistance_control`: operator-controlled staging/activation state.

New tables expose owner-filtered reads where appropriate. Browser users cannot write assistance or generic provenance tables directly. All new functions explicitly revoke service-role EXECUTE before their narrow allowlist grants, including when platform default privileges automatically grant it. Runtime service role has no UPDATE/DELETE on the assistance tables and cannot call the renamed previous eligibility implementations. Worksheet/exercise deletion does not cascade into task history; assignment/account deletion retains the existing privacy lifecycle.

## Indexing RPCs

Authenticated, owner derived from `auth.uid()`:

```text
learning_register_worksheet_task(
  p_assignment uuid, p_problem uuid, p_snapshot_sha256 text)
learning_bind_worksheet_source(
  p_assignment uuid, p_problem uuid, p_source_version text,
  p_source_page integer, p_source_snapshot_sha256 text)
```

Only owned `manual` or `student_confirmed_source` rows with `unit_type='problem'` qualify. Task ID is the actual worksheet UUID. The snapshot hash is SHA256 of raw UTF-8 `problem_text`, without its displayed problem number. Reindexing validates the current hash while retaining the original task snapshot and all assistance.

The first receipt contains `taskId, ownerId, assignmentId, originKind, originKey, initialSnapshotSha256, trustBasis`. The source receipt contains `taskId, sourceVersionId, sourcePage, sourceSnapshotSha256`.

Later trusted exercise preparation calls service-only `learning_bind_exercise(p_owner,p_assignment,p_task,p_exercise,p_source_snapshot_sha256)`. It returns `taskId,exerciseId,sourceVersionId,sourceSnapshotSha256,referenceSha256`. Reference hashes are computed in PostgreSQL over a fixed JSONB projection of actual exercise identity, owner, assignment, version, skill, prompt, specification and reviewed flag. Treat them as opaque; do not recreate the JSONB serialization in JavaScript.

## Protected help RPCs

Service-only task-specific help:

```text
learning_begin_task_assistance(
  p_owner uuid, p_assignment uuid, p_task uuid, p_request uuid,
  p_source_version text, p_source_snapshot_sha256 text,
  p_channel text, p_kind text)
```

Source version may be null only for a current owned worksheet before indexing. `channel` is `local|api`; `kind` is `hint|example|check|guide`. Use `verifiedTaskAssistanceReceipt` from `lib/learning-engine/task-assistance.ts` to match every response field against the request. A shape-valid receipt for another owner, task, source or request is rejected.

Authenticated Study Buddy, always broad scope:

```text
learning_begin_assignment_assistance(
  p_assignment uuid, p_request uuid, p_payload_sha256 text,
  p_channel text, p_kind text, p_selected_problem uuid DEFAULT NULL)
```

Verifies owned assignment/class, effective green AI policy, and owned selected problem when supplied. Its receipt is `{schemaVersion:'assignment-assistance-v1',scope:'assignment',requestId,ownerId,assignmentId,selectedProblemId,payloadSha256,channel,kind,recordedAt,independenceBlocked:true}`. Payload digest must bind the actual selected source/question/context/conversation recipe before any substantive response is released. Identical requests replay; shifted request identity, payload, scope, channel or kind conflict.

Caller order: validate authorization and payload, persist receipt, verify exact receipt, then generate/release feedback. Direct Edge and local paths both need this boundary. Missing RPC, staged enforcement, failed persistence or a mismatched receipt must not fall through to unrecorded help. No model output or student text is added to these ledgers; the payload/snapshot hashes are sufficient for their narrow provenance role.

## Reviewed transfer provisioning

`learning_provision_reviewed_transfer(p_owner,p_assignment,p_task,p_exercise)` is service-only and accepts **no freshness flag**. It consumes an operator-written authorization containing actual exercise ID, owner, assignment, source version, reference SHA, SHA256 of PostgreSQL `learning_documents.pages::text`, novelty-review artifact SHA and review timestamp.

It checks the actual exercise is reviewed math, the owned source was created after installation and after any broad assignment help, review occurred after source creation, and no broad help occurred after review. It creates the stable task and reference binding atomically. A unique reviewed-exercise index prevents concurrent creation of two fresh origins from one reference. Content-identical reviewed aliases may share the task; they never reset prior help or attempts.

The authorization is the explicit semantic review boundary. A new UUID, uploaded page, metadata label, version hash or caller-supplied `fresh` field cannot establish novelty. The reviewer must inspect content and prior exposure, and preserve the review artifact bound by `novelty_evidence_sha256`. No authorizations are fabricated or backfilled by this migration.

Generic `learning_register_task` is internal, not executable by runtime service or authenticated roles. Authenticated wrappers can register only unresolved worksheets. Existing old source versions cannot be recertified after broad assignment help merely by registering a new exercise/task later.

## Eligibility and concurrency

All new help and eligibility paths take the owner/assignment advisory lock first, then a stable task lock where needed. Both session issue and attempt recording check lifetime task help, broad assignment exposure, all bound aliases' attempts and notebook revisions. Sessions freeze task ID, source version and reference digest. The original reviewed typed-math/first-attempt/session conditions and conservative generic AI checks remain in force.

If help commits first, a waiting attempt is ineligible. If an independent attempt commits first, later help does not change that historical evidence. Prior broad help blocks existing tasks; a genuinely new source with explicit operator authorization can provide a later clean transfer.

The existing generic AI checks remain conservative and can block unrelated contemporaneous work until that traffic has verified scope. This foundation does not claim to control legacy confidence/flashcard `mastery_events`, prove absence of off-app help, or retroactively cleanse unknown historical provenance. Existing notebook help writers also need integration with the shared assistance transaction boundary before claiming complete concurrency protection for every route.

## Verification

PostgreSQL 16 was run in a new disposable workspace cluster listening only on `127.0.0.1:55449`. Setup uses minimal earlier-schema dependencies, then loads the actual prior session/history migrations unchanged and this forward migration. It is not a full production-schema replay. Tests must not run against a shared database.

```powershell
psql -h 127.0.0.1 -p 55449 -U postgres -d <empty-test-db> -v ON_ERROR_STOP=1 -f scripts/learning/test-task-assistance-setup.sql
psql -h 127.0.0.1 -p 55449 -U postgres -d <test-db> -v ON_ERROR_STOP=1 -f scripts/learning/test-task-assistance.sql
psql -h 127.0.0.1 -p 55449 -U postgres -d <test-db> -v ON_ERROR_STOP=1 -f scripts/learning/test-task-assistance-staging.sql
psql -h 127.0.0.1 -p 55449 -U postgres -d <test-db> -v ON_ERROR_STOP=1 -f scripts/learning/test-task-assistance-concurrency.sql
npx vitest run lib/learning-engine/task-assistance.test.ts
```

Passed at the isolated-test checkpoint: core behavioral SQL, staged compatibility/activation/broad-scope/new-source checks, and four real two-connection lock orderings (task and assignment assistance, help-first and attempt-first). The main SQL fixtures roll back; the concurrency script removes its dedicated fixtures. The pure receipt suite passed 11 tests. That test run made no provider requests or shared database changes. The later staged deployment is recorded separately below and in the status section.

## Live read-only deployment preflight

On 2026-09-29 at 00:20:49 UTC, project `oitipayrriupcitgmzju` matched both normalized function bodies in `20260925203216_learning_assisted_history.sql` exactly. Both functions are PostgreSQL-owned SECURITY DEFINER functions with `search_path=public,pg_temp` and EXECUTE granted only to PostgreSQL/service roles. `pg_depend` returned no stored dependents, and an all-schema textual function-body search found no callers retaining the predecessor names. No renamed-function/control-table collision exists. This does not exclude dynamically constructed SQL outside the catalog.

Live default privileges **do** automatically grant service EXECUTE on new public functions. The migration now explicitly revokes that privilege before narrow grants; the final isolated harness reproduced these defaults and all three SQL suites passed. Activation, generic registration and internal hash/reference/eligibility helpers remain unavailable to the runtime service role. The migration itself aborts if predecessor body hashes or recorded dependencies drift before deployment.

Exact source SHA256: `5ecb750cbd59fc1ef8eb75c799b10356c6357a4a1e9a0b28b8c5ca78cbf05252`.

The machine-readable report is `docs/engineering/learning-task-assistance-preflight.json`. The separate reviewer inspected the current code and found no further blocker in that scope; SQL execution evidence is the author's isolated verification. The disposable server has been stopped.

## Completed staged deployment and remaining activation gate

The migration was applied at `2026-09-29T00:34:16.744492+00:00` as version `20260929003416`, with the exact source SHA256 shown above. The operational receipt records `livePrivilegePostflightPassed=true` and `enforced=false`. The earlier instruction to apply this migration after the benchmark is fulfilled; do not resubmit it as a pending migration or use an unrestricted repository-wide `db push` from this dirty checkout.

For a fresh rollout check, run `scripts/learning/verify-task-assistance-staged.sql` read-only and compare the live migration version, control state and privilege expectations with the recorded deployment. Do not infer deployment or activation from local test success.

Next steps are to complete and independently review all substantive-help paths, build and release their exact scoped Next/Edge versions with the flags still off, and verify authenticated behavior and interruption/idempotency boundaries. A genuine fresh transfer requires the operator's content/exposure review and authorization artifact; an AI engineering test or a new exercise UUID cannot substitute for that review. Verify that the student can reach the provisioned transfer before the PostgreSQL operator enables enforcement. Keep activation separate from this completed staged migration.
