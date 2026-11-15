# Study Buddy assistance receipt foundation

## Server helper

`recordStudyBuddyAssistance(client, identity, context)` in
`lib/learning-engine/study-buddy-assistance.ts` is server-only. Identity contains
the verified session's `ownerId`, owned `assignmentId`, stable UUID `requestId`,
nullable `selectedProblemId`, channel (`local` or `api`) and assistance kind
(`hint`, `example`, `check` or `guide`). The helper sends no owner override to
SQL: the authenticated RPC derives the owner from `auth.uid()`.

The helper always requests **assignment-wide** assistance. Study Buddy's
effective prompt can include the whole assignment even with a selected
worksheet problem. A selection is context, not evidence that all help was
limited to that task. No synthetic worksheet UUID represents broad chat.

The `context` argument must be an immutable complete snapshot of the actual
normalized request, effective system/user inputs, relevant source versions,
assignment context and execution configuration. Construct it once and use
that same snapshot for response generation. Do not include credentials or
bearer tokens. The helper canonicalizes and hashes it with the complete
identity before its first asynchronous digest. It rejects ambiguous JSON and
canonical payloads above one million UTF-8 bytes. Only the digest and bounded
identity fields reach the assistance RPC; source text is not persisted in
the receipt.

The caller must use the same request UUID across retries. Changed context,
source version, selected problem, assignment, channel or kind changes the
receipt identity and must conflict with a previously recorded request. A
valid UUID alone is not proof of request identity. Never silently generate a
new UUID to evade an existing content conflict.

## Before output release

When `DIANA_DURABLE_TASK_ASSISTANCE_ENABLED` is exactly `true`, await the helper
before substantive deterministic output, before provider dispatch, and before
any streaming content. It invokes
`learning_begin_assignment_assistance(p_assignment,p_request,p_payload_sha256,
p_channel,p_kind,p_selected_problem)` and validates every returned scope field.
The SQL implementation owns authentication, policy, idempotency, serialization
and durable storage. Parsing a client-supplied receipt is not equivalent.

Missing migration, staged enforcement, unavailable storage, wrong receipt
scope and malformed receipts throw the sanitized
`assistance_receipt_unavailable` error. The caller must withhold substantive
output on that path. Keep a committed assistance event if a later provider
call fails; uncertainty cannot restore independence. If an API attempt later
falls back to local guidance, keep its original receipt rather than reuse its
request ID with a changed channel or payload.

`scoped-assistance-receipt.ts` distinguishes existing task-assistance receipts
from assignment-assistance receipts. A task receipt cannot satisfy this
helper. The assignment receipt includes `scope: assignment`, the payload
digest, selection context, committed time and `independenceBlocked: true`.
Neither receipt is a model-quality or correctness assertion.

## Staged rollout

The environment flag defaults off and returns `{status: disabled, receipt:
null}` without optional RPC calls. That preserves existing behavior before
rollout and makes no durable-recording claim. This foundation itself does not
edit the Study Buddy route or deploy any service.

Coordinate the server flag with SQL enforcement. Deploy the enabled helper
while SQL remains staged, so assistance is temporarily withheld; then activate
SQL only after its reviewed-transfer prerequisites and coverage checks pass.
Do not run enforced independent-evidence gates while an old or flag-disabled
help path can omit assistance records. Broad assignment events must serialize
with independent starts/attempts using assignment locking before task locking.
Other assistance surfaces require equivalent coverage before claiming a
complete production guarantee.

Fresh-transfer exceptions need operator-verified novel source and reference
provenance. A new task UUID, upload version, or registration timestamp alone
cannot erase prior exposure. Unknown legacy mappings stay unresolved.

## Tests and limits

Seven behavioral helper tests cover default-off behavior, whole-assignment
scope with selection, exact idempotent retry, payload/scope/configuration
conflicts, waiting before release, unavailable/forged/foreign receipts,
sanitized errors, forbidden serialization, payload bounds and scope unions.
They use an in-memory RPC implementation and assert no network fetches. SQL
authorization/concurrency tests are maintained separately by the migration
owner. Passing helper tests does not establish live migration, deployment,
receipt durability in production or model learning quality.
