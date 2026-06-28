# Diana Worker Production Gate Evidence

Date: 2026-06-28

This captures the current local evidence for the Diana worker production gate.
It does not claim that production deployment is complete. The remaining gate is
external: image build/push, cluster deployment, monitoring scrape, GitHub
Actions production-gate run, and cohort rollout.

## Local Gates Passed

- `npm run typecheck`
- `npm run test:run` - 117 test files, 730 tests passed
- `npm run tone-audit` - clean across 426 files
- `npm run build`
- `npm run worker:test` - 14 focused worker/API/sidecar/middleware test files, 75 tests passed
- `npm run worker:deployment-check`
  - parses worker Kubernetes deployment objects
  - parses Prometheus ServiceMonitor and PrometheusRule objects
  - verifies worker metrics scrape uses bearer-token auth
  - verifies queue backlog, running lease, retry, and tenant-error alerts
  - verifies worker metrics include old active backlog outside the rolling
    history window, so KEDA can still see queued/running jobs
  - verifies worker APIs allow bounded per-run smoke queues and load smoke
    rejects unrelated claimed jobs
  - verifies the worker runner reads claimed job timeout constraints and aborts
    sidecar execution when a job exceeds its budget window
  - verifies queued worker results are returned through a signed-in,
    owner-scoped Diana status endpoint without backend provider details
  - verifies Diana voice managed-queue rollout is tenant-scoped and has a
    tenant rollback override
  - parses KEDA ScaledObject and verifies production queue-depth scaling
  - verifies migration `0044` replaces `claim_worker_job` with expired or
    malformed lease recovery and max-attempt handling
  - verifies the worker image workflow runs focused worker tests before Docker
    build
  - verifies the worker image workflow uploads a `diana-worker-image-...`
    artifact with the commit, image tag, and Docker image id
  - verifies the worker image workflow self-checks the image evidence artifact
    and has a strict `--require-pushed` mode when a GHCR push is requested
  - verifies the production-gate workflow includes a deployed-worker canary for
    actual worker-replica job consumption
  - verifies the production-gate workflow can run authenticated Diana status
    smoke with QA credentials, browser login, and worker-API completion
  - verifies the production-gate workflow uploads a durable
    `diana-worker-production-gate-...` artifact with summary, step outcomes,
    and command logs
  - verifies the worker image workflow watches Diana voice/status API routes
    and middleware changes, not only worker endpoint changes
  - verifies the worker image workflow watches worker database migrations, the
    production-gate evidence verifier, and the evidence documentation
  - verifies preflight-only production-gate runs do not require QA browser
    credentials for a status-smoke step that cannot run
  - verifies the production-gate workflow self-checks the evidence package
    shape before uploading the artifact
  - verifies `npm run worker:gate-evidence-check` can audit a downloaded
    production-gate artifact in strict success mode
- `npm run worker:gate-evidence-check -- --dir=<sample-artifact> --require-success`
  - passed against a temporary strict sample artifact with all production-gate
    steps marked `success` and all required command logs present
- `npm run worker:runtime-smoke`
- `git diff --check` - exit 0; only LF/CRLF working-copy warnings

## Command-Center Audit Passed

- `npx tsx scripts/command-center-audit.ts`
  - no ngrok process exposes Paperclip port `3100`
  - Paperclip local/private health passed
  - OpenJarvis health and model endpoints passed
  - Ollama model endpoint passed
  - gstack browser health passed
  - OpenJarvis sidecar chat passed
  - Ollama fallback chat passed
  - Paperclip-to-gstack handoff payload passed
  - Paperclip issue payload passed
  - student UI boundary passed: no direct Paperclip/OpenJarvis/gstack/Ollama/Codex
    backend references in `app/` or `components/`
  - command-center contract test cluster passed
  - Codex OAuth worker passed

## Live Local Worker Gates Passed

Target origin: `http://localhost:3000`

- `npm run worker:production-preflight`
  - Diana app reachable
  - unauthenticated `/api/diana/voice-candidate/status` returns JSON `401`
    from Diana instead of a login-page redirect
  - worker claim, complete, metrics, and prometheus endpoints reject missing
    bearer auth
  - authorized worker claim/complete requests reach validation
  - worker metrics and prometheus metrics return 200 with bearer auth
  - `worker_jobs` and `worker_rate_limits` schema is reachable
  - `claim_worker_job` and `reserve_worker_rate_limit` RPCs are callable
- `npm run worker:diana:compiled -- --health`
  - compiled worker reports healthy against Diana metrics
- `npm run worker:tenant-canary -- --seed`
  - missing tenant completion rejected with 400
  - cross-tenant completion rejected with 404
  - canary cleanup returned 200
- `WORKER_API_TOKEN=worker-secret npm run worker:e2e-smoke`
  - compiled worker consumed one per-run smoke-queue job:
    `student-ai-candidate-smoke-e2e-smoke-mqxggsj3`
  - fake OpenJarvis-compatible sidecar received one chat request
  - job completed as `succeeded`
  - result recorded provider `openjarvis` and model `worker-e2e-fake-model`
- `WORKER_API_TOKEN=worker-secret npm run worker:diana-status-smoke`
  - dev server was launched with `QA_CREATE_USER=true`,
    `DIANA_VOICE_SIDECAR_ENABLED=true`, and
    `DIANA_VOICE_QUEUE_MODE=managed_queue`
  - authenticated Diana request queued trace `dw-mqy90ox2-h2qylplj` on
    `student-ai-candidate`
  - worker API completion `status-smoke-mqy90nte-worker-api` completed the job
    through Diana's backend worker completion endpoint
  - authenticated status polling returned the completed Diana candidate without
    provider, model, worker id, Paperclip, gstack, OpenJarvis, or Ollama fields
    in the browser-visible response
  - authorship receipt was saved
- `npm run worker:deployed-canary -- --timeout-ms=60000 --poll-ms=1000`
  - ran with a local compiled worker process standing in for a deployed replica
  - seeded one `student-ai-candidate` production-queue job
  - worker completed the job with provider `openjarvis`, model `llama3.2:3b`,
    and worker id `local-deployed-canary-worker`
- `WORKER_API_TOKEN=worker-secret npm run worker:load-smoke -- --count=5`
  - 5 per-run smoke-queue jobs completed on
    `student-ai-candidate-smoke-load-smoke-mqxggwrt`
  - per-run smoke queue metrics reported `queued: 0`, `running: 0`, `error: 0`,
    `retries: 0`

## Live Production App-Side Gates Passed

Target origin: `https://diana-umber.vercel.app`

- Vercel production deployment `dpl_Hr2SjPfpYsHrzAESZeBPJ3BPUEQ3` is `Ready`
  and aliased to `https://diana-umber.vercel.app`.
- `npm run worker:production-preflight`
  - Diana app reachable
  - unauthenticated Diana voice status returns JSON `401`
  - worker claim, complete, metrics, and prometheus endpoints reject missing
    bearer auth with JSON `401`
  - authorized worker claim and complete requests reach validation
  - authorized worker metrics and prometheus metrics return `200`
  - `worker_jobs` and `worker_rate_limits` schema is reachable
  - `claim_worker_job` and `reserve_worker_rate_limit` RPCs are callable
- `npm run worker:tenant-canary -- --seed`
  - missing tenant completion rejected with `400`
  - cross-tenant completion rejected with `404`
  - canary cleanup returned `200`
- `npm run worker:load-smoke -- --count=5`
  - 5 per-run production-origin smoke jobs completed
  - metrics reported `queued: 0`, `running: 0`, `error: 0`, `retries: 0`
- `npm run worker:e2e-smoke`
  - compiled local worker consumed one production-origin smoke job
  - fake OpenJarvis-compatible sidecar received one chat request
  - job completed as `succeeded`
  - result recorded provider `openjarvis` and model `worker-e2e-fake-model`
- `npm run worker:deployed-canary -- --timeout-ms=15000 --poll-ms=1000`
  - timed out with the seeded job still `queued`
  - this confirms the app-side gate is live, but no deployed worker replica has
    consumed production queue work yet

## Bugs Fixed During Verification

The tenant canary previously claimed from the shared `student-ai-candidate`
queue. When run concurrently with e2e smoke, it could claim the e2e smoke job.
The canary, e2e smoke, and load smoke now use bounded per-run
`student-ai-candidate-smoke-...` queues by default, and metrics checks query the
same smoke queue they exercised.

The worker runner previously persisted per-job timeout constraints but did not
enforce them around the OpenJarvis/Ollama sidecar call. The runner now extracts
the claimed job timeout, wraps execution in an aborting timeout, forwards the
`AbortSignal` into the Diana voice sidecar fetch, and completes over-budget
work as a worker error.

The Diana voice route previously had only a global managed-queue switch. It now
supports `DIANA_VOICE_MANAGED_QUEUE_TENANTS` for tenant/cohort rollout while
the default stays inline, and `DIANA_VOICE_INLINE_QUEUE_TENANTS` for tenant
rollback even when global managed queue mode is enabled.

The managed queue path previously returned `202 queued` without a student-owned
way to receive the completed candidate. Workers now store a capped candidate
response in the tenant-scoped result payload, and Diana exposes
`/api/diana/voice-candidate/status` so only the signed-in owner can poll the
public candidate result. The browser still does not receive provider, model, or
worker id details; those stay in the backend worker job result and Diana
authorship receipt for audit.

The status endpoint was initially protected only by middleware, so an
unauthenticated API probe could follow the redirect to `/login` and receive a
200 HTML page. The endpoint is now middleware-public like
`/api/diana/voice-candidate`, which lets the route return the intended JSON
`401` response and keeps owner checks inside the route.

The local worker smoke previously bypassed the student-authenticated Diana
request path by seeding worker jobs directly. `worker:diana-status-smoke` now
proves the live path from authenticated Diana request, to managed queue, to
worker completion, to authenticated status polling and authorship receipt.

The status smoke was initially local-only because it depended on the dev QA
bootstrap route. It now also supports `--auth=browser` with `QA_USER_EMAIL` and
`QA_USER_PASSWORD`, plus `--complete-with=worker-api`, so GitHub Actions can run
the same student-facing queued-status proof against staging or production
without enabling dev-only QA routes.

The worker image workflow initially watched worker endpoint files but not the
Diana voice candidate API, queued-status API, or auth middleware that the worker
tests depend on. The workflow path filters now include those boundaries so a
student-facing queue/status change cannot bypass the focused worker image gate.
It also watches the worker database migrations, production-gate evidence
verifier, and evidence documentation so changes to the production contract do
not skip the image/build/test workflow. The workflow also watches its own YAML
definition so changes to the image gate rerun the image gate.

The production-gate workflow initially required QA browser credentials whenever
the status-smoke input was true, even when seeded checks were disabled and the
status-smoke step would be skipped. The secret check now matches the step
condition, so preflight-only runs can still prove reachability without unrelated
QA credentials.

The production-gate artifact verifier initially checked that `summary.json` and
`outcome.json` existed, but not that they described the same target, commit,
inputs, and run. It now rejects mismatched or malformed metadata before treating
an artifact as rollout evidence.

The production-gate workflow now runs the evidence verifier against
`worker-gate-evidence` before upload. The strict rollout check still happens
after downloading the artifact with `--require-success`, but the workflow now
catches malformed or mismatched evidence packages during the run itself.

The worker image workflow now writes `worker-image-evidence/summary.json` and
`worker-image-evidence/outcome.json`, then uploads a
`diana-worker-image-...` artifact. This gives the rollout record a
commit-to-image link and the image workflow step outcomes before the
production-gate artifact proves that deployed worker replicas consumed real
queue jobs. The summary records whether a push was requested; a successful push
also writes `pushed-image.txt` with the GHCR image tag.
`npm run worker:image-evidence-check` verifies the artifact shape and required
build/test/smoke outcomes, and `--require-pushed` additionally requires
`pushed-image.txt` to match the recorded GHCR image tag.

The production-origin e2e smoke exposed a distributed clock-skew bug. Queued
jobs were inserting `available_at` from the client/runtime clock, so a fast
remote claim could see the job as not yet available against the database clock
and return `idle`. Immediate queued jobs now omit `available_at` and let the
database default set it. `worker-queue.test.ts` includes a regression check for
this boundary.

## Remaining Production Gate

- Build `Dockerfile.worker` with Docker or an equivalent container builder.
- Push the immutable worker image tag to the target registry.
- Apply `deploy/worker/kubernetes.yaml` in the target cluster.
- Configure production secrets and confirm workers do not receive Supabase
  service-role credentials.
- Configure production monitoring to scrape
  `/api/workers/metrics/prometheus`.
- Configure an already-onboarded QA student and include that student's tenant in
  the managed-queue cohort before running authenticated Diana status smoke.
- Enable queue-depth scaling with the KEDA/Prometheus path once scrape data is
  available.
- Run the GitHub `Worker production gate` workflow against staging and
  production.
- Preserve the uploaded `diana-worker-production-gate-...` artifact from each
  staging and production run as the rollout evidence package.
- Inspect `outcome.json` in that artifact before rollout expansion; required
  checks should be `success`, while intentionally disabled optional checks may
  be `skipped`.
- Run `npm run worker:gate-evidence-check -- --dir=<artifact> --require-success`
  against the downloaded artifact before treating the run as production proof.
- Confirm `worker:deployed-canary` passes against staging and production after
  workers are deployed. This seeds one production-queue job and waits for a
  deployed worker replica to complete it.
- Roll one internal tenant or cohort to `DIANA_VOICE_QUEUE_MODE=managed_queue`,
  observe one school-day traffic window, then expand by cohort.

## Local Tooling Blockers

The following deployment tools are not installed on this machine:

- `docker`
- `podman`
- `kubectl`
- `gh`
