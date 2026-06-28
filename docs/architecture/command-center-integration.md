# Command Center Integration

This is the boundary contract for connecting Diana with Paperclip, OpenJarvis,
and gstack without turning any one tool into the whole platform.

## Positioning

Diana is the student product. It owns the user experience, assignments, classes,
student safety policy, authorship logging, AI traffic-light behavior, and parent
or school privacy boundaries.

Paperclip is the command center. It can coordinate goals, tickets, agent roles,
approvals, budgets, heartbeats, run records, and audit logs. It should route
work and record outcomes. It should not own Diana's student runtime or product
database.

OpenJarvis is the local AI worker layer. It can provide local chat, voice,
memory, local model routing, scheduled personal workflows, and low-cost private
execution. It can help a student type or speak to Diana, but it must call Diana
through approved Diana tools for academic context and policy decisions.

gstack is the engineering and browser automation layer. It can run planning
review, CEO review, engineering review, design review, browser QA, release
documentation, canary checks, and related software-production workflows. It is
not the student conversation layer and not the business command center.

The integration layer is deliberately thin: HTTP, MCP, CLI, and scripts pass
structured requests, results, and artifact references between systems.

## Million-user rule

The scalable Diana product must not require Paperclip, OpenJarvis, or gstack in
the normal student request path.

Required for core Diana:

- Diana web and mobile UI
- Supabase auth, Postgres, storage, and Edge Functions
- Diana's AI safety and authorship logging path
- Cloud fallback for voice/text help when no local sidecar exists

Optional or internal:

- Paperclip for internal command-center operations and agent governance
- OpenJarvis for optional local/private sidecar mode
- gstack for engineering review, browser testing, release checks, and canaries

## First safe integration path

Start with Paperclip to gstack.

This path is low risk because it is internal engineering work and does not
require student records. Paperclip can create a goal or issue such as "Run
Diana dashboard QA." The gstack worker receives a read-only engineering work
request, performs QA or review, and returns reports, screenshots, logs, and
recommendations as artifacts. Paperclip stores the run evidence and audit trail.

Default constraints:

- read-only unless explicitly approved
- engineering policy mode
- no Diana student data
- report changed files or confirm no changes
- return screenshots, logs, command output, or report artifacts when available

Current executable helpers:

- `npm run command-center:handoff` emits the internal Diana work request.
- `npm run command-center:paperclip-issue` emits a Paperclip `paperclipCreateIssue` payload.
- `npm run command-center:paperclip-submit` creates a live Paperclip issue through `paperclipai`.
- `npm run command-center:openjarvis-test` verifies the local sidecar worker path.
- Handoff and issue-payload commands are local and emission-only by default.

## OpenJarvis student sidecar path

OpenJarvis can be used for a student to type or speak to Diana, but only as a
sidecar behind Diana.

Allowed first tools:

- `get_next_assignment`
- `read_due_today`
- `ask_diana_for_hint`
- `transcribe_voice_note`

Later write tools, after the read-only loop is stable:

- `create_reminder`
- `save_student_note`
- `start_focus_session`

Non-negotiable boundaries:

- OpenJarvis must not access Diana's Supabase database directly.
- OpenJarvis must not decide Diana's academic safety policy.
- Student-facing routes must create a tenant-scoped Diana worker job before
  invoking any sidecar worker.
- Browser responses may include a public trace id, queue mode, read-only flag,
  and policy mode only; provider details stay in Diana audit receipts.
- Production rollout requires durable queues, worker rate limits, and tenant
  isolation using the `worker_jobs` and `worker_rate_limits` schema.
- Production preflight can verify the worker queue and rate-limit schema with
  read-only service-role checks and verify the worker queue/rate-limit RPCs
  without claiming a real job or reserving a real rate-limit slot before any
  canary job is seeded.
- Worker pools claim and complete jobs through `/api/workers/claim` and
  `/api/workers/complete` with `WORKER_API_TOKEN` bearer auth. These endpoints
  are backend-only and must never be called by the student UI.
- Worker bearer tokens are compared through a fixed-digest timing-safe check
  before any queue claim, completion, or metrics logic runs.
- Worker completion must include the claimed job's tenant id. Trace-only
  completion is rejected so backend workers cannot accidentally complete
  another tenant's work.
- Student candidate requests reserve a durable `worker_rate_limits` slot before
  sidecar execution, instead of relying on app-local counters.
- `DIANA_VOICE_QUEUE_MODE=managed_queue` moves candidate execution from inline
  sidecar calls to the backend worker pool while keeping the browser response to
  a public trace and queued state.
- `/api/workers/metrics` is backend-only and reports queue totals, retry count,
  latency, and tenant error aggregates for observability.
- `/api/workers/metrics/prometheus` is backend-only and exposes scrapeable
  Prometheus metrics for the same worker snapshot.
- OpenJarvis must not bypass AI traffic-light behavior.
- OpenJarvis must return transcripts and tool calls for Diana-side logging.
- Student-runtime work must originate from Diana, not Paperclip.
- Long-running Diana worker replicas need the worker bearer token and
  OpenJarvis base URL, but they must not carry Supabase service-role credentials.
  Service-role credentials are reserved for short-lived preflight/canary/load
  smoke jobs.

## Contract files

The executable contract lives in:

- `lib/integrations/command-center-contract.ts`
- `lib/integrations/command-center-contract.test.ts`
- `lib/integrations/command-center-handoff.ts`
- `lib/integrations/command-center-handoff.test.ts`
- `lib/integrations/command-center-paperclip.ts`
- `lib/integrations/command-center-paperclip.test.ts`
- `lib/integrations/openjarvis-sidecar.ts`
- `lib/integrations/openjarvis-sidecar.test.ts`
- `lib/worker-tier/production-worker-tier.ts`
- `lib/worker-tier/production-worker-tier.test.ts`
- `lib/worker-tier/worker-queue.ts`
- `lib/worker-tier/worker-queue.test.ts`
- `lib/worker-tier/worker-runner.ts`
- `lib/worker-tier/worker-runner.test.ts`
- `app/api/workers/claim/route.ts`
- `app/api/workers/claim/route.test.ts`
- `app/api/workers/complete/route.ts`
- `app/api/workers/complete/route.test.ts`
- `app/api/workers/metrics/route.ts`
- `app/api/workers/metrics/route.test.ts`
- `app/api/workers/metrics/prometheus/route.ts`
- `app/api/workers/metrics/prometheus/route.test.ts`
- `scripts/create-command-center-handoff.ts`
- `scripts/create-paperclip-gstack-issue.ts`
- `scripts/submit-paperclip-gstack-issue.ts`
- `scripts/test-openjarvis-sidecar.ts`
- `scripts/run-diana-worker.ts`
- `scripts/run-worker-tenant-canary.ts`
- `scripts/run-worker-load-smoke.ts`
- `scripts/worker-production-preflight.ts`
- `scripts/validate-worker-deployment.ts`
- `Dockerfile.worker`
- `.env.worker.example`
- `.env.worker-canary.example`
- `deploy/worker/kubernetes.yaml`
- `deploy/worker/keda-scaledobject.yaml`
- `deploy/worker/prometheus-example.yaml`
- `docs/operations/diana-worker-production-runbook.md`

Use those helpers when introducing a real adapter so new work keeps the same
ownership model.

The staged build plan lives in `docs/architecture/command-center-roadmap.md`.
