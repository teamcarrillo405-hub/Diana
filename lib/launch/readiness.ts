export type CriticalPath = {
  source: string;
  test: string;
};

export type PerformanceBudgets = {
  lcpMs: number;
  fidMs: number;
  cls: number;
};

export const PERFORMANCE_BUDGETS: PerformanceBudgets = {
  lcpMs: 2500,
  fidMs: 100,
  cls: 0.1,
};

export const REQUIRED_LAUNCH_DOCS = [
  "docs/launch/LAUNCH_READINESS.md",
  "docs/launch/SECURITY_AND_RETENTION.md",
  "docs/launch/MOBILE_AND_BETA_MATRIX.md",
] as const;

export const CRITICAL_PATHS: CriticalPath[] = [
  { source: "lib/scoring/next-five-minutes.ts", test: "lib/scoring/next-five-minutes.test.ts" },
  { source: "lib/fsrs/fsrs.ts", test: "lib/fsrs/fsrs.test.ts" },
  { source: "lib/timer/timer.ts", test: "lib/timer/timer.test.ts" },
  { source: "lib/ai/safety.ts", test: "lib/ai/safety.test.ts" },
  { source: "lib/privacy/export.ts", test: "lib/privacy/export.test.ts" },
  { source: "lib/social/collaboration.ts", test: "lib/social/collaboration.test.ts" },
  { source: "lib/platform/analytics.ts", test: "lib/platform/analytics.test.ts" },
  { source: "lib/offline/store.ts", test: "lib/offline/store.test.ts" },
  { source: "lib/mastery/concepts.ts", test: "lib/mastery/concepts.test.ts" },
  { source: "lib/lms/canvas.ts", test: "lib/lms/canvas.test.ts" },
  { source: "lib/student-state/model.ts", test: "lib/student-state/model.test.ts" },
  { source: "lib/teen-testing/protocol.ts", test: "lib/teen-testing/protocol.test.ts" },
  { source: "lib/competitive/capability-matrix.ts", test: "lib/competitive/capability-matrix.test.ts" },
  { source: "lib/study-helper/guided-learning.ts", test: "lib/study-helper/guided-learning.test.ts" },
  { source: "lib/study-helper/visual-breakdown.ts", test: "lib/study-helper/visual-breakdown.test.ts" },
  { source: "lib/benchmark/competitive.ts", test: "lib/benchmark/competitive.test.ts" },
];

export function criticalPathCoveragePercent(
  paths: CriticalPath[],
  exists: (path: string) => boolean,
): number {
  if (paths.length === 0) return 100;
  const covered = paths.filter((path) => exists(path.source) && exists(path.test)).length;
  return Math.round((covered / paths.length) * 100);
}

export function performanceBudgetsPass(budgets: PerformanceBudgets): boolean {
  return budgets.lcpMs <= 2500 && budgets.fidMs <= 100 && budgets.cls <= 0.1;
}

export function launchDocsPresent(
  docs: readonly string[],
  exists: (path: string) => boolean,
): boolean {
  return docs.every((doc) => exists(doc));
}

export function launchReadinessPasses({
  coveragePercent,
  docsPresent,
  performancePasses,
}: {
  coveragePercent: number;
  docsPresent: boolean;
  performancePasses: boolean;
}): boolean {
  return coveragePercent >= 80 && docsPresent && performancePasses;
}
