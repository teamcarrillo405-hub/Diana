import { describe, expect, it } from "vitest";

import { PROVIDER_CANARY_STAGING_ENV } from "@/lib/lms/provider-canary";
import { getBetaQaResourceNamespace, getBetaQaRunId } from "./qa-resources";
import {
  BETA_LMS_STAGING_ACK,
  evaluateBetaLmsStagingAuthorization,
} from "./lms-staging";

const runId = "beta-lms-authorization-001";

function environment(): Record<string, string> {
  const values = Object.fromEntries(
    PROVIDER_CANARY_STAGING_ENV.map((name) => [name, "synthetic"]),
  );
  return {
    ...values,
    NODE_ENV: "test",
    VERCEL_ENV: "preview",
    DIANA_BETA_LMS_DISPOSABLE: "true",
    DIANA_BETA_LMS_ENVIRONMENT: "staging",
    DIANA_BETA_QA_RUN_ID: getBetaQaRunId(runId),
    DIANA_BETA_LMS_RESOURCE_NAMESPACE: getBetaQaResourceNamespace(runId),
    DIANA_BETA_LMS_CANVAS_RESOURCE_TAG: getBetaQaResourceNamespace(runId),
    DIANA_BETA_LMS_GOOGLE_RESOURCE_TAG: getBetaQaResourceNamespace(runId),
    DIANA_BETA_RELEASE_SHA: "a".repeat(40),
    DIANA_BETA_LMS_STAGING_URL:
      "https://diana-lms-auth-teamcarrillo405-hubs-projects.vercel.app",
    DIANA_CANARY_PREVIEW_ORIGIN:
      "https://diana-lms-auth-teamcarrillo405-hubs-projects.vercel.app",
    DIANA_CANARY_CANVAS_BASE_URL: "https://sandbox.canvas.test",
    DIANA_PROVIDER_CANARY_ALLOW_WRITES: "true",
    DIANA_LMS_CANVAS_IMPORT_ENABLED: "true",
    DIANA_LMS_CANVAS_SUBMISSION_ENABLED: "true",
    DIANA_LMS_GOOGLE_IMPORT_ENABLED: "true",
    DIANA_LMS_GOOGLE_SUBMISSION_ENABLED: "true",
  };
}

describe("LMS staging authorization", () => {
  it("requires all three fields for the dedicated fourth Canvas grade write", () => {
    const complete = evaluateBetaLmsStagingAuthorization({
      runId,
      acknowledgement: BETA_LMS_STAGING_ACK,
      environment: environment(),
    });
    expect(complete.authorized).toBe(true);

    for (const key of [
      "DIANA_CANARY_CANVAS_GRADE_ASSIGNMENT_ID",
      "DIANA_CANARY_CANVAS_GRADE_STUDENT_ID",
      "DIANA_CANARY_CANVAS_GRADE_SCORE",
    ]) {
      const missing = environment();
      delete missing[key];
      const result = evaluateBetaLmsStagingAuthorization({
        runId,
        acknowledgement: BETA_LMS_STAGING_ACK,
        environment: missing,
      });
      expect(result.authorized).toBe(false);
      expect(result.checks.find((check) => check.id === "provider-configuration")?.status)
        .toBe("block");
    }
  });
});
