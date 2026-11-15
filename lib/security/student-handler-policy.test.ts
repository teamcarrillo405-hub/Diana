import { beforeAll, describe, expect, it, vi } from "vitest";
import { build } from "esbuild";
import { runInNewContext } from "node:vm";

const owner = "00000000-0000-4000-8000-000000000001";
const assignmentId = "00000000-0000-4000-8000-000000000002";
const classId = "00000000-0000-4000-8000-000000000003";
const noteId = "00000000-0000-4000-8000-000000000004";
const tiers = [undefined, "consumer", "school_tier"] as const;
const scopes = ["assignment", "class", "note"] as const;
let bundle: string;

beforeAll(async () => {
  const result = await build({
    entryPoints: ["supabase/functions/_shared/student-handler.ts"],
    bundle: true, platform: "node", format: "cjs", write: false,
    plugins: [{ name: "mock-database-io", setup(builder) {
      builder.onResolve({ filter: /^jsr:@supabase\/supabase-js@2$/ }, () => ({ path: "sdk", namespace: "policy-test" }));
      builder.onLoad({ filter: /.*/, namespace: "policy-test" }, () => ({
        contents: "export const createClient = (...args) => globalThis.policyTest.createClient(...args);", loader: "js",
      }));
    } }],
  });
  bundle = result.outputFiles[0].text;
});

async function invoke(input: {
  tier?: string; scope: typeof scopes[number] | "unscoped"; classMode: unknown; assignmentOverride?: unknown; requestMode?: string;
}) {
  const rows: Record<string, unknown> = {
    profiles: { user_id: owner, age_bracket: "adult", consent_ai: true },
    data_deletion_requests: null,
    assignments: { id: assignmentId, owner_id: owner, class_id: classId, ai_mode_override: input.assignmentOverride ?? null },
    classes: { id: classId, owner_id: owner, ai_mode: input.classMode },
    notes: { id: noteId, owner_id: owner, assignment_id: assignmentId, class_id: classId },
  };
  const filters = vi.fn();
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: owner } }, error: null }) },
    from: (table: string) => {
      const query: Record<string, unknown> = {};
      for (const method of ["select", "in", "limit"]) query[method] = () => query;
      query.eq = (...args: unknown[]) => { filters(table, ...args); return query; };
      query.maybeSingle = async () => ({ data: rows[table], error: null });
      return query;
    },
  };
  const createClient = vi.fn(() => client);
  const env: Record<string, string | undefined> = {
    SUPABASE_URL: "https://synthetic.test", SUPABASE_ANON_KEY: "synthetic-public",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service", DIANA_HOMEWORK_PRODUCT_TIER: input.tier,
  };
  const testModule = { exports: {} };
  runInNewContext(bundle, {
    module: testModule, exports: testModule.exports, Request, Response, Headers, URL,
    Deno: { env: { get: (key: string) => env[key] } }, policyTest: { createClient },
  });
  const api = testModule.exports as {
    withStudentSecurity(name: string, handler: (request: Request) => Promise<Response>): (request: Request) => Promise<Response>;
  };
  const providerHandler = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
  const scope = input.scope === "assignment" ? { assignmentId } : input.scope === "class" ? { classId } : input.scope === "note" ? { noteId } : {};
  const response = await api.withStudentSecurity("math-step", providerHandler)(new Request("https://synthetic.test/math-step", {
    method: "POST", headers: { Authorization: "Bearer synthetic-session" },
    // A client claiming green must never override the stored policy.
    body: JSON.stringify({ ownerId: owner, aiMode: input.requestMode ?? "green", ...scope }),
  }));
  return { response, providerHandler, createClient, filters };
}

describe("shared Edge policy enforcement", () => {
  it.each(tiers.flatMap(tier => ["red", "yellow"].map(requestMode => ({ tier, requestMode }))))
  ("honors an explicit $requestMode request without assignment scope in tier $tier", async input => {
    const result = await invoke({ ...input, scope: "unscoped", classMode: "green" });
    expect(result.response.status).toBe(403);
    expect(await result.response.json()).toMatchObject({ code: "ai_policy_blocked" });
    expect(result.providerHandler).not.toHaveBeenCalled();
    expect(result.createClient).not.toHaveBeenCalled();
  });

  it.each(tiers.flatMap(tier => scopes.flatMap(scope => ["red", "yellow", "invalid"].map(classMode => ({ tier, scope, classMode })))))
  ("blocks stored $classMode through $scope in tier $tier before service or provider access", async input => {
    const result = await invoke(input);
    expect(result.response.status).toBe(403);
    expect(await result.response.json()).toMatchObject({ code: "ai_policy_blocked" });
    expect(result.providerHandler).not.toHaveBeenCalled();
    expect(result.createClient).toHaveBeenCalledTimes(1);
    expect(result.filters).toHaveBeenCalledWith("classes", "owner_id", owner);
  });

  it.each(tiers.flatMap(tier => ["red", "yellow"].map(assignmentOverride => ({ tier, assignmentOverride }))))
  ("honors stored $assignmentOverride assignment overrides in tier $tier", async input => {
    const result = await invoke({ ...input, scope: "assignment", classMode: "green" });
    expect(result.response.status).toBe(403);
    expect(result.providerHandler).not.toHaveBeenCalled();
    expect(result.createClient).toHaveBeenCalledTimes(1);
  });

  it.each(tiers.flatMap(tier => scopes.map(scope => ({ tier, scope }))))
  ("allows authenticated green $scope in tier $tier", async input => {
    const result = await invoke({ ...input, classMode: "green" });
    expect(result.response.status).toBe(200);
    expect(result.providerHandler).toHaveBeenCalledOnce();
    expect(result.createClient).toHaveBeenCalledTimes(2);
  });
});
