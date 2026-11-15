import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createHybridExperimentHandler, type HybridExperimentPlan, type HybridExperimentDependencies,
  type HybridGuardInput } from "../../supabase/functions/_shared/learning/hybrid-experiment-handler";
import { HYBRID_BENCHMARK_SYSTEM, HYBRID_RESPONSE_JSON_SCHEMA } from "../../supabase/functions/_shared/learning/hybrid-benchmark-prompt";
import { MINOR_SAFETY, CALM_TONE, REDIRECT_PROMPT, FRUSTRATION_REDIRECT } from "../../supabase/functions/_shared/system-prompts";

const REQUEST = "a262a6d7-e023-48ea-8d45-7130706445c2";
const OTHER = "b262a6d7-e023-48ea-8d45-7130706445c2";
const OWNER = "11111111-1111-4111-8111-111111111111";
const BATCH = "22222222-2222-4222-8222-222222222222";
const NOW = Date.parse("2026-09-29T00:00:00Z");
const sha = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const feedback = { action: "hint", feedback: "Compare the two recorded values.", nextQuestion: "Which value is larger?", sourceQuotes: [], limitations: ["Synthetic exercise only."] };
const provider = () => ({ id: "resp_synthetic_1", model: "gpt-6-astra", status: "completed",
  usage: { input_tokens: 800, output_tokens: 60, total_tokens: 860 },
  output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(feedback) }] }] });
function approved(): HybridExperimentPlan {
  const input = JSON.stringify({ caseId: "synthetic-rates", problem: "Compare 2 and 3.", studentAttempt: "I will compare them." });
  const bytes = new TextEncoder().encode(HYBRID_BENCHMARK_SYSTEM + input).length;
  return { sha256: "a".repeat(64), model: "gpt-6-astra", systemSha256: sha(HYBRID_BENCHMARK_SYSTEM),
    priceReviewedAt: new Date(NOW).toISOString(), inputRate: 1250, outputRate: 5000,
    requests: { [REQUEST]: { requestId: REQUEST, batchId: BATCH, caseId: "synthetic-rates", input,
      inputSha256: sha(input), reservedCents: Math.ceil(((bytes + 1024) * 1250 + 4096 * 5000) / 1_000_000) } } };
}
type Faults = { authStatus?: number; owner?: string; env?: Record<string, string | undefined>; plan?: HybridExperimentPlan;
  reserveFailure?: boolean; startFailure?: boolean; tokenStartFailure?: boolean; budgetDenied?: boolean;
  receiptFailure?: boolean; storeFailure?: boolean; releasedStateFailure?: boolean; logFailure?: boolean;
  inputBlocked?: boolean; outputBlocked?: boolean; outputScreeningUnavailable?: boolean;
  fetchError?: boolean; httpStatus?: number; raw?: unknown; invalidResponseJson?: boolean };

async function fixture(faults: Faults = {}) {
  // Exercise the actual shared budget guard without importing Deno environment
  // declarations into the Next TypeScript program. Its moderator is injected.
  const guardModule = "../../supabase/functions/_shared/safety.ts";
  const { runSafeBudgetedAiCall } = await import(guardModule);
  const events: string[] = [], calls: { name: string; args: Record<string, unknown> }[] = [];
  const outputs: Record<string, unknown>[] = [], seen = new Set<string>();
  const states: string[] = [];
  let centsCommitted = false, reservedTokens = 0;
  const client = {
    async rpc(name: string, args: Record<string, unknown>) {
      events.push(name); calls.push({ name, args });
      if (name === "learning_reserve_experiment") {
        if (faults.reserveFailure || seen.has(String(args.p_id))) return { data: false, error: null };
        seen.add(String(args.p_id)); return { data: true, error: null };
      }
      if (name === "learning_start_experiment_provider") return { data: !faults.startFailure, error: null };
      if (name === "learning_record_experiment_usage") {
        if (faults.receiptFailure) return { data: null, error: { message: "receipt unavailable" } };
        centsCommitted = true; return { data: 2, error: null };
      }
      if (name === "learning_record_experiment_output_state") {
        const state = String(args.p_state);
        if (state === "released" && faults.releasedStateFailure) return { data: false, error: null };
        states.push(state); return { data: true, error: null };
      }
      if (name === "reserve_ai_token_budget") {
        reservedTokens = Number(args.p_requested_tokens);
        return { data: [{ allowed: !faults.budgetDenied, reservation_id: faults.budgetDenied ? null : "token-id",
          reserved_tokens: reservedTokens, remaining_tokens: 100_000, reservation_status: "active" }], error: null };
      }
      if (name === "mark_ai_budget_provider_started") return { data: [{ reservation_id: "token-id", reservation_status: "active",
        provider_start_status: faults.tokenStartFailure ? "unknown" : "started", provider_started_at: faults.tokenStartFailure ? null : new Date(NOW).toISOString() }], error: null };
      if (name === "settle_ai_token_budget") return { data: [{ reservation_id: "token-id", reservation_status: "settled",
        actual_tokens: args.p_actual_tokens, charged_tokens: args.p_actual_tokens }], error: null };
      if (name === "release_ai_budget_known_not_consumed") return { data: [{ released: true }], error: null };
      throw new Error("Unexpected RPC " + name);
    },
    from(table: string) {
      expect(table).toBe("learning_experiment_outputs");
      return { async insert(value: Record<string, unknown>) {
        events.push("save-output");
        if (faults.storeFailure) return { error: { message: "storage unavailable" } };
        outputs.push(value); return { error: null };
      } };
    },
  };
  const plan = faults.plan ?? approved();
  const env: Record<string, string | undefined> = { DIANA_HYBRID_EXPERIMENT_PLAN_HASH: plan.sha256,
    DIANA_LEARNING_OPERATOR_IDS: OWNER, OPENAI_API_KEY: "synthetic-unit-test-key", ...faults.env };
  const fetcher = vi.fn<typeof fetch>(async () => {
    events.push("provider");
    if (faults.fetchError) throw new Error("connection lost after send");
    return new Response(faults.invalidResponseJson ? "{" : JSON.stringify(faults.raw ?? provider()), { status: faults.httpStatus ?? 200 });
  });
  const auth = vi.fn(async (_request: Request, options: { requireAiGreen: true }) => {
    events.push("authenticate"); expect(options).toEqual({ requireAiGreen: true });
    return faults.authStatus ? new Response(JSON.stringify({ error: "not authorized" }), { status: faults.authStatus })
      : { ownerId: faults.owner ?? OWNER, serviceClient: client };
  });
  const log = vi.fn(async () => { events.push("log"); if (faults.logFailure) throw new Error("logging unavailable"); });
  const guard = async <T>(input: HybridGuardInput<T>) => {
    expect(input.idempotencyKey).toBe("hybrid-experiment:" + REQUEST);
    return runSafeBudgetedAiCall({ ...input, moderator: async ({ phase }: { phase: string }) => {
      events.push("moderate-" + phase);
      if (phase === "output") {
        expect(centsCommitted).toBe(true);
        if (faults.outputScreeningUnavailable) throw new Error("screening unavailable");
        if (faults.outputBlocked) return { safe: false, category: "sensitive_data", redirect: "Remove private details." };
      }
      if (phase === "input" && faults.inputBlocked) return { safe: false, category: "sensitive_data", redirect: "Remove private details." };
      return { safe: true };
    } });
  };
  const deps: HybridExperimentDependencies = { plan, env: name => env[name], authenticate: auth,
    readBody: request => request.json().catch(() => null), guard, fetch: fetcher, logInteraction: log, now: () => NOW };
  const handler = createHybridExperimentHandler(deps);
  const request = (body: unknown = { planSha256: plan.sha256, requestId: REQUEST }) => new Request("https://example.invalid/hybrid-learning-experiment", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return { handler, request, plan, events, calls, outputs, states, fetcher, auth, log, seen,
    get centsCommitted() { return centsCommitted; }, get reservedTokens() { return reservedTokens; } };
}

describe("frozen hybrid experiment Edge behavior", () => {
  it("preserves every minor-safety instruction while replacing only the unestablished age assertion", () => {
    const ageAssertion = "The student is a minor (high-school age).";
    expect(MINOR_SAFETY.startsWith(ageAssertion)).toBe(true);
    const remainingSafety = MINOR_SAFETY.slice(ageAssertion.length);
    expect(HYBRID_BENCHMARK_SYSTEM).toContain("The learner's age is unknown. Preserve all minor-safety safeguards." + remainingSafety);
    expect(HYBRID_BENCHMARK_SYSTEM).not.toContain(ageAssertion);
    for (const safeguard of [CALM_TONE, REDIRECT_PROMPT, FRUSTRATION_REDIRECT]) {
      expect(HYBRID_BENCHMARK_SYSTEM).toContain(safeguard);
    }
  });
  it("executes only the committed input once and saves usage before moderation, output storage and release", async () => {
    const f = await fixture();
    const response = await f.handler(f.request());
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.result).toMatchObject({ requestId: REQUEST, syntheticInput: true, researchOnly: true, semanticAcceptance: false, actualCents: 2 });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = f.fetcher.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(JSON.parse(String(init?.body))).toMatchObject({ model: "gpt-6-astra", input: f.plan.requests[REQUEST].input,
      instructions: HYBRID_BENCHMARK_SYSTEM, store: false, service_tier: "default", max_output_tokens: 4096, reasoning: { effort: "high" } });
    expect(f.calls[0]).toEqual({ name: "learning_reserve_experiment", args: {
      p_id: REQUEST, p_manifest_hash: f.plan.sha256, p_cents: f.plan.requests[REQUEST].reservedCents, p_batch_id: BATCH, p_batch_cap: 1000 } });
    expect(f.events.indexOf("learning_record_experiment_usage")).toBeLessThan(f.events.indexOf("moderate-output"));
    expect(f.events.indexOf("moderate-output")).toBeLessThan(f.events.indexOf("save-output"));
    expect(f.states).toEqual(["released"]);
    expect(f.calls.find(call => call.name === "settle_ai_token_budget")?.args.p_actual_tokens).toBe(860);
    expect(JSON.stringify(f.calls)).not.toContain(feedback.feedback);
    expect(JSON.stringify(f.calls)).not.toContain(f.plan.requests[REQUEST].input);
    const repeat = await f.handler(f.request());
    expect(repeat.status).toBe(409); expect(f.fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 503])("halts at authentication/policy rejection %s without reservation or provider", async status => {
    const f = await fixture({ authStatus: status });
    expect((await f.handler(f.request())).status).toBe(status);
    expect(f.calls).toEqual([]); expect(f.fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { DIANA_LEARNING_OPERATOR_IDS: "other-operator" }, { DIANA_LEARNING_OPERATOR_IDS: "prefix-" + OWNER },
    { DIANA_HYBRID_EXPERIMENT_PLAN_HASH: "b".repeat(64) }, { DIANA_HYBRID_EXPERIMENT_PLAN_HASH: undefined },
  ])("requires exact operator membership and deployed plan commitment", async env => {
    const f = await fixture({ env });
    expect((await f.handler(f.request())).status).toBe(403);
    expect(f.calls).toEqual([]); expect(f.fetcher).not.toHaveBeenCalled();
  });
  it.each([
    null, [], { planSha256: "a".repeat(64), requestId: OTHER },
    { planSha256: "b".repeat(64), requestId: REQUEST },
    { planSha256: "a".repeat(64), requestId: REQUEST, input: "unapproved prompt" },
    { planSha256: "a".repeat(64), requestId: REQUEST, model: "other" },
    { planSha256: "a".repeat(64), requestId: REQUEST, inputRate: 0 },
  ])("rejects arbitrary content or unregistered request %#", async body => {
    const f = await fixture(); expect((await f.handler(f.request(body))).status).toBe(400);
    expect(f.calls).toEqual([]); expect(f.fetcher).not.toHaveBeenCalled();
  });
  it("keeps the empty deployment registry closed and rejects unsupported HTTP methods", async () => {
    const plan = approved(); plan.sha256 = ""; plan.requests = {};
    const f = await fixture({ plan });
    expect((await f.handler(f.request({ planSha256: "a".repeat(64), requestId: REQUEST }))).status).toBe(400);
    expect((await f.handler(new Request("https://example.invalid"))).status).toBe(405);
    expect(f.calls).toEqual([]);
  });
  it.each([
    ["expired prices", (p: HybridExperimentPlan) => { p.priceReviewedAt = new Date(NOW - 86_400_001).toISOString(); }],
    ["future prices", (p: HybridExperimentPlan) => { p.priceReviewedAt = new Date(NOW + 60_001).toISOString(); }],
    ["invalid prices", (p: HybridExperimentPlan) => { p.priceReviewedAt = "not a date"; }],
    ["input price drift", (p: HybridExperimentPlan) => { p.inputRate = 0; }],
    ["output price drift", (p: HybridExperimentPlan) => { p.outputRate = 5001; }],
    ["model drift", (p: HybridExperimentPlan) => { p.model = "gpt-6-sol"; }],
    ["system hash", (p: HybridExperimentPlan) => { p.systemSha256 = "b".repeat(64); }],
    ["input hash", (p: HybridExperimentPlan) => { p.requests[REQUEST].inputSha256 = "b".repeat(64); }],
    ["reservation drift", (p: HybridExperimentPlan) => { p.requests[REQUEST].reservedCents += 1; }],
    ["request key mismatch", (p: HybridExperimentPlan) => { p.requests[REQUEST].requestId = OTHER; }],
    ["batch identity", (p: HybridExperimentPlan) => { p.requests[REQUEST].batchId = "anything"; }],
    ["UTF8 byte bound", (p: HybridExperimentPlan) => { p.requests[REQUEST].input = "界".repeat(4001); p.requests[REQUEST].inputSha256 = sha(p.requests[REQUEST].input); }],
  ] as const)("rejects configuration %s before any financial reservation", async (_label, mutate) => {
    const plan = approved(); mutate(plan); const f = await fixture({ plan });
    expect((await f.handler(f.request())).status).toBe(503);
    expect(f.calls).toEqual([]); expect(f.fetcher).not.toHaveBeenCalled();
  });
  it("rejects a missing provider key before reserving", async () => {
    const f = await fixture({ env: { OPENAI_API_KEY: " " } });
    expect((await f.handler(f.request())).status).toBe(503); expect(f.calls).toEqual([]);
  });
  it("fails closed if structured-output schema plus request framing outgrow the 1024-byte allowance", async () => {
    const schema = HYBRID_RESPONSE_JSON_SCHEMA as unknown as Record<string, unknown>;
    const original = schema.description;
    try {
      schema.description = "x".repeat(1025);
      const f = await fixture();
      expect((await f.handler(f.request())).status).toBe(503);
      expect(f.calls).toEqual([]); expect(f.fetcher).not.toHaveBeenCalled();
    } finally {
      if (original === undefined) delete schema.description; else schema.description = original;
    }
  });
  it.each([{ reserveFailure: true }, { startFailure: true }, { tokenStartFailure: true }, { budgetDenied: true }, { inputBlocked: true }])(
    "does not invoke the provider when any start prerequisite fails %#", async faults => {
      const f = await fixture(faults); const response = await f.handler(f.request());
      expect(response.status).toBeGreaterThanOrEqual(400); expect(f.fetcher).not.toHaveBeenCalled(); expect(f.outputs).toEqual([]);
      expect(f.states).not.toContain("released");
    });
  it.each([{ fetchError: true }, { httpStatus: 429 }, { httpStatus: 500 }, { invalidResponseJson: true }])(
    "never retries uncertain generation and retains its reservation %#", async faults => {
      const f = await fixture(faults); const response = await f.handler(f.request());
      expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ usageSaved: false });
      expect(f.fetcher).toHaveBeenCalledTimes(1); expect(f.states).toEqual(["generation_error"]);
      expect(f.calls.find(call => call.name === "settle_ai_token_budget")?.args.p_actual_tokens).toBe(f.reservedTokens);
      expect(f.calls.some(call => /release|cancel/.test(call.name))).toBe(false);
      expect((await f.handler(f.request())).status).toBe(409); expect(f.fetcher).toHaveBeenCalledTimes(1);
    });
  it.each([
    { ...provider(), output: [{ type: "message", content: [{ type: "output_text", text: "not JSON" }] }] },
    { ...provider(), output: [] }, { ...provider(), output: "not an array" },
    { ...provider(), status: "incomplete" }, { ...provider(), model: "gpt-6-sol" },
    { ...provider(), model: "gpt-6-astra-unapproved-family" },
    { ...provider(), model: "gpt-6-astra-2026-02-31" },
  ])("commits actual usage before rejecting malformed/incomplete/unknown-model output %#", async raw => {
    const f = await fixture({ raw }); const response = await f.handler(f.request());
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ usageSaved: true });
    expect(f.centsCommitted).toBe(true); expect(f.states).toEqual(["accounting_error"]); expect(f.outputs).toEqual([]);
    expect(f.events).not.toContain("moderate-output"); expect(f.calls.some(call => /release|cancel/.test(call.name))).toBe(false);
  });
  it("accepts a dated snapshot of only the planned model", async () => {
    const f = await fixture({ raw: { ...provider(), model: "gpt-6-astra-2026-09-20" } });
    expect((await f.handler(f.request())).status).toBe(200);
  });
  it.each([
    { ...provider(), usage: { input_tokens: 800, output_tokens: 60, total_tokens: 861 } },
    { ...provider(), usage: { input_tokens: 800, output_tokens: -1, total_tokens: 799 } },
    { ...provider(), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 } },
    { ...provider(), usage: undefined },
  ])("retains uncertain charges when provider usage is invalid %#", async raw => {
    const f = await fixture({ raw }); const response = await f.handler(f.request());
    expect(response.status).toBe(503); expect(f.centsCommitted).toBe(false);
    expect(f.outputs).toEqual([]); expect(f.states).toEqual(["generation_error"]);
    expect(f.calls.some(call => /release|cancel/.test(call.name))).toBe(false);
  });
  it("withholds output when the exact-usage receipt cannot commit", async () => {
    const f = await fixture({ receiptFailure: true });
    expect((await f.handler(f.request())).status).toBe(503);
    expect(f.events).not.toContain("moderate-output"); expect(f.outputs).toEqual([]); expect(f.states).toEqual(["generation_error"]);
  });
  it.each([
    [{ outputBlocked: true }, "blocked"], [{ outputScreeningUnavailable: true }, "screening_unavailable"],
  ] as const)("saves actual charges before output moderation rejection %#", async (faults, state) => {
    const f = await fixture(faults); const response = await f.handler(f.request());
    expect(response.status).toBeGreaterThanOrEqual(400); expect(f.centsCommitted).toBe(true);
    expect(f.states).toEqual([state]); expect(f.outputs).toEqual([]);
    expect(f.calls.find(call => call.name === "settle_ai_token_budget")?.args.p_actual_tokens).toBe(860);
  });
  it.each([{ storeFailure: true }, { releasedStateFailure: true }])("does not release a success when durable output state fails %#", async faults => {
    const f = await fixture(faults); const response = await f.handler(f.request());
    expect(response.status).toBe(503); expect(await response.json()).not.toHaveProperty("result");
    expect(f.centsCommitted).toBe(true); expect(f.states).toEqual(["accounting_error"]);
    expect(f.log).not.toHaveBeenCalled();
    expect((await f.handler(f.request())).status).toBe(409); expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it("keeps a saved response successful if best-effort interaction logging rejects", async () => {
    const f = await fixture({ logFailure: true });
    expect((await f.handler(f.request())).status).toBe(200);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.log).toHaveBeenCalledTimes(1); expect(f.states).toEqual(["released"]);
  });
});
