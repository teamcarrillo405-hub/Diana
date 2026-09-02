import { LmsOperationError } from "./errors";

export type LmsProviderFeature =
  | "canvas_import"
  | "canvas_submission"
  | "google_import"
  | "google_submission";

type Env = Record<string, string | undefined>;

export interface ProviderFeatureFlags {
  canvas: {
    import: boolean;
    submission: boolean;
  };
  google: {
    import: boolean;
    submission: boolean;
  };
}

export const LMS_PROVIDER_FEATURE_ENV: Record<LmsProviderFeature, string> = {
  canvas_import: "DIANA_LMS_CANVAS_IMPORT_ENABLED",
  canvas_submission: "DIANA_LMS_CANVAS_SUBMISSION_ENABLED",
  google_import: "DIANA_LMS_GOOGLE_IMPORT_ENABLED",
  google_submission: "DIANA_LMS_GOOGLE_SUBMISSION_ENABLED",
};

export function isLmsProviderFeatureEnabled(
  feature: LmsProviderFeature,
  env: Env = process.env,
): boolean {
  const configured = env[LMS_PROVIDER_FEATURE_ENV[feature]]?.trim().toLowerCase();
  // Provider access stays off until a deployment explicitly opts in. This avoids
  // accidentally enabling real LMS traffic when credentials reach a local setup.
  if (!configured) return false;
  return configured === "1" || configured === "true";
}

export function assertLmsProviderFeatureEnabled(
  feature: LmsProviderFeature,
  env: Env = process.env,
): void {
  if (isLmsProviderFeatureEnabled(feature, env)) return;
  const [provider, operation] = feature.split("_") as ["canvas" | "google", "import" | "submission"];
  const providerName = provider === "canvas" ? "Canvas" : "Google Classroom";
  throw new LmsOperationError(
    `${providerName} ${operation} is not enabled.`,
    "provider_feature_disabled",
    503,
  );
}

export function lmsProviderCapabilities(env: Env = process.env): Readonly<ProviderFeatureFlags> {
  return Object.freeze({
    canvas: Object.freeze({
      import: isLmsProviderFeatureEnabled("canvas_import", env),
      submission: isLmsProviderFeatureEnabled("canvas_submission", env),
    }),
    google: Object.freeze({
      import: isLmsProviderFeatureEnabled("google_import", env),
      submission: isLmsProviderFeatureEnabled("google_submission", env),
    }),
  });
}
