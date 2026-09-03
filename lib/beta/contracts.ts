export const BETA_GATE_KIND = "diana-beta-gate" as const;
export const BETA_GATE_RECEIPT_KIND = "diana-beta-gate-receipt" as const;
export const BETA_GATE_SCHEMA_VERSION = 3 as const;
export const BETA_REQUIRED_NODE_ENGINE = "24.x" as const;
export const BETA_DEPENDENCY_INSTALL_SCRIPT_NAME = "beta:dependencies" as const;
export const BETA_DEPENDENCY_INSTALL_SCRIPT =
  "node scripts/beta/verify-dependency-install.mjs" as const;
export const BETA_GUARDIAN_GATE_ID = "guardian-gate" as const;
export const BETA_GUARDIAN_GATE_SCRIPT_NAME = "guardian:gate" as const;
export const BETA_GUARDIAN_GATE_SCRIPT =
  "tsx scripts/guardian/verify-under-13-boundary.ts" as const;

export type BetaRunStatus =
  | "ready"
  | "preflight-blocked"
  | "running"
  | "passed"
  | "gate-blocked";

export type BetaCheckStatus = "pass" | "fail";
export type BetaGateStatus = "pending" | "running" | "pass" | "fail" | "blocked";
export type BetaIssueSeverity = "blocker" | "error" | "warning";

export interface BetaIssue {
  id: string;
  gateId: string;
  severity: BetaIssueSeverity;
  title: string;
  detail: string;
  remediation?: string;
}

export interface BetaPreflightCheck {
  id: string;
  label: string;
  status: BetaCheckStatus;
  detail: string;
}

export interface BetaGateDefinition {
  id: string;
  label: string;
  command: readonly [string, ...string[]];
  packageScript: string;
}

export interface BetaPublicPackageCommand {
  scriptName: string;
  packageScript: string;
}

export interface BetaGateResult {
  id: string;
  label: string;
  command: string[];
  status: BetaGateStatus;
  startedAt: string | null;
  completedAt: string | null;
  exitCode: number | null;
  evidenceFile: string | null;
}

export type BetaEvidenceKind =
  | "ownership-marker"
  | "manifest"
  | "checkpoint-receipt"
  | "gate-receipt"
  | "surface-receipt"
  | "report";

export interface BetaEvidenceEntry {
  kind: BetaEvidenceKind;
  path: string;
}

export interface BetaSourceIdentity {
  commitSha: string;
  worktreeDigest: string;
  dirty: boolean;
  fileCount: number;
}

export interface BetaRunManifest {
  schemaVersion: typeof BETA_GATE_SCHEMA_VERSION;
  kind: typeof BETA_GATE_KIND;
  runId: string;
  status: BetaRunStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  project: {
    name: string;
    version: string;
    nodeVersion: string;
  };
  source: BetaSourceIdentity;
  preflight: BetaPreflightCheck[];
  gates: BetaGateResult[];
  issues: BetaIssue[];
  evidence: BetaEvidenceEntry[];
}

export interface BetaGateReceipt {
  schemaVersion: typeof BETA_GATE_SCHEMA_VERSION;
  kind: typeof BETA_GATE_RECEIPT_KIND;
  runId: string;
  gateId: string;
  command: string[];
  status: "pass" | "fail";
  startedAt: string;
  completedAt: string;
  exitCode: number | null;
  signal: string | null;
  outputCaptured: false;
  error: string | null;
  source: BetaSourceIdentity;
}

export const BETA_LOCAL_GATE_DEFINITIONS = [
  {
    id: "dependency-install",
    label: "Reproducible dependency install",
    command: ["npm", "run", BETA_DEPENDENCY_INSTALL_SCRIPT_NAME],
    packageScript: BETA_DEPENDENCY_INSTALL_SCRIPT,
  },
  {
    id: "dependency-audit",
    label: "High-severity dependency audit",
    command: ["npm", "run", "security:audit"],
    packageScript: "node scripts/beta/security-audit.mjs",
  },
  {
    id: "secret-scan",
    label: "Secret scan across history and releasable source",
    command: ["npm", "run", "security:secrets"],
    packageScript: "node scripts/secret-scan.mjs",
  },
  {
    id: "typecheck",
    label: "TypeScript typecheck",
    command: ["npm", "run", "typecheck"],
    packageScript: "tsc --noEmit",
  },
  {
    id: "lint",
    label: "ESLint",
    command: ["npm", "run", "lint"],
    packageScript: "eslint . --max-warnings=0",
  },
  {
    id: "supabase-types",
    label: "Supabase generated type parity",
    command: ["npm", "run", "supabase:types:check"],
    packageScript: "node scripts/check-supabase-types.mjs",
  },
  {
    id: "unit-tests",
    label: "Unit and component tests",
    command: ["npm", "run", "test:run"],
    packageScript: "vitest run --testTimeout 120000 --hookTimeout 120000",
  },
  {
    id: BETA_GUARDIAN_GATE_ID,
    label: "Under-13 guardian boundary",
    command: ["npm", "run", BETA_GUARDIAN_GATE_SCRIPT_NAME],
    packageScript: BETA_GUARDIAN_GATE_SCRIPT,
  },
  {
    id: "worker-deployment",
    label: "Managed worker deployment boundary",
    command: ["npm", "run", "worker:deployment-check"],
    packageScript: "tsx scripts/validate-worker-deployment.ts",
  },
  {
    id: "recovery-contract",
    label: "Database recovery contract",
    command: ["npm", "run", "recovery:test"],
    packageScript: "node --test scripts/supabase-recovery-verify.test.mjs",
  },
  {
    id: "tone-audit",
    label: "Calm-copy audit",
    command: ["npm", "run", "tone-audit"],
    packageScript: "tsx scripts/tone-audit.ts",
  },
  {
    id: "launch-audit",
    label: "Launch audit",
    command: ["npm", "run", "launch-audit"],
    packageScript: "tsx scripts/launch-audit.ts",
  },
  {
    id: "production-build",
    label: "Production build",
    command: ["npm", "run", "build"],
    packageScript: "next build",
  },
] as const satisfies readonly BetaGateDefinition[];

export const BETA_PUBLIC_PACKAGE_COMMANDS = [
  { scriptName: "beta:preflight", packageScript: "tsx scripts/beta/preflight.ts" },
  { scriptName: "beta:checkpoint", packageScript: "node scripts/beta/checkpoint.mjs" },
  {
    scriptName: "beta:materialize",
    packageScript: "node scripts/beta/materialize-checkpoint.mjs",
  },
  { scriptName: "beta:evaluation", packageScript: "tsx scripts/beta/evaluation-harness.ts" },
  { scriptName: "beta:evidence", packageScript: "tsx scripts/beta/external-evidence.ts" },
  {
    scriptName: "beta:gate:local",
    packageScript: "node --experimental-strip-types --experimental-loader ./scripts/beta/typescript-resolution-loader.mjs ./scripts/beta/local-gate.ts",
  },
  { scriptName: "beta:fixtures", packageScript: "tsx scripts/beta/fixtures.ts" },
  { scriptName: "beta:subjects", packageScript: "tsx scripts/beta/subjects.ts" },
  { scriptName: "beta:browser", packageScript: "tsx scripts/beta/browser.ts" },
  { scriptName: "beta:lms:mock", packageScript: "tsx scripts/beta/lms-mock.ts" },
  { scriptName: "beta:lms:staging", packageScript: "tsx scripts/beta/lms-staging.ts" },
  { scriptName: "beta:lms:cleanup", packageScript: "tsx scripts/beta/lms-cleanup.ts" },
  { scriptName: "beta:gate:staging", packageScript: "tsx scripts/beta/staging-gate.ts" },
  { scriptName: "beta:report", packageScript: "tsx scripts/beta/report.ts" },
  { scriptName: "beta:cleanup", packageScript: "tsx scripts/beta/cleanup.ts" },
  { scriptName: "beta:finalize", packageScript: "tsx scripts/beta/finalize.ts" },
] as const satisfies readonly BetaPublicPackageCommand[];
