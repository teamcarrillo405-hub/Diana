# Command Center Roadmap

This is the build plan for Paperclip, OpenJarvis, gstack, and Diana.

## Principle

Diana is the product for millions of students. Paperclip, OpenJarvis, and
gstack make Diana stronger, but they are not required for the normal student
request path.

## Phase 1: Contracts and Boundaries

Status: complete.

Owner: Diana.

Outcome: Diana has a typed contract for work requests, work results, artifact
references, handoff constraints, and student-runtime guard checks.

Exit criteria:

- Contract exists in `lib/integrations/command-center-contract.ts`.
- Tests prove student-runtime work cannot bypass Diana.
- Architecture docs define Paperclip, OpenJarvis, gstack, and Diana ownership.

## Phase 2: Paperclip to gstack

Status: current.

Owner: Paperclip.

Outcome: Paperclip can create or store a gstack engineering request for Diana
QA, review, or browser automation.

Default request:

- Source: Paperclip
- Target: gstack
- Mode: engineering
- Permission: read-only
- Data: internal repo/docs only
- Budget: capped

CLI:

```bash
npm run command-center:handoff
```

Optional write:

```bash
npm run command-center:handoff -- --write=.planning/command-center/paperclip-gstack-dashboard-qa.json
```

Paperclip issue payload:

```bash
npm run command-center:paperclip-issue
```

Optional Paperclip-targeted write:

```bash
npm run command-center:paperclip-issue -- --company-id=<uuid> --project-id=<uuid> --paperclip-goal-id=<uuid> --assignee-agent-id=<uuid> --write=.planning/command-center/paperclip-gstack-dashboard-qa-issue.json
```

The issue payload is emission-only. It produces `paperclipCreateIssue` input for
the Paperclip MCP/API layer, but it does not call the live Paperclip runtime by
default.

Command-center privacy and health audit:

```bash
npm run command-center:audit
```

Use this before command-center work. It verifies that Paperclip is still
local/private, no ngrok process exposes Paperclip port `3100`, OpenJarvis and
Ollama are reachable, gstack browser automation is healthy, Codex OAuth works,
the Paperclip-to-gstack payload is read-only, and Diana student UI code does not
directly reference the backend operator systems.

For a faster local check that skips the Codex OAuth worker:

```bash
npm run command-center:audit -- --quick
```

Live Paperclip submission:

```bash
npm run command-center:paperclip-submit -- --company-id=<uuid> --api-base=http://127.0.0.1:3100
```

Use `--dry-run` first when pointing at a new company or assignee.

Phase 2.1 exit criteria:

- A Paperclip issue adapter maps Diana `WorkRequest` into `paperclipCreateIssue`.
- Non-UUID Paperclip ids are rejected before tool input is emitted.
- Student-runtime and OpenJarvis requests cannot become Paperclip gstack issues.
- The issue body carries the original Diana work request for audit.

## Phase 3: OpenJarvis Read-only Sidecar

Owner: OpenJarvis with Diana as safety gate.

Outcome: A student can type or speak locally while Diana remains the source of
truth for assignments, AI policy, and authorship logging.

Allowed first Diana tools:

- `get_next_assignment`
- `read_due_today`
- `ask_diana_for_hint`
- `transcribe_voice_note`

Exit criteria:

- OpenJarvis has no direct Supabase access.
- Diana receives transcripts and tool-call records.
- The sidecar works when available and Diana falls back to cloud when absent.

First implementation target:

- Student speaks or types in Diana.
- Diana sends approved context to the OpenJarvis sidecar.
- OpenJarvis returns a transcript, candidate response, and tool-call trace.
- Diana applies traffic-light policy, minor-safety rules, and authorship logging.
- Diana renders or refuses the answer from its own product UI.

Current read-only route:

- Student UI calls Diana-owned `/api/diana/voice-candidate`.
- The route is off unless `DIANA_OPENJARVIS_SIDECAR_ENABLED=true` or
  `DIANA_VOICE_SIDECAR_ENABLED=1`.
- The route requires an authenticated Diana user.
- The browser never calls OpenJarvis, Ollama, Paperclip, gstack, or local ports.
- The server calls the OpenAI-compatible OpenJarvis endpoint and returns a
  candidate response plus read-only trace.
- The response is shown only after Diana writes an `authorship_log` receipt.
- The route verifies assignment ownership before attaching an assignment id to
  the receipt.

Verified local beta gate:

- Signed-in `/voice` typed-command flow returns a Diana candidate through
  OpenJarvis.
- The browser only calls `/api/diana/voice-candidate`.
- `authorship_log` records the receipt before the response is shown.
- The read-only trace exposes only read/transcription tools:
  `ask_diana_for_hint`, `get_next_assignment`, `read_due_today`, and
  `transcribe_voice_note`.
- Desktop and mobile `/voice` QA have no console errors or horizontal overflow.

Production scale gate:

- Do not route millions of students through a single local OpenJarvis process.
- Before broad rollout, promote the sidecar contract to a horizontally scalable
  worker tier with queueing, rate limits, observability, model routing, and
  per-tenant isolation.
- Keep Paperclip and gstack backend-only; Diana remains the only student-facing
  command surface.

Current production-worker-tier foundation:

- `lib/worker-tier/production-worker-tier.ts` defines the tenant-scoped worker
  job contract, public browser-safe trace, read-only tool boundary, per-window
  rate-limit decision, budget cap, and inline/managed queue modes.
- `/api/diana/voice-candidate` now creates a `diana.voice_candidate` worker job
  before calling the local sidecar.
- The browser receives only `traceId`, `queueMode`, `policyMode`, and
  `readOnly`; the full OpenJarvis/provider trace stays in `authorship_log`.
- `supabase/migrations/0041_production_worker_tier.sql` defines durable
  production tables for `worker_jobs` and `worker_rate_limits`.
- `supabase/migrations/0042_worker_queue_runtime.sql` adds queue payloads,
  retry/lease fields, and the `claim_worker_job` RPC for horizontally scalable
  workers.
- `supabase/migrations/0043_worker_rate_limit_runtime.sql` adds the atomic
  `reserve_worker_rate_limit` RPC so scaled app instances reserve the same
  tenant/student/feature limit before sidecar execution.
- `/api/workers/claim` and `/api/workers/complete` expose bearer-token worker
  endpoints for backend worker pools. They are not browser/student surfaces.
- `/api/workers/complete` requires the tenant id returned by the claim path, so
  worker completion is trace-scoped and tenant-scoped.
- `npm run worker:diana -- --worker-id=<id>` starts a backend worker loop that
  claims one approved queue at a time, executes `diana.voice_candidate`, and
  completes the job with worker id, duration, provider, and model telemetry.
- `npm run worker:diana -- --health` checks the protected metrics endpoint and
  can be used as a worker health probe.
- `Dockerfile.worker` packages the Diana worker as a standalone backend service.
  `--max-cycles=<n>` and multiple `DIANA_WORKER_ID` values support bounded
  smoke runs and horizontal scaling.
- `npm run worker:diana -- --check-config` verifies the worker command path and
  environment parsing, including the Diana app URL and OpenJarvis sidecar URL,
  without contacting the Diana app or queue.
- `npm run worker:deployment-check` statically verifies worker deployment
  templates, image workflow triggers, sidecar configuration, and service-role
  credential separation.
- `DIANA_VOICE_QUEUE_MODE=managed_queue` makes `/api/diana/voice-candidate`
  enqueue candidate work for the worker pool and return a browser-safe queued
  trace instead of calling the sidecar inline.
- `/api/diana/voice-candidate/status` lets the signed-in student poll a queued
  candidate by public trace id. It is owner-scoped through Diana/Supabase and
  returns only candidate text plus public trace fields, not provider, model, or
  worker ids.
- `DIANA_VOICE_MANAGED_QUEUE_TENANTS` enables managed queue mode for specific
  tenants while the default stays inline, and `DIANA_VOICE_INLINE_QUEUE_TENANTS`
  is a per-tenant rollback override when global managed queue mode is enabled.
- `/api/workers/metrics` exposes backend-only queue depth, retry, latency, and
  tenant error metrics behind `WORKER_API_TOKEN`.
- `/api/workers/metrics/prometheus` exposes the same backend-only metrics as
  Prometheus text for production scraping. Tenant labels are opt-in with
  `includeTenants=true` to avoid high-cardinality metrics by default.
- `npm run worker:tenant-canary` verifies the worker completion boundary rejects
  missing tenant ids and can optionally test wrong-tenant completion for a known
  job.
- `npm run worker:tenant-canary -- --seed` creates, cross-tenant checks, and
  cleans up a known smoke-queue canary job when service credentials are
  available, without claiming from the shared production queue.
- `npm run worker:load-smoke -- --count=10` seeds managed-queue jobs, claims and
  completes them through the worker API, then reads `/api/workers/metrics`.
- `npm run worker:production-preflight` verifies a deployed Diana app is
  reachable, worker claim/complete/metrics endpoints are protected from
  unauthenticated requests, bearer auth reaches worker validation, and backend
  bearer auth can read JSON and Prometheus worker metrics. When Supabase
  service credentials are present, it also performs read-only worker table
  schema checks and non-mutating worker RPC checks before seeded canaries mutate
  queue state.
- `npm run command-center:audit` includes the production-worker-tier contract
  tests.
- `docs/operations/diana-worker-production-runbook.md` defines the deploy,
  preflight, canary, load, rollout, and rollback procedure.
- `deploy/worker/` contains Kubernetes, optional KEDA, and Prometheus Operator
  examples for the horizontally scalable worker tier.

Runnable worker examples:

```bash
WORKER_API_TOKEN=<secret> npm run worker:diana -- --worker-id=voice-worker-a
WORKER_API_TOKEN=<secret> npm run worker:diana -- --worker-id=voice-worker-b
WORKER_API_TOKEN=<secret> npm run worker:diana -- --health
WORKER_API_TOKEN=<secret> npm run worker:tenant-canary
WORKER_API_TOKEN=<secret> npm run worker:tenant-canary -- --seed
WORKER_API_TOKEN=<secret> npm run worker:load-smoke -- --count=10
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<url> npm run worker:production-preflight
```

Use `--once` for a single poll in smoke tests.

Container deployment:

```bash
docker build -f Dockerfile.worker -t diana-worker .
docker run --env-file .env.worker.example diana-worker
```

Each replica should use the same `WORKER_API_TOKEN`, a unique
`DIANA_WORKER_ID`, and a reachable `OPENJARVIS_BASE_URL`. The queue claim RPC
uses `for update skip locked`, so multiple replicas can poll
`student-ai-candidate` without claiming the same job.

Remaining production gate:

1. Deploy one or more `Dockerfile.worker` replicas with production secrets,
   unique `DIANA_WORKER_ID` values, worker health probes, and autoscaling tied
   to queue depth or claim latency.
2. Keep `DIANA_VOICE_QUEUE_MODE=inline` as the default while staging validates
   managed queue mode. Then roll tenants forward one cohort at a time with
   `DIANA_VOICE_MANAGED_QUEUE_TENANTS`; use `DIANA_VOICE_INLINE_QUEUE_TENANTS`
   for tenant rollback.
3. Wire `/api/workers/metrics` into the production observability stack with
   dashboards and alerts for queue depth, running leases, retry count, average
   claim latency, average completion latency, and tenant error aggregates. Use
   `/api/workers/metrics/prometheus` when the stack can scrape Prometheus text.
4. Run `worker:production-preflight`, seeded tenant canaries, and load smoke in
   staging and production before each tenant rollout.
5. Run larger load tests against the managed worker path before enabling it for
   broad student traffic.
6. Use the rollback runbook to return affected tenants to inline mode and scale
   worker replicas down only after queue depth reaches zero.

Local sidecar health test:

```bash
npm run command-center:openjarvis-test
```

Default local test targets the OpenAI-compatible OpenJarvis server at
`http://127.0.0.1:8000` with `llama3.2:3b`. To test the Ollama fallback
directly:

```bash
npm run command-center:local-ai-test -- --provider=ollama --base-url=http://127.0.0.1:11434 --model=llama3.2:3b
```

To test the Codex OAuth worker path:

```bash
npm run command-center:local-ai-test -- --provider=codex
```

The current local OpenJarvis server can be started from its install directory:

```bash
cd C:\Users\glcar\OpenJarvis
$env:UV_PYTHON_PREFERENCE="only-managed"
uv run jarvis serve --host 127.0.0.1 --port 8000 --engine ollama --model llama3.2:3b
```

## Phase 4: OpenJarvis Narrow Writes

Owner: Diana.

Outcome: The local sidecar can perform limited student-approved writes through
Diana APIs.

Allowed write tools:

- `create_reminder`
- `save_student_note`

Exit criteria:

- Diana validates auth and payload shape.
- Diana logs sidecar write events.
- No assignment status changes happen through OpenJarvis.

## Phase 5: Operations Governance

Owner: Paperclip.

Outcome: Paperclip tracks recurring QA, research, canary, support, and product
operations workflows with run status, cost, logs, approvals, and artifacts.

Exit criteria:

- Paperclip stores gstack run artifacts.
- Paperclip can route local/private work to OpenJarvis when appropriate.
- Diana core student runtime remains independent.
