import type { AssignmentStatus } from "@/lib/supabase/types";

/**
 * Allowed transitions for an assignment. We deliberately don't allow skipping
 * 'exporting' (the submission helper checklist) before 'submitted', so the
 * checklist always runs.
 */
const TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  todo:       ["drafting", "abandoned"],
  drafting:   ["checking", "todo", "abandoned"],
  checking:   ["exporting", "drafting", "abandoned"],
  exporting:  ["submitted", "checking", "abandoned"],
  submitted:  ["graded"],
  graded:     [],
  abandoned:  ["todo"],
};

export function canTransition(from: AssignmentStatus, to: AssignmentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatesFor(from: AssignmentStatus): AssignmentStatus[] {
  return TRANSITIONS[from] ?? [];
}

export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  todo: "To do",
  drafting: "Drafting",
  checking: "Checking",
  exporting: "Submitting",
  submitted: "Submitted",
  graded: "Graded",
  abandoned: "Set aside",
};

export const STATUS_HINT: Record<AssignmentStatus, string> = {
  todo: "Haven't started yet.",
  drafting: "You're working on it.",
  checking: "Reviewing your own draft.",
  exporting: "Running through the submit checklist.",
  submitted: "It's in. You're done.",
  graded: "Grade came back.",
  abandoned: "Set aside for now: you can pick it back up.",
};

/**
 * Helper for detail page: a one-line summary of a pivot that just happened.
 * Returns null if no pivot was recorded.
 */
export function pivotSummary(pivotNote: string | null): string | null {
  if (!pivotNote || pivotNote.trim().length === 0) return null;
  return `Paused earlier: ${pivotNote.trim()}`;
}
