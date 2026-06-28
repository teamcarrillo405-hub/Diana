# Diana Worker Production Gate Evidence

Date: 2026-06-28

This captures the current local evidence for the Diana worker production gate.
It does not claim that production deployment is complete. The remaining gate is
external: hosted worker replica deployment, monitoring scrape, GitHub Actions
production-gate run, and cohort rollout.

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
  - verifies this production-gate branch auto-publishes the GHCR worker image
    and requires pushed-image evidence
  - verifies worker pods declare a GHCR image pull secret and the hosted
    Kubernetes deploy workflow creates it from repository secrets before
    applying the workload
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

- Vercel production deployment `dpl_6Vn3yTQMzHSKyxei1VvZztvjXr4V` is `Ready`
  and aliased to `https://diana-umber.vercel.app`.
  - It was deployed from clean worktree
    `C:\Users\glcar\Diana-clean-deploy-08d6add` at commit
    `3eb8303209c8bb48cb4fad0eb322931c7f7e052a`, avoiding unrelated local
    dashboard/design WIP in `C:\Users\glcar\Diana`.
- `npm run worker:production-preflight`
  - Diana app reachable
  - unauthenticated Diana voice status returns JSON `401`
  - worker claim, complete, metrics, prometheus, and version endpoints reject
    missing bearer auth with JSON `401`
  - authorized worker claim and complete requests reach validation
  - authorized worker metrics and prometheus metrics return `200`
  - authorized worker version returns app SHA
    `3eb8303209c8bb48cb4fad0eb322931c7f7e052a` from `DIANA_APP_BUILD_SHA`,
    and preflight passed with `DIANA_EXPECTED_APP_SHA` set to the same value
  - `worker_jobs` and `worker_rate_limits` schema is reachable
  - `claim_worker_job` and `reserve_worker_rate_limit` RPCs are callable
- `npm run worker:tenant-canary -- --seed`
  - missing tenant completion rejected with `400`
  - cross-tenant completion rejected with `404`
  - canary cleanup returned `200`
- `npm run worker:load-smoke -- --count=5`
  - 5 per-run production-origin smoke jobs completed
  - metrics reported `queued: 0`, `running: 0`, `error: 0`, `retries: 0`
  - latest smoke queue:
    `student-ai-candidate-smoke-load-smoke-mqydjrjp`
- `npm run worker:e2e-smoke`
  - compiled local worker consumed one production-origin smoke job
  - fake OpenJarvis-compatible sidecar received one chat request
  - job completed as `succeeded`
  - result recorded provider `openjarvis`, model `worker-e2e-fake-model`, and
    backend-only `imageSha` `e2e-smoke-mqydjro7-image-sha`
  - latest trace: `dw-e2e-smoke-mqydjro7`
- `npm run worker:deployed-canary -- --timeout-ms=20000 --poll-ms=1000`
  - timed out with the seeded job still `queued`
  - this confirms the app-side gate is live, but no deployed worker replica has
    consumed production queue work yet

## Worker Image Evidence

- GitHub workflow badges report `CI - passing` and `Worker image - passing`
  for branch `codex/diana-v2-clean-history` after commit
  `e2e08e9b10c4ee11c9e33bc15053cf8d2a3b0ed2`.
  - The GitHub REST API was rate-limited for unauthenticated artifact lookup
    during this evidence refresh, so the exact latest artifact id was not
    retrieved in this snapshot.
  - The latest candidate worker image tag for hosted deployment is expected to
    be:
    `ghcr.io/teamcarrillo405-hub/diana/diana-worker:e2e08e9b10c4ee11c9e33bc15053cf8d2a3b0ed2`
  - The production Diana app deployment SHA remains:
    `3eb8303209c8bb48cb4fad0eb322931c7f7e052a`
- GitHub `Worker image` run `28338120109` passed for commit
  `c2593a8b26130537476e08037c2ef9e9a870e51e`.
- Artifact `diana-worker-image-28338120109-1` was uploaded.
- The workflow is configured to push this branch's worker image to:
  `ghcr.io/teamcarrillo405-hub/diana/diana-worker:c2593a8b26130537476e08037c2ef9e9a870e51e`
- Because this branch sets `PUSH_WORKER_IMAGE=true`, the workflow's own
  `npm run worker:image-evidence-check -- --require-pushed` step had to pass
  before the successful run concluded.

## Temporary Replica Smoke Passed

This is not final production proof because the replicas were temporary local
processes, not hosted production workers. It does prove the production app,
production queue, worker token, OpenJarvis sidecar, and two concurrent worker
processes can complete a production-queue canary.

- Started two temporary compiled worker processes against
  `https://diana-umber.vercel.app` and queue `student-ai-candidate`.
- Ran `npm run worker:deployed-canary -- --timeout-ms=60000 --poll-ms=1000`.
- Canary trace `dw-deployed-canary-mqyb4rfq` completed as `succeeded`.
- The winning worker was `local-temp-replica-2-143454`.
- Result recorded provider `openjarvis`, model `llama3.2:3b`, and
  `responseChars: 113`.

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
The production-gate branch now auto-publishes its GHCR image on push so worker
deployment is no longer blocked on a manual image-dispatch step.

The hosted Kubernetes deploy path now handles private GHCR pulls explicitly.
Worker pods declare `imagePullSecrets: ghcr-pull-secret`, and the GitHub deploy
workflow requires `GHCR_PULL_USERNAME` plus `GHCR_PULL_TOKEN`, creates the
Docker registry secret in the target namespace, and rewrites the pull-secret
name when a different input is used.

The hosted Kubernetes deploy workflow now uploads
`diana-worker-kubernetes-deploy-...` evidence with the selected image, target
origin, namespace, replica count, kubectl rollout/status logs, production
preflight output, and deployed-worker canary output.

`npm run worker:kubernetes-deploy-evidence-check` now verifies that deploy
artifact shape and, with `--require-success`, requires successful rollout,
worker pod status, production preflight, and deployed-worker canary evidence.

The deploy workflow now rejects the placeholder `image_sha` input, so a manual
dispatch cannot accidentally roll out an older default image. Operators must
copy the intended SHA from a successful `Worker image` run.

The hosted worker config now includes `DIANA_WORKER_IMAGE_SHA`, and the
Kubernetes deploy workflow runs the deployed-worker canary with
`--expected-image-sha`. The worker records `imageSha` in backend-only job result
payloads, which lets deploy evidence prove the job was consumed by the intended
image without exposing backend details to the student browser.

The production-origin e2e smoke exposed a distributed clock-skew bug. Queued
jobs were inserting `available_at` from the client/runtime clock, so a fast
remote claim could see the job as not yet available against the database clock
and return `idle`. Immediate queued jobs now omit `available_at` and let the
database default set it. `worker-queue.test.ts` includes a regression check for
this boundary.

## Remaining Production Gate Plan

1. Deploy hosted worker replicas.
   - Use the `Worker kubernetes deploy` workflow.
   - Required repository secrets: `KUBE_CONFIG_B64`,
     `DIANA_WORKER_API_TOKEN`, `GHCR_PULL_USERNAME`, and
     `GHCR_PULL_TOKEN`.
   - Dispatch inputs for the current production target:
     - `target_origin`: `https://diana-umber.vercel.app`
     - `image_sha`: `e2e08e9b10c4ee11c9e33bc15053cf8d2a3b0ed2`
     - `expected_app_sha`: `3eb8303209c8bb48cb4fad0eb322931c7f7e052a`
     - `replicas`: `2` or higher
     - `openjarvis_base_url`: the private in-cluster OpenJarvis-compatible
       service URL
     - `openjarvis_model`: the approved local model, currently `llama3.2:3b`
   - The workflow applies `deploy/worker/kubernetes.yaml`, creates the GHCR
     image pull secret, writes `DIANA_WORKER_IMAGE_SHA`, runs production
     preflight, and runs the deployed-worker canary with
     `--expected-image-sha`.

2. Prove hosted worker consumption.
   - Preserve the uploaded `diana-worker-kubernetes-deploy-...` artifact.
   - Download it and run
     `npm run worker:kubernetes-deploy-evidence-check -- --dir=<artifact> --require-success`.
   - The artifact must show successful rollout status, pod status,
     production preflight with the expected app SHA, and a deployed-worker
     canary completed by the expected worker image SHA.

3. Turn on monitoring and autoscaling evidence.
   - Configure production monitoring to scrape
     `/api/workers/metrics/prometheus`.
   - Enable the Prometheus/KEDA queue-depth path once scrape data is visible.
   - Confirm queue depth, running leases, retry count, tenant errors, claim
     latency, and completion latency are observable before student rollout.

4. Run the full GitHub production gate.
   - Dispatch `Worker production gate` against staging first, then production.
   - Production inputs:
     - `target_origin`: `https://diana-umber.vercel.app`
     - `expected_app_sha`: `3eb8303209c8bb48cb4fad0eb322931c7f7e052a`
     - `seeded_checks`: `true`
     - `diana_status_smoke`: `true`
     - `load_count`: start with `10`, then repeat with `25` or `100`
   - Preserve the uploaded `diana-worker-production-gate-...` artifact and run
     `npm run worker:gate-evidence-check -- --dir=<artifact> --require-success`.

5. Roll out by tenant, not globally.
   - Configure an already-onboarded QA student and include that tenant in
     `DIANA_VOICE_MANAGED_QUEUE_TENANTS`.
   - Keep global `DIANA_VOICE_QUEUE_MODE=inline` until the first cohort passes.
   - Observe one school-day traffic window.
   - Expand by cohort while keeping `DIANA_VOICE_INLINE_QUEUE_TENANTS` ready as
     the rollback override.

## Local Tooling Blockers

The following deployment tools are not installed on this machine:

- `docker`
- `podman`
- `kubectl`
- `gh`
