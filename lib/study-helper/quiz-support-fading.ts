import type { PracticeScoreSummary } from "@/lib/study-helper/practice-scoring";

export const QUIZ_SUPPORT_STAGES = ["supported", "guided", "light", "independent"] as const;

export type QuizSupportStage = (typeof QUIZ_SUPPORT_STAGES)[number];

export type QuizSupportUsage = {
  hintViews: number;
  dianaTurns: number;
};

export type QuizSupportState = {
  stage: QuizSupportStage;
  completedAttempts: number;
  consecutiveReadyPasses: number;
  lastPercentage: number | null;
  lastUsage: QuizSupportUsage;
};

const EMPTY_USAGE: QuizSupportUsage = { hintViews: 0, dianaTurns: 0 };

export function normalizeQuizSupportUsage(value: unknown): QuizSupportUsage {
  const row = isRecord(value) ? value : {};
  return {
    hintViews: boundedCount(row.hintViews),
    dianaTurns: boundedCount(row.dianaTurns),
  };
}

export function normalizeQuizSupportState(value: unknown): QuizSupportState {
  const row = isRecord(value) ? value : {};
  const stage = QUIZ_SUPPORT_STAGES.includes(row.stage as QuizSupportStage)
    ? row.stage as QuizSupportStage
    : "supported";
  return {
    stage,
    completedAttempts: boundedCount(row.completedAttempts),
    consecutiveReadyPasses: boundedCount(row.consecutiveReadyPasses),
    lastPercentage: percentage(row.lastPercentage),
    lastUsage: normalizeQuizSupportUsage(row.lastUsage),
  };
}

export function advanceQuizSupport(
  currentValue: unknown,
  result: PracticeScoreSummary,
  usageValue: unknown,
): QuizSupportState {
  const current = normalizeQuizSupportState(currentValue);
  const usage = normalizeQuizSupportUsage(usageValue);
  const score = result.percentage;
  const completedAttempts = current.completedAttempts + 1;

  if (score === null || score < 60) {
    return {
      stage: "supported",
      completedAttempts,
      consecutiveReadyPasses: 0,
      lastPercentage: score,
      lastUsage: usage,
    };
  }
  if (score < 75) {
    return {
      stage: "guided",
      completedAttempts,
      consecutiveReadyPasses: 0,
      lastPercentage: score,
      lastUsage: usage,
    };
  }
  if (score < 85) {
    return {
      stage: "light",
      completedAttempts,
      consecutiveReadyPasses: 0,
      lastPercentage: score,
      lastUsage: usage,
    };
  }

  const completedWithLightHelp = usage.hintViews <= 1 && usage.dianaTurns <= 1;
  const consecutiveReadyPasses = completedWithLightHelp
    ? current.consecutiveReadyPasses + 1
    : 0;
  return {
    stage: current.stage === "independent" || consecutiveReadyPasses >= 2
      ? "independent"
      : "light",
    completedAttempts,
    consecutiveReadyPasses,
    lastPercentage: score,
    lastUsage: usage,
  };
}

export function quizSupportCopy(stage: QuizSupportStage): {
  label: string;
  description: string;
  startsQuiet: boolean;
} {
  if (stage === "independent") {
    return {
      label: "Independent pass",
      description: "Diana is staying quiet while you try. You can turn support on at any time.",
      startsQuiet: true,
    };
  }
  if (stage === "light") {
    return {
      label: "Light support",
      description: "Try your own reasoning first. A hint and Diana are still available.",
      startsQuiet: true,
    };
  }
  if (stage === "guided") {
    return {
      label: "Guided practice",
      description: "Hints and Diana are ready when one step needs another look.",
      startsQuiet: false,
    };
  }
  return {
    label: "Supported practice",
    description: "Use a hint or ask Diana after you make your first attempt.",
    startsQuiet: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(10_000, Math.floor(value)))
    : 0;
}

function percentage(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : null;
}

export function emptyQuizSupportUsage(): QuizSupportUsage {
  return { ...EMPTY_USAGE };
}
