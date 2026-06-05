import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  latestCoveredQaResult,
  summarizeQaResult,
  TEEN_UX_AUTHENTICATED_QA_ROUTES,
  TEEN_UX_REQUIRED_QA_ROUTES,
  TEEN_UX_REQUIRED_QA_VIEWPORTS,
  type QaEvidenceRow,
} from "./qa-evidence";

describe("teen UX QA evidence", () => {
  it("requires the full route and viewport matrix with screenshots", () => {
    const root = makeRoot();
    const qaPath = writeQa(root, "partial", [
      row(root, "partial", "/", "375x812"),
    ]);

    const summary = summarizeQaResult(qaPath);

    expect(summary.coverageComplete).toBe(false);
    expect(summary.authenticatedCoverageComplete).toBe(false);
    expect(summary.missingPairs.length).toBeGreaterThan(0);
  });

  it("does not count login redirects as authenticated visual proof", () => {
    const root = makeRoot();
    const qaPath = writeQa(root, "redirected", fullRows(root, "redirected", "login-redirect"));

    const summary = summarizeQaResult(qaPath);

    expect(summary.coverageComplete).toBe(true);
    expect(summary.authenticatedCoverageComplete).toBe(false);
    expect(summary.loginRedirectCount).toBeGreaterThan(0);
  });

  it("selects the newest complete QA run instead of a newer partial run", () => {
    const root = makeRoot();
    const olderComplete = writeQa(root, "complete", fullRows(root, "complete", "authenticated"));
    const newerPartial = writeQa(root, "partial", [row(root, "partial", "/", "375x812")]);
    setMtime(olderComplete, new Date("2026-06-03T10:00:00Z"));
    setMtime(newerPartial, new Date("2026-06-03T11:00:00Z"));

    const summary = latestCoveredQaResult(root);

    expect(summary.coverageComplete).toBe(true);
    expect(summary.authenticatedCoverageComplete).toBe(true);
    expect(summary.sourcePath).toBe(olderComplete);
    expect(summary.total).toBe(50);
  });
});

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "diana-qa-"));
  mkdirSync(join(root, ".planning", "qa-screenshots"), { recursive: true });
  return root;
}

function writeQa(root: string, name: string, rows: QaEvidenceRow[]): string {
  const dir = join(root, ".planning", "qa-screenshots", name);
  mkdirSync(dir, { recursive: true });
  for (const item of rows) {
    if (item.screenshot) writeFileSync(item.screenshot, "");
  }
  const path = join(dir, "qa-results.json");
  writeFileSync(path, `${JSON.stringify(rows, null, 2)}\n`);
  return path;
}

function fullRows(root: string, name: string, appAuthState: "authenticated" | "login-redirect"): QaEvidenceRow[] {
  return TEEN_UX_REQUIRED_QA_VIEWPORTS.flatMap((viewport) =>
    TEEN_UX_REQUIRED_QA_ROUTES.map((route) => {
      const isAuthenticatedRoute = (TEEN_UX_AUTHENTICATED_QA_ROUTES as readonly string[]).includes(route);
      return row(root, name, route, viewport, isAuthenticatedRoute ? appAuthState : "public");
    }),
  );
}

function row(
  root: string,
  name: string,
  route: string,
  viewport: string,
  authState: QaEvidenceRow["authState"] = "public",
): QaEvidenceRow {
  const fileRoute = route === "/" ? "landing" : route.replace(/^\//, "").replace(/\//g, "-");
  return {
    route,
    viewport,
    screenshot: join(root, ".planning", "qa-screenshots", name, `${viewport}-${fileRoute}.png`),
    hasHorizontalOverflow: false,
    bannedVisible: [],
    statusText: "ok",
    authState,
  };
}

function setMtime(path: string, date: Date): void {
  utimesSync(path, date, date);
}
