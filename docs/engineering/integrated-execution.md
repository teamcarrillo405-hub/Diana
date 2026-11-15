# Integrated tutoring research execution adapter

Status: implemented locally; default off; no deployment, model call, budget
mutation or approval created by this work. This is separate from the frozen 96
runner and its cases. The new Edge function bundles `approved-plan.json: null`.

## What runs

1. The existing authenticated capture command observes owned assignment sources,
   stored policy and actual lexical retrieval with no generation.
2. The request preparation command freezes the curriculum-only primary Edge
   prompt and exact Responses request bytes. Nonmatched rows remain explicitly
   unscheduled. This still does not evaluate model abstention on absent evidence.
3. The new execution compiler combines that hash-pinned request plan with an
   operator-reviewed quote. It creates deterministic case/request/batch IDs and
   a canonical execution-plan hash. Compilation grants no permission.
4. The new `learning-integrated-execution` Edge function accepts only a deployed
   plan hash and a known request ID. It cannot accept prompts, prices, models,
   owner IDs or a replacement plan from the HTTP caller.
5. The operator runner authenticates an existing account and invokes only that
   Edge endpoint. It makes at most one HTTP attempt per scheduled case, saves
   exact Edge envelopes privately, and stops at the first non-success or
   ambiguity. Later and unscheduled cases remain in its denominator.

## Authorization and persistence

Execution requires all of these server conditions:

- `DIANA_INTEGRATED_EXECUTION_ENABLED=true`
- `DIANA_INTEGRATED_EXECUTION_PLAN_HASH` equals the bundled plan's canonical hash
- `DIANA_INTEGRATED_EXECUTION_OPERATOR_ID` equals its exact operator UUID
- `SUPABASE_URL` equals the plan's project URL
- A verified assistance receipt from this research function's unconditional
  recording call. It does not depend on `DIANA_DURABLE_TASK_ASSISTANCE_ENABLED`,
  so research activation does not require changing that global production flag.
- The existing student auth helper verifies the actual bearer session, consent,
  deletion state, owned assignment and effective green policy.
- Every pinned document remains owned by that operator, linked to that exact
  assignment and stored at the expected version/content hash. Each scheduled pin
  additionally binds a canonical SHA256 of its captured metadata and pages. The
  Edge reads and hashes those actual values at every source check, so an unchanged
  declared content hash cannot conceal changed source bytes. Preparation checks
  each retrieved anchor against the pinned owner's assignment and exact page text.

Policy and source checks repeat before screening, after input moderation before
generation, and before releasing completed output. Expired approval or stale
pricing blocks dispatch, including an expiry during input moderation. No API key
or service key enters the operator script or replica; provider calls are Edge-only.

The same `learning_reserve_experiment` RPC provides atomic request uniqueness and
batch/month reservation checks. It refuses a second attempt even if the first
response was lost. `learning_start_experiment_provider` must commit before fetch.
The existing user-scoped assistance receipt must also verify before generation.
`learning_record_experiment_usage` atomically persists measured tokens and settles
generation cents before output moderation can withhold the result. An unexpected
response model has unapproved pricing, so its original usage stays raw evidence
and the reservation remains held for reconciliation. Transport uncertainty,
missing usage, invalid usage, storage failure and ambiguous acknowledgements do
not trigger a retry or an invented zero charge.

Raw envelopes are inserted into the existing `learning_experiment_outputs`
table. Its migration revokes anon/authenticated access and grants service_role;
no owner-readable bypass is added. The raw record's parse classification is
distinct from the content-free provider receipt's final release/blocked/error
state. Join both when reviewing: a structurally complete response can still be
withheld by moderation or a changed policy. Raw blocked content is not returned
to the operator client. Raw provider bodies, including reasoning summaries and
unrecognized metadata, remain service-only even on success. A successful operator
envelope contains only screened answer text, usage and content-free receipt hashes.
It is not a substitute for the private raw record during later evaluation.
Partial over-limit bodies are explicitly marked
incomplete and cannot become successful results.

No migration is required. Existing ledger limits are at most 1000c per batch and
the shared 10000c monthly cap. Compilation partitions fixed requests into bounded
batches and ensures their total reservation does not exceed the quote. Each case
reserves a conservative input bound of complete request UTF8 bytes plus 1024,
and 800 output tokens, at the separately reviewed rates. These are ceilings, not
tokenizer measurements. Runtime monetary settlement is based on actual reported
tokens at those reviewed prices.

The actual safety guard remains in use. Its fixed moderation model is
`omni-moderation-latest`, bounded to at most two calls per case with 20s timeouts.
The quote must explicitly attest a reviewed zero-cent moderation rate. This code
does not establish current provider pricing. A nonzero moderation rate would
require extending accounting before activation. Embedding is outside this path.

## Commands

All files are explicit inputs, bounded regular UTF8 files with separately pinned
byte hashes. Outputs are exclusive; mode 0600/0700 is requested where supported.
Windows ACLs govern actual access on Windows. Reports contain source and model
text and must be kept private. Console output contains counts/status/hashes only.

```powershell
npx tsx scripts/learning/integrated-execution-plan.ts compile <prepared-plan.json> --prepared-sha256 <file-sha256> --quote <quote.json> --quote-sha256 <file-sha256> --out <new-execution-plan.json>
```

Quote fields are:

- `schema: integrated-execution-quote-v1`
- `preparedPlanSha256`, `operatorId`, `projectUrl` (exact HTTPS origin)
- `inputRate`, `outputRate` (cents per million tokens)
- `priceReviewedAt`, `expiresAt` (execution expires within 24h of reviewed pricing)
- `maxTotalCents` (1-10000), `maxBatchCents` (1-1000), `timeoutMs` (1000-180000)
- `moderation: {model: omni-moderation-latest, maxCallsPerCase: 2, reviewedCentsPerCall: 0}`

No concrete quote or approval is generated automatically. After separate exact
authorization and reviewed deployment of the new plan, the runner command is:

```powershell
node --conditions=react-server --import tsx scripts/learning/integrated-execution-run.ts execute <execution-plan.json> --plan-file-sha256 <file-sha256> --approval <approval.json> --approval-sha256 <file-sha256> --out-dir <new-directory>
```

Approval fields are `schema: integrated-execution-approval-v1`, `approved:true`,
`planSha256`, `operatorId`, `maxTotalCents`, and `expiresAt`. This local file is an
operator guard; it cannot authorize the server. The deployed exact plan/hash,
server flag and authenticated operator are the actual server gate. The script
requires existing-account credentials in process-only `DIANA_CAPTURE_QA_EMAIL`
and `DIANA_CAPTURE_QA_PASSWORD`; it never creates or resets an account. Public
Supabase configuration comes from the existing environment or public-only parser.
The output directory must not already exist. There is no resume/retry command.
The runner checks both the plan and the shorter local approval expiry before each
dispatch; an expired approval leaves remaining rows explicitly unattempted.

## Verification limits and remaining execution inputs

The raw parser implementation was moved byte-for-byte to shared Edge code, with
one explicit `node:buffer` import added for Deno; the Next export delegates to it.
Removing that import reproduces the independently reviewed parser SHA, and
all 48 existing parser/CLI tests remain passing. New tests execute the real safety
guard with synthetic moderators, test receipt/order/budget failures and one-attempt
behavior, and run the bundled real default-off entry with a network sentinel.
The bundle test maps JSR Supabase to the already installed npm SDK. Native Deno
and hosted Edge execution are not claimed; deployment compilation remains a gate.
The function pins Zod 3.25.76, matching the installed version exercised by these tests.
Its function-local import map resolves the existing JSR Supabase SDK specifier to
`npm:@supabase/supabase-js@2.106.2` and pins the functions runtime types to
`jsr:@supabase/functions-js@2.106.2/edge-runtime.d.ts`, matching the installed
packages used by the local bundle tests. The SDK version is published on npm;
the same SDK version is unavailable on JSR.
The shared dynamic resource lookup validates an object with the requested ID and
owner before allowing it to reach policy checks or privileged client creation.
The function-local import map follows [Supabase dependency guidance](https://supabase.com/docs/guides/functions/dependencies);
the explicit Buffer import follows [Deno's Node API guidance](https://docs.deno.com/runtime/reference/node_apis/).

Fresh family-reviewed evaluation inputs, pinned sources, rubric/thresholds,
operator-verified model identity/pricing and the exact approval are still required
for a new 96-case proposal. No new teaching cases were authored here. No educator
qualification, semantic acceptance, learning benefit, execution attestation or
production eligibility is inferred from code/tests, server hashes or API usage.

## Database assistance readiness preflight

The 29 September approved diagnostic stopped before generation because the
database assistance control was still staged. Setting the research-local receipt
option does not override that database gate. Its historical run, conservative
token charge and zero-cent research settlement remain preserved in
`artifacts/learning-engine/research/integrated-diagnostic-approved-20260929/`.

The next local source revision reads the actual
`learning_task_assistance_control` singleton using the service client obtained
from the authenticated operator context. It runs before experiment reservation,
moderation or the token guard. A false control returns HTTP 503 with
`assistance_enforcement_staged`; missing, malformed, denied or unavailable data
returns `assistance_readiness_unavailable`. Both report no reservation/provider
attempt. The read is not a write receipt: the existing mandatory receipt remains
immediately before provider dispatch and must still succeed if state changes.
This repair has not been deployed and does not change frozen research packages.

### Activation prerequisites, read-only assessment

The live check on 29 September found `enforced=false`, zero transfer authorization
rows and zero provisioned fresh-transfer bindings. The service role can read the
control but cannot activate it; authenticated and anonymous roles also cannot
activate it. The existing operator activation function requires a reviewed fresh
transfer with its current reference binding. Provisioning separately validates
the actual source/version/reference, post-installation source age, review timing,
and absence of disqualifying broad assignment assistance.

Before global activation, the rollout described in `learning-task-assistance.md`
also requires independently checked substantive-help integrations deployed at
their reviewed versions, plus an authorized fresh transfer that the student can
actually reach. The SQL existence check alone does not prove those application
release conditions. There is no runtime disable RPC. No activation or transfer
authorization was performed by this preflight repair.

A possible separately reviewed research path would use an operator-owned exact
allowlist bound to plan hash, experiment request ID, owner, assignment, payload
hash and expiry, and a service-only append-only receipt RPC. That RPC would check
the exact recent unstarted reservation and current consent/deletion/green policy
before appending the normal assignment-assistance exposure record. Current
experiment reservations do not bind owner or assignment before provider start,
so reservation ID and hash alone are insufficient for that database permission.
The existing product RPC and independence activation gate would remain unchanged.
This is a design proposal, not an implemented bypass or approval to retry.
