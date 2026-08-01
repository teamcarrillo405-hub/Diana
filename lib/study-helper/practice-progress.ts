export interface PracticeProgress {
  currentQuestion: number;
  completed: boolean;
  completedAt: string | null;
  responses: Record<string, string>;
}

const MAX_QUESTIONS = 20;
const MAX_RESPONSE_LENGTH = 2_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function normalizePracticeProgress(value: unknown): PracticeProgress {
  const raw = isRecord(value) ? value : {};
  const rawResponses = isRecord(raw.responses) ? raw.responses : {};
  const responses = Object.fromEntries(
    Object.entries(rawResponses)
      .filter(([key, response]) => {
        const index = Number(key);
        return (
          Number.isInteger(index) &&
          index >= 0 &&
          index < MAX_QUESTIONS &&
          typeof response === "string"
        );
      })
      .map(([key, response]) => [key, (response as string).trim().slice(0, MAX_RESPONSE_LENGTH)])
      .filter(([, response]) => response.length > 0),
  );
  const currentQuestion =
    typeof raw.currentQuestion === "number" &&
    Number.isInteger(raw.currentQuestion) &&
    raw.currentQuestion >= 0
      ? Math.min(raw.currentQuestion, MAX_QUESTIONS - 1)
      : 0;
  const completedAt =
    typeof raw.completedAt === "string" && Number.isFinite(Date.parse(raw.completedAt))
      ? new Date(raw.completedAt).toISOString()
      : null;

  return {
    currentQuestion,
    completed: raw.completed === true,
    completedAt,
    responses,
  };
}

export function mergePracticeProgress(
  payload: unknown,
  progress: PracticeProgress,
): Record<string, unknown> {
  return {
    ...(isRecord(payload) ? payload : {}),
    practiceProgress: normalizePracticeProgress(progress),
  };
}
