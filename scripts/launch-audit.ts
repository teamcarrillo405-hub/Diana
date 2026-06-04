import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CRITICAL_PATHS,
  PERFORMANCE_BUDGETS,
  REQUIRED_LAUNCH_DOCS,
  criticalPathCoveragePercent,
  launchDocsPresent,
  launchReadinessPasses,
  performanceBudgetsPass,
} from "../lib/launch/readiness";

const ROOT = process.cwd();

const REQUIRED_FILES = [
  ".planning/MILESTONE-V2-MASTER-PLAN.md",
  "supabase/migrations/0034_launch_hardening_retention.sql",
  "app/(app)/study-groups/page.tsx",
  "app/(app)/export/page.tsx",
  "electron/main.cjs",
  "electron/preload.cjs",
  "scripts/electron-dev.mjs",
  "public/sw.js",
  ...REQUIRED_LAUNCH_DOCS,
] as const;

function exists(path: string): boolean {
  return existsSync(join(ROOT, path));
}

function main() {
  const missingFiles = REQUIRED_FILES.filter((path) => !exists(path));
  const coveragePercent = criticalPathCoveragePercent(CRITICAL_PATHS, exists);
  const docsPresent = launchDocsPresent(REQUIRED_LAUNCH_DOCS, exists);
  const performancePasses = performanceBudgetsPass(PERFORMANCE_BUDGETS);
  const ready = launchReadinessPasses({ coveragePercent, docsPresent, performancePasses }) && missingFiles.length === 0;

  console.log("launch-audit");
  console.log(`  critical path coverage: ${coveragePercent}%`);
  console.log(`  performance budgets: LCP ${PERFORMANCE_BUDGETS.lcpMs}ms, FID ${PERFORMANCE_BUDGETS.fidMs}ms, CLS ${PERFORMANCE_BUDGETS.cls}`);
  console.log(`  launch docs present: ${docsPresent ? "yes" : "no"}`);

  if (missingFiles.length > 0) {
    console.log("  missing files:");
    for (const file of missingFiles) console.log(`    - ${file}`);
  }

  if (!ready) {
    console.log("launch-audit: not ready");
    process.exit(1);
  }

  console.log("launch-audit: ready");
}

main();
