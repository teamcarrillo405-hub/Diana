import { loadIngestionSession } from "../../lib/learning-engine/ingestion-session";
import { superviseIngestion } from "../../lib/learning-engine/ingestion-supervisor";
import { ingestionConfiguration, ingestionRepository, runIngestionPass } from "./ingestion-worker";

function setting(name: string, fallback: number) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  if (!/^\d{1,9}$/.test(value)) throw new Error("ingestion_supervisor_bound");
  return Number(value);
}

async function main() {
  const { filename, pin } = ingestionConfiguration(), controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try {
    const result = await superviseIngestion({
      maxDurationMs: setting("DIANA_INGESTION_DURATION_MS", 3_600_000),
      intervalMs: setting("DIANA_INGESTION_INTERVAL_MS", 10_000),
      maxBackoffMs: setting("DIANA_INGESTION_BACKOFF_MS", 60_000),
      maxPasses: setting("DIANA_INGESTION_MAX_PASSES", 360),
      load: () => loadIngestionSession(filename, ingestionRepository, pin),
      pass: (session, signal) => runIngestionPass(session, pin, signal),
      signal: controller.signal,
      report: event => console.log(JSON.stringify(event)),
    });
    console.log(JSON.stringify(result));
    if (!["bounded_supervisor_complete", "stopped"].includes(result.status)) process.exitCode = 1;
  } finally { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); }
}

main().catch(() => {
  console.error("The preparation supervisor stopped. Check its private session, pinned owner, endpoint and bounded settings; credentials and source text are not logged.");
  process.exitCode = 1;
});
