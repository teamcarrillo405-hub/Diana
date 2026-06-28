import { loadEnvConfig } from "@next/env";
import { chromium, request, type APIRequestContext } from "@playwright/test";
import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { VOICE_CANDIDATE_QUEUE } from "../lib/worker-tier/production-worker-tier";
import { createServiceClient } from "../lib/supabase/service";

loadEnvConfig(process.cwd());

type JsonObject = Record<string, unknown>;
type WorkerJobProbe = {
  tenant_id: string;
  owner_id: string;
  queue_name: string;
  status: string;
};
type SidecarRequest = {
  model?: unknown;
  messages?: unknown;
};
type CompletionMode = "compiled-worker" | "worker-api";
type AuthMode = "qa-bootstrap" | "browser";

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function numberArg(name: string, fallback: number): number {
  const raw = argValue(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const token = process.env.WORKER_API_TOKEN;
  if (!token) {
    throw new Error("WORKER_API_TOKEN is required to run the Diana status polling smoke.");
  }
  if (!existsSync("dist/worker/run-diana-worker.cjs")) {
    throw new Error("Compiled worker bundle is missing. Run npm run worker:build first.");
  }

  const admin = createServiceClient();
  if (!admin) {
    throw new Error("Supabase service client is required for Diana status polling smoke.");
  }

  const baseUrl = argValue("base-url") ?? process.env.DIANA_WORKER_BASE_URL ?? "http://127.0.0.1:3000";
  const timeoutMs = Math.max(5_000, numberArg("timeout-ms", 60_000));
  const pollMs = Math.max(250, numberArg("poll-ms", 1_000));
  const authMode = authModeArg();
  const completionMode = completionModeArg();
  const runId = `status-smoke-${Date.now().toString(36)}`;
  const workerId = completionMode === "worker-api"
    ? `${runId}-worker-api`
    : `${runId}-compiled-worker`;
  const model = argValue("model") ?? "status-smoke-fake-model";
  const auth = await createAuthenticatedApiContext({ baseUrl, authMode });
  const sidecar = completionMode === "compiled-worker" ? createFakeOpenJarvisServer(model) : null;

  try {
    const submit = await auth.api.post("/api/diana/voice-candidate", {
      headers: {
        "content-type": "application/json",
        "x-diana-session-id": runId,
        "x-idempotency-key": runId,
      },
      data: {
        source: "typed",
        transcript: "I need one small next step for my homework.",
        assignmentId: null,
      },
    });
    const submitJson = await safeJson(submit);
    if (submit.status() !== 202 || submitJson?.ok !== true || submitJson?.queued !== true) {
      throw new Error(
        `Diana voice candidate did not enter the managed queue (${submit.status()}). ` +
          "Launch the app with DIANA_VOICE_SIDECAR_ENABLED=true and DIANA_VOICE_QUEUE_MODE=managed_queue. " +
          JSON.stringify(submitJson),
      );
    }

    const trace = submitJson.trace as JsonObject | undefined;
    const traceId = typeof trace?.traceId === "string" ? trace.traceId : "";
    if (!traceId) throw new Error("Diana voice candidate response did not include a public trace id.");
    assertStudentSafeStatusBody(submitJson, "queued submit response");

    const job = await prioritizeQueuedJob(admin, traceId);
    const queuedStatus = await auth.api.get(`/api/diana/voice-candidate/status?traceId=${encodeURIComponent(traceId)}`);
    const queuedJson = await safeJson(queuedStatus);
    if (!queuedStatus.ok() || queuedJson?.ok !== true || !["queued", "running"].includes(String(queuedJson?.status))) {
      throw new Error(`Queued status polling returned ${queuedStatus.status()}: ${JSON.stringify(queuedJson)}`);
    }
    assertStudentSafeStatusBody(queuedJson, "queued status response");

    if (completionMode === "worker-api") {
      await completeThroughWorkerApi({
        baseUrl,
        token,
        traceId,
        tenantId: job.tenant_id,
        workerId,
      });
    } else {
      if (!sidecar) throw new Error("Compiled worker completion requires a fake sidecar.");
      await sidecar.listen();
      const worker = await runCompiledWorkerOnce({
        baseUrl,
        token,
        workerId,
        queueName: job.queue_name,
        sidecarBaseUrl: sidecar.baseUrl,
        model,
      });
      if (worker.status !== 0) {
        throw new Error(`Compiled worker exited ${worker.status}: ${worker.stderr || worker.stdout}`);
      }
      if (!sidecar.observedRequest) {
        throw new Error("Fake OpenJarvis sidecar did not receive a chat request.");
      }
    }

    const completedJson = await waitForCompletedStatus({
      api: auth.api,
      traceId,
      timeoutMs,
      pollMs,
    });
    assertStudentSafeStatusBody(completedJson, "completed status response");
    const response = typeof completedJson.response === "string" ? completedJson.response : "";
    if (!response.trim()) {
      throw new Error("Completed status response did not include Diana's candidate response.");
    }

    const receipt = await admin
      .from("authorship_log")
      .select("id")
      .eq("owner_id", job.owner_id)
      .eq("event_type", "local_voice_candidate")
      .contains("payload", { workerJob: { traceId } })
      .maybeSingle();

    console.log(JSON.stringify({
      ok: true,
      baseUrl,
      traceId,
      tenantId: job.tenant_id,
      queueName: job.queue_name,
      workerId,
      authMode,
      completionMode,
      status: completedJson.status,
      responseChars: response.length,
      sidecarRequests: sidecar?.requestCount ?? 0,
      authorshipReceipt: Boolean(receipt.data?.id),
    }));
  } finally {
    await sidecar?.close();
    await auth.dispose();
  }
}

function authModeArg(): AuthMode {
  const value = argValue("auth");
  if (value === "browser" || value === "qa-bootstrap") return value;
  return process.env.QA_USER_EMAIL && process.env.QA_USER_PASSWORD ? "browser" : "qa-bootstrap";
}

function completionModeArg(): CompletionMode {
  const value = argValue("complete-with");
  if (value === "worker-api" || value === "compiled-worker") return value;
  return "worker-api";
}

async function createAuthenticatedApiContext({
  baseUrl,
  authMode,
}: {
  baseUrl: string;
  authMode: AuthMode;
}): Promise<{ api: APIRequestContext; dispose: () => Promise<void> }> {
  if (authMode === "browser") {
    return createBrowserAuthenticatedApiContext(baseUrl);
  }

  const api = await request.newContext({ baseURL: baseUrl });
  const session = await api.get("/api/qa/anonymous-session");
  if (!session.ok()) {
    const body = await safeText(session);
    await api.dispose();
    throw new Error(
      `QA session bootstrap returned ${session.status()}. ` +
        `Launch the app with QA_CREATE_USER=true for this local-only smoke, ` +
        `or pass --auth=browser with QA_USER_EMAIL and QA_USER_PASSWORD. ${body}`,
    );
  }

  return {
    api,
    dispose: () => api.dispose(),
  };
}

async function createBrowserAuthenticatedApiContext(baseUrl: string): Promise<{
  api: APIRequestContext;
  dispose: () => Promise<void>;
}> {
  const email = process.env.QA_USER_EMAIL;
  const password = process.env.QA_USER_PASSWORD;
  if (!email || !password) {
    throw new Error("Browser auth requires QA_USER_EMAIL and QA_USER_PASSWORD.");
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(new URL("/login", baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await page.goto(new URL("/dashboard", baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    const text = (await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")).toLowerCase();
    if (page.url().includes("/login") || isLoginPageText(text)) {
      throw new Error("Browser auth did not create a Diana student session.");
    }

    const storageState = await context.storageState();
    const api = await request.newContext({ baseURL: baseUrl, storageState });
    return {
      api,
      async dispose() {
        await api.dispose();
        await context.close();
        await browser.close();
      },
    };
  } catch (error) {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    throw error;
  }
}

function isLoginPageText(text: string): boolean {
  return text.includes("welcome back") &&
    text.includes("email") &&
    text.includes("password") &&
    text.includes("sign in");
}

async function prioritizeQueuedJob(
  admin: NonNullable<ReturnType<typeof createServiceClient>>,
  traceId: string,
): Promise<WorkerJobProbe> {
  const { data, error } = await admin
    .from("worker_jobs")
    .update({ priority: 5000 })
    .eq("trace_id", traceId)
    .select("tenant_id,owner_id,queue_name,status")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Diana status smoke could not read the queued worker job.");
  }
  if (data.queue_name !== VOICE_CANDIDATE_QUEUE) {
    throw new Error(`Diana status smoke expected ${VOICE_CANDIDATE_QUEUE}, got ${data.queue_name}.`);
  }
  if (data.status !== "queued") {
    throw new Error(`Diana status smoke expected queued worker job, got ${data.status}.`);
  }
  return data as WorkerJobProbe;
}

async function waitForCompletedStatus({
  api,
  traceId,
  timeoutMs,
  pollMs,
}: {
  api: Awaited<ReturnType<typeof request.newContext>>;
  traceId: string;
  timeoutMs: number;
  pollMs: number;
}): Promise<JsonObject> {
  const dueAt = Date.now() + timeoutMs;
  let last: JsonObject | null = null;

  while (Date.now() <= dueAt) {
    const response = await api.get(`/api/diana/voice-candidate/status?traceId=${encodeURIComponent(traceId)}`);
    const json = await safeJson(response);
    if (json && typeof json === "object") last = json;
    if (response.ok() && json?.ok === true && json.status === "succeeded") {
      return json;
    }
    if (json?.status === "error" || json?.status === "rate_limited") {
      throw new Error(`Diana status smoke ended with ${json.status}: ${JSON.stringify(json)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error(`Diana status smoke timed out after ${timeoutMs}ms. Last status: ${JSON.stringify(last)}`);
}

async function completeThroughWorkerApi({
  baseUrl,
  token,
  traceId,
  tenantId,
  workerId,
}: {
  baseUrl: string;
  token: string;
  traceId: string;
  tenantId: string;
  workerId: string;
}) {
  const responseText =
    "Open the assignment and write one sentence about what the teacher asked for.";
  const response = await fetch(new URL("/api/workers/complete", baseUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      traceId,
      tenantId,
      status: "succeeded",
      result: {
        response: responseText,
        responseChars: responseText.length,
        provider: "status-smoke",
        model: "worker-api",
        workerId,
        durationMs: 0,
      },
    }),
  });
  const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!response.ok || json?.ok !== true) {
    throw new Error(`Worker API completion returned ${response.status}: ${JSON.stringify(json)}`);
  }
}

function assertStudentSafeStatusBody(body: unknown, label: string) {
  const text = JSON.stringify(body);
  for (const forbidden of ["provider", "model", "workerId", "openjarvis", "ollama", "gstack", "paperclip"]) {
    if (text.toLowerCase().includes(forbidden.toLowerCase())) {
      throw new Error(`${label} exposed backend detail: ${forbidden}`);
    }
  }
}

async function safeJson(response: { json(): Promise<unknown> }): Promise<JsonObject | null> {
  try {
    const parsed = await response.json();
    return parsed && typeof parsed === "object" ? parsed as JsonObject : null;
  } catch {
    return null;
  }
}

async function safeText(response: { text(): Promise<string> }): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function createFakeOpenJarvisServer(expectedModel: string) {
  let requestCount = 0;
  let observedRequest: SidecarRequest | null = null;
  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "not found" }));
      return;
    }
    requestCount += 1;
    observedRequest = await readJson(request) as SidecarRequest;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      id: "diana-status-smoke",
      object: "chat.completion",
      model: expectedModel,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Open the assignment and write one sentence about what the teacher asked for.",
          },
          finish_reason: "stop",
        },
      ],
    }));
  });

  return {
    get baseUrl() {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Fake sidecar is not listening.");
      }
      return `http://127.0.0.1:${address.port}`;
    },
    get requestCount() {
      return requestCount;
    },
    get observedRequest() {
      return observedRequest;
    },
    async listen() {
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
    },
    async close() {
      if (!server.listening) return;
      server.close();
      await once(server, "close");
    },
  };
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function runCompiledWorkerOnce({
  baseUrl,
  token,
  workerId,
  queueName,
  sidecarBaseUrl,
  model,
}: {
  baseUrl: string;
  token: string;
  workerId: string;
  queueName: string;
  sidecarBaseUrl: string;
  model: string;
}): Promise<{ status: number | null; stdout: string; stderr: string }> {
  const child = spawn(process.execPath, [
    "dist/worker/run-diana-worker.cjs",
    "--once",
    `--base-url=${baseUrl}`,
    `--worker-id=${workerId}`,
    `--queue=${queueName}`,
    "--lease-seconds=60",
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      WORKER_API_TOKEN: token,
      OPENJARVIS_BASE_URL: sidecarBaseUrl,
      OPENJARVIS_MODEL: model,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const [status] = await once(child, "exit") as [number | null, NodeJS.Signals | null];
  return { status, stdout: stdout.trim(), stderr: stderr.trim() };
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exit(1);
});
