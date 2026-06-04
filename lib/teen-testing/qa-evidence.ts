import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const TEEN_UX_REQUIRED_QA_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/proof",
  "/dashboard",
  "/assignments",
  "/notes",
  "/flashcards",
  "/settings/ai-history",
  "/teacher-share",
] as const;

export const TEEN_UX_REQUIRED_QA_VIEWPORTS = [
  "375x812",
  "390x844",
  "768x1024",
  "1024x768",
  "1440x1000",
] as const;

export type QaEvidenceRow = {
  route?: string;
  viewport?: string;
  screenshot?: string;
  hasHorizontalOverflow?: boolean;
  bannedVisible?: string[];
  statusText?: string;
};

export type QaEvidenceSummary = {
  exists: boolean;
  sourcePath: string | null;
  total: number;
  overflowCount: number;
  bannedCount: number;
  serverErrorCount: number;
  screenshotCount: number;
  coverageComplete: boolean;
  missingPairs: string[];
};

export function latestCoveredQaResult(root = process.cwd()): QaEvidenceSummary {
  const qaRoot = join(root, ".planning", "qa-screenshots");
  if (!existsSync(qaRoot)) return emptySummary();

  const candidates = readdirSync(qaRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(qaRoot, entry.name, "qa-results.json"))
    .filter((path) => existsSync(path))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  for (const candidate of candidates) {
    const summary = summarizeQaResult(candidate);
    if (summary.coverageComplete) return summary;
  }

  return candidates.length > 0 ? summarizeQaResult(candidates[0]) : emptySummary();
}

export function summarizeQaResult(path: string): QaEvidenceSummary {
  const rows = JSON.parse(readFileSync(path, "utf8")) as QaEvidenceRow[];
  const present = new Set(rows.map((row) => `${row.route ?? ""}::${row.viewport ?? ""}`));
  const missingPairs = requiredPairs().filter((pair) => !present.has(pair));
  const screenshotCount = rows.filter((row) => row.screenshot && existsSync(row.screenshot)).length;
  const coverageComplete =
    missingPairs.length === 0 &&
    rows.length >= TEEN_UX_REQUIRED_QA_ROUTES.length * TEEN_UX_REQUIRED_QA_VIEWPORTS.length &&
    screenshotCount >= TEEN_UX_REQUIRED_QA_ROUTES.length * TEEN_UX_REQUIRED_QA_VIEWPORTS.length;

  return {
    exists: true,
    sourcePath: path,
    total: rows.length,
    overflowCount: rows.filter((row) => row.hasHorizontalOverflow).length,
    bannedCount: rows.filter((row) => (row.bannedVisible ?? []).length > 0).length,
    serverErrorCount: rows.filter((row) => row.statusText === "internal-server-error").length,
    screenshotCount,
    coverageComplete,
    missingPairs,
  };
}

function requiredPairs(): string[] {
  return TEEN_UX_REQUIRED_QA_VIEWPORTS.flatMap((viewport) =>
    TEEN_UX_REQUIRED_QA_ROUTES.map((route) => `${route}::${viewport}`),
  );
}

function emptySummary(): QaEvidenceSummary {
  return {
    exists: false,
    sourcePath: null,
    total: 0,
    overflowCount: 0,
    bannedCount: 0,
    serverErrorCount: 0,
    screenshotCount: 0,
    coverageComplete: false,
    missingPairs: requiredPairs(),
  };
}
