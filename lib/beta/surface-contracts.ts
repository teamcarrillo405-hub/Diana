import { BETA_GATE_SCHEMA_VERSION, type BetaSourceIdentity } from "./contracts";
import { validateBetaRunId } from "./run-id";

export const BETA_SURFACE_RECEIPT_KIND = "diana-beta-surface-receipt" as const;

export const BETA_SURFACE_NAMES = [
  "fixtures",
  "subjects",
  "browser",
  "lms-mock",
  "lms-staging",
  "staging-gate",
  "cleanup",
] as const;

export type BetaSurfaceName = (typeof BETA_SURFACE_NAMES)[number];
export type BetaSurfaceStatus = "pass" | "blocked";
export type BetaSurfaceCheckStatus = "pass" | "block";
export type BetaSurfaceNetwork =
  | "none"
  | "intercepted"
  | "local-browser"
  | "staging-providers"
  | "not-run";
export type BetaSurfaceWrites =
  | "none"
  | "disposable-local"
  | "disposable-staging"
  | "disposable-cleanup";

export type BetaQaResourceKind =
  | "namespace"
  | "student"
  | "course"
  | "assignment"
  | "submission"
  | "browser-profile";

export interface BetaQaResource {
  kind: BetaQaResourceKind;
  id: string;
  disposable: true;
}

export interface BetaSurfaceCheck {
  id: string;
  label: string;
  status: BetaSurfaceCheckStatus;
  detail: string;
}

export interface BetaSurfaceBindings {
  releaseSha: string | null;
  url: string | null;
}

export interface BetaSurfaceReceipt {
  schemaVersion: typeof BETA_GATE_SCHEMA_VERSION;
  kind: typeof BETA_SURFACE_RECEIPT_KIND;
  runId: string;
  qaRunId: string;
  surface: BetaSurfaceName;
  status: BetaSurfaceStatus;
  startedAt: string;
  completedAt: string;
  command: string[] | null;
  exitCode: number | null;
  signal: string | null;
  network: BetaSurfaceNetwork;
  writes: BetaSurfaceWrites;
  outputCaptured: false;
  error: string | null;
  bindings: BetaSurfaceBindings;
  source: BetaSourceIdentity;
  resources: BetaQaResource[];
  checks: BetaSurfaceCheck[];
}

export const BETA_SUBJECT_GATE_PATH = "scripts/educational-evaluation-gate.ts" as const;
export const BETA_SUBJECT_RESULTS_FILE = "educational-evaluation-results.json" as const;

export function getBetaSubjectGateCommand(
  runIdInput: string,
): readonly [string, ...string[]] {
  const runId = validateBetaRunId(runIdInput);
  return [
    "npx",
    "tsx",
    BETA_SUBJECT_GATE_PATH,
    "gate",
    `--input=artifacts/beta-gate-inputs/${runId}/${BETA_SUBJECT_RESULTS_FILE}`,
    "--format=text",
    "--detail-limit=0",
  ];
}

export const BETA_BROWSER_SPEC_PATH = "tests/beta-browser.spec.ts" as const;
export const BETA_BROWSER_BUILD_COMMAND = ["npx", "next", "build"] as const;
export const BETA_BROWSER_COMMAND = [
  "npx",
  "playwright",
  "test",
  BETA_BROWSER_SPEC_PATH,
  "--project=chromium",
  "--reporter=line",
  "--workers=1",
  "--retries=0",
  "--trace=off",
] as const;

export const BETA_LMS_MOCK_COMMAND = ["provider-canary", "mock"] as const;
export const BETA_LMS_STAGING_COMMAND = [
  "npx",
  "tsx",
  "scripts/provider-canary.ts",
  "--mode=staging",
] as const;
export const BETA_STAGING_GIT_COMMAND = [
  "git",
  "status+rev-parse+cat-file",
] as const;
export const BETA_CLEANUP_COMMAND = [
  "beta-resource-cleanup",
  "run-scoped",
] as const;

export const BETA_FIXED_SURFACE_COMMANDS = {
  browser: BETA_BROWSER_COMMAND,
  "lms-mock": BETA_LMS_MOCK_COMMAND,
  "lms-staging": BETA_LMS_STAGING_COMMAND,
  "staging-gate": BETA_STAGING_GIT_COMMAND,
  cleanup: BETA_CLEANUP_COMMAND,
} as const satisfies Partial<Record<BetaSurfaceName, readonly string[]>>;
