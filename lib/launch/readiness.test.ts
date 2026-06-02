import { describe, expect, it } from "vitest";
import {
  CRITICAL_PATHS,
  PERFORMANCE_BUDGETS,
  REQUIRED_LAUNCH_DOCS,
  criticalPathCoveragePercent,
  launchDocsPresent,
  launchReadinessPasses,
  performanceBudgetsPass,
} from "./readiness";

describe("launch readiness", () => {
  it("requires at least 80 percent critical-path test coverage", () => {
    const paths = CRITICAL_PATHS.slice(0, 5);
    const exists = (path: string) => !path.includes("privacy");
    expect(criticalPathCoveragePercent(paths, exists)).toBe(80);
  });

  it("locks the v2 performance budgets", () => {
    expect(performanceBudgetsPass(PERFORMANCE_BUDGETS)).toBe(true);
    expect(performanceBudgetsPass({ lcpMs: 2600, fidMs: 90, cls: 0.05 })).toBe(false);
  });

  it("checks launch documentation presence", () => {
    const docs = REQUIRED_LAUNCH_DOCS;
    expect(launchDocsPresent(docs, (path) => docs.includes(path as never))).toBe(true);
    expect(launchDocsPresent(docs, (path) => !path.endsWith("SECURITY_AND_RETENTION.md"))).toBe(false);
  });

  it("combines launch gates", () => {
    expect(launchReadinessPasses({ coveragePercent: 80, docsPresent: true, performancePasses: true })).toBe(true);
    expect(launchReadinessPasses({ coveragePercent: 79, docsPresent: true, performancePasses: true })).toBe(false);
  });
});
