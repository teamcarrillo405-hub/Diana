import { describe, expect, it } from "vitest";
import {
  effectiveAiMode,
  evaluateProfileEligibility,
  isDeletionActive,
  isOwnedStoragePath,
  suppliedOwnerMatches,
} from "../../supabase/functions/_shared/auth-policy";
import { configuredDianaOrigins, withStudentCors } from "../../supabase/functions/_shared/cors";

describe("shared Edge Function authorization policy", () => {
  it("blocks ineligible profiles before AI use", () => {
    expect(evaluateProfileEligibility({ age_bracket: "under_13", consent_ai: false })).toEqual({
      allowed: false,
      code: "under_13",
    });
    expect(evaluateProfileEligibility({ age_bracket: "13_to_17", consent_ai: false })).toEqual({
      allowed: false,
      code: "ai_consent_required",
    });
    expect(evaluateProfileEligibility({ age_bracket: "13_to_17", consent_ai: true })).toEqual({
      allowed: true,
    });
    expect(isDeletionActive("requested")).toBe(true);
    expect(isDeletionActive("processing")).toBe(true);
    expect(isDeletionActive("failed")).toBe(true);
    expect(isDeletionActive("db_purge_failed")).toBe(true);
    expect(isDeletionActive("unexpected_state")).toBe(true);
    expect(isDeletionActive("cancelled")).toBe(false);
    expect(isDeletionActive("completed")).toBe(false);
    expect(isDeletionActive(null)).toBe(false);
  });

  it("blocks user A from supplying user B IDs and storage prefixes", () => {
    const userA = "00000000-0000-4000-8000-00000000000a";
    const userB = "00000000-0000-4000-8000-00000000000b";
    expect(suppliedOwnerMatches(userA, userA)).toBe(true);
    expect(suppliedOwnerMatches(userA, userB)).toBe(false);
    expect(isOwnedStoragePath(userA, `${userA}/notes/photo.png`)).toBe(true);
    expect(isOwnedStoragePath(userA, `${userB}/notes/photo.png`)).toBe(false);
    expect(isOwnedStoragePath(userA, `${userA}/../${userB}/photo.png`)).toBe(false);
  });

  it("requires the effective assignment or class policy to be green", () => {
    expect(effectiveAiMode("red", "green")).toBe("red");
    expect(effectiveAiMode("yellow", "green")).toBe("yellow");
    expect(effectiveAiMode(null, "green")).toBe("green");
    expect(effectiveAiMode(null, undefined)).toBe("unknown");
  });

  it("fails CORS closed in production and varies allowed responses by Origin", async () => {
    const missingConfig = (name: string) => name === "DIANA_ENV" ? "production" : undefined;
    expect(configuredDianaOrigins(missingConfig).size).toBe(0);
    const closedHandler = withStudentCors(() => new Response("ok"), missingConfig);
    const closed = await closedHandler(new Request("https://functions.example.test/test", { method: "POST" }));
    expect(closed.status).toBe(503);
    expect(closed.headers.get("Vary")).toBe("Origin");

    const configured = (name: string) => name === "DIANA_ALLOWED_ORIGINS"
      ? "https://diana.example"
      : name === "DIANA_ENV" ? "production" : undefined;
    const handler = withStudentCors(() => new Response("ok"), configured);
    const allowed = await handler(new Request("https://functions.example.test/test", {
      method: "POST",
      headers: { Origin: "https://diana.example" },
    }));
    const blocked = await handler(new Request("https://functions.example.test/test", {
      method: "POST",
      headers: { Origin: "https://attacker.example" },
    }));
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe("https://diana.example");
    expect(allowed.headers.get("Vary")).toBe("Origin");
    expect(blocked.status).toBe(403);
    expect(blocked.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });
});
