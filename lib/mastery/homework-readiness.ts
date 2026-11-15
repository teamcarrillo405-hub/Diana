import type { AssignmentWorkProfile } from "@/lib/assignment-profile";
import { deriveConceptSeeds, normalizeConceptNames } from "@/lib/mastery/concepts";

export type HomeworkMasteryConceptRow = {
  id?: string | null;
  name: string;
  mastery_level: number | string | null;
  self_confidence?: number | string | null;
};

export type HomeworkMasteryMatch = {
  id: string | null;
  name: string;
  masteryLevel: number;
  selfConfidence: number | null;
};

export type HomeworkMasteryReadiness = {
  status: "unmapped" | "mapped";
  candidateConcepts: string[];
  matchedConcepts: HomeworkMasteryMatch[];
  bridgeConcepts: HomeworkMasteryMatch[];
  steadyConcepts: HomeworkMasteryMatch[];
  requiresBridge: boolean;
};

const BRIDGE_THRESHOLD = 2;
const STEADY_THRESHOLD = 3;

export function buildHomeworkMasteryReadiness(input: {
  profile: AssignmentWorkProfile;
  className?: string | null;
  assignmentParts: Array<string | null | undefined>;
  concepts: readonly HomeworkMasteryConceptRow[];
}): HomeworkMasteryReadiness {
  const candidateConcepts = deriveConceptSeeds(
    input.assignmentParts.filter((part): part is string => typeof part === "string" && part.trim().length > 0),
    5,
    { className: input.className },
  );
  const normalizedCandidates = normalizeConceptNames(candidateConcepts);
  const matchedConcepts = input.concepts
    .map(normalizeMasteryRow)
    .filter((concept): concept is HomeworkMasteryMatch => concept !== null)
    .filter((concept) => normalizedCandidates.some((candidate) => conceptsOverlap(candidate, concept.name)))
    .sort((left, right) => left.masteryLevel - right.masteryLevel || left.name.localeCompare(right.name));

  return {
    status: matchedConcepts.length > 0 ? "mapped" : "unmapped",
    candidateConcepts: normalizedCandidates,
    matchedConcepts,
    bridgeConcepts: matchedConcepts.filter((concept) => concept.masteryLevel < BRIDGE_THRESHOLD).slice(0, 3),
    steadyConcepts: matchedConcepts.filter((concept) => concept.masteryLevel >= STEADY_THRESHOLD).slice(0, 3),
    requiresBridge: matchedConcepts.some((concept) => concept.masteryLevel < BRIDGE_THRESHOLD),
  };
}

export function formatHomeworkMasteryReadiness(readiness: HomeworkMasteryReadiness): string {
  if (readiness.status === "unmapped") {
    return [
      "Mastery evidence: this assignment is not yet linked to verified concept evidence.",
      readiness.candidateConcepts.length > 0
        ? `Possible concepts for student confirmation: ${readiness.candidateConcepts.slice(0, 5).join(", ")}.`
        : "Ask one short prerequisite check only if it changes the next explanation.",
      "Do not claim a prerequisite gap until the student's work or response demonstrates it.",
    ].join("\n");
  }

  return [
    `Mastery evidence: ${readiness.matchedConcepts.map((concept) => `${concept.name} ${concept.masteryLevel.toFixed(2)}/4`).join("; ")}.`,
    readiness.bridgeConcepts.length > 0
      ? `Verified bridge candidates: ${readiness.bridgeConcepts.map((concept) => concept.name).join(", ")}. Teach the smallest useful bridge, check it, then return to the assigned work.`
      : "No verified low-mastery concept is blocking this assignment. Preserve the assignment's rigor and watch the student's current work for a specific gap.",
    readiness.steadyConcepts.length > 0
      ? `Steady concepts Diana may connect to: ${readiness.steadyConcepts.map((concept) => concept.name).join(", ")}.`
      : "",
  ].filter(Boolean).join("\n");
}

function normalizeMasteryRow(row: HomeworkMasteryConceptRow): HomeworkMasteryMatch | null {
  const name = normalizeConceptNames([row.name])[0];
  if (!name) return null;
  const masteryLevel = numericLevel(row.mastery_level);
  const confidence = row.self_confidence === null || row.self_confidence === undefined
    ? null
    : numericLevel(row.self_confidence);
  return {
    id: typeof row.id === "string" ? row.id : null,
    name,
    masteryLevel,
    selfConfidence: confidence,
  };
}

function numericLevel(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(4, parsed));
}

function conceptsOverlap(left: string, right: string): boolean {
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const leftTokens = new Set(left.split(" ").filter((token) => token.length >= 4));
  const rightTokens = new Set(right.split(" ").filter((token) => token.length >= 4));
  if (leftTokens.size === 0 || rightTokens.size === 0) return false;
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return shared >= Math.min(2, leftTokens.size, rightTokens.size);
}
