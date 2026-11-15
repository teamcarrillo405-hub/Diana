import { buildAssignmentArtifact } from "@/lib/assignment-artifact";
import type { AssignmentWorkspaceMode } from "@/lib/assignment-workspace";

export type UnifiedLegacyWork = {
  studentWork: Record<string, string>;
  hasStudentWork: boolean;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function legacySavedWorkForUnifiedUnit(
  mode: AssignmentWorkspaceMode,
  savedWork: Record<string, unknown>,
): UnifiedLegacyWork {
  const directWork = text(savedWork.work) || text(savedWork.answer);
  const artifact = buildAssignmentArtifact({ mode, savedWork });
  const structuredWork = artifact.sections
    .map((section) => `${section.label}\n${section.content}`)
    .join("\n\n")
    .trim();
  const work = directWork || structuredWork;
  const workInk = text(savedWork.workInk);
  const answer = text(savedWork.answer);
  const studentWork = Object.fromEntries([
    work ? ["work", work] : null,
    workInk ? ["workInk", workInk] : null,
    answer ? ["answer", answer] : null,
  ].filter((entry): entry is [string, string] => entry !== null));

  return {
    studentWork,
    hasStudentWork: Boolean(work || workInk),
  };
}
