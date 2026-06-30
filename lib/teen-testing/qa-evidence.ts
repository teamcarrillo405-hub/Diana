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
  "/sharing",
] as const;

export const TEEN_UX_AUTHENTICATED_QA_ROUTES = [
  "/proof",
  "/dashboard",
  "/assignments",
  "/notes",
  "/flashcards",
  "/settings/ai-history",
  "/sharing",
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
  authState?: "public" | "authenticated" | "login-redirect";
};

export type QaEvidenceSummary = {
  exists: boolean;
  sourcePath: string | null;
  total: number;
  overflowCount: number;
  bannedCount: number;
  serverErrorCount: number;
  screenshotCount: number;
  loginRedirectCount: number;
  authenticatedRouteCount: number;
  authenticatedCoverageComplete: boolean;
  coverageComplete: boolean;
  missingPairs: string[];
  missingAuthenticatedPairs: string[];
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
  const authenticatedPresent = new Set(
    rows
      .filter((row) => row.authState === "authenticated")
      .map((row) => `${row.route ?? ""}::${row.viewport ?? ""}`),
  );
  const missingAuthenticatedPairs = authenticatedPairs().filter((pair) => !authenticatedPresent.has(pair));
  const screenshotCount = rows.filter((row) => row.screenshot && existsSync(row.screenshot)).length;
  const loginRedirectCount = rows.filter((row) => row.authState === "login-redirect").length;
  const authenticatedRouteCount = rows.filter((row) => row.authState === "authenticated").length;
  const authenticatedCoverageComplete = missingAuthenticatedPairs.length === 0 && loginRedirectCount === 0;
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
    loginRedirectCount,
    authenticatedRouteCount,
    authenticatedCoverageComplete,
    coverageComplete,
    missingPairs,
    missingAuthenticatedPairs,
  };
}

function requiredPairs(): string[] {
  return TEEN_UX_REQUIRED_QA_VIEWPORTS.flatMap((viewport) =>
    TEEN_UX_REQUIRED_QA_ROUTES.map((route) => `${route}::${viewport}`),
  );
}

function authenticatedPairs(): string[] {
  return TEEN_UX_REQUIRED_QA_VIEWPORTS.flatMap((viewport) =>
    TEEN_UX_AUTHENTICATED_QA_ROUTES.map((route) => `${route}::${viewport}`),
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
    loginRedirectCount: 0,
    authenticatedRouteCount: 0,
    authenticatedCoverageComplete: false,
    coverageComplete: false,
    missingPairs: requiredPairs(),
    missingAuthenticatedPairs: authenticatedPairs(),
  };
}
