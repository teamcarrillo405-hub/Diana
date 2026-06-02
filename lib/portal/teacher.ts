export type AiMode = "green" | "yellow" | "red";

export type PortalAssignment = {
  class_id: string | null;
  status: string;
};

export type ClassAnalytics = {
  classId: string;
  total: number;
  completed: number;
  completionRate: number;
};

const COMPLETED_STATUSES = new Set(["done", "submitted", "graded"]);

export function effectiveAiMode(classMode: AiMode, override?: AiMode | null): AiMode {
  return override ?? classMode;
}

export function classCompletionAnalytics(
  classIds: string[],
  assignments: PortalAssignment[],
): ClassAnalytics[] {
  return classIds.map((classId) => {
    const rows = assignments.filter((assignment) => assignment.class_id === classId);
    const completed = rows.filter((assignment) => COMPLETED_STATUSES.has(assignment.status)).length;
    const total = rows.length;
    return {
      classId,
      total,
      completed,
      completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  });
}

export function parentSafeProgressNotes<T extends { visible_to_parent: boolean }>(notes: T[]): T[] {
  return notes.filter((note) => note.visible_to_parent);
}
