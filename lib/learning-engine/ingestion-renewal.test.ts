import { describe, expect, it, vi } from "vitest";
import { renewIngestionSession, validateRenewalRecord, type RenewalRecord } from "./ingestion-renewal";

const now = 1_900_000_000_000, ownerId = "11111111-1111-4111-8111-111111111111";
const pin = { ownerId, sessionId: "22222222-2222-4222-8222-222222222222", url: "https://example.supabase.co" };
const jwt = (overrides = {}) => "header." + Buffer.from(JSON.stringify({ role: "authenticated", sub: ownerId,
  session_id: pin.sessionId, exp: (now + 60_000) / 1000, ...overrides })).toString("base64url") + ".signature";
const fixture = (overrides = {}): RenewalRecord => ({ version: "ingestion-renewal-v1", state: "ready", url: pin.url,
  publicKey: "sb_publishable_synthetic", accessToken: jwt(), refreshToken: "synthetic-refresh-old",
  delegatedAt: now - 1000, delegationExpiresAt: now + 3_600_000, ...overrides });
function harness(overrides: Record<string, unknown> = {}) {
  const writes: RenewalRecord[] = [], calls: { url: string; init?: RequestInit }[] = [];
  const transport = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    if (String(input).includes("/token?")) return Response.json({ access_token: jwt({ exp: (now + 3_600_000) / 1000 }),
      refresh_token: "synthetic-refresh-new", token_type: "bearer", user: { id: ownerId }, ...overrides });
    return Response.json({ id: ownerId });
  });
  const options = { record: fixture(), pin, persist: async (record: RenewalRecord) => { writes.push(record); },
    fetch: transport as typeof fetch, now: () => now };
  return { options, writes, calls, transport };
}
describe("bounded ingestion session renewal", () => {
  it("journals before refresh, verifies live identity and commits rotated credentials", async () => {
    const h = harness();
    const actual = h.options.fetch;
    h.options.fetch = (async (...args: Parameters<typeof fetch>) => { expect(h.writes[0]?.state).toBe("refreshing"); return actual(...args); }) as typeof fetch;
    const result = await renewIngestionSession(h.options);
    expect(result.accessToken).toBe(h.writes[1].accessToken);
    expect(h.writes.map(item => item.state)).toEqual(["refreshing", "ready"]);
    expect(h.writes[1].refreshToken).toBe("synthetic-refresh-new");
    expect(h.calls.map(call => call.url)).toEqual([pin.url + "/auth/v1/token?grant_type=refresh_token", pin.url + "/auth/v1/user"]);
    for (const call of h.calls) expect(call.init).toMatchObject({ redirect: "error", credentials: "omit", cache: "no-store" });
  });
  it("uses a sufficiently fresh access token without reading or transmitting the refresh credential", async () => {
    const h = harness(); h.options.record = fixture({ accessToken: jwt({ exp: (now + 3_600_000) / 1000 }) });
    await renewIngestionSession(h.options);
    expect(h.transport).not.toHaveBeenCalled(); expect(h.writes).toEqual([]);
  });
  it.each([
    { role: "service_role" }, { sub: "33333333-3333-4333-8333-333333333333" },
    { session_id: "33333333-3333-4333-8333-333333333333" }, { exp: (now - 1000) / 1000 },
  ])("rejects changed or expired refreshed claims %j", async claims => {
    const h = harness({ access_token: jwt(claims) });
    await expect(renewIngestionSession(h.options)).rejects.toThrow("reauthorization_required");
    expect(h.writes.map(item => item.state)).toEqual(["refreshing"]); expect(h.calls).toHaveLength(1);
  });
  it("does not retry ambiguous network failure, oversized responses, or rejected identity", async () => {
    for (const failure of ["network", "oversized", "identity"]) {
      const h = harness();
      h.options.fetch = vi.fn(async (input) => {
        if (failure === "network") throw new Error("transport-secret-not-logged");
        if (failure === "oversized") return new Response("x".repeat(32_001));
        if (String(input).endsWith("/user")) return Response.json({ id: "33333333-3333-4333-8333-333333333333" });
        return h.transport(input);
      });
      await expect(renewIngestionSession(h.options)).rejects.toThrow("renewal_stopped_reauthorization_required");
      expect(h.writes).toHaveLength(1);
      await expect(renewIngestionSession({ ...h.options, record: h.writes[0] })).rejects.toThrow("ambiguous_previous_attempt");
    }
  });
  it("requires bounded unexpired delegation, endpoint and session pins before network", async () => {
    for (const record of [fixture({ delegationExpiresAt: now + 1000 }), fixture({ delegationExpiresAt: now + 86_400_000 }),
      fixture({ delegatedAt: now + 1 }), fixture({ url: "https://other.supabase.co" }),
      fixture({ publicKey: "sb_secret_unsafe" }), fixture({ accessToken: jwt({ session_id: "33333333-3333-4333-8333-333333333333" }) })]) {
      const h = harness(); await expect(renewIngestionSession({ ...h.options, record })).rejects.toThrow();
      expect(h.transport).not.toHaveBeenCalled(); expect(h.writes).toEqual([]);
    }
    expect(validateRenewalRecord(fixture({ accessToken: jwt({ exp: (now - 1000) / 1000 }) }), pin, now).state).toBe("ready");
  });
  it("stops before network if journaling fails or shutdown is already requested", async () => {
    const h = harness(); await expect(renewIngestionSession({ ...h.options, persist: async () => { throw new Error("write unavailable"); } })).rejects.toThrow();
    const controller = new AbortController(); controller.abort();
    await expect(renewIngestionSession({ ...h.options, signal: controller.signal })).rejects.toThrow("cancelled");
    expect(h.transport).not.toHaveBeenCalled();
  });
  it("returns no usable session if durable rotated-token storage fails", async () => {
    const h = harness();
    await expect(renewIngestionSession({ ...h.options, persist: async record => {
      if (record.state === "ready") throw new Error("storage unavailable"); h.writes.push(record);
    } })).rejects.toThrow("reauthorization_required");
    expect(h.writes[0].state).toBe("refreshing");
  });
  it("rechecks delegation and cancellation after slow final persistence", async () => {
    for (const reason of ["delegation", "cancelled"]) {
      const h = harness(), controller = new AbortController(); let current = now;
      await expect(renewIngestionSession({ ...h.options, now: () => current, signal: controller.signal,
        persist: async record => {
          h.writes.push(record);
          if (record.state === "ready") {
            if (reason === "delegation") current = record.delegationExpiresAt - 59_999;
            else controller.abort();
          }
        },
      })).rejects.toThrow("reauthorization_required");
      expect(h.writes.at(-1)?.state).toBe("ready");
    }
  });
});
