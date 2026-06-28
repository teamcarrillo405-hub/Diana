import { loadEnvConfig } from "@next/env";
import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createVoiceCandidateWorkerJob, VOICE_CANDIDATE_SMOKE_QUEUE } from "../lib/worker-tier/production-worker-tier";
import { enqueueWorkerJob } from "../lib/worker-tier/worker-queue";
import { createServiceClient } from "../lib/supabase/service";

loadEnvConfig(process.cwd());

type SidecarRequest = {
  model?: unknown;
  messages?: unknown;
};

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

async function main() {
  const token = process.env.WORKER_API_TOKEN;
  if (!token) {
    throw new Error("WORKER_API_TOKEN is required to run the worker e2e smoke.");
  }
  if (!existsSync("dist/worker/run-diana-worker.cjs")) {
    throw new Error("Compiled worker bundle is missing. Run npm run worker:build first.");
  }

  const admin = createServiceClient();
  if (!admin) {
    throw new Error("Supabase service client is required for worker e2e smoke.");
  }

  const baseUrl = argValue("base-url") ?? process.env.DIANA_WORKER_BASE_URL ?? "http://127.0.0.1:3000";
  const ownerId = argValue("owner-id") ?? await firstUserId(admin);
  const runId = `e2e-smoke-${Date.now().toString(36)}`;
  const traceId = `dw-${runId}`;
  const workerId = `${runId}-compiled-worker`;
  const imageSha = `${runId}-image-sha`;
  const queueName = argValue("queue") ?? process.env.DIANA_WORKER_SMOKE_QUEUE ?? `${VOICE_CANDIDATE_SMOKE_QUEUE}-${runId}`;
  const model = argValue("model") ?? "worker-e2e-fake-model";
  const sidecar = createFakeOpenJarvisServer(model);

  try {
    await sidecar.listen();
    const job = createVoiceCandidateWorkerJob({
      input: {
        transcript: "I need help deciding the next tiny step.",
        source: "typed",
        assignmentId: null,
      },
      studentId: ownerId,
      tenantId: `personal:${ownerId}`,
      queueMode: "managed_queue",
      queueName,
      sessionId: runId,
      traceId,
      idempotencyKey: `${runId}:${traceId}`,
    });
    await enqueueWorkerJob(job, "queued", admin);
    await admin.from("worker_jobs").update({ priority: 2000 }).eq("trace_id", traceId);

    const worker = await runCompiledWorkerOnce({
      baseUrl,
      token,
      workerId,
      imageSha,
      queueName,
      sidecarBaseUrl: sidecar.baseUrl,
      model,
    });
    if (worker.status !== 0) {
      throw new Error(`Compiled worker exited ${worker.status}: ${worker.stderr || worker.stdout}`);
    }
    if (!sidecar.observedRequest) {
      throw new Error(
        `Fake OpenJarvis sidecar did not receive a chat request. Worker stdout: ${worker.stdout || "<empty>"}; stderr: ${worker.stderr || "<empty>"}`,
      );
    }
    if (sidecar.observedRequest.model !== model) {
      throw new Error("Compiled worker sent an unexpected OpenJarvis model.");
    }
    if (!Array.isArray(sidecar.observedRequest.messages)) {
      throw new Error("Compiled worker did not send OpenJarvis messages.");
    }

    const { data, error } = await admin
      .from("worker_jobs")
      .select("trace_id,tenant_id,status,result_payload,locked_until,locked_by")
      .eq("trace_id", traceId)
      .eq("tenant_id", `personal:${ownerId}`)
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Worker e2e smoke could not read the completed job.");
    }
    const result = data.result_payload && typeof data.result_payload === "object"
      ? data.result_payload as Record<string, unknown>
      : {};
    if (data.status !== "succeeded") {
      throw new Error(`Worker e2e smoke expected succeeded status, got ${data.status}.`);
    }
    if (
      result.provider !== "openjarvis" ||
      result.model !== model ||
      result.workerId !== workerId ||
      result.imageSha !== imageSha
    ) {
      throw new Error("Worker e2e smoke result payload did not record the compiled OpenJarvis worker.");
    }
    if (data.locked_until !== null || data.locked_by !== null) {
      throw new Error("Worker e2e smoke expected the completed job lease to be cleared.");
    }

    console.log(JSON.stringify({
      ok: true,
      baseUrl,
      traceId,
      tenantId: data.tenant_id,
      workerId,
      queueName,
      sidecarRequests: sidecar.requestCount,
      status: data.status,
      result: {
        provider: result.provider,
        model: result.model,
        imageSha: result.imageSha,
        responseChars: result.responseChars,
      },
    }));
  } finally {
    await sidecar.close();
  }
}

async function firstUserId(admin: NonNullable<ReturnType<typeof createServiceClient>>): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(error.message);
  const user = data.users[0];
  if (!user) {
    throw new Error("No auth user is available for worker e2e smoke.");
  }
  return user.id;
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
      id: "worker-e2e-smoke",
      object: "chat.completion",
      model: expectedModel,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Open the assignment and name the next tiny step you can do in two minutes.",
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
        throw new Error("Fake OpenJarvis sidecar is not listening.");
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
  imageSha,
}: {
  baseUrl: string;
  token: string;
  workerId: string;
  imageSha: string;
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
      DIANA_WORKER_IMAGE_SHA: imageSha,
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
