import { loadRenewingIngestionSession } from "../../lib/learning-engine/ingestion-renewal-store";
import { superviseIngestion } from "../../lib/learning-engine/ingestion-supervisor";
import { ingestionConfiguration, ingestionRepository, runIngestionPass } from "./ingestion-worker";

async function main() {
  if (process.env.DIANA_INGESTION_RENEWAL_ENABLED !== "1") throw new Error("renewal_opt_in_required");
  const config = ingestionConfiguration(), sessionId = process.env.DIANA_INGESTION_SESSION_ID;
  if (!sessionId) throw new Error("renewal_session_pin_required");
  const controller = new AbortController(), stop = () => controller.abort();
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try {
    const result = await superviseIngestion({ maxDurationMs: 3_600_000, maxPasses: 360, intervalMs: 10_000, maxBackoffMs: 60_000,
      load: () => loadRenewingIngestionSession({ filename: config.filename, repository: ingestionRepository,
        pin: { ...config.pin, sessionId }, signal: controller.signal }),
      pass: (session, signal) => runIngestionPass(session, config.pin, signal), signal: controller.signal,
      report: event => console.log(JSON.stringify(event)) });
    console.log(JSON.stringify(result));
    if (!["bounded_supervisor_complete", "stopped"].includes(result.status)) process.exitCode = 1;
  } finally { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); }
}
main().catch(() => { console.error("Preparation renewal stopped. Check the private delegation, session pin and operator reconciliation; no credentials are logged."); process.exitCode = 1; });
