export const COVERAGE_STAGES = [
  "introduces",
  "teaches",
  "practices",
  "assesses",
] as const;

export type CoverageStage = (typeof COVERAGE_STAGES)[number];

export type CourseObjectiveCoverageInput = {
  objectiveId: string;
  title: string;
  standardItemIds: readonly string[];
  lessonStages: readonly CoverageStage[];
  assessmentItemCount: number;
};

export type CourseObjectiveCoverage = {
  objectiveId: string;
  title: string;
  standardItemIds: string[];
  stages: CoverageStage[];
  assessmentItemCount: number;
  taught: boolean;
  practiced: boolean;
  assessed: boolean;
  gaps: Array<"standard" | "instruction" | "practice" | "assessment">;
};

export type CourseCoverageReport = {
  objectives: CourseObjectiveCoverage[];
  objectiveCount: number;
  alignedObjectiveCount: number;
  taughtObjectiveCount: number;
  practicedObjectiveCount: number;
  assessedObjectiveCount: number;
  fullyCoveredObjectiveCount: number;
  coveragePercent: number;
};

function uniqueStages(stages: readonly CoverageStage[]): CoverageStage[] {
  return COVERAGE_STAGES.filter((stage) => stages.includes(stage));
}

export function buildCourseCoverageReport(
  input: readonly CourseObjectiveCoverageInput[],
): CourseCoverageReport {
  const seen = new Set<string>();
  const objectives = input.map((objective) => {
    if (!objective.objectiveId || seen.has(objective.objectiveId)) {
      throw new TypeError("Course coverage objectives need unique IDs.");
    }
    seen.add(objective.objectiveId);
    const stages = uniqueStages(objective.lessonStages);
    const taught = stages.includes("introduces") || stages.includes("teaches");
    const practiced = stages.includes("practices");
    const assessed = stages.includes("assesses") || objective.assessmentItemCount > 0;
    const standardItemIds = [...new Set(objective.standardItemIds.filter(Boolean))];
    const gaps: CourseObjectiveCoverage["gaps"] = [];
    if (standardItemIds.length === 0) gaps.push("standard");
    if (!taught) gaps.push("instruction");
    if (!practiced) gaps.push("practice");
    if (!assessed) gaps.push("assessment");
    return {
      objectiveId: objective.objectiveId,
      title: objective.title,
      standardItemIds,
      stages,
      assessmentItemCount: Math.max(0, Math.floor(objective.assessmentItemCount)),
      taught,
      practiced,
      assessed,
      gaps,
    };
  });
  const objectiveCount = objectives.length;
  const fullyCoveredObjectiveCount = objectives.filter((objective) => objective.gaps.length === 0).length;
  return {
    objectives,
    objectiveCount,
    alignedObjectiveCount: objectives.filter((objective) => objective.standardItemIds.length > 0).length,
    taughtObjectiveCount: objectives.filter((objective) => objective.taught).length,
    practicedObjectiveCount: objectives.filter((objective) => objective.practiced).length,
    assessedObjectiveCount: objectives.filter((objective) => objective.assessed).length,
    fullyCoveredObjectiveCount,
    coveragePercent: objectiveCount === 0
      ? 0
      : Math.round((fullyCoveredObjectiveCount / objectiveCount) * 10_000) / 100,
  };
}

export function canPublishCoveredCourse(report: CourseCoverageReport): boolean {
  return report.objectiveCount > 0 && report.fullyCoveredObjectiveCount === report.objectiveCount;
}
