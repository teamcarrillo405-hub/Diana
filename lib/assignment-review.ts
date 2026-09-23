export type AssignmentReviewTemplate = "writing" | "math" | "worksheet" | "research" | "history" | "lab" | "reading" | "language" | "coding" | "art" | "project" | "handoff";

export type AssignmentReviewField = {
  label: string;
  value: string;
};

export type AssignmentReviewResult = {
  title: string;
  strength: string;
  improvement: string;
  nextMove: string;
  question: string;
  evidenceAnchor: string;
};

export function parseAssignmentReviewResponse(content: string, template: AssignmentReviewTemplate): AssignmentReviewResult {
  const json = extractJsonObject(content);
  if (!json) return fallbackAssignmentReview(template);

  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const fallback = fallbackAssignmentReview(template);
    return {
      title: stringOr(parsed.title, fallback.title),
      strength: stringOr(parsed.strength, fallback.strength),
      improvement: stringOr(parsed.improvement, fallback.improvement),
      nextMove: stringOr(parsed.nextMove, fallback.nextMove),
      question: stringOr(parsed.question, fallback.question),
      evidenceAnchor: stringOr(parsed.evidenceAnchor, fallback.evidenceAnchor),
    };
  } catch {
    return fallbackAssignmentReview(template);
  }
}

function fallbackAssignmentReview(template: AssignmentReviewTemplate): AssignmentReviewResult {
  const nextMove = template === "math"
    ? "Show the operation you chose and why it fits the problem."
    : template === "lab"
      ? "Connect one observation to the claim you are making."
      : template === "reading"
        ? "Add one exact detail from the text, then explain why it matters."
        : template === "project"
          ? "Choose the smallest deliverable you can complete next."
          : template === "writing"
            ? "Add one sentence that makes your main claim more specific."
            : "Name the next thing you will hand in or complete.";

  return {
    title: "Diana review",
    strength: "You have started with your own work.",
    improvement: "The next useful improvement is to make the connection to the assignment clearer.",
    nextMove,
    question: "What evidence or detail best supports your next move?",
    evidenceAnchor: "Student work",
  };
}

function extractJsonObject(content: string): string | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  return start === -1 || end <= start ? null : content.slice(start, end + 1);
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, 900) : fallback;
}