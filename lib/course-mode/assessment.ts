export const QTI_INTERACTION_TYPES = [
  "choice",
  "multiple_choice",
  "text_entry",
  "numeric_entry",
  "extended_text",
] as const;

export type QtiInteractionType = (typeof QTI_INTERACTION_TYPES)[number];

export type QtiChoice = {
  identifier: string;
  label: string;
};

export type QtiAssessmentItem = {
  identifier: string;
  title: string;
  interactionType: QtiInteractionType;
  prompt: string;
  choices: QtiChoice[];
  correctResponse: string[];
  caseSensitive: boolean;
  numericTolerance: number | null;
  points: number;
  objectiveIds: string[];
};

export type AssessmentScore = {
  score: number | null;
  pointsPossible: number;
  requiresTeacherScore: boolean;
  rationale: string;
};

function normalizedText(value: unknown, caseSensitive: boolean): string {
  const text = typeof value === "string" || typeof value === "number"
    ? String(value).trim().replace(/\s+/gu, " ")
    : "";
  return caseSensitive ? text : text.toLocaleLowerCase();
}

function responseList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => typeof item === "string" || typeof item === "number" ? [String(item)] : [])
    : typeof value === "string" || typeof value === "number"
      ? [String(value)]
      : [];
}

export function validateQtiAssessmentItem(item: QtiAssessmentItem): string[] {
  const issues = [
    !/^[A-Za-z][A-Za-z0-9_-]{0,79}$/u.test(item.identifier) ? "Item identifier must start with a letter and use letters, numbers, underscores, or hyphens." : "",
    !item.title.trim() ? "Add an item title." : "",
    !item.prompt.trim() ? "Add the student prompt." : "",
    !(item.points > 0) ? "Item points must be positive." : "",
    item.numericTolerance !== null && item.numericTolerance < 0 ? "Numeric tolerance cannot be negative." : "",
  ].filter(Boolean);
  if (item.interactionType === "choice" || item.interactionType === "multiple_choice") {
    if (item.choices.length < 2) issues.push("Choice items need at least two choices.");
    const identifiers = new Set(item.choices.map((choice) => choice.identifier));
    if (identifiers.size !== item.choices.length || item.choices.some((choice) => !choice.identifier || !choice.label.trim())) {
      issues.push("Every choice needs a unique identifier and label.");
    }
    if (item.correctResponse.length === 0 || item.correctResponse.some((answer) => !identifiers.has(answer))) {
      issues.push("Correct responses must reference available choices.");
    }
  }
  if (item.interactionType !== "extended_text" && item.correctResponse.length === 0) {
    issues.push("Deterministic items need a correct response.");
  }
  if (item.interactionType === "numeric_entry" && item.correctResponse.some((answer) => !Number.isFinite(Number(answer)))) {
    issues.push("Numeric items need numeric correct responses.");
  }
  return [...new Set(issues)];
}

export function scoreQtiResponse(item: QtiAssessmentItem, response: unknown): AssessmentScore {
  const validation = validateQtiAssessmentItem(item);
  if (validation.length > 0) {
    return {
      score: null,
      pointsPossible: item.points,
      requiresTeacherScore: true,
      rationale: "Item configuration requires teacher review.",
    };
  }
  if (item.interactionType === "extended_text") {
    return {
      score: null,
      pointsPossible: item.points,
      requiresTeacherScore: true,
      rationale: "Extended response requires rubric-based teacher scoring.",
    };
  }
  if (item.interactionType === "numeric_entry") {
    const received = Number(responseList(response)[0]);
    const expected = Number(item.correctResponse[0]);
    const tolerance = item.numericTolerance ?? 0;
    const correct = Number.isFinite(received) && Math.abs(received - expected) <= tolerance;
    return {
      score: correct ? item.points : 0,
      pointsPossible: item.points,
      requiresTeacherScore: false,
      rationale: correct ? "Numeric response is within the approved tolerance." : "Numeric response is outside the approved tolerance.",
    };
  }
  const received = responseList(response).map((value) => normalizedText(value, item.caseSensitive));
  const expected = item.correctResponse.map((value) => normalizedText(value, item.caseSensitive));
  const correct = item.interactionType === "multiple_choice"
    ? received.length === expected.length && [...received].sort().every((value, index) => value === [...expected].sort()[index])
    : received.length === 1 && expected.includes(received[0]);
  return {
    score: correct ? item.points : 0,
    pointsPossible: item.points,
    requiresTeacherScore: false,
    rationale: correct ? "Response matches the approved scoring rule." : "Response does not match the approved scoring rule.",
  };
}

export function assessmentPercent(scores: readonly AssessmentScore[]): number | null {
  if (scores.length === 0 || scores.some((score) => score.score === null)) return null;
  const possible = scores.reduce((sum, score) => sum + score.pointsPossible, 0);
  if (possible <= 0) return null;
  return Math.round((scores.reduce((sum, score) => sum + (score.score ?? 0), 0) / possible) * 10_000) / 100;
}

export function qtiItemToStorage(item: QtiAssessmentItem) {
  return {
    identifier: item.identifier,
    title: item.title.trim(),
    interaction_type: item.interactionType,
    prompt: item.prompt.trim(),
    body: { choices: item.choices },
    response_declaration: {
      correctResponse: item.correctResponse,
      caseSensitive: item.caseSensitive,
      numericTolerance: item.numericTolerance,
    },
    points_possible: item.points,
  };
}
