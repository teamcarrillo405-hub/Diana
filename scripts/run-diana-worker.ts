import { loadEnvConfig } from "@next/env";
import { hostname } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import {
  runOneDianaWorkerCycle,
  type DianaWorkerConfig,
} from "../lib/worker-tier/worker-runner";
import { resolveDianaVoiceSidecarConfig } from "../lib/integrations/diana-voice-sidecar";

loadEnvConfig(process.cwd());

let stopping = false;
process.once("SIGINT", () => {
  stopping = true;
});
process.once("SIGTERM", () => {
  stopping = true;
});

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
    throw new Error("WORKER_API_TOKEN is required to run a Diana worker.");
  }

  const config: DianaWorkerConfig = {
    baseUrl: argValue("base-url") ?? process.env.DIANA_WORKER_BASE_URL ?? "http://127.0.0.1:3000",
    token,
    workerId: argValue("worker-id") ?? process.env.DIANA_WORKER_ID ?? `${hostname()}-${process.pid}`,
    queueName: argValue("queue") ?? process.env.DIANA_WORKER_QUEUE ?? "student-ai-candidate",
    leaseSeconds: Math.max(1, Math.min(300, numberArg("lease-seconds", 60))),
  };
  const pollMs = Math.max(250, numberArg("poll-ms", 2000));
  const maxCycles = process.argv.includes("--once")
    ? 1
    : Math.max(0, Math.floor(numberArg("max-cycles", 0)));

  if (process.argv.includes("--check-config")) {
    const sidecar = resolveDianaVoiceSidecarConfig();
    console.log(JSON.stringify({
      workerId: config.workerId,
      queueName: config.queueName,
      baseUrl: config.baseUrl,
      leaseSeconds: config.leaseSeconds,
      sidecarProvider: sidecar.provider,
      sidecarBaseUrl: sidecar.baseUrl,
      sidecarModel: sidecar.model,
      status: "configured",
      at: new Date().toISOString(),
    }));
    return;
  }

  if (process.argv.includes("--health")) {
    await healthCheck(config);
    return;
  }

  let cycles = 0;
  do {
    const result = await runOneDianaWorkerCycle({ config });
    cycles += 1;
    console.log(JSON.stringify({
      workerId: config.workerId,
      queueName: config.queueName,
      cycle: cycles,
      result,
      at: new Date().toISOString(),
    }));

    if (maxCycles > 0 && cycles >= maxCycles) break;
    if (stopping) break;
    await delay(result.status === "idle" ? pollMs : 0);
  } while (!stopping);

  console.log(JSON.stringify({
    workerId: config.workerId,
    queueName: config.queueName,
    status: "stopped",
    cycles,
    at: new Date().toISOString(),
  }));
}

async function healthCheck(config: DianaWorkerConfig) {
  const response = await fetch(new URL("/api/workers/metrics?windowMinutes=1", config.baseUrl), {
    headers: {
      authorization: `Bearer ${config.token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Diana worker health check returned ${response.status}.`);
  }
  const json = await response.json().catch(() => null) as { ok?: boolean } | null;
  if (!json?.ok) {
    throw new Error("Diana worker health check did not return an ok metrics response.");
  }
  console.log(JSON.stringify({
    workerId: config.workerId,
    queueName: config.queueName,
    status: "healthy",
    at: new Date().toISOString(),
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exit(1);
});
