export type WeightedAssessmentGrade = {
  ruleId: string;
  assessmentId: string;
  weight: number;
  percent: number | null;
};

export type WeightedCourseGrade = {
  ready: boolean;
  calculatedPercent: number | null;
  ruleCount: number;
  scoredCount: number;
  totalWeight: number;
};

export function calculateWeightedCourseGrade(
  grades: readonly WeightedAssessmentGrade[],
): WeightedCourseGrade {
  if (grades.some((grade) => !Number.isFinite(grade.weight) || grade.weight <= 0)) {
    throw new TypeError("Every approved grading rule needs a positive weight.");
  }
  if (grades.some((grade) => grade.percent !== null && (
    !Number.isFinite(grade.percent) || grade.percent < 0 || grade.percent > 100
  ))) {
    throw new TypeError("Confirmed assessment percentages must be between 0 and 100.");
  }
  const ruleCount = grades.length;
  const scored = grades.filter((grade) => grade.percent !== null);
  const totalWeight = grades.reduce((sum, grade) => sum + grade.weight, 0);
  const ready = ruleCount > 0 && scored.length === ruleCount && totalWeight > 0;
  return {
    ready,
    calculatedPercent: ready
      ? Math.round((
          grades.reduce((sum, grade) => sum + (grade.percent ?? 0) * grade.weight, 0)
          / totalWeight
        ) * 1000) / 1000
      : null,
    ruleCount,
    scoredCount: scored.length,
    totalWeight,
  };
}

export function requiresGradeOverrideReason(
  calculatedPercent: number,
  finalPercent: number,
): boolean {
  return Math.abs(calculatedPercent - finalPercent) > 0.0005;
}
