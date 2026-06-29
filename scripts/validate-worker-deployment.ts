import { readFileSync } from "node:fs";
import { parseAllDocuments } from "yaml";

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function includesAll(text: string, values: string[]): boolean {
  return values.every((value) => text.includes(value));
}

function excludesAll(text: string, values: string[]): boolean {
  return values.every((value) => !text.includes(value));
}

function check(name: string, ok: boolean, detail: string): Check {
  return { name, ok, detail };
}

type K8sManifest = {
  apiVersion?: string;
  kind?: string;
  metadata?: { name?: string; labels?: Record<string, string> };
  spec?: Record<string, unknown>;
  data?: Record<string, string>;
  stringData?: Record<string, string>;
};

function getPath(value: unknown, path: readonly (string | number)[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (typeof key === "number") {
      return Array.isArray(current) ? current[key] : undefined;
    }
    return current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined;
  }, value);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseKubernetesManifests(text: string): { manifests: K8sManifest[]; errors: string[] } {
  const docs = parseAllDocuments(text);
  const errors = docs.flatMap((doc) => doc.errors.map((error) => error.message));
  const manifests = docs
    .map((doc) => doc.toJSON())
    .filter((doc): doc is K8sManifest => Boolean(doc && typeof doc === "object"));
  return { manifests, errors };
}

function byKind(manifests: K8sManifest[], kind: string): K8sManifest | undefined {
  return manifests.find((manifest) => manifest.kind === kind);
}

function hasContainerProbe(container: unknown, probeName: "readinessProbe" | "livenessProbe"): boolean {
  const command = toStringArray(getPath(container, [probeName, "exec", "command"]));
  return command.join(" ") === "node dist/worker/run-diana-worker.cjs --health";
}

const dockerfile = read("Dockerfile.worker");
const workflow = read(".github/workflows/worker-image.yml");
const productionGateWorkflow = read(".github/workflows/worker-production-gate.yml");
const kubernetesDeployWorkflow = read(".github/workflows/worker-kubernetes-deploy.yml");
const deployment = read("deploy/worker/kubernetes.yaml");
const prometheus = read("deploy/worker/prometheus-example.yaml");
const keda = read("deploy/worker/keda-scaledobject.yaml");
const leaseRecoveryMigration = read("supabase/migrations/0044_worker_claim_lease_recovery.sql");
const appEnv = read(".env.example");
const workerEnv = read(".env.worker.example");
const canaryEnv = read(".env.worker-canary.example");
const dockerignore = read(".dockerignore");
const packageJson = read("package.json");
const workerMetrics = read("lib/worker-tier/worker-metrics.ts");
const workerTier = read("lib/worker-tier/production-worker-tier.ts");
const workerRunner = read("lib/worker-tier/worker-runner.ts");
const voiceCandidateRoute = read("app/api/diana/voice-candidate/route.ts");
const voiceCandidateStatusRoute = read("app/api/diana/voice-candidate/status/route.ts");
const workerVersionRoute = read("app/api/workers/version/route.ts");
const voiceCommandSurface = read("app/(app)/voice/voice-command-surface.tsx");
const supabaseMiddleware = read("lib/supabase/middleware.ts");
const loadSmoke = read("scripts/run-worker-load-smoke.ts");
const dianaStatusSmoke = read("scripts/run-diana-status-polling-smoke.ts");
const productionPreflight = read("scripts/worker-production-preflight.ts");
const evidenceVerifier = read("scripts/verify-worker-gate-evidence.ts");
const imageEvidenceVerifier = read("scripts/verify-worker-image-evidence.ts");
const kubernetesDeployEvidenceVerifier = read("scripts/verify-worker-kubernetes-deploy-evidence.ts");
const parsedDeployment = parseKubernetesManifests(deployment);
const parsedPrometheus = parseKubernetesManifests(prometheus);
const parsedKeda = parseKubernetesManifests(keda);
const deploymentManifest = byKind(parsedDeployment.manifests, "Deployment");
const hpaManifest = byKind(parsedDeployment.manifests, "HorizontalPodAutoscaler");
const pdbManifest = byKind(parsedDeployment.manifests, "PodDisruptionBudget");
const networkPolicyManifest = byKind(parsedDeployment.manifests, "NetworkPolicy");
const serviceMonitorManifest = byKind(parsedPrometheus.manifests, "ServiceMonitor");
const prometheusRuleManifest = byKind(parsedPrometheus.manifests, "PrometheusRule");
const scaledObjectManifest = byKind(parsedKeda.manifests, "ScaledObject");
const workerContainer = getPath(deploymentManifest, ["spec", "template", "spec", "containers", 0]);

const checks: Check[] = [
  check(
    "Worker Kubernetes manifest parses",
    parsedDeployment.errors.length === 0,
    parsedDeployment.errors.length === 0
      ? `parsed-${parsedDeployment.manifests.length}-objects`
      : parsedDeployment.errors.join("; "),
  ),
  check(
    "Worker Kubernetes manifest has expected objects",
    ["Secret", "ConfigMap", "Deployment", "HorizontalPodAutoscaler", "PodDisruptionBudget", "NetworkPolicy"]
      .every((kind) => parsedDeployment.manifests.some((manifest) => manifest.kind === kind)),
    "deploy/worker/kubernetes.yaml must include Secret, ConfigMap, Deployment, HPA, PDB, and NetworkPolicy objects.",
  ),
  check(
    "Worker image uses compiled runtime entrypoint",
    includesAll(dockerfile, [
      "npm run worker:build",
      "npm ci --omit=dev",
      "node\", \"dist/worker/run-diana-worker.cjs",
    ]) && !dockerfile.includes("npm ci --include=dev"),
    "Dockerfile.worker must compile the worker in a build stage and run production dependencies only.",
  ),
  check(
    "Worker pod has OpenJarvis target",
    includesAll(deployment, ["OPENJARVIS_BASE_URL", "OPENJARVIS_MODEL", "DIANA_WORKER_IMAGE_SHA"]),
    "deploy/worker/kubernetes.yaml must configure the sidecar URL, model, and image SHA.",
  ),
  check(
    "Worker pod runs compiled entrypoint directly",
    toStringArray(getPath(workerContainer, ["command"])).join(" ") === "node" &&
      toStringArray(getPath(workerContainer, ["args"])).join(" ") === "dist/worker/run-diana-worker.cjs --poll-ms=1000 --lease-seconds=60" &&
      hasContainerProbe(workerContainer, "readinessProbe") &&
      hasContainerProbe(workerContainer, "livenessProbe"),
    "deploy/worker/kubernetes.yaml must run and probe the compiled worker entrypoint.",
  ),
  check(
    "Worker deployment has rollout safety",
    getPath(deploymentManifest, ["spec", "revisionHistoryLimit"]) === 3 &&
      getPath(deploymentManifest, ["spec", "strategy", "type"]) === "RollingUpdate" &&
      getPath(deploymentManifest, ["spec", "strategy", "rollingUpdate", "maxUnavailable"]) === 1 &&
      getPath(deploymentManifest, ["spec", "strategy", "rollingUpdate", "maxSurge"]) === 1,
    "deploy/worker/kubernetes.yaml must define bounded rolling updates.",
  ),
  check(
    "Worker pod disables ambient Kubernetes credentials",
    getPath(deploymentManifest, ["spec", "template", "spec", "automountServiceAccountToken"]) === false,
    "Worker pods must not mount a Kubernetes service account token by default.",
  ),
  check(
    "Worker pod declares GHCR image pull secret",
    getPath(deploymentManifest, ["spec", "template", "spec", "imagePullSecrets", 0, "name"]) === "ghcr-pull-secret",
    "Worker pods must declare an imagePullSecret so private GHCR packages can be pulled by hosted clusters.",
  ),
  check(
    "Worker pod uses restricted security context",
    getPath(deploymentManifest, ["spec", "template", "spec", "securityContext", "runAsNonRoot"]) === true &&
      getPath(deploymentManifest, ["spec", "template", "spec", "securityContext", "runAsUser"]) === 10001 &&
      getPath(deploymentManifest, ["spec", "template", "spec", "securityContext", "seccompProfile", "type"]) === "RuntimeDefault" &&
      getPath(workerContainer, ["securityContext", "allowPrivilegeEscalation"]) === false &&
      getPath(workerContainer, ["securityContext", "readOnlyRootFilesystem"]) === true &&
      toStringArray(getPath(workerContainer, ["securityContext", "capabilities", "drop"])).includes("ALL"),
    "Worker pods must run non-root with a restricted container security context.",
  ),
  check(
    "Worker deployment spreads replicas",
    getPath(deploymentManifest, ["spec", "template", "spec", "topologySpreadConstraints", 0, "topologyKey"]) === "kubernetes.io/hostname" &&
      getPath(deploymentManifest, ["spec", "template", "spec", "topologySpreadConstraints", 0, "labelSelector", "matchLabels", "app.kubernetes.io/name"]) === "diana-worker",
    "Worker deployment must ask the scheduler to spread replicas across nodes.",
  ),
  check(
    "Worker deployment has disruption budget",
    getPath(pdbManifest, ["metadata", "name"]) === "diana-worker" &&
      getPath(pdbManifest, ["spec", "minAvailable"]) === 1 &&
      getPath(pdbManifest, ["spec", "selector", "matchLabels", "app.kubernetes.io/name"]) === "diana-worker",
    "Worker deployment must keep at least one worker available during voluntary disruptions.",
  ),
  check(
    "Worker deployment has explicit network policy",
    getPath(networkPolicyManifest, ["metadata", "name"]) === "diana-worker-egress" &&
      toStringArray(getPath(networkPolicyManifest, ["spec", "policyTypes"])).includes("Egress") &&
      getPath(networkPolicyManifest, ["spec", "podSelector", "matchLabels", "app.kubernetes.io/name"]) === "diana-worker" &&
      deployment.includes("k8s-app: kube-dns") &&
      deployment.includes("app.kubernetes.io/name: diana-web") &&
      deployment.includes("app.kubernetes.io/name: openjarvis"),
    "Worker deployment must include an egress policy for DNS, Diana, and OpenJarvis.",
  ),
  check(
    "Worker autoscaling manifest is bounded",
    getPath(hpaManifest, ["spec", "minReplicas"]) === 2 &&
      getPath(hpaManifest, ["spec", "maxReplicas"]) === 20 &&
      getPath(hpaManifest, ["spec", "scaleTargetRef", "name"]) === "diana-worker",
    "Worker HPA must keep a two-replica floor and bounded max replica count.",
  ),
  check(
    "Worker prometheus manifest parses",
    parsedPrometheus.errors.length === 0,
    parsedPrometheus.errors.length === 0
      ? `parsed-${parsedPrometheus.manifests.length}-objects`
      : parsedPrometheus.errors.join("; "),
  ),
  check(
    "Worker prometheus manifest has scrape and alert objects",
    ["ServiceMonitor", "PrometheusRule"].every((kind) =>
      parsedPrometheus.manifests.some((manifest) => manifest.kind === kind)
    ),
    "deploy/worker/prometheus-example.yaml must include ServiceMonitor and PrometheusRule objects.",
  ),
  check(
    "Worker prometheus scrape targets worker metrics",
    getPath(serviceMonitorManifest, ["spec", "endpoints", 0, "path"]) === "/api/workers/metrics/prometheus" &&
      getPath(serviceMonitorManifest, ["spec", "endpoints", 0, "bearerTokenSecret", "name"]) ===
        "diana-worker-metrics-token" &&
      getPath(serviceMonitorManifest, ["spec", "selector", "matchLabels", "app.kubernetes.io/name"]) === "diana-web",
    "Prometheus ServiceMonitor must scrape the backend-only worker metrics endpoint with a bearer token.",
  ),
  check(
    "Worker prometheus alerts cover queue health",
    includesAll(prometheus, [
      "DianaWorkerQueueBacklog",
      "DianaWorkerRunningLeaseBacklog",
      "DianaWorkerHighRetryCount",
      "DianaWorkerTenantErrors",
      "diana_worker_jobs_total",
      "diana_worker_retries_total",
      "diana_worker_tenants_with_errors",
    ]),
    "Prometheus alerts must cover backlog, running leases, retries, and tenant errors.",
  ),
  check(
    "Worker metrics keep old active backlog visible",
    includesAll(workerMetrics, [
      "status.in.(queued,running)",
      "created_at.gte.",
      "Worker jobs active now or completed in the selected metrics window.",
    ]),
    "Worker metrics must include active queued/running jobs regardless of created_at so KEDA sees old backlog.",
  ),
  check(
    "Worker smoke queues are bounded and per-run capable",
    includesAll(workerTier, [
      "SMOKE_QUEUE_PATTERN",
      "student-ai-candidate-smoke-[a-z0-9-]{4,80}",
      "isAllowedWorkerQueueName",
    ]) &&
      includesAll(loadSmoke, [
        "VOICE_CANDIDATE_SMOKE_QUEUE}-${runId}",
        "claimed.traceId.startsWith(`dw-${runId}-`)",
      ]),
    "Worker APIs must allow bounded per-run smoke queues, and load smoke must reject unrelated claimed jobs.",
  ),
  check(
    "Worker runner enforces job timeout constraints",
    includesAll(workerRunner, [
      "extractWorkerTimeoutMs(claimed.constraints)",
      "runWithWorkerTimeout",
      "AbortController",
      "Worker execution timed out.",
      "imageSha: config.imageSha",
    ]),
    "Worker runtime must honor claimed job budget timeout constraints, abort sidecar work, and record image provenance.",
  ),
  check(
    "Voice worker rollout is tenant scoped",
    includesAll(workerTier, [
      "DIANA_VOICE_MANAGED_QUEUE_TENANTS",
      "DIANA_VOICE_INLINE_QUEUE_TENANTS",
      "tenantListIncludes",
    ]) &&
      includesAll(voiceCandidateRoute, [
        "const tenantId = personalTenantId(user.id)",
        "resolveVoiceCandidateQueueMode({ tenantId })",
      ]),
    "Diana voice candidate rollout must support tenant-scoped managed queue enablement and tenant rollback.",
  ),
  check(
    "Queued voice results return through Diana only",
    includesAll(workerRunner, ["response: result.response"]) &&
      includesAll(voiceCandidateStatusRoute, [
        ".eq(\"owner_id\", user.id)",
        "result_payload",
        "publicTrace",
        "STUDENT_RUNTIME_READ_TOOLS",
      ]) &&
      includesAll(voiceCommandSurface, [
        "/api/diana/voice-candidate/status?traceId=",
        "pollQueuedCandidate",
      ]) &&
      includesAll(voiceCandidateStatusRoute, [
        "return NextResponse.json({",
        "response,",
        "trace: publicTrace(data.trace_id, data.queue_mode)",
      ]) &&
      includesAll(supabaseMiddleware, [
        "/api/diana/voice-candidate/status",
      ]),
    "Managed-queue voice results must be owner-scoped, return JSON auth errors, and avoid backend provider details.",
  ),
  check(
    "Worker version route proves app deployment SHA",
    includesAll(workerVersionRoute, [
      "hasValidWorkerBearer",
      "DIANA_APP_BUILD_SHA",
      "VERCEL_GIT_COMMIT_SHA",
      "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
      "Worker authorization required.",
      "app:",
      "sha:",
    ]) && includesAll(supabaseMiddleware, ["/api/workers/version"]),
    "Backend-only worker version endpoint must expose app SHA to worker preflight without requiring student auth.",
  ),
  check(
    "Diana status smoke supports production auth",
    includesAll(dianaStatusSmoke, [
      "QA_USER_EMAIL",
      "QA_USER_PASSWORD",
      "chromium.launch",
      "completeThroughWorkerApi",
      "argValue(\"auth\")",
      "argValue(\"complete-with\")",
      "worker-api",
    ]),
    "Diana status smoke must support real QA browser auth and worker-API completion for production-gate CI.",
  ),
  check(
    "Worker KEDA manifest parses",
    parsedKeda.errors.length === 0,
    parsedKeda.errors.length === 0 ? `parsed-${parsedKeda.manifests.length}-objects` : parsedKeda.errors.join("; "),
  ),
  check(
    "Worker KEDA scaler targets queue depth",
    getPath(scaledObjectManifest, ["metadata", "name"]) === "diana-worker-queue-depth" &&
      getPath(scaledObjectManifest, ["spec", "scaleTargetRef", "name"]) === "diana-worker" &&
      getPath(scaledObjectManifest, ["spec", "minReplicaCount"]) === 2 &&
      getPath(scaledObjectManifest, ["spec", "maxReplicaCount"]) === 50 &&
      getPath(scaledObjectManifest, ["spec", "triggers", 0, "type"]) === "prometheus" &&
      getPath(scaledObjectManifest, ["spec", "triggers", 0, "metadata", "metricName"]) ===
        "diana_worker_queued_jobs" &&
      String(getPath(scaledObjectManifest, ["spec", "triggers", 0, "metadata", "query"]) ?? "").includes(
        'diana_worker_jobs_total{queue="student-ai-candidate",status="queued"}',
      ),
    "KEDA ScaledObject must scale diana-worker from production queue depth.",
  ),
  check(
    "Worker claim RPC reclaims expired leases",
    includesAll(leaseRecoveryMigration, [
      "create or replace function public.claim_worker_job",
      "locked_until is null",
      "locked_until <= now()",
      "attempts < max_attempts",
      "attempts >= max_attempts",
      "Worker lease expired after maximum attempts.",
      "worker_jobs_reclaim_idx",
    ]),
    "Worker claim RPC migration must reclaim expired or malformed running jobs and stop retrying after max_attempts.",
  ),
  check(
    "Worker pod excludes service-role credentials",
    excludesAll(deployment, ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"]),
    "Long-running worker pods must not carry Supabase service-role credentials.",
  ),
  check(
    "Diana app env exposes tenant rollout controls",
    includesAll(appEnv, [
      "WORKER_API_TOKEN",
      "DIANA_VOICE_QUEUE_MODE=inline",
      "DIANA_VOICE_MANAGED_QUEUE_TENANTS",
      "DIANA_VOICE_INLINE_QUEUE_TENANTS",
    ]),
    ".env.example must document app-side worker token and tenant rollout controls.",
  ),
  check(
    "Worker env excludes canary-only secrets",
    includesAll(workerEnv, [
      "WORKER_API_TOKEN",
      "DIANA_WORKER_BASE_URL",
      "OPENJARVIS_BASE_URL",
      "OPENJARVIS_MODEL",
      "DIANA_WORKER_IMAGE_SHA",
    ]) &&
      excludesAll(workerEnv, ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"]),
    ".env.worker.example must contain only long-running worker settings.",
  ),
  check(
    "Canary env contains seeding credentials",
    includesAll(canaryEnv, [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "WORKER_API_TOKEN",
      "DIANA_WORKER_BASE_URL",
      "DIANA_WORKER_EXPECTED_IMAGE_SHA",
      "DIANA_EXPECTED_APP_SHA",
    ]),
    ".env.worker-canary.example must contain preflight/canary/load-smoke settings.",
  ),
  check(
    "Docker context keeps worker env examples",
    includesAll(dockerignore, ["!.env.worker.example", "!.env.worker-canary.example"]),
    ".dockerignore must keep worker env examples available for image-context review.",
  ),
  check(
    "Generated worker bundle stays out of Docker context",
    includesAll(dockerignore, ["dist"]),
    ".dockerignore must exclude local compiled worker artifacts; Docker builds them in the image.",
  ),
  check(
    "Worker image workflow watches all worker deployment inputs",
    includesAll(workflow, [
      ".env.worker.example",
      ".env.worker-canary.example",
      "app/api/diana/**",
      "deploy/worker/**",
      "lib/supabase/middleware.ts",
      "supabase/migrations/0041_production_worker_tier.sql",
      "supabase/migrations/0042_worker_queue_runtime.sql",
      "supabase/migrations/0043_worker_rate_limit_runtime.sql",
      "supabase/migrations/0044_worker_claim_lease_recovery.sql",
      ".github/workflows/worker-image.yml",
      ".github/workflows/worker-production-gate.yml",
      ".github/workflows/worker-kubernetes-deploy.yml",
      "scripts/validate-worker-deployment.ts",
      "scripts/verify-worker-gate-evidence.ts",
      "scripts/verify-worker-kubernetes-deploy-evidence.ts",
      "scripts/verify-worker-image-evidence.ts",
      "scripts/run-worker-deployed-canary.ts",
      "scripts/run-diana-status-polling-smoke.ts",
    ]),
    "Worker image workflow must run when worker deployment inputs change.",
  ),
  check(
    "Worker image workflow ignores mutable evidence snapshots",
    excludesAll(workflow, ["docs/operations/diana-worker-production-gate-evidence.md"]),
    "Evidence snapshot edits must not create a new worker image SHA and make the snapshot stale.",
  ),
  check(
    "Worker image workflow smokes command path with sidecar config",
    includesAll(workflow, [
      "Smoke worker command path",
      "OPENJARVIS_BASE_URL=http://openjarvis:8000",
      "node dist/worker/run-diana-worker.cjs --check-config",
    ]),
    "Worker image workflow must run the worker command path inside the image.",
  ),
  check(
    "Worker image workflow uploads image evidence",
    includesAll(workflow, [
      "Record worker image build evidence",
      "docker image inspect",
      "worker-image-evidence/summary.json",
      "remoteImage",
      "imageId",
      "pushRequested",
      "PUSH_WORKER_IMAGE",
      "refs/heads/codex/diana-v2-clean-history",
      "pushed-image.txt",
      "Verify worker image evidence",
      "Write worker image outcome",
      "worker-image-evidence/outcome.json",
      "steps.worker_tests.outcome",
      "steps.command_smoke.outcome",
      "steps.push_image.outcome",
      "npm run worker:image-evidence-check -- --dir=worker-image-evidence",
      "--require-pushed",
      "actions/upload-artifact@v4",
      "diana-worker-image-${{ github.run_id }}-${{ github.run_attempt }}",
      "worker-image-evidence",
    ]),
    "Worker image workflow must retain image id and GHCR tag evidence for rollout audit.",
  ),
  check(
    "Worker image workflow watches compiled worker build input",
    includesAll(workflow, ["scripts/build-worker.mjs", "scripts/smoke-worker-runtime.mjs"]),
    "Worker image workflow must run when the worker bundling script changes.",
  ),
  check(
    "Worker image workflow smokes Docker-less compiled runtime",
    includesAll(workflow, ["Smoke compiled worker runtime", "npm run worker:runtime-smoke"]),
    "Worker image workflow must prove the compiled worker runs before Docker build.",
  ),
  check(
    "Package exposes compiled runtime smoke",
    includesAll(packageJson, [
      "worker:runtime-smoke",
      "scripts/smoke-worker-runtime.mjs",
      "worker:test",
      "lib/worker-tier/worker-runner.test.ts",
      "lib/supabase/middleware.test.ts",
      "app/api/diana/voice-candidate/status/route.test.ts",
      "app/api/workers/metrics/prometheus/route.test.ts",
      "app/api/workers/version/route.test.ts",
      "worker:e2e-smoke",
      "scripts/run-worker-e2e-smoke.ts",
      "worker:deployed-canary",
      "scripts/run-worker-deployed-canary.ts",
      "worker:diana-status-smoke",
      "scripts/run-diana-status-polling-smoke.ts",
      "worker:gate-evidence-check",
      "scripts/verify-worker-gate-evidence.ts",
      "worker:kubernetes-deploy-evidence-check",
      "scripts/verify-worker-kubernetes-deploy-evidence.ts",
      "worker:image-evidence-check",
      "scripts/verify-worker-image-evidence.ts",
    ]),
    "package.json must expose focused worker tests plus local runtime, e2e, Diana status, and deployed-worker smokes.",
  ),
  check(
    "Worker image workflow runs worker tests before image build",
    includesAll(workflow, ["Worker API tests", "npm run worker:test"]) &&
      workflow.indexOf("npm run worker:test") < workflow.indexOf("docker build -f Dockerfile.worker"),
    "Worker image workflow must run focused worker tests before building the image.",
  ),
  check(
    "Worker image workflow installs dependencies deterministically",
    includesAll(workflow, ["actions/setup-node@v4", "npm ci", "cache: npm"]),
    "Worker image workflow must install dependencies before npm script checks.",
  ),
  check(
    "Production gate workflow runs target preflight",
    includesAll(productionGateWorkflow, [
      "workflow_dispatch",
      "target_origin",
      "expected_app_sha",
      "expected_worker_image_sha",
      "DIANA_WORKER_BASE_URL",
      "DIANA_EXPECTED_APP_SHA",
      "DIANA_WORKER_EXPECTED_IMAGE_SHA",
      "npm run worker:production-preflight",
      "worker-gate-evidence/production-preflight.log",
    ]) &&
      includesAll(productionPreflight, [
        "Diana voice status requires student auth",
        "/api/diana/voice-candidate/status",
        "traceId",
        "DIANA_EXPECTED_APP_SHA",
        "/api/workers/version",
        "Worker version authorized",
      ]),
    "Production gate workflow must be manually runnable against a target Diana origin and verify Diana status auth plus optional app and worker image SHA.",
  ),
  check(
    "Production gate workflow runs seeded isolation and load checks",
    includesAll(productionGateWorkflow, [
      "DIANA_SUPABASE_URL",
      "DIANA_SUPABASE_SERVICE_ROLE_KEY",
      "DIANA_QA_USER_EMAIL",
      "DIANA_QA_USER_PASSWORD",
      "inputs.seeded_checks",
      "inputs.diana_status_smoke",
      "npm run worker:tenant-canary -- --seed",
      "npm run worker:e2e-smoke",
      "npm run worker:deployed-canary -- --timeout-ms=120000",
      "npx playwright install --with-deps chromium",
      "npm run worker:diana-status-smoke -- --auth=browser --complete-with=worker-api --timeout-ms=120000",
      "npm run worker:load-smoke -- --count=",
      "worker-gate-evidence/tenant-canary.log",
      "worker-gate-evidence/e2e-smoke.log",
      "worker-gate-evidence/deployed-canary.log",
      "worker-gate-evidence/diana-status-smoke.log",
      "worker-gate-evidence/load-smoke.log",
      "expected_worker_image_sha requires seeded_checks=true",
      "id: tenant_canary",
      "id: e2e_smoke",
      "id: deployed_canary",
      "id: diana_status_smoke",
      "id: load_smoke",
    ]),
    "Production gate workflow must run seeded tenant canary, local compiled e2e, deployed-worker canary, Diana status smoke, and load smoke when enabled.",
  ),
  check(
    "Production gate only requires QA status credentials when status smoke can run",
    includesAll(productionGateWorkflow, [
      'if [ "${{ inputs.seeded_checks }}" = "true" ] && [ "${{ inputs.diana_status_smoke }}" = "true" ]; then',
      'test -n "$QA_USER_EMAIL"',
      'test -n "$QA_USER_PASSWORD"',
    ]),
    "Production gate must allow preflight-only runs without irrelevant QA browser credentials.",
  ),
  check(
    "Production gate workflow uploads evidence artifact",
    includesAll(productionGateWorkflow, [
      "actions/upload-artifact@v4",
      "Upload production gate evidence",
      "diana-worker-production-gate-${{ github.run_id }}-${{ github.run_attempt }}",
      "worker-gate-evidence/summary.json",
      "worker-gate-evidence/outcome.json",
      "Write production gate outcome",
      "Verify evidence package shape",
      "npm run worker:gate-evidence-check -- --dir=worker-gate-evidence",
      "steps.production_preflight.outcome",
      "steps.deployed_canary.outcome",
      "steps.diana_status_smoke.outcome",
      "retention-days: 30",
    ]),
    "Production gate workflow must upload a durable evidence artifact with summary, outcomes, and command logs.",
  ),
  check(
    "Kubernetes deploy workflow applies hosted worker replicas",
    includesAll(kubernetesDeployWorkflow, [
      "KUBE_CONFIG_B64",
      "expected_app_sha",
      "DIANA_EXPECTED_APP_SHA",
      "DIANA_WORKER_API_TOKEN",
      "DIANA_SUPABASE_URL",
      "DIANA_SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "GHCR_PULL_USERNAME",
      "GHCR_PULL_TOKEN",
      "image_pull_secret_name",
      "replace-with-worker-image-sha",
      "image_sha must be set to a real Worker image SHA tag",
      'if [ "${{ inputs.run_canary }}" = "true" ]; then',
      'test -n "$NEXT_PUBLIC_SUPABASE_URL"',
      'test -n "$SUPABASE_SERVICE_ROLE_KEY"',
      "worker-kubernetes-deploy-evidence/summary.json",
      "worker-kubernetes-deploy-evidence/outcome.json",
      "worker-kubernetes-deploy-evidence/rollout-status.log",
      "worker-kubernetes-deploy-evidence/deployment-status.log",
      "worker-kubernetes-deploy-evidence/pod-status.log",
      "worker-kubernetes-deploy-evidence/production-preflight.log",
      "worker-kubernetes-deploy-evidence/deployed-canary.log",
      "Verify deployment evidence package",
      "npm run worker:kubernetes-deploy-evidence-check -- --dir=worker-kubernetes-deploy-evidence",
      "--from-literal=DIANA_WORKER_IMAGE_SHA=\"${{ inputs.image_sha }}\"",
      "kubectl -n \"$NAMESPACE\" create secret docker-registry \"$IMAGE_PULL_SECRET_NAME\"",
      "--docker-server=ghcr.io",
      "--docker-username=\"$GHCR_PULL_USERNAME\"",
      "--docker-password=\"$GHCR_PULL_TOKEN\"",
      "sed -i \"s#name: ghcr-pull-secret#name: $IMAGE_PULL_SECRET_NAME#g\"",
      "replicas must be at least 2",
      "ghcr.io/teamcarrillo405-hub/diana/diana-worker:${{ inputs.image_sha }}",
      "kubectl -n \"$NAMESPACE\" create secret generic diana-worker-secrets",
      "kubectl -n \"$NAMESPACE\" create configmap diana-worker-config",
      "kubectl -n \"$NAMESPACE\" apply -f /tmp/diana-worker-workload.yaml",
      "kubectl -n \"$NAMESPACE\" scale deployment/diana-worker --replicas=\"$REPLICAS\"",
      "kubectl -n \"$NAMESPACE\" rollout status deployment/diana-worker --timeout=180s",
      "npm run worker:production-preflight",
      "npm run worker:deployed-canary -- --timeout-ms=120000 --poll-ms=1000 --expected-image-sha=${{ inputs.image_sha }}",
      "actions/upload-artifact@v4",
      "diana-worker-kubernetes-deploy-${{ github.run_id }}-${{ github.run_attempt }}",
      "worker-kubernetes-deploy-evidence",
      "steps.apply_worker_workload.outcome",
      "steps.worker_deployment_status.outcome",
      "steps.deployed_canary.outcome",
    ]),
    "Kubernetes deploy workflow must deploy at least two hosted workers, verify consumption, and upload deployment evidence.",
  ),
  check(
    "Kubernetes deploy evidence verifier exists",
    includesAll(kubernetesDeployEvidenceVerifier, [
      "summary.json",
      "outcome.json",
      "Worker kubernetes deploy",
      "expectedAppSha",
      "--require-success",
      "artifact summary and outcome metadata match",
      "artifact metadata uses safe deploy input values",
      "rollout-status.log",
      "pod-status.log",
      "production-preflight.log",
      "deployed-canary.log",
      "Worker version authorized",
      "production-preflight.log must prove the expected Diana app SHA",
      "successfully rolled out",
      "diana-worker",
      "imageSha",
      "\\\"ok\\\": true",
    ]),
    "Kubernetes deploy evidence verifier must validate deploy metadata, rollout logs, worker pod status, and canary success mode.",
  ),
  check(
    "Production gate evidence verifier exists",
    includesAll(evidenceVerifier, [
      "summary.json",
      "outcome.json",
      "expectedAppSha",
      "expectedWorkerImageSha",
      "--require-success",
      "artifact summary and outcome metadata match",
      "artifact metadata uses expected input values",
      "deployment-check.log",
      "production-preflight.log",
      "diana-status-smoke.log",
      "load-smoke.log",
      "Worker version authorized",
      "production-preflight.log must prove the expected Diana app SHA",
      "expected worker image sha is proven by deployed canary",
      "deployed-canary.log must prove the expected worker image SHA",
      "\\\"ok\\\": true",
    ]),
    "Production gate evidence verifier must validate summary, outcomes, command logs, and success mode.",
  ),
  check(
    "Worker image evidence verifier exists",
    includesAll(imageEvidenceVerifier, [
      "summary.json",
      "outcome.json",
      "Worker image",
      "--require-pushed",
      "pushRequested",
      "pushed-image.txt",
      "ghcr.io/",
      "sha256:",
      "artifact summary and outcome metadata match",
      "baseRequiredSteps",
      "commandSmoke",
      "completed successfully",
    ]),
    "Worker image evidence verifier must validate image metadata and pushed-image proof.",
  ),
];

const ok = checks.every((item) => item.ok);
console.log(JSON.stringify({ ok, checks }, null, 2));
if (!ok) process.exit(1);
