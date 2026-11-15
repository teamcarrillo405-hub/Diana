import { describe, expect, it } from "vitest";
import {
  sanitizeMonitoringRoute,
  sanitizeMonitoringText,
  sanitizeTelemetryMetadata,
} from "./privacy";

describe("monitoring privacy", () => {
  it("removes identifiers and query strings from routes", () => {
    expect(sanitizeMonitoringRoute(
      "/assignments/f3da856f-bb12-4bcd-8a5d-5f5489056535/workspace?student=alex",
    )).toBe("/assignments/:id/workspace");
  });

  it("redacts credentials and personal data from error summaries", () => {
    const value = sanitizeMonitoringText(
      "Bearer secret-token alex@example.com at C:\\Users\\alex\\draft.txt https://example.com?a=1",
    );

    expect(value).toBe("[credential] [email] at [path]");
    expect(value).not.toContain("alex");
    expect(value).not.toContain("secret-token");
  });

  it("keeps only bounded operational metadata", () => {
    expect(sanitizeTelemetryMetadata({
      source: "workspace",
      synthetic: false,
      assignmentText: "student answer",
      nested: { student: "Alex" },
    })).toEqual({ source: "workspace", synthetic: false });
  });
});
