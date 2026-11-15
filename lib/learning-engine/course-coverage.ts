import type { CourseFramework, CourseLevel, LearningDomain } from "./course-framework";
import type { VersionedActivity } from "./course-activities";
import { AUTHORED_CURRICULUM_RELEASE, CURRICULUM_SCOPE_LIMITS } from "./course-expansion";

const levels: CourseLevel[] = ["middle_school", "high_school", "college_intro", "college_advanced"];
const subjects = ["math", "reading", "english", "science", "history", "computing"] as const satisfies readonly LearningDomain[];

/** Content inventory, not standards alignment, publication approval, mastery or course completion. */
export function courseCoverageReport(framework: CourseFramework, activities: VersionedActivity[]) {
  return {
    release: AUTHORED_CURRICULUM_RELEASE,
    completeCurriculum: false as const,
    educatorApproved: false as const,
    standardsAligned: false as const,
    qualification: "Selected authored practice modules. Level labels describe task context; they do not certify full grade or degree coverage, learner readiness, or learning gains.",
    matrix: subjects.flatMap(subject => levels.map(level => {
      const selected = activities.filter(activity => activity.subject === subject && activity.level === level);
      const ids = new Set(selected.map(activity => activity.courseId));
      return { subject, level, status: selected.length ? "partial_authored" as const : "unavailable" as const,
        activities: selected.length, competencies: new Set(selected.map(activity => activity.skillId)).size,
        courses: framework.courses.filter(course => ids.has(course.id)).map(course => ({ id: course.id, title: course.title })),
        methods: [...new Set(selected.map(activity => activity.method.kind))],
        pendingEducatorReview: selected.filter(activity => activity.review === "pending").length,
        limitations: subject === "computing" ? ["Selected authored traces and systems scenarios only; not a full computing curriculum.", "Rubric guidance does not execute code, prove correctness or establish security.", "Grade-band fit and sequencing await educator review."] : [...CURRICULUM_SCOPE_LIMITS[subject]],
      };
    })),
  };
}
