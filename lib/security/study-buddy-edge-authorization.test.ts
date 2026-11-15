import { resolve } from "node:path";
import { createHash, webcrypto } from "node:crypto";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let bundle: string;
const auth = vi.fn(), provider = vi.fn(), log = vi.fn();
const env = vi.fn();
let handler: (request: Request) => Promise<Response>;
beforeAll(async () => {
  // Execute the actual Deno entrypoint with only IO/auth boundaries substituted.
  // Pure prompt, response parsing and evidence modules remain in the bundle.
  const result = await build({ entryPoints: [resolve("supabase/functions/study-buddy/index.ts")],
    bundle: true, write: false, platform: "node", format: "cjs", plugins: [{ name: "test-io-boundaries", setup(builder) {
      builder.onResolve({ filter: /^(jsr:)|\/((student-auth|student-handler|homework-adapter|safety)\.ts)$/ }, args => ({ path: args.path, namespace: "test-boundary" }));
      builder.onLoad({ filter: /.*/, namespace: "test-boundary" }, args => {
        const contents = args.path.startsWith("jsr:") ? "" : args.path.endsWith("student-auth.ts")
          ? "export const requireStudentContext = (...args) => globalThis.testIO.auth(...args);"
          : args.path.endsWith("student-handler.ts") ? "export const withStudentSecurity = (_name, handler) => handler;"
          : args.path.endsWith("homework-adapter.ts") ? "export const runOpenAIHomeworkAdapter = (...args) => globalThis.testIO.provider(...args);"
          : "export const logInteraction = (...args) => globalThis.testIO.log(...args);";
        return { contents, loader: "js" };
      });
    } }] });
  bundle = result.outputFiles[0].text;
});
beforeEach(() => {
  vi.clearAllMocks();
  env.mockReturnValue(undefined);
  runInNewContext(bundle, { Deno: { serve: (value: typeof handler) => { handler = value; }, env: { get: env } },
    testIO: { auth, provider, log }, crypto: webcrypto, Response, Request, Headers, TextEncoder, TextDecoder, console });
  provider.mockResolvedValue({ model: "test-model", tokens: 10, content: JSON.stringify({ title: "Consider the next step",
    main: "Look at the constant term.", reason: "Keep both sides balanced.", steps: ["Read the equation.", "Identify the constant.", "What operation would undo it?"], anchor: "Current problem" }) });
});
const body = { ownerId: "11111111-1111-4111-8111-111111111111", assignmentId: "22222222-2222-4222-8222-222222222222",
  classId: "33333333-3333-4333-8333-333333333333", question: "What can I try?" };
const request = () => new Request("https://functions.example/study-buddy", { method: "POST", body: JSON.stringify(body) });
const keyedRequest = (extra: Record<string, unknown> = {}) => new Request("https://functions.example/study-buddy", {
  method: "POST", body: JSON.stringify({ ...body, idempotencyKey: "edge-help-1", ...extra }),
});
type RpcArgs = Record<string, unknown>;
function receipt(args: RpcArgs) {
  return { schemaVersion: "assignment-assistance-v1", scope: "assignment", requestId: args.p_request,
    ownerId: body.ownerId, assignmentId: args.p_assignment, selectedProblemId: null,
    payloadSha256: args.p_payload_sha256, channel: "api", kind: args.p_kind,
    independenceBlocked: true, recordedAt: "2026-09-28T12:00:00.000Z" };
}
function durableAuth(rpc: ReturnType<typeof vi.fn>) {
  const userClient = { rpc };
  const serviceClient = { rpc: vi.fn(), identity: "privileged provider accounting" };
  env.mockImplementation(name => name === "DIANA_DURABLE_TASK_ASSISTANCE_ENABLED" ? "true" : undefined);
  auth.mockResolvedValue({ ownerId: body.ownerId, userClient, serviceClient });
  return { userClient, serviceClient };
}
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
describe("Study Buddy direct Edge authorization", () => {
  it.each([401, 403, 503])("stops before the provider when authoritative authorization returns %s", async status => {
    auth.mockResolvedValue(new Response(JSON.stringify({ error: "Unavailable" }), { status }));
    expect((await handler(request())).status).toBe(status);
    expect(auth).toHaveBeenCalledWith(expect.any(Request), { suppliedOwnerId: body.ownerId,
      assignmentId: body.assignmentId, classId: body.classId, requireAiGreen: true });
    expect(provider).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
  });
  it("uses the authorized service client only after an explicit green-policy gate", async () => {
    const serviceClient = { identity: "authorized service client" };
    auth.mockResolvedValue({ ownerId: body.ownerId, serviceClient });
    const response = await handler(request());
    expect(response.status).toBe(200); expect((await response.json()).ok).toBe(true);
    expect(provider).toHaveBeenCalledOnce();
    expect(provider.mock.calls[0][0].supabase).toBe(serviceClient);
    expect(auth.mock.invocationCallOrder[0]).toBeLessThan(provider.mock.invocationCallOrder[0]);
  });
  it("preserves the caller request key at the atomic token reservation boundary", async () => {
    auth.mockResolvedValue({ ownerId: body.ownerId, serviceClient: {} });
    const response = await handler(new Request("https://functions.example/study-buddy", { method: "POST",
      body: JSON.stringify({ ...body, idempotencyKey: "study-request-1" }) }));
    expect(response.status).toBe(200);
    expect(provider.mock.calls[0][0].idempotencyKey).toBe("study-request-1");
  });
  it.each(["", " ", "x".repeat(129), 42, null])("rejects an invalid supplied request key before provider use: %j", async idempotencyKey => {
    const response = await handler(new Request("https://functions.example/study-buddy", { method: "POST",
      body: JSON.stringify({ ...body, idempotencyKey }) }));
    expect(response.status).toBe(400); expect(provider).not.toHaveBeenCalled();
  });
});

describe("Study Buddy durable assistance dispatch guard", () => {
  it.each([null, undefined, [], "receipt", {}])("blocks a missing or malformed receipt: %j", async data => {
    const rpc = vi.fn().mockResolvedValue({ data, error: null });
    durableAuth(rpc);
    const response = await handler(keyedRequest());
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("assistance_receipt_unavailable");
    expect(provider).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
  });

  it.each([
    ["schemaVersion", "other"], ["scope", "task"], ["requestId", "other-request"],
    ["ownerId", "other-owner"], ["assignmentId", "other-assignment"], ["selectedProblemId", "narrower-task"],
    ["payloadSha256", "0".repeat(64)], ["channel", "local"], ["kind", "check"],
    ["independenceBlocked", false], ["recordedAt", "invalid"], ["extra", true],
  ])("rejects a receipt with mismatched %s", async (key, value) => {
    const rpc = vi.fn().mockImplementation(async (_name, args) => ({ data: { ...receipt(args), [String(key)]: value }, error: null }));
    durableAuth(rpc);
    expect((await handler(keyedRequest())).status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
  });

  it("requires the receipt to finish before dispatch and uses only the authenticated user client", async () => {
    let finish!: (value: { data: unknown; error: unknown }) => void;
    const pending = new Promise<{ data: unknown; error: unknown }>(resolve => { finish = resolve; });
    const rpc = vi.fn().mockReturnValue(pending);
    const { serviceClient } = durableAuth(rpc);
    let settled = false;
    const responsePromise = handler(keyedRequest()).then(value => { settled = true; return value; });
    await vi.waitFor(() => expect(rpc).toHaveBeenCalledOnce());
    expect(provider).not.toHaveBeenCalled(); expect(settled).toBe(false);
    expect(serviceClient.rpc).not.toHaveBeenCalled();
    finish({ data: receipt(rpc.mock.calls[0][1]), error: null });
    expect((await responsePromise).status).toBe(200);
    expect(provider).toHaveBeenCalledOnce();
    expect(provider.mock.calls[0][0].supabase).toBe(serviceClient);
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(provider.mock.invocationCallOrder[0]);
  });

  it("binds the receipt hash to the actual normalized provider request and a separate owner-specific namespace", async () => {
    const rpc = vi.fn().mockImplementation(async (_name, args) => ({ data: receipt(args), error: null }));
    durableAuth(rpc);
    expect((await handler(keyedRequest({ mode: "hint", source: "  selected problem  ", tutorPersona: "maya",
      conversation: [{ role: "student", text: "my work" }], routing: { sourceChars: 900, academicBand: "high_school" } }))).status).toBe(200);
    const [rpcName, args] = rpc.mock.calls[0];
    const dispatched = provider.mock.calls[0][0];
    const hex = sha(`study-buddy-edge-assistance-v1:${body.ownerId}:edge-help-1`);
    const expectedId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 3) | 8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
    expect(rpcName).toBe("learning_begin_assignment_assistance");
    expect(args).toEqual({ p_assignment: body.assignmentId, p_request: expectedId,
      p_payload_sha256: sha(JSON.stringify({ protocol: "study-buddy-edge-input-v1", ownerId: body.ownerId,
        assignmentId: body.assignmentId, requestId: expectedId, channel: "api", kind: "hint", mode: "hint",
        system: dispatched.system, user: dispatched.user, routing: dispatched.routing, maxTokens: dispatched.maxTokens, json: dispatched.json })),
      p_channel: "api", p_kind: "hint", p_selected_problem: null });
    expect(dispatched.idempotencyKey).toBe("edge-help-1");
    expect(dispatched.user).toContain("selected problem");
    expect(dispatched.system).toContain("You are Diana");
  });

  it.each([
    { question: "different question" }, { source: "changed work" }, { mode: "hint" },
    { conversation: [{ role: "student", text: "changed prior work" }] },
    { tutorStyle: "direct" }, { routing: { signals: "changed routing" } },
    { specialistContext: "changed context" }, { assignmentId: "44444444-4444-4444-8444-444444444444" },
  ])("blocks a same-key changed payload when the atomic RPC reports a conflict: %j", async changed => {
    // Simulate the SQL RPC's atomic conflict contract, not its implementation.
    let firstArgs: RpcArgs | undefined;
    const rpc = vi.fn().mockImplementation(async (_name, args: RpcArgs) => {
      if (firstArgs && (firstArgs.p_payload_sha256 !== args.p_payload_sha256 || firstArgs.p_assignment !== args.p_assignment)) {
        return { data: null, error: { code: "23505", message: "private database details" } };
      }
      firstArgs = args;
      return { data: receipt(args), error: null };
    });
    durableAuth(rpc);
    expect((await handler(keyedRequest())).status).toBe(200);
    const response = await handler(keyedRequest(changed));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private database details");
    expect(rpc.mock.calls[1][1].p_request).toBe(rpc.mock.calls[0][1].p_request);
    expect(rpc.mock.calls[1][1].p_payload_sha256).not.toBe(rpc.mock.calls[0][1].p_payload_sha256);
    expect(provider).toHaveBeenCalledOnce();
  });

  it("ignores forged caller receipts and does not fall back to privileged RPC access", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const { serviceClient } = durableAuth(rpc);
    serviceClient.rpc.mockResolvedValue({ data: { independenceBlocked: true }, error: null });
    const response = await handler(keyedRequest({ assistanceReceipt: { independenceBlocked: true },
      receipt: { schemaVersion: "assignment-assistance-v1", ownerId: body.ownerId },
      payloadSha256: "a".repeat(64), assistanceRecorded: true }));
    expect(response.status).toBe(503); expect(rpc).toHaveBeenCalledOnce();
    expect(serviceClient.rpc).not.toHaveBeenCalled(); expect(provider).not.toHaveBeenCalled();
  });

  it("fails closed if the authenticated user client is absent", async () => {
    const { serviceClient } = durableAuth(vi.fn());
    auth.mockResolvedValue({ ownerId: body.ownerId, serviceClient });
    expect((await handler(keyedRequest())).status).toBe(503);
    expect(serviceClient.rpc).not.toHaveBeenCalled(); expect(provider).not.toHaveBeenCalled();
  });

  it.each(["error", "throw"])("retains fail-closed behavior for RPC %s", async failure => {
    const rpc = failure === "throw" ? vi.fn().mockRejectedValue(new Error("private error"))
      : vi.fn().mockResolvedValue({ data: null, error: { message: "private error" } });
    durableAuth(rpc);
    const response = await handler(keyedRequest());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("private error");
    expect(provider).not.toHaveBeenCalled();
  });

  it("preserves legacy behavior when the durable flag is off", async () => {
    const rpc = vi.fn().mockRejectedValue(new Error("must not be called"));
    durableAuth(rpc); env.mockReturnValue("false");
    expect((await handler(keyedRequest())).status).toBe(200);
    expect(rpc).not.toHaveBeenCalled(); expect(provider).toHaveBeenCalledOnce();
  });

  it("does not manufacture assignment contamination for unscoped legacy help", async () => {
    const rpc = vi.fn(); durableAuth(rpc);
    expect((await handler(keyedRequest({ assignmentId: null }))).status).toBe(200);
    expect(rpc).not.toHaveBeenCalled(); expect(provider).toHaveBeenCalledOnce();
  });
});
