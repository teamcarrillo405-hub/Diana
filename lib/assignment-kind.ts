import type { AssignmentKind, AssignmentStatus } from "@/lib/supabase/types";

export const ASSIGNMENT_KINDS = [
  "essay",
  "lab",
  "problem_set",
  "presentation",
  "test_prep",
  "reading",
  "other",
] as const satisfies readonly AssignmentKind[];

export const ASSIGNMENT_STATUSES = [
  "todo",
  "drafting",
  "checking",
  "exporting",
  "submitted",
  "graded",
  "abandoned",
] as const satisfies readonly AssignmentStatus[];

export function normalizeAssignmentKind(value: unknown): AssignmentKind {
  return typeof value === "string" && ASSIGNMENT_KINDS.some((kind) => kind === value)
    ? value as AssignmentKind
    : "other";
}

export function normalizeAssignmentStatus(value: unknown): AssignmentStatus {
  return typeof value === "string" && ASSIGNMENT_STATUSES.some((status) => status === value)
    ? value as AssignmentStatus
    : "todo";
}
