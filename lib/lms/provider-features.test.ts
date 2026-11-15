import { describe, expect, it } from "vitest";
import {
  assertLmsProviderFeatureEnabled,
  isLmsProviderFeatureEnabled,
  lmsProviderCapabilities,
} from "./provider-features";

describe("LMS provider feature flags", () => {
  it("defaults off outside local development and test runtimes", () => {
    expect(isLmsProviderFeatureEnabled("canvas_import", { NODE_ENV: "production" })).toBe(false);
    expect(isLmsProviderFeatureEnabled("google_submission", { NODE_ENV: "staging" })).toBe(false);
  });

  it("fails closed even in local development and tests without explicit configuration", () => {
    expect(isLmsProviderFeatureEnabled("canvas_import", { NODE_ENV: "development" })).toBe(false);
    expect(isLmsProviderFeatureEnabled("google_import", { NODE_ENV: "test" })).toBe(false);
  });

  it("requires an explicit true or 1 value when configured", () => {
    expect(isLmsProviderFeatureEnabled("canvas_submission", {
      NODE_ENV: "production",
      DIANA_LMS_CANVAS_SUBMISSION_ENABLED: "true",
    })).toBe(true);
    expect(isLmsProviderFeatureEnabled("google_submission", {
      NODE_ENV: "production",
      DIANA_LMS_GOOGLE_SUBMISSION_ENABLED: "1",
    })).toBe(true);
    expect(isLmsProviderFeatureEnabled("google_submission", {
      NODE_ENV: "development",
      DIANA_LMS_GOOGLE_SUBMISSION_ENABLED: "enabled",
    })).toBe(false);
  });

  it("keeps import and submission controls independent by provider", () => {
    const capabilities = lmsProviderCapabilities({
      NODE_ENV: "production",
      DIANA_LMS_CANVAS_IMPORT_ENABLED: "true",
      DIANA_LMS_CANVAS_SUBMISSION_ENABLED: "false",
      DIANA_LMS_GOOGLE_IMPORT_ENABLED: "false",
      DIANA_LMS_GOOGLE_SUBMISSION_ENABLED: "true",
    });

    expect(capabilities).toEqual({
      canvas: { import: true, submission: false },
      google: { import: false, submission: true },
    });
  });

  it("uses a machine-readable error when a provider operation is disabled", () => {
    expect(() => assertLmsProviderFeatureEnabled("google_import", { NODE_ENV: "production" }))
      .toThrow(expect.objectContaining({ code: "provider_feature_disabled", status: 503 }));
  });
});
