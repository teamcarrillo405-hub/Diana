export type BudgetAssignment = {
  id: string;
  title: string;
  classId: string;
  kind: string;
  estimated_minutes: number | null;
  reading_load: number | null;
  due_at: string | null;
  status: string;
};

export type BudgetItem = {
  assignmentId: string;
  title: string;
  classId: string;
  effectiveMinutes: number;
  dueAt: string | null;
};

export type BudgetProfile = {
  diagnoses: string[];
  extra_time_pct: number;
};

/** Per-kind fallback when estimated_minutes is null (Pitfall 5 mitigation) */
export const KIND_DEFAULT_MINUTES: Record<string, number> = {
  essay:        60,
  lab:          45,
  problem_set:  45,
  presentation: 30,
  test_prep:    45,
  reading:      30,
  other:        30,
};

export function computeNightBudget(
  assignments: BudgetAssignment[],
  profile: BudgetProfile,
): { totalMinutes: number; items: BudgetItem[] } {
  const hasDyslexia = profile.diagnoses.includes("dyslexia");

  const items: BudgetItem[] = assignments.map((a) => {
    const base = a.estimated_minutes ?? (KIND_DEFAULT_MINUTES[a.kind] ?? 30);
    const readingHeavy = (a.reading_load ?? 0) >= 3;
    const effectiveMinutes = hasDyslexia && readingHeavy
      ? Math.round(base * 1.6)
      : base;

    return {
      assignmentId: a.id,
      title:        a.title,
      classId:      a.classId,
      effectiveMinutes,
      dueAt:        a.due_at,
    };
  });

  const totalMinutes = items.reduce((sum, i) => sum + i.effectiveMinutes, 0);
  return { totalMinutes, items };
}
