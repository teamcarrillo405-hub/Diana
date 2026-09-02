import { describe, expect, it } from "vitest";

import { parseBetaCliArguments } from "./cli";
import {
  REDACTED_VALUE,
  isSensitiveEvidenceKey,
  redactForEvidence,
  redactText,
} from "./redaction";
import { isValidBetaRunId, validateBetaRunId } from "./run-id";

describe("beta run ids", () => {
  it("accepts portable exact-child directory names", () => {
    for (const runId of ["beta-20260830-01", "rc1", "local-verify-abc123"]) {
      expect(isValidBetaRunId(runId)).toBe(true);
      expect(validateBetaRunId(runId)).toBe(runId);
    }
  });

  it("rejects traversal, ambiguous separators, case drift, and device names", () => {
    for (const runId of [
      "../beta",
      "beta/child",
      "beta\\child",
      "C:\\beta",
      "Beta-01",
      "beta_01",
      "beta--01",
      "-beta",
      "beta-",
      "ab",
      "con",
      "lpt1",
      " beta-01",
    ]) {
      expect(isValidBetaRunId(runId)).toBe(false);
      expect(() => validateBetaRunId(runId)).toThrow(/run id/iu);
    }
  });

  it("parses only a run id", () => {
    expect(parseBetaCliArguments(["--run-id=beta-001"])).toEqual({
      help: false,
      runId: "beta-001",
    });
    expect(parseBetaCliArguments(["--run-id", "beta-001"])).toEqual({
      help: false,
      runId: "beta-001",
    });
    expect(() => parseBetaCliArguments(["--path=artifacts"])).toThrow(/unknown/iu);
    expect(() => parseBetaCliArguments(["--confirm-cleanup"])).toThrow(/unknown/iu);
  });
});

describe("beta evidence redaction", () => {
  it("redacts credential-shaped text and URL passwords", () => {
    const text = [
      "Authorization: Bearer secret-token-value",
      "Cookie: student-session=private-cookie-value",
      "DATABASE_URL=postgresql://student:db-password@example.test/diana",
      "api_key=sk-proj-1234567890abcdef", // gitleaks:allow synthetic credential fixture
      "jwt=eyJabcdefghijk.abcdefghijklmnop.qrstuvwxyz123456",
    ].join("\n");

    const redacted = redactText(text);
    expect(redacted).toContain(REDACTED_VALUE);
    expect(redacted).not.toContain("secret-token-value");
    expect(redacted).not.toContain("private-cookie-value");
    expect(redacted).not.toContain("db-password");
    expect(redacted).not.toContain("sk-proj-1234567890abcdef");
    expect(redacted).not.toContain("eyJabcdefghijk");
  });

  it("redacts nested secrets and student source without mutating input", () => {
    const input = {
      status: "blocked",
      apiKey: "top-secret-key",
      nested: {
        studentSource: "private assignment text",
        detail: "Bearer another-secret-value",
      },
      values: [{ refresh_token: "refresh-secret" }],
    };

    const output = redactForEvidence(input);
    expect(output).not.toBe(input);
    expect(output.apiKey).toBe(REDACTED_VALUE);
    expect(output.nested.studentSource).toBe(REDACTED_VALUE);
    expect(output.nested.detail).toBe(`Bearer ${REDACTED_VALUE}`);
    expect(output.values[0].refresh_token).toBe(REDACTED_VALUE);
    expect(input.apiKey).toBe("top-secret-key");
    expect(isSensitiveEvidenceKey("SUPABASE_SERVICE_ROLE_KEY")).toBe(true);
    expect(isSensitiveEvidenceKey("gateId")).toBe(false);
  });
});
