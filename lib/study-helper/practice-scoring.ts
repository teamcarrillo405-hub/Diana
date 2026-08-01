import type { StudyArtifactQuizItem } from "./artifacts";

export type PracticeComparisonKind = "choice" | "text" | "numeric";

export type PracticeResultCategory =
  | "matched"
  | "check_again"
  | "review_together"
  | "not_answered";

export type PracticeQuestionResult = {
  questionIndex: number;
  question: string;
  response: string;
  expectedAnswer: string;
  comparisonKind: PracticeComparisonKind;
  category: PracticeResultCategory;
  scored: boolean;
  pointsEarned: 0 | 1 | null;
  explanation: string;
  sourceAnchor: string;
};

export type PracticeScoreSummary = {
  results: PracticeQuestionResult[];
  questionCount: number;
  answeredCount: number;
  scoredCount: number;
  unscoredCount: number;
  matchedCount: number;
  checkAgainCount: number;
  reviewTogetherCount: number;
  notAnsweredCount: number;
  pointsEarned: number;
  pointsPossible: number;
  percentage: number | null;
};

const OPEN_RESPONSE_PATTERN =
  /\b(analy[sz]e|compare|describe|discuss|evaluate|explain|how|justify|reflect|show your work|why)\b/iu;
const CHOICE_LABEL_PATTERN = /^\s*(?:choice\s*)?([a-z]|\d{1,2})[\s.):_-]*$/iu;
const NUMERIC_PATTERN =
  /^\s*([$£€])?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+|\.\d+)(?:\.\d+)?(?:e[+-]?\d+)?|[+-]?\d+\s*\/\s*[+-]?\d+)\s*(%)?\s*$/iu;

function cleanResponse(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizePracticeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/[.,!?;:]+$/gu, "");
}

function parseNumericAnswer(value: string): number | null {
  const match = NUMERIC_PATTERN.exec(value.normalize("NFKC"));
  if (!match) return null;

  const rawNumber = match[2].replace(/,/gu, "").replace(/\s+/gu, "");
  let parsed: number;

  if (rawNumber.includes("/")) {
    const [numeratorText, denominatorText] = rawNumber.split("/");
    const numerator = Number(numeratorText);
    const denominator = Number(denominatorText);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }
    parsed = numerator / denominator;
  } else {
    parsed = Number(rawNumber);
  }

  if (!Number.isFinite(parsed)) return null;
  return match[3] === "%" ? parsed / 100 : parsed;
}

function numbersMatch(left: number, right: number): boolean {
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= Number.EPSILON * scale * 16;
}

function choiceIndex(value: string, choices: string[]): number | null {
  const normalized = normalizePracticeText(value);
  const exactIndex = choices.findIndex(
    (choice) => normalizePracticeText(choice) === normalized,
  );
  if (exactIndex >= 0) return exactIndex;

  const labelMatch = CHOICE_LABEL_PATTERN.exec(value);
  if (!labelMatch) return null;

  const label = labelMatch[1];
  const numericLabel = Number(label);
  if (Number.isInteger(numericLabel) && numericLabel >= 1 && numericLabel <= choices.length) {
    return numericLabel - 1;
  }

  const alphabeticIndex = label.toLocaleLowerCase("en-US").charCodeAt(0) - 97;
  return alphabeticIndex >= 0 && alphabeticIndex < choices.length
    ? alphabeticIndex
    : null;
}

function isOpenResponse(item: StudyArtifactQuizItem): boolean {
  return (
    item.choices.length === 0 &&
    parseNumericAnswer(item.answer) === null &&
    (OPEN_RESPONSE_PATTERN.test(item.question) ||
      normalizePracticeText(item.answer).length > 80)
  );
}

function comparisonKindFor(
  item: StudyArtifactQuizItem,
  response: string,
): PracticeComparisonKind {
  if (item.choices.length > 0) return "choice";
  if (parseNumericAnswer(item.answer) !== null && parseNumericAnswer(response) !== null) {
    return "numeric";
  }
  return "text";
}

function explanationFor(
  category: PracticeResultCategory,
  item: StudyArtifactQuizItem,
): string {
  if (category === "matched") {
    return item.hint
      ? `This matches the saved answer. Reminder: ${item.hint}`
      : "This matches the saved answer.";
  }
  if (category === "check_again") {
    return item.hint
      ? `Take another look using this reminder: ${item.hint}`
      : `Take another look at ${item.sourceAnchor}.`;
  }
  if (category === "review_together") {
    return item.hint
      ? `This response needs a meaning-aware review. Start with: ${item.hint}`
      : `This response needs a meaning-aware review using ${item.sourceAnchor}.`;
  }
  return "Add a response when you are ready.";
}

export function scorePracticeQuestion(
  item: StudyArtifactQuizItem,
  responseValue: unknown,
  questionIndex = 0,
): PracticeQuestionResult {
  const response = cleanResponse(responseValue);
  const comparisonKind = comparisonKindFor(item, response);
  let category: PracticeResultCategory;
  let scored = true;
  let pointsEarned: 0 | 1 | null;

  if (!response) {
    category = "not_answered";
    scored = false;
    pointsEarned = null;
  } else if (isOpenResponse(item)) {
    category = "review_together";
    scored = false;
    pointsEarned = null;
  } else if (comparisonKind === "choice") {
    const responseIndex = choiceIndex(response, item.choices);
    const answerIndex = choiceIndex(item.answer, item.choices);

    if (responseIndex === null || answerIndex === null) {
      category = "review_together";
      scored = false;
      pointsEarned = null;
    } else {
      const matched = responseIndex === answerIndex;
      category = matched ? "matched" : "check_again";
      pointsEarned = matched ? 1 : 0;
    }
  } else if (comparisonKind === "numeric") {
    const responseNumber = parseNumericAnswer(response);
    const answerNumber = parseNumericAnswer(item.answer);
    const matched =
      responseNumber !== null &&
      answerNumber !== null &&
      numbersMatch(responseNumber, answerNumber);
    category = matched ? "matched" : "check_again";
    pointsEarned = matched ? 1 : 0;
  } else {
    const matched =
      normalizePracticeText(response) === normalizePracticeText(item.answer);
    category = matched ? "matched" : "check_again";
    pointsEarned = matched ? 1 : 0;
  }

  return {
    questionIndex,
    question: item.question,
    response,
    expectedAnswer: item.answer,
    comparisonKind,
    category,
    scored,
    pointsEarned,
    explanation: explanationFor(category, item),
    sourceAnchor: item.sourceAnchor,
  };
}

export function scorePracticeTest(
  quiz: StudyArtifactQuizItem[],
  responses: Record<string, string>,
): PracticeScoreSummary {
  const results = quiz.map((item, index) =>
    scorePracticeQuestion(item, responses[String(index)], index),
  );
  const scoredResults = results.filter((result) => result.scored);
  const pointsEarned = scoredResults.reduce(
    (total, result) => total + (result.pointsEarned ?? 0),
    0,
  );
  const pointsPossible = scoredResults.length;

  return {
    results,
    questionCount: results.length,
    answeredCount: results.filter((result) => result.category !== "not_answered").length,
    scoredCount: pointsPossible,
    unscoredCount: results.length - pointsPossible,
    matchedCount: results.filter((result) => result.category === "matched").length,
    checkAgainCount: results.filter((result) => result.category === "check_again").length,
    reviewTogetherCount: results.filter(
      (result) => result.category === "review_together",
    ).length,
    notAnsweredCount: results.filter(
      (result) => result.category === "not_answered",
    ).length,
    pointsEarned,
    pointsPossible,
    percentage:
      pointsPossible > 0
        ? Math.round((pointsEarned / pointsPossible) * 100)
        : null,
  };
}
