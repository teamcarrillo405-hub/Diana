import { afterEach, describe, expect, it, vi } from "vitest";

import { GOOGLE_CLASSROOM_SCOPES } from "./google";
import {
  missingGoogleCanaryScopes,
  runProviderCanary,
  validatePreviewCors,
} from "./provider-canary";
import { withStudentCors } from "../../supabase/functions/_shared/cors";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("provider canary preflight", () => {
  it("runs every provider scenario with intercepted network and no credentials", async () => {
    const report = await runProviderCanary({ mode: "mock", env: {} });

    expect(report.ok).toBe(true);
    expect(report.network).toBe("intercepted");
    expect(report.checks.map((check) => check.id)).toEqual([
      "scope-contract",
      "preview-cors",
      "canvas-import",
      "classroom-import",
      "canvas-submissions",
      "classroom-file",
      "oauth-expired",
      "scope-denied",
      "duplicate-submit",
      "ambiguous-reconciliation",
    ]);
    expect(report.checks.every((check) => check.ok)).toBe(true);
  });

  it("does not contact staging providers when the explicit staging contract is incomplete", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network must not be reached");
    });
    vi.stubGlobal("fetch", fetchMock);

    const report = await runProviderCanary({ mode: "staging", env: {} });

    expect(report.ok).toBe(false);
    expect(report.network).toBe("blocked");
    expect(report.checks.find((check) => check.id === "staging-config")?.detail)
      .toContain("missing staging configuration");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a denied Google scope", () => {
    const granted = GOOGLE_CLASSROOM_SCOPES.filter((scope) => !scope.endsWith("/drive.file"));

    expect(missingGoogleCanaryScopes(granted)).toEqual([
      "https://www.googleapis.com/auth/drive.file",
    ]);
  });

  it("allows the restricted preview suffix without replacing exact origins", () => {
    expect(validatePreviewCors({
      DIANA_CANARY_PREVIEW_ORIGIN: "https://diana-sha-teamcarrillo405-hubs-projects.vercel.app",
      DIANA_ALLOWED_ORIGINS: "https://diana.example",
      DIANA_ALLOWED_PREVIEW_HOST_SUFFIX: "-teamcarrillo405-hubs-projects.vercel.app",
    })).toEqual({
      ok: true,
      detail: "https://diana-sha-teamcarrillo405-hubs-projects.vercel.app matches the restricted Diana Vercel preview policy",
    });
    expect(validatePreviewCors({
      DIANA_CANARY_PREVIEW_ORIGIN: "https://other-sha-team.vercel.app",
      DIANA_ALLOWED_PREVIEW_HOST_SUFFIX: "-teamcarrillo405-hubs-projects.vercel.app",
    }).ok).toBe(false);
    expect(validatePreviewCors({
      DIANA_CANARY_PREVIEW_ORIGIN: "https://diana-sha-teamcarrillo405-hubs-projects.vercel.app",
      DIANA_ALLOWED_PREVIEW_HOST_SUFFIX: ".vercel.app",
    }).ok).toBe(false);
  });

  it("reflects only a matching Diana Vercel preview origin in the shared CORS handler", async () => {
    const env = (name: string) => name === "DIANA_ALLOWED_PREVIEW_HOST_SUFFIX"
      ? "-teamcarrillo405-hubs-projects.vercel.app"
      : name === "DIANA_ENV" ? "production" : undefined;
    const handler = withStudentCors(() => new Response("ok"), env);

    const allowed = await handler(new Request("https://functions.example.test/canary", {
      method: "POST",
      headers: { Origin: "https://diana-sha-teamcarrillo405-hubs-projects.vercel.app" },
    }));
    const blocked = await handler(new Request("https://functions.example.test/canary", {
      method: "POST",
      headers: { Origin: "https://other-sha-team.vercel.app" },
    }));

    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("Access-Control-Allow-Origin"))
      .toBe("https://diana-sha-teamcarrillo405-hubs-projects.vercel.app");
    expect(blocked.status).toBe(403);
    expect(blocked.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });
});
