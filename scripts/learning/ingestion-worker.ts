import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import type { LearningDatabase } from "../../lib/learning-engine/database";
import { advancePdf } from "../../lib/learning-engine/ingestion";
import { learningAccess } from "../../lib/learning-engine/server";
import { drainIngestion } from "../../lib/learning-engine/ingestion-runner";
import { ingestionEndpoint, loadIngestionSession, validateIngestionSession, type IngestionIdentity, type IngestionSession } from "../../lib/learning-engine/ingestion-session";

export const ingestionRepository = fileURLToPath(new URL("../../", import.meta.url));

export function ingestionConfiguration() {
  const filename = process.env.DIANA_INGESTION_SESSION_FILE;
  const ownerId = process.env.DIANA_INGESTION_OWNER_ID;
  const url = process.env.DIANA_INGESTION_SUPABASE_URL;
  if (!filename || !ownerId || !url) throw new Error("ingestion_configuration_required");
  return { filename, pin: { ownerId, url: ingestionEndpoint(url) } };
}

/** One verified owner, bounded network calls and abortable transport. No session renewal. */
export async function runIngestionPass(session: IngestionSession, pin: IngestionIdentity, signal: AbortSignal) {
  validateIngestionSession(session, pin);
  const passSignal = AbortSignal.any([signal, AbortSignal.timeout(55_000)]);
  const client = createClient<LearningDatabase>(session.url, session.publicKey, {
    global: {
      headers: { Authorization: "Bearer " + session.accessToken },
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.any([passSignal, AbortSignal.timeout(15_000), ...(init?.signal ? [init.signal] : [])]) }),
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const authorized = async () => {
    if (passSignal.aborted) return false;
    try { validateIngestionSession(session, pin); } catch { return false; }
    const identity = await client.auth.getUser(session.accessToken);
    if (passSignal.aborted || identity.error || identity.data.user?.id !== pin.ownerId) return false;
    return await learningAccess("retrieval", pin.ownerId, client) && !passSignal.aborted;
  };
  return drainIngestion({
    maxSteps: 20, maxDurationMs: 50_000, authorized,
    pending: async () => {
      const rows = await client.from("learning_ingestion_jobs").select("id").eq("owner_id", pin.ownerId)
        .in("state", ["queued", "indexing", "extracting"])
        .or("lease_until.is.null,lease_until.lte." + new Date().toISOString())
        .order("updated_at", { ascending: true }).limit(25);
      if (rows.error) throw new Error("ingestion_queue_unavailable");
      return (rows.data ?? []).map(row => row.id);
    },
    advance: id => advancePdf(id, pin.ownerId, client),
  });
}

async function main() {
  const { filename, pin } = ingestionConfiguration(), controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try {
    const session = await loadIngestionSession(filename, ingestionRepository, pin);
    const result = await runIngestionPass(session, pin, controller.signal);
    console.log(JSON.stringify({ status: result.status, steps: result.steps }));
    if (result.status === "authorization_unavailable") process.exitCode = 1;
  } finally { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error("The worker pass could not complete. Check its private session and preparation queue; credentials and source text are not logged.");
    process.exitCode = 1;
  });
}
