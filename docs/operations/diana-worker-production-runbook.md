# Diana Worker Production Runbook

This runbook is for the Diana voice/text candidate worker tier. The student UI
must continue to talk only to Diana. Paperclip, OpenJarvis, gstack, worker
claim endpoints, and worker metrics stay backend-only.

## Gate

Production is ready for managed queue rollout only when all of these are true:

- Supabase migrations `0041`, `0042`, `0043`, and `0044` are applied in the target
  environment. When service-role credentials are present,
  `worker:production-preflight` verifies the required `worker_jobs` and
  `worker_rate_limits` columns with read-only checks, verifies
  `claim_worker_job` with an empty preflight queue, and verifies
  `reserve_worker_rate_limit` with a non-mutating validation call before any
  seeded canary runs.
- `WORKER_API_TOKEN` is set on the Diana app and every worker replica.
- `/api/workers/claim`, `/api/workers/complete`, `/api/workers/metrics`, and
  `/api/workers/metrics/prometheus` return `401` without the worker bearer
  token.
- `/api/workers/claim` and `/api/workers/complete` reach validation with the
  worker bearer token, proving the protected worker API is reachable without
  seeding a job.
- `/api/diana/voice-candidate/status` returns queued and completed candidate
  results only to the signed-in owner of the worker job, and never exposes
  provider, model, worker id, or worker API details to the browser.
- `npm run worker:production-preflight` passes against the target Diana origin.
  It must verify that unauthenticated status polling returns JSON `401` from
  Diana rather than a login-page redirect.
- At least two worker replicas run from the same image with unique
  `DIANA_WORKER_ID` values.
- Hosted clusters can pull the worker image from GHCR through an explicit image
  pull secret. The GitHub deploy workflow requires `GHCR_PULL_USERNAME` and
  `GHCR_PULL_TOKEN` and creates the configured pull secret before applying the
  worker deployment.
- Expired or malformed worker leases are reclaimable through
  `claim_worker_job`, and jobs that hit `max_attempts` move to `error` instead
  of remaining stuck in `running`.
- Worker pods run the compiled worker entrypoint as a non-root user, with no
  ambient Kubernetes service account token, a read-only root filesystem, a
  PodDisruptionBudget, and explicit egress policy.
- `npm run worker:deployment-check` passes and parses
  `deploy/worker/kubernetes.yaml` into the expected Kubernetes objects:
  Secret, ConfigMap, Deployment, HorizontalPodAutoscaler, PodDisruptionBudget,
  and NetworkPolicy.
- Autoscaling is configured from CPU at minimum, and queue-depth scaling is
  configured before broad rollout.
- `/api/workers/metrics/prometheus` is scraped by production monitoring.
- Worker metrics include active `queued` and `running` jobs regardless of their
  age, so old backlog remains visible to Prometheus alerts and KEDA scaling.
- Seeded tenant canary and load smoke pass in staging and production.
- A deployed-worker canary proves an actual worker replica consumes and
  completes one production-queue job.
- The manual `Worker production gate` GitHub Actions workflow passes against
  the target origin with the same worker token and short-lived Supabase service
  credentials used by the operator.

## Environment

Set these on the Diana app:

```bash
WORKER_API_TOKEN=<strong shared worker token>
DIANA_VOICE_QUEUE_MODE=inline
DIANA_VOICE_MANAGED_QUEUE_TENANTS=
DIANA_VOICE_INLINE_QUEUE_TENANTS=
```

Use `DIANA_VOICE_MANAGED_QUEUE_TENANTS` for cohort rollout while the default
stays inline. It accepts comma- or whitespace-separated tenant ids, for example
`personal:<student-id>`. Use `DIANA_VOICE_INLINE_QUEUE_TENANTS` as a tenant
rollback override; it keeps listed tenants inline even when
`DIANA_VOICE_QUEUE_MODE=managed_queue` is enabled globally.

Set these on worker replicas:

```bash
WORKER_API_TOKEN=<same strong shared worker token>
DIANA_WORKER_BASE_URL=https://<diana-production-origin>
DIANA_WORKER_QUEUE=student-ai-candidate
DIANA_WORKER_ID=<unique replica id>
OPENJARVIS_BASE_URL=http://<openjarvis-service>:8000
OPENJARVIS_MODEL=<approved model>
```

Do not put Supabase service-role credentials on long-running worker replicas.
Set service-role credentials only in the operator shell, CI job, or short-lived
job that runs production preflight schema checks, canary seeding, or load-smoke
seeding:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

For the authenticated Diana status smoke in staging or production, configure an
already-onboarded QA student account and include that student's tenant in the
managed-queue cohort:

```bash
QA_USER_EMAIL=<qa-student-email>
QA_USER_PASSWORD=<qa-student-password>
DIANA_VOICE_MANAGED_QUEUE_TENANTS=personal:<qa-student-user-id>
```

The smoke signs in through Diana's normal login page, submits a Diana candidate
request, verifies the queued status response, completes the job through the
worker API, and verifies the completed status response stays student-safe.

For the hosted Kubernetes deploy workflow, configure repository secrets:

```text
KUBE_CONFIG_B64
DIANA_WORKER_API_TOKEN
GHCR_PULL_USERNAME
GHCR_PULL_TOKEN
```

`GHCR_PULL_TOKEN` should be a token with package read access to the Diana worker
image. The workflow creates a Docker registry secret named `ghcr-pull-secret`
by default and rewrites the worker pod `imagePullSecrets` entry when a different
secret name is supplied.

The deploy workflow uploads a
`diana-worker-kubernetes-deploy-<run-id>-<attempt>` artifact with the target
origin, image tag, namespace, replica count, kubectl rollout/status logs,
production preflight output, and deployed-worker canary output. Keep this with
the worker image and production-gate artifacts.

After downloading the deploy artifact, verify it locally:

```bash
npm run worker:kubernetes-deploy-evidence-check -- --dir=<path-to-downloaded-deploy-artifact> --require-success
```

The workflow intentionally does not default to a real image SHA. Set
`image_sha` to the SHA from the latest successful `Worker image` run you intend
to deploy.

## Deploy

1. Build the worker image from `Dockerfile.worker`.
2. Deploy at least two worker replicas. Use `deploy/worker/kubernetes.yaml` as
   the Kubernetes shape.
   - Keep `imagePullSecrets` configured so hosted clusters can pull private
     GHCR packages.
   - Keep `PodDisruptionBudget` enabled so voluntary disruptions leave at least
     one worker running.
   - Keep `NetworkPolicy` enabled. If Diana is served only through an external
     origin, keep the HTTPS egress rule and restrict it to known CIDRs when your
     platform gives stable ranges. If Diana and OpenJarvis run in-cluster, prefer
     pod/service selectors and remove broad external HTTPS egress.
3. Verify the compiled worker command path before image rollout:

```bash
npm run worker:runtime-smoke
```

This copies only `dist/worker/run-diana-worker.cjs` into a clean temp directory
and runs `--check-config` without repo `node_modules`, which catches bundling
or runtime dependency regressions before Docker is involved.

4. Verify the image command path before rollout:

```bash
docker run --rm \
  -e WORKER_API_TOKEN=<secret> \
  -e DIANA_WORKER_BASE_URL=<origin> \
  -e OPENJARVIS_BASE_URL=http://<openjarvis-service>:8000 \
  diana-worker \
  node dist/worker/run-diana-worker.cjs --check-config
```

5. Configure worker health probes with:

```bash
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<origin> node dist/worker/run-diana-worker.cjs --health
```

6. Configure monitoring to scrape:

```text
/api/workers/metrics/prometheus?windowMinutes=15
```

Use `deploy/worker/prometheus-example.yaml` as the Prometheus Operator shape.
Use `deploy/worker/keda-scaledobject.yaml` only after the Prometheus metric is
available.

`Dockerfile.worker` builds `dist/worker/run-diana-worker.cjs` in a dependency
stage, then installs production dependencies only in the runtime stage.

## Staging Checks

Run these before changing any tenant to managed queue mode:

```bash
npm run worker:deployment-check
NEXT_PUBLIC_SUPABASE_URL=<supabase-url> SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<staging-origin> npm run worker:production-preflight
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<staging-origin> npm run worker:tenant-canary -- --seed
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<staging-origin> npm run worker:e2e-smoke
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<staging-origin> npm run worker:deployed-canary
QA_USER_EMAIL=<qa-email> QA_USER_PASSWORD=<qa-password> \
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<staging-origin> \
npm run worker:diana-status-smoke -- --auth=browser --complete-with=worker-api --timeout-ms=120000
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<staging-origin> npm run worker:load-smoke -- --count=25
```

The same checks can be run from GitHub Actions with the manual
`Worker production gate` workflow. Configure repository secrets:

```text
DIANA_WORKER_API_TOKEN
DIANA_SUPABASE_URL
DIANA_SUPABASE_SERVICE_ROLE_KEY
DIANA_QA_USER_EMAIL
DIANA_QA_USER_PASSWORD
```

Then dispatch the workflow with:

- `target_origin`: the staging or production Diana origin
- `load_count`: `10`, `25`, or `100`
- `seeded_checks`: `true` for tenant canary and managed-queue load smoke
- `diana_status_smoke`: `true` to run the authenticated Diana status smoke

The workflow uploads a `diana-worker-production-gate-<run-id>-<attempt>`
artifact containing:

- `summary.json`
- `outcome.json`
- `deployment-check.log`
- `production-preflight.log`
- `tenant-canary.log`
- `e2e-smoke.log`
- `deployed-canary.log`
- `diana-status-smoke.log`
- `load-smoke.log`

Keep this artifact with the rollout record. Inspect `outcome.json` first; every
required step for the selected inputs should be `success`, and intentionally
disabled optional checks should be `skipped`. The artifact is the preferred
auditable proof that the worker tier, Diana status path, tenant isolation, and
load gate passed for a specific commit and target origin.

After downloading the artifact, verify it locally:

```bash
npm run worker:gate-evidence-check -- --dir=<path-to-downloaded-artifact> --require-success
```

The `Worker image` workflow also uploads a
`diana-worker-image-<run-id>-<attempt>` artifact. Keep it with the rollout
record so the deployed worker image tag can be matched back to the commit,
workflow run, local Docker image id, and step outcomes that passed the worker
image gate.

For a final rollout record, prefer a worker image artifact and production-gate
artifact from the same commit. If an app-only commit follows the image build,
record that diff explicitly before rollout; otherwise rebuild the worker image
from the new head so the evidence package has one SHA across app, worker image,
and production gate.

After downloading the image artifact, verify it locally:

```bash
npm run worker:image-evidence-check -- --dir=<path-to-downloaded-image-artifact>
```

If the workflow was dispatched with `push_image=true`, verify the pushed image
proof as well:

```bash
npm run worker:image-evidence-check -- --dir=<path-to-downloaded-image-artifact> --require-pushed
```

Use `--require-success` for rollout go/no-go. Omit it only when inspecting a
partial artifact from a workflow run that stopped early.

Confirm:

- Deployment check reports `Worker Kubernetes manifest parses` and
  `Worker Kubernetes manifest has expected objects` as passing.
- Preflight is `ok: true`.
- Preflight reports `Worker database schema reachable` as
  `worker_jobs-and-worker_rate_limits-readable` when service credentials are
  supplied.
- Preflight reports `Worker database RPCs reachable` as
  `claim_worker_job-and-reserve_worker_rate_limit-callable` when service
  credentials are supplied.
- Tenant canary rejects missing-tenant and cross-tenant completion.
- Compiled worker e2e smoke seeds one managed-queue job, runs the compiled
  worker once against a fake OpenJarvis-compatible sidecar, and verifies the
  job completes through Diana's worker API. Smoke jobs use bounded per-run
  queues such as `student-ai-candidate-smoke-e2e-smoke-...` by default so they
  do not consume real student queue items or stale smoke jobs from another run.
- Deployed-worker canary seeds one `student-ai-candidate` job and waits for a
  deployed worker replica to complete it. This is the proof that workers are
  actually running, not just that the worker API is reachable.
- Diana status smoke signs in as the QA student, submits a queued Diana request,
  verifies queued and completed status polling through Diana, and confirms the
  browser-visible response does not expose backend provider, model, worker id,
  Paperclip, gstack, OpenJarvis, or Ollama fields.
- Load smoke completes the requested count.
- Queue depth returns to zero.
- Retry count stays low.
- No student browser calls worker endpoints directly.
- Queued Diana voice requests poll `/api/diana/voice-candidate/status` and show
  the completed candidate through Diana after the worker result is available.

## Production Rollout

1. Keep the app default at `DIANA_VOICE_QUEUE_MODE=inline`.
2. Deploy workers and monitoring first.
3. Run production preflight.
4. Run seeded tenant canary.
5. Run compiled worker e2e smoke.
6. Run deployed-worker canary.
7. Run load smoke with a small count, then a larger count:

```bash
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<prod-origin> npm run worker:e2e-smoke
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<prod-origin> npm run worker:deployed-canary
QA_USER_EMAIL=<qa-email> QA_USER_PASSWORD=<qa-password> \
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<prod-origin> \
npm run worker:diana-status-smoke -- --auth=browser --complete-with=worker-api --timeout-ms=120000
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<prod-origin> npm run worker:load-smoke -- --count=10
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<prod-origin> npm run worker:load-smoke -- --count=100
```

The preferred production evidence is a successful `Worker production gate`
workflow run for the production origin after the worker image is deployed, plus
the uploaded `diana-worker-production-gate-...` artifact from that run.

8. Add one internal tenant or cohort to `DIANA_VOICE_MANAGED_QUEUE_TENANTS`
   while keeping `DIANA_VOICE_QUEUE_MODE=inline`.
9. Watch queue depth, running leases, retries, claim latency, completion
   latency, and tenant errors for at least one school-day traffic window.
10. Expand by adding tenant ids to `DIANA_VOICE_MANAGED_QUEUE_TENANTS` only
    while metrics stay within limits.
11. Move to global `DIANA_VOICE_QUEUE_MODE=managed_queue` only after staging
    and early production cohorts have passed, and keep
    `DIANA_VOICE_INLINE_QUEUE_TENANTS` available as a tenant rollback list.

## Rollback

If queue depth keeps growing, retries climb, tenant errors appear, or candidate
responses are delayed:

1. Add affected tenants to `DIANA_VOICE_INLINE_QUEUE_TENANTS` and remove them
   from `DIANA_VOICE_MANAGED_QUEUE_TENANTS`.
2. Keep worker replicas running until queued jobs drain.
3. Verify:

```bash
NEXT_PUBLIC_SUPABASE_URL=<supabase-url> SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
WORKER_API_TOKEN=<secret> DIANA_WORKER_BASE_URL=<origin> npm run worker:production-preflight
```

4. Confirm `/api/workers/metrics` shows queued count at zero.
5. Scale worker replicas down only after the queue is clear.
6. Keep Paperclip, OpenJarvis, and gstack backend-only during rollback.

## Student Boundary

Student-facing code may call `/api/diana/voice-candidate` and
`/api/diana/voice-candidate/status` only. It must not call:

- `/api/workers/claim`
- `/api/workers/complete`
- `/api/workers/metrics`
- `/api/workers/metrics/prometheus`
- OpenJarvis local ports
- Paperclip
- gstack

For queued voice requests, student-facing code may also call
`/api/diana/voice-candidate/status` with the public trace id returned by Diana.
The browser may receive only the candidate text and public trace fields: trace
id, queue mode, read-only flag, and policy mode. Provider details, worker ids,
model names, and full traces stay in Diana backend logs and authorship receipts.
