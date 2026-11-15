import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  BETA_LOCAL_GATE_DEFINITIONS,
  type BetaIssueSeverity,
  type BetaRunManifest,
} from "./contracts";
import {
  BETA_GATE_REPORT_FILE,
  addBetaEvidenceEntry,
  getBetaRunDirectory,
  readBetaGateReceipt,
  readBetaRunManifest,
  withBetaRunLock,
  writeBetaReportArtifact,
  writeBetaRunManifest,
} from "./evidence";
import { redactForEvidence, redactText } from "./redaction";
import { validateBetaRunId } from "./run-id";
import { betaSourceIdentityMatches } from "./source-identity";
import {
  getBetaSurfaceReceiptPath,
  readBetaSurfaceReceipt,
} from "./surface-evidence";
import type {
  BetaSurfaceName,
  BetaSurfaceReceipt,
} from "./surface-contracts";

const ISSUE_ORDER: Record<BetaIssueSeverity, number> = {
  blocker: 0,
  error: 1,
  warning: 2,
};

const REQUIRED_RELEASE_SURFACES = [
  "fixtures",
  "subjects",
  "browser",
  "lms-mock",
  "lms-staging",
  "cleanup",
  "staging-gate",
] as const satisfies readonly BetaSurfaceName[];

type BetaReportSurface = {
  surface: (typeof REQUIRED_RELEASE_SURFACES)[number];
  status: "pass" | "blocked" | "missing" | "invalid";
  detail: string;
};

export type BetaReportLocalGateReceiptStatus = "pass" | "blocked";

function markdownCell(value: string | number | null): string {
  return redactText(String(value ?? "not recorded"))
    .replace(/\|/gu, "\\|")
    .replace(/\r?\n/gu, " ");
}

function normalizeReportSurfaces(
  receipts: readonly BetaSurfaceReceipt[],
): BetaReportSurface[] {
  return REQUIRED_RELEASE_SURFACES.map((surface) => {
    const receipt = receipts.find((candidate) => candidate.surface === surface);
    if (!receipt) {
      return {
        surface,
        status: "missing" as const,
        detail: "Required receipt is not available.",
      };
    }
    const blocked = receipt.checks.find((check) => check.status === "block");
    return {
      surface,
      status: receipt.status,
      detail: blocked?.detail ?? `${receipt.checks.length} checks passed.`,
    };
  });
}

function readReportSurfaces(projectRoot: string, runId: string): BetaReportSurface[] {
  return REQUIRED_RELEASE_SURFACES.map((surface) => {
    const receiptPath = getBetaSurfaceReceiptPath(projectRoot, runId, surface);
    if (!existsSync(receiptPath)) {
      return {
        surface,
        status: "missing" as const,
        detail: "Required receipt is not available.",
      };
    }
    try {
      const receipt = readBetaSurfaceReceipt(projectRoot, runId, surface);
      const blocked = receipt.checks.find((check) => check.status === "block");
      return {
        surface,
        status: receipt.status,
        detail: blocked?.detail ?? `${receipt.checks.length} checks passed.`,
      };
    } catch {
      return {
        surface,
        status: "invalid" as const,
        detail: "Required receipt is present but did not pass validation.",
      };
    }
  });
}

function hasRegisteredBetaReportArtifact(
  projectRoot: string,
  manifest: BetaRunManifest,
): boolean {
  if (!manifest.evidence.some(
    (entry) => entry.kind === "report" && entry.path === BETA_GATE_REPORT_FILE,
  )) {
    return false;
  }

  try {
    const reportPath = path.join(
      getBetaRunDirectory(projectRoot, manifest.runId),
      BETA_GATE_REPORT_FILE,
    );
    const stats = lstatSync(reportPath);
    return stats.isFile() && !stats.isSymbolicLink();
  } catch {
    return false;
  }
}

export function betaReportLocalGateReceiptStatus(
  projectRoot: string,
  manifest: BetaRunManifest,
): BetaReportLocalGateReceiptStatus {
  if (
    manifest.status !== "passed" ||
    manifest.gates.length !== BETA_LOCAL_GATE_DEFINITIONS.length
  ) {
    return "blocked";
  }

  try {
    for (const [index, definition] of BETA_LOCAL_GATE_DEFINITIONS.entries()) {
      const gate = manifest.gates[index];
      const evidenceFile = `gates/${definition.id}.json`;
      if (
        gate?.id !== definition.id ||
        gate.label !== definition.label ||
        JSON.stringify(gate.command) !== JSON.stringify(definition.command) ||
        gate.status !== "pass" ||
        gate.startedAt === null ||
        gate.completedAt === null ||
        gate.exitCode !== 0 ||
        gate.evidenceFile !== evidenceFile ||
        !manifest.evidence.some(
          (entry) => entry.kind === "gate-receipt" && entry.path === evidenceFile,
        )
      ) {
        return "blocked";
      }

      const receipt = readBetaGateReceipt(
        projectRoot,
        manifest.runId,
        definition.id,
      );
      if (
        receipt.status !== "pass" ||
        receipt.exitCode !== 0 ||
        receipt.signal !== null ||
        receipt.error !== null ||
        receipt.startedAt !== gate.startedAt ||
        receipt.completedAt !== gate.completedAt ||
        JSON.stringify(receipt.command) !== JSON.stringify(definition.command) ||
        !betaSourceIdentityMatches(receipt.source, manifest.source)
      ) {
        return "blocked";
      }
    }
  } catch {
    return "blocked";
  }

  return "pass";
}

export function betaReleaseReportStatus(
  manifest: BetaRunManifest,
  surfaces: readonly BetaReportSurface[],
  localGateReceiptStatus: BetaReportLocalGateReceiptStatus = "blocked",
): "passed" | "blocked" {
  return manifest.status === "passed" &&
    localGateReceiptStatus === "pass" &&
    REQUIRED_RELEASE_SURFACES.every((surface) =>
      surfaces.some((candidate) => candidate.surface === surface && candidate.status === "pass")
    )
    ? "passed"
    : "blocked";
}

export function renderBetaReport(
  input: BetaRunManifest,
  surfaceReceipts: readonly BetaSurfaceReceipt[] = [],
  localGateReceiptStatus: BetaReportLocalGateReceiptStatus = "blocked",
): string {
  const manifest = redactForEvidence(input);
  const surfaces = normalizeReportSurfaces(surfaceReceipts);
  const releaseStatus = betaReleaseReportStatus(
    manifest,
    surfaces,
    localGateReceiptStatus,
  );
  const checksPassed = manifest.preflight.filter((candidate) => candidate.status === "pass").length;
  const gatesPassed = manifest.gates.filter((candidate) => candidate.status === "pass").length;
  const surfacesPassed = surfaces.filter((candidate) => candidate.status === "pass").length;
  const issues = [...manifest.issues].sort(
    (left, right) => ISSUE_ORDER[left.severity] - ISSUE_ORDER[right.severity] || left.id.localeCompare(right.id),
  );
  const evidence = [...manifest.evidence].sort((left, right) => left.path.localeCompare(right.path));
  const lines = [
    "# Diana Beta Gate Report",
    "",
    `- Run ID: \`${markdownCell(manifest.runId)}\``,
    `- Local gate status: **${markdownCell(manifest.status)}**`,
    `- Run evidence status: **${markdownCell(releaseStatus)}**`,
    `- Created: ${markdownCell(manifest.createdAt)}`,
    `- Completed: ${markdownCell(manifest.completedAt)}`,
    `- Project: ${markdownCell(manifest.project.name)} ${markdownCell(manifest.project.version)}`,
    `- Node: ${markdownCell(manifest.project.nodeVersion)}`,
    "",
    "## Summary",
    "",
    `- Preflight checks passed: ${checksPassed}/${manifest.preflight.length}`,
    `- Local gates passed: ${gatesPassed}/${manifest.gates.length}`,
    `- Local gate receipts verified: **${markdownCell(localGateReceiptStatus)}**`,
    `- Required run surfaces passed: ${surfacesPassed}/${surfaces.length}`,
    `- Issues recorded: ${manifest.issues.length}`,
    "",
    "## Preflight",
    "",
    "| Check | Status | Detail |",
    "|---|---|---|",
    ...manifest.preflight.map(
      (candidate) =>
        `| ${markdownCell(candidate.label)} | ${markdownCell(candidate.status)} | ${markdownCell(candidate.detail)} |`,
    ),
    "",
    "## Local Gates",
    "",
    "| Gate | Status | Exit | Evidence |",
    "|---|---|---:|---|",
    ...manifest.gates.map(
      (gate) =>
        `| ${markdownCell(gate.label)} | ${markdownCell(gate.status)} | ${markdownCell(gate.exitCode)} | ${markdownCell(gate.evidenceFile)} |`,
    ),
    "",
    "## Release Surfaces",
    "",
    "| Surface | Status | Detail |",
    "|---|---|---|",
    ...surfaces.map(
      (surface) =>
        `| ${markdownCell(surface.surface)} | ${markdownCell(surface.status)} | ${markdownCell(surface.detail)} |`,
    ),
    "",
    "## Issues",
    "",
  ];

  if (issues.length === 0) {
    lines.push("No issues recorded.");
  } else {
    for (const issue of issues) {
      lines.push(
        `### ${markdownCell(issue.severity.toUpperCase())}: ${markdownCell(issue.title)}`,
        "",
        `- Gate: \`${markdownCell(issue.gateId)}\``,
        `- Detail: ${markdownCell(issue.detail)}`,
      );
      if (issue.remediation) lines.push(`- Remediation: ${markdownCell(issue.remediation)}`);
      lines.push("");
    }
  }

  lines.push(
    "## Evidence",
    "",
    ...evidence.map((entry) => `- \`${markdownCell(entry.path)}\` (${markdownCell(entry.kind)})`),
    "",
    "## Evidence Safety",
    "",
    "Raw command output, credential values, and student source are not stored in beta gate evidence. Non-sensitive run IDs, release bindings, and fixed QA resource names may be recorded.",
    "",
  );

  return lines.join("\n");
}

export interface WriteBetaReportOptions {
  projectRoot: string;
  runId: string;
  now?: () => Date;
}

export function writeBetaReport(options: WriteBetaReportOptions): BetaRunManifest {
  const projectRoot = path.resolve(options.projectRoot);
  const runId = validateBetaRunId(options.runId);
  return withBetaRunLock({ projectRoot, runId }, () => {
    const timestamp = (options.now ?? (() => new Date()))().toISOString();
    let manifest = readBetaRunManifest(projectRoot, runId);

    if (manifest.status === "ready" || manifest.status === "running") {
      throw new Error(`Beta run ${runId} is ${manifest.status}; a final report requires a completed run.`);
    }

    const localGateReceiptStatus = betaReportLocalGateReceiptStatus(
      projectRoot,
      manifest,
    );
    manifest = addBetaEvidenceEntry(
      { ...manifest, updatedAt: timestamp },
      { kind: "report", path: BETA_GATE_REPORT_FILE },
    );
    const surfaceReceipts = REQUIRED_RELEASE_SURFACES.flatMap((surface) => {
      const receiptPath = getBetaSurfaceReceiptPath(projectRoot, runId, surface);
      if (!existsSync(receiptPath)) return [];
      try {
        return [readBetaSurfaceReceipt(projectRoot, runId, surface)];
      } catch {
        return [];
      }
    });
    writeBetaReportArtifact(
      projectRoot,
      runId,
      renderBetaReport(manifest, surfaceReceipts, localGateReceiptStatus),
    );
    writeBetaRunManifest(projectRoot, manifest);
    return manifest;
  });
}

export function readBetaReleaseReportStatus(
  projectRoot: string,
  runIdInput: string,
): "passed" | "blocked" {
  const runId = validateBetaRunId(runIdInput);
  const manifest = readBetaRunManifest(projectRoot, runId);
  if (!hasRegisteredBetaReportArtifact(projectRoot, manifest)) return "blocked";
  return betaReleaseReportStatus(
    manifest,
    readReportSurfaces(projectRoot, runId),
    betaReportLocalGateReceiptStatus(projectRoot, manifest),
  );
}

export function readStoredBetaReport(projectRoot: string, runId: string): string {
  const runDirectory = getBetaRunDirectory(projectRoot, validateBetaRunId(runId));
  return readFileSync(path.join(runDirectory, BETA_GATE_REPORT_FILE), "utf8");
}
