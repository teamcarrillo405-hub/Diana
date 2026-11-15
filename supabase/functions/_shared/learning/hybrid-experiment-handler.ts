/** Dependency-injected research handler. Importing it starts no runtime or IO. */
import { beginExperimentProvider, recordExperimentUsage, recordExperimentOutputState,
  type ExperimentAccountingClient, type ExperimentUsage } from "./experiment-accounting.ts";
import { HYBRID_BENCHMARK_SYSTEM, HYBRID_RESPONSE_JSON_SCHEMA } from "./hybrid-benchmark-prompt.ts";

type ApprovedCase = { requestId: string; batchId: string; caseId: string; input: string; inputSha256: string; reservedCents: number };
export type HybridExperimentPlan = { sha256: string; model: string; systemSha256: string; priceReviewedAt: string;
  inputRate: number; outputRate: number; requests: Readonly<Record<string, ApprovedCase>> };
export type HybridExperimentClient = ExperimentAccountingClient & {
  from(table: string): { insert(value: Record<string, unknown>): PromiseLike<{ error: unknown }> };
};
type Auth = { ownerId: string; serviceClient: HybridExperimentClient };
type GuardFailure = { ok: false; kind: "budget" | "accounting" | "safety" | "screening"; message: string; status: number };
export type HybridGuardInput<T> = { ownerId: string; supabase: HybridExperimentClient; input: string; systemPrompt: string;
  maxOutputTokens: number; idempotencyKey: string; invoke: () => Promise<T>; getTokens: (value: T) => number; getOutput: (value: T) => string };
export type HybridExperimentDependencies = {
  plan: HybridExperimentPlan;
  env: (name: string) => string | undefined;
  authenticate: (request: Request, options: { requireAiGreen: true }) => Promise<Auth | Response>;
  readBody: (request: Request) => Promise<unknown>;
  guard: <T>(input: HybridGuardInput<T>) => Promise<{ ok: true; value: T } | GuardFailure>;
  fetch: typeof fetch;
  logInteraction: (params: { ownerId: string; feature: "learning_experiment"; model: string; tokensUsed: number;
    inputBytes: number; outputBytes: number }, client: HybridExperimentClient) => Promise<unknown>;
  now?: () => number;
};
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const string = (value: unknown, min: number, max: number): value is string => typeof value === "string" && value.length >= min && value.length <= max;
const keys = (value: Record<string, unknown>, expected: string[]) => Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
async function sha(text: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), byte => byte.toString(16).padStart(2, "0")).join("");
}
function receipt(raw: unknown): ExperimentUsage & { status: string } {
  if (!object(raw) || !string(raw.id, 1, 200) || !string(raw.model, 1, 100) || typeof raw.status !== "string" || !object(raw.usage)) throw new Error("Invalid provider receipt.");
  const usage = raw.usage;
  if (!["input_tokens", "output_tokens", "total_tokens"].every(key => Number.isSafeInteger(usage[key]) && Number(usage[key]) >= 0)) throw new Error("Invalid provider usage.");
  return { id: raw.id, model: raw.model, status: raw.status, usage: {
    input_tokens: usage.input_tokens as number, output_tokens: usage.output_tokens as number, total_tokens: usage.total_tokens as number,
  } };
}
function responseText(raw: unknown): string {
  if (!object(raw) || !Array.isArray(raw.output)) throw new Error("Missing provider output.");
  const parts: string[] = [];
  for (const item of raw.output) {
    if (!object(item) || typeof item.type !== "string" || (item.content !== undefined && !Array.isArray(item.content))) throw new Error("Invalid provider output.");
    for (const part of (item.content ?? []) as unknown[]) {
      if (!object(part) || typeof part.type !== "string" || (part.text !== undefined && typeof part.text !== "string")) throw new Error("Invalid provider output part.");
      if (item.type === "message" && part.type === "output_text") parts.push(typeof part.text === "string" ? part.text : "");
    }
  }
  return parts.join("\n");
}
export function parseFeedback(text: string) {
  const value: unknown = JSON.parse(text);
  if (!object(value) || !keys(value, ["action", "feedback", "nextQuestion", "sourceQuotes", "limitations"])
    || !["clarify", "hint", "related_example", "independent_attempt", "needs_review"].includes(String(value.action))
    || !string(value.feedback, 1, 8000) || !string(value.nextQuestion, 1, 2000)
    || !Array.isArray(value.sourceQuotes) || value.sourceQuotes.length > 12 || !value.sourceQuotes.every(q => string(q, 1, 4000))
    || !Array.isArray(value.limitations) || value.limitations.length > 12 || !value.limitations.every(q => string(q, 0, 1000))) {
    throw new Error("Invalid tutor feedback.");
  }
  return value;
}
export function knownModel(model: string, planned: string): boolean {
  if (model === planned) return true;
  if (!model.startsWith(planned + "-")) return false;
  const date = model.slice(planned.length + 1);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date))
    && new Date(date).toISOString().slice(0, 10) === date;
}

export function createHybridExperimentHandler(deps: HybridExperimentDependencies): (request: Request) => Promise<Response> {
  const now = deps.now ?? Date.now;
  return async request => {
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    let started = false, usageSaved = false;
    let accounting: Parameters<typeof beginExperimentProvider>[1] | undefined;
    let client: HybridExperimentClient | undefined;
    try {
      const auth = await deps.authenticate(request, { requireAiGreen: true });
      if (auth instanceof Response) return auth;
      client = auth.serviceClient;
      const parsed = await deps.readBody(request);
      if (!object(parsed) || !keys(parsed, ["planSha256", "requestId"])
        || typeof parsed.planSha256 !== "string" || !HASH.test(parsed.planSha256)
        || typeof parsed.requestId !== "string" || !UUID.test(parsed.requestId)) return json({ error: "Invalid benchmark request." }, 400);
      const plan = deps.plan;
      const input = Object.hasOwn(plan.requests, parsed.requestId) ? plan.requests[parsed.requestId] : undefined;
      if (!HASH.test(plan.sha256) || parsed.planSha256 !== plan.sha256 || !input) return json({ error: "Only the frozen authored benchmark is available." }, 400);
      if (deps.env("DIANA_HYBRID_EXPERIMENT_PLAN_HASH") !== plan.sha256 ||
        !(deps.env("DIANA_LEARNING_OPERATOR_IDS") ?? "").split(",").map(id => id.trim()).includes(auth.ownerId)) {
        return json({ error: "An approved operator and exact benchmark plan are required." }, 403);
      }
      const apiKey = deps.env("OPENAI_API_KEY"), reviewed = Date.parse(plan.priceReviewedAt);
      const bytes = new TextEncoder().encode(HYBRID_BENCHMARK_SYSTEM + input.input).length;
      const framingAllowance = 1024;
      const providerRequest = { model: plan.model, store: false, service_tier: "default", instructions: HYBRID_BENCHMARK_SYSTEM,
        input: input.input, max_output_tokens: 4096, reasoning: { effort: "high" },
        text: { format: { type: "json_schema", name: "diana_tutoring_response", strict: true, schema: HYBRID_RESPONSE_JSON_SCHEMA } } };
      // System/user text is counted separately. Freeze the remaining schema and
      // request wrapper within the declared conservative byte/token allowance.
      const framingBytes = new TextEncoder().encode(JSON.stringify({ ...providerRequest, instructions: "", input: "" })).length;
      const reservationCents = Math.ceil(((bytes + framingAllowance) * plan.inputRate + 4096 * plan.outputRate) / 1_000_000);
      if (!apiKey?.trim() || plan.model !== "gpt-6-astra" || plan.inputRate !== 1250 || plan.outputRate !== 5000 ||
        !Number.isFinite(reviewed) || reviewed > now() + 60_000 || now() - reviewed > 86_400_000 ||
        input.requestId !== parsed.requestId || !UUID.test(input.batchId) || !string(input.caseId, 1, 200) || !string(input.input, 1, 12000) ||
        bytes > 12000 || framingBytes > framingAllowance || reservationCents !== input.reservedCents || reservationCents > 37 ||
        await sha(HYBRID_BENCHMARK_SYSTEM) !== plan.systemSha256 || await sha(input.input) !== input.inputSha256) {
        return json({ error: "Benchmark configuration needs review." }, 503);
      }
      const inputHash = await sha(JSON.stringify({ planSha256: plan.sha256, requestId: input.requestId, ownerId: auth.ownerId }));
      const reservation = await client.rpc("learning_reserve_experiment", {
        p_id: input.requestId, p_manifest_hash: plan.sha256, p_cents: reservationCents, p_batch_id: input.batchId, p_batch_cap: 1000,
      });
      if (reservation.error || reservation.data !== true) return json({ error: "This attempt is already reserved or its budget is unavailable." }, 409);
      accounting = { requestId: input.requestId, ownerId: auth.ownerId, inputHash, model: plan.model,
        inputRate: plan.inputRate, outputRate: plan.outputRate, priceReviewedAt: plan.priceReviewedAt };
      const context = accounting, serviceClient = client;
      const startedAt = new Date(now()).toISOString();
      const guarded = await deps.guard({
        ownerId: auth.ownerId, supabase: serviceClient, input: input.input, systemPrompt: HYBRID_BENCHMARK_SYSTEM,
        maxOutputTokens: 4096, idempotencyKey: "hybrid-experiment:" + input.requestId,
        invoke: async () => {
          await beginExperimentProvider(serviceClient, context); started = true;
          const response = await deps.fetch("https://api.openai.com/v1/responses", {
            method: "POST", headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
            body: JSON.stringify(providerRequest),
            signal: AbortSignal.timeout(180_000),
          });
          if (!response.ok) throw new Error("Provider request did not complete.");
          const raw: unknown = await response.json(), usage = receipt(raw);
          // Commit cost before examining completion, model identity, content, or moderation.
          const actualCents = await recordExperimentUsage(serviceClient, context, usage); usageSaved = true;
          if (usage.status !== "completed" || !knownModel(usage.model, plan.model)) throw new Error("Incomplete or unexpected model response.");
          const text = responseText(raw), feedback = parseFeedback(text);
          return { ...usage, text, feedback, actualCents };
        }, getTokens: value => value.usage.total_tokens, getOutput: value => value.text,
      });
      if (!guarded.ok) {
        if (started) await recordExperimentOutputState(serviceClient, context, guarded.kind === "safety" ? "blocked" : guarded.kind === "screening" ? "screening_unavailable" : "accounting_error");
        return json({ error: guarded.message, usageSaved }, guarded.status);
      }
      const result = { caseId: input.caseId, planSha256: plan.sha256, requestId: input.requestId, startedAt, completedAt: new Date(now()).toISOString(),
        providerResponseId: guarded.value.id, resolvedModel: guarded.value.model, output: guarded.value.text, feedback: guarded.value.feedback,
        usage: guarded.value.usage, actualCents: guarded.value.actualCents, syntheticInput: true, researchOnly: true, semanticAcceptance: false };
      const saved = await serviceClient.from("learning_experiment_outputs").insert({ request_id: input.requestId, owner_id: auth.ownerId, input_hash: inputHash,
        manifest: { version: "hybrid-tutor-baseline-v1", planSha256: plan.sha256, model: plan.model, split: "development", humanReview: "pending" }, result });
      if (saved.error) throw new Error("Output storage needs reconciliation.");
      await recordExperimentOutputState(serviceClient, context, "released");
      void Promise.resolve().then(() => deps.logInteraction({ ownerId: auth.ownerId, feature: "learning_experiment", model: guarded.value.model,
        tokensUsed: guarded.value.usage.total_tokens, inputBytes: bytes, outputBytes: new TextEncoder().encode(guarded.value.text).length }, serviceClient)).catch(() => undefined);
      return json({ ok: true, result });
    } catch {
      if (started && client && accounting) await recordExperimentOutputState(client, accounting, usageSaved ? "accounting_error" : "generation_error").catch(() => undefined);
      return json({ error: "Benchmark paused; retained usage and reservation need inspection before another attempt.", usageSaved }, 503);
    }
  };
}
