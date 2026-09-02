import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  confirmationCutoffIso,
  confirmationNeedsRotation,
  confirmationTtlHours,
  configuredEarlyAccessOrigins,
  createEarlyAccessRateLimitKeys,
  earlyAccessActionUrl,
  earlyAccessJson,
  earlyAccessOpaqueDigest,
  earlyAccessRateLimitSecret,
  earlyAccessSiteOrigin,
  isAllowedEarlyAccessOrigin,
  parseEarlyAccessSignup,
  parseEarlyAccessToken,
  readEarlyAccessJson,
  reserveEarlyAccessRateLimits,
  withEarlyAccessCors,
  withEarlyAccessFailureBoundary,
  type EarlyAccessEnvReader,
  type EarlyAccessRateLimitClient,
} from "../../supabase/functions/_shared/early-access-security";

function env(values: Record<string, string | undefined>): EarlyAccessEnvReader {
  return (name) => values[name];
}

describe("early-access strict CORS", () => {
  it("allows only canonical exact origins", () => {
    const productionEnv = env({
      DIANA_ENV: "production",
      EARLY_ACCESS_ALLOWED_ORIGINS: [
        "https://preview.diana.test",
        "http://localhost:3002",
        "*",
        "https://user@attacker.test",
      ].join(","),
      SITE_URL: "https://launch.diana.test/early-access",
    });

    const origins = configuredEarlyAccessOrigins(productionEnv);
    expect(origins).toContain("https://diana.app");
    expect(origins).toContain("https://preview.diana.test");
    expect(origins).toContain("https://launch.diana.test");
    expect(origins).not.toContain("http://localhost:3002");
    expect(origins).not.toContain("*");
    expect(isAllowedEarlyAccessOrigin("https://preview.diana.test", productionEnv)).toBe(true);

    for (const origin of [
      "https://preview.diana.test.attacker.example",
      "https://PREVIEW.diana.test",
      "https://preview.diana.test/",
      "null",
      "http://preview.diana.test",
    ]) {
      expect(isAllowedEarlyAccessOrigin(origin, productionEnv), origin).toBe(false);
    }
  });

  it("reflects an allowed origin and rejects a disallowed origin without CORS headers", async () => {
    const productionEnv = env({
      DIANA_ENV: "production",
      EARLY_ACCESS_ALLOWED_ORIGINS: "https://landing.diana.test",
    });
    const handler = withEarlyAccessCors(() => earlyAccessJson({ accepted: true }, 202), productionEnv);

    const allowed = await handler(new Request("https://functions.test/signup", {
      method: "POST",
      headers: { Origin: "https://landing.diana.test" },
    }));
    expect(allowed.status).toBe(202);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe("https://landing.diana.test");
    expect(allowed.headers.get("Cache-Control")).toBe("no-store");
    expect(allowed.headers.get("Vary")).toContain("Origin");

    const blocked = await handler(new Request("https://functions.test/signup", {
      method: "POST",
      headers: { Origin: "https://attacker.test" },
    }));
    expect(blocked.status).toBe(403);
    expect(blocked.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });

  it("accepts only POST preflights with the fixed header allowlist", async () => {
    const productionEnv = env({
      DIANA_ENV: "production",
      EARLY_ACCESS_ALLOWED_ORIGINS: "https://landing.diana.test",
    });
    const handler = withEarlyAccessCors(() => earlyAccessJson({ ok: true }), productionEnv);
    const preflight = (method: string, headers: string) => handler(new Request(
      "https://functions.test/signup",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://landing.diana.test",
          "Access-Control-Request-Method": method,
          "Access-Control-Request-Headers": headers,
        },
      },
    ));

    const allowed = await preflight(
      "POST",
      "authorization, apikey, content-type, x-client-info, x-retry-count",
    );
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe("https://landing.diana.test");
    expect(allowed.headers.get("Access-Control-Allow-Credentials")).toBeNull();

    expect((await preflight("DELETE", "content-type")).status).toBe(403);
    const customHeader = await preflight("POST", "content-type, x-unsafe-header");
    expect(customHeader.status).toBe(403);
    expect(customHeader.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });

  it("discards thrown error objects before logging or responding", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const handler = withEarlyAccessFailureBoundary(() => {
        throw new Error("student@example.com 123e4567-e89b-42d3-a456-426614174000"); // gitleaks:allow synthetic UUIDv4 fixture
      });
      const response = await handler(new Request("https://functions.test/signup"));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Early access is temporarily unavailable." });
      expect(log).toHaveBeenCalledExactlyOnceWith("early-access request failed");
    } finally {
      log.mockRestore();
    }
  });
});

describe("early-access request validation", () => {
  it("reads only bounded JSON objects", async () => {
    const valid = await readEarlyAccessJson(new Request("https://functions.test/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ email: "student@example.com" }),
    }));
    expect(valid).toEqual({ ok: true, value: { email: "student@example.com" } });

    const wrongMedia = await readEarlyAccessJson(new Request("https://functions.test/signup", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "{}",
    }));
    expect(wrongMedia).toMatchObject({ ok: false, status: 415 });

    const arrayBody = await readEarlyAccessJson(new Request("https://functions.test/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "[]",
    }));
    expect(arrayBody).toMatchObject({ ok: false, status: 400 });

    const oversized = await readEarlyAccessJson(new Request("https://functions.test/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(128) }),
    }), 64);
    expect(oversized).toMatchObject({ ok: false, status: 413 });
  });

  it("normalizes valid signup input and rejects unsafe email shapes", () => {
    expect(parseEarlyAccessSignup({
      email: " Student+Beta@Example.COM ",
      source: "public_landing",
      website: "",
    })).toEqual({
      ok: true,
      value: {
        email: "Student+Beta@Example.COM",
        normalizedEmail: "student+beta@example.com",
        source: "public_landing",
        honeypotFilled: false,
      },
    });

    expect(parseEarlyAccessSignup({
      email: "student@example.com",
      source: "../../admin",
      website: "filled-by-bot",
    })).toEqual({
      ok: true,
      value: {
        email: "student@example.com",
        normalizedEmail: "student@example.com",
        source: "public_landing",
        honeypotFilled: true,
      },
    });

    for (const email of [
      "student@example",
      "student@@example.com",
      "student@-example.com",
      "student@example..com",
      "student\n@example.com",
      `${"a".repeat(65)}@example.com`,
      `${"a".repeat(190)}@example.com`,
    ]) {
      expect(parseEarlyAccessSignup({ email }), email).toEqual({ ok: false });
    }
  });

  it("accepts only canonical UUIDv4 bearer tokens", () => {
    const token = "123e4567-e89b-42d3-a456-426614174000"; // gitleaks:allow synthetic UUIDv4 fixture
    expect(parseEarlyAccessToken({ token })).toBe(token);
    expect(parseEarlyAccessToken({ token: token.toUpperCase() })).toBe(token);

    for (const invalid of [
      "------------------------------------",
      "123e4567-e89b-12d3-a456-426614174000",
      "123e4567-e89b-42d3-7456-426614174000",
      `${token} `,
      token.replace(/-/gu, ""),
    ]) {
      expect(parseEarlyAccessToken({ token: invalid }), invalid).toBeNull();
    }
    expect(parseEarlyAccessToken({ token: [token] })).toBeNull();
  });
});

describe("early-access expiry and abuse controls", () => {
  it("bounds confirmation TTL and computes a stable cutoff", () => {
    const now = new Date("2026-08-30T12:00:00.000Z");
    expect(confirmationTtlHours(undefined)).toBe(48);
    expect(confirmationTtlHours("24")).toBe(24);
    expect(confirmationTtlHours("0")).toBe(48);
    expect(confirmationTtlHours("169")).toBe(48);
    expect(confirmationTtlHours("1.5")).toBe(48);

    const cutoff = confirmationCutoffIso(now, 48);
    expect(cutoff).toBe("2026-08-28T12:00:00.000Z");
    expect(confirmationNeedsRotation("2026-08-28T11:59:59.999Z", cutoff)).toBe(true);
    expect(confirmationNeedsRotation(cutoff, cutoff)).toBe(false);
    expect(confirmationNeedsRotation("not-a-date", cutoff)).toBe(true);
    expect(confirmationNeedsRotation(null, cutoff)).toBe(false);
  });

  it("requires a dedicated high-entropy rate-limit secret", () => {
    expect(earlyAccessRateLimitSecret(env({ EARLY_ACCESS_RATE_LIMIT_SALT: "x".repeat(32) })))
      .toBe("x".repeat(32));
    expect(earlyAccessRateLimitSecret(env({ EARLY_ACCESS_RATE_LIMIT_SALT: "x".repeat(31) })))
      .toBeNull();
    expect(earlyAccessRateLimitSecret(env({ SUPABASE_SERVICE_ROLE_KEY: "x".repeat(64) })))
      .toBeNull();
  });

  it("uses opaque, action-scoped keys for both IP and subject limits", async () => {
    const secret = "rate-limit-secret-with-at-least-32-bytes";
    const subject = "student@example.com";
    const request = new Request("https://functions.test/signup", {
      headers: {
        "cf-connecting-ip": "203.0.113.9",
        "x-forwarded-for": "198.51.100.4, 198.51.100.5",
      },
    });
    const signupKeys = await createEarlyAccessRateLimitKeys(secret, "signup", request, subject);
    const repeatedKeys = await createEarlyAccessRateLimitKeys(secret, "signup", request, subject);
    const confirmKeys = await createEarlyAccessRateLimitKeys(secret, "confirm", request, subject);

    expect(signupKeys).toEqual(repeatedKeys);
    expect(signupKeys).toHaveLength(2);
    expect(new Set(signupKeys).size).toBe(2);
    expect(signupKeys).not.toEqual(confirmKeys);
    for (const key of signupKeys) {
      expect(key).toMatch(/^ea:v1:[0-9a-f]{64}$/u);
      expect(key).not.toContain(subject);
      expect(key).not.toContain("203.0.113.9");
    }
    expect(await earlyAccessOpaqueDigest(subject)).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("gates on IP before reserving a subject bucket and fails closed on storage errors", async () => {
    const called: string[] = [];
    const client = (responses: Record<string, { data: unknown; error: unknown }>): EarlyAccessRateLimitClient => ({
      rpc: async (_name, args) => {
        called.push(args.p_rate_key);
        return responses[args.p_rate_key];
      },
    });

    expect(await reserveEarlyAccessRateLimits(client({
      ip: { data: true, error: null },
      subject: { data: true, error: null },
    }), ["ip", "subject"])).toBe("allowed");
    expect(called).toEqual(["ip", "subject"]);

    called.length = 0;
    expect(await reserveEarlyAccessRateLimits(client({
      ip: { data: false, error: null },
      subject: { data: true, error: null },
    }), ["ip", "subject"])).toBe("limited");
    expect(called).toEqual(["ip"]);

    called.length = 0;
    expect(await reserveEarlyAccessRateLimits(client({
      ip: { data: true, error: { code: "storage" } },
      subject: { data: true, error: null },
    }), ["ip", "subject"])).toBe("unavailable");
    expect(called).toEqual(["ip"]);

    called.length = 0;
    expect(await reserveEarlyAccessRateLimits(client({
      ip: { data: true, error: null },
      subject: { data: false, error: null },
    }), ["ip", "subject"])).toBe("limited");
    expect(called).toEqual(["ip", "subject"]);
  });

  it("builds action links from a validated site origin", () => {
    const productionEnv = env({
      DIANA_ENV: "production",
      SITE_URL: "https://launch.diana.test/some/path",
    });
    const token = "123e4567-e89b-42d3-a456-426614174000"; // gitleaks:allow synthetic UUIDv4 fixture
    expect(earlyAccessSiteOrigin(productionEnv)).toBe("https://launch.diana.test");
    expect(earlyAccessActionUrl("https://launch.diana.test", "confirm", token))
      .toBe(`https://launch.diana.test/early-access/confirm?token=${token}`);
    expect(earlyAccessSiteOrigin(env({ DIANA_ENV: "production", SITE_URL: "http://diana.test" })))
      .toBe("https://diana.app");
  });
});

describe("early-access Edge Function wiring", () => {
  const functionsRoot = join(process.cwd(), "supabase/functions");
  const source = (name: string) => readFileSync(join(functionsRoot, name, "index.ts"), "utf8");

  it("routes every public handler through the shared guard and abuse controls", () => {
    for (const name of ["early-access-signup", "early-access-confirm", "early-access-unsubscribe"]) {
      const handler = source(name);
      expect(handler).toContain('from "../_shared/early-access-security.ts"');
      expect(handler).toContain("Deno.serve(withEarlyAccessCors(withEarlyAccessFailureBoundary(");
      expect(handler).toContain('request.method !== "POST"');
      expect(handler).toContain("readEarlyAccessJson(request)");
      expect(handler).toContain("createEarlyAccessRateLimitKeys(");
      expect(handler).toContain("reserveEarlyAccessRateLimits(");
      expect(handler).not.toContain('"Access-Control-Allow-Origin": "*"');
    }
  });

  it("expires confirmation without disclosing token state", () => {
    const handler = source("early-access-confirm");
    expect(handler).toContain("parseEarlyAccessToken(parsedBody.value)");
    expect(handler).toContain('.eq("confirmation_token", token)');
    expect(handler).toContain('.eq("status", "pending_confirmation")');
    expect(handler).toContain('.not("confirmation_sent_at", "is", null)');
    expect(handler).toContain('.gte("confirmation_sent_at", confirmationCutoff)');
    expect(handler).toContain("including unknown or expired tokens");
    expect(handler).toContain("return earlyAccessJson({ confirmed: true })");
  });

  it("makes unsubscribe bearer-owned, idempotent, and dominant over confirmation", () => {
    const handler = source("early-access-unsubscribe");
    expect(handler).toContain("parseEarlyAccessToken(parsedBody.value)");
    expect(handler).toContain('.eq("confirmation_token", token)');
    expect(handler).toContain('.in("status", ["pending_confirmation", "confirmed"])');
    expect(handler).not.toContain('.eq("email"');
    expect(handler).toContain("no token state is disclosed");
    expect(handler).toContain("return earlyAccessJson({ unsubscribed: true })");
  });

  it("keeps signup non-enumerating, refreshes expired confirmation, and hashes mail idempotency", () => {
    const handler = source("early-access-signup");
    expect(handler).toContain("confirmationNeedsRotation(");
    expect(handler).toContain("crypto.randomUUID()");
    expect(handler).toContain('.eq("status", "pending_confirmation")');
    expect(handler).toContain("earlyAccessOpaqueDigest(token)");
    expect(handler).not.toContain("`diana-early-access-${token}`");
    expect(handler).toContain("does not reveal whether the email was already on the list");
    expect(handler).toContain("return earlyAccessJson({ accepted: true }, 202)");
  });

  it("never sends request values or caught errors to application logs", () => {
    for (const name of ["early-access-signup", "early-access-confirm", "early-access-unsubscribe"]) {
      const handler = source(name);
      expect(handler).not.toContain("catch (error)");
      expect(handler).not.toContain("console.log(");
      const loggedArguments = [...handler.matchAll(/console\.(?:error|warn)\(([^\n]+)\);/gu)]
        .map((match) => match[1]);
      expect(loggedArguments.length, name).toBeGreaterThan(0);
      for (const argument of loggedArguments) {
        expect(argument, `${name} log must be a single static string`).toMatch(/^"[^"]+"$/u);
        expect(argument, `${name} log exposed a secret field name`).not.toMatch(/email|token/iu);
      }
    }
  });
});
