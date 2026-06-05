import type { StudentStateAiPolicy } from "@/lib/student-state/model";
import type { StudyArtifact } from "./artifacts";

type AuthorshipArtifact = Pick<StudyArtifact, "guide" | "quiz" | "cards">;

export type AuthorshipReceipt = {
  sourceAnchors: string[];
  dianaActions: string[];
  studentActions: string[];
  aiContribution: "none" | "organize" | "hint" | "practice" | "draft_suggestion";
  finalWorkProtected: boolean;
  refusalRedirectLogged: boolean;
  sensitiveDataExcluded: boolean;
  teacherSafeSummary: string;
  studentActionRequired: string;
  shareSummary: string;
};

export function buildAuthorshipReceipt(input: {
  artifact?: AuthorshipArtifact | null;
  aiPolicy: StudentStateAiPolicy;
  aiContribution: AuthorshipReceipt["aiContribution"];
  studentActions?: string[];
  dianaActions?: string[];
}): AuthorshipReceipt {
  const sourceAnchors = artifactAnchors(input.artifact);
  const dianaActions = input.dianaActions ?? defaultDianaActions(input.artifact);
  const studentActions = input.studentActions ?? [
    "Review source anchors.",
    "Edit practice wording before saving.",
    "Write final assignment work in their own words.",
  ];

  return {
    sourceAnchors,
    dianaActions,
    studentActions,
    aiContribution: input.aiPolicy === "red" ? "none" : input.aiContribution,
    finalWorkProtected: true,
    refusalRedirectLogged: dianaActions.some((action) => /redirect|answer request/i.test(action)),
    sensitiveDataExcluded: true,
    teacherSafeSummary: teacherSafeSummaryFor(sourceAnchors, dianaActions, studentActions),
    studentActionRequired: studentActions[0] ?? "Keep final assignment work student-made.",
    shareSummary: [
      sourceAnchors.length > 0 ? `${sourceAnchors.length} source anchors` : "Source requested before more help",
      `${dianaActions.length} Diana support actions`,
      `${studentActions.length} student-owned actions`,
      "readiness private",
    ].join(" | "),
  };
}

export function artifactAnchors(artifact?: AuthorshipArtifact | null): string[] {
  if (!artifact) return [];
  const anchors = new Set<string>();
  for (const item of artifact.quiz ?? []) if (item.sourceAnchor) anchors.add(item.sourceAnchor);
  for (const card of artifact.cards ?? []) if (card.sourceAnchor) anchors.add(card.sourceAnchor);
  return [...anchors].slice(0, 12);
}

function defaultDianaActions(artifact?: AuthorshipArtifact | null): string[] {
  if (!artifact) return ["Organized the next study move."];
  const actions = ["Organized class material into study support."];
  if (artifact.guide.length > 0) actions.push("Created a source-anchored guide.");
  if (artifact.quiz.length > 0) actions.push("Created recall questions with hints.");
  if (artifact.cards.length > 0) actions.push("Drafted editable cards.");
  return actions;
}

function teacherSafeSummaryFor(
  sourceAnchors: string[],
  dianaActions: string[],
  studentActions: string[],
): string {
  const sourcePart = sourceAnchors.length > 0
    ? `${sourceAnchors.length} source-backed study items`
    : "source-backed support requested";
  return `${sourcePart}; ${dianaActions.length} Diana support moves; ${studentActions.length} student-owned moves; readiness details withheld.`;
}
