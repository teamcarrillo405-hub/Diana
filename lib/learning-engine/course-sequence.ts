import type { VersionedActivity } from "./course-activities";
import { coursePrerequisites, type CourseFramework } from "./course-framework";
import { transferOrigins, transferOriginActivityIds } from "./course-transfer";
import { coursePathSchema, type CoursePath } from "./course-path-schema";

/** Optional navigation only. No mastery inference, locking or forced level promotion.
 * Call with currently AVAILABLE activities, never with withdrawn saved activities.
 * Prerequisites without a matching task remain explicit; no unrelated task substitutes.
 */
export function buildCoursePaths(framework: CourseFramework, available: VersionedActivity[]): CoursePath[] {
  const ids = new Set<string>();
  for (const item of available) {
    if (ids.has(item.id)) throw new Error("duplicate_path_activity");
    ids.add(item.id);
    const course = framework.courses.find(candidate => candidate.id === item.courseId);
    if (!course || !course.units.some(unit => unit.skillIds.includes(item.skillId))) throw new Error("path_course_mismatch");
  }
  const transferIds = new Map(Object.entries(transferOriginActivityIds).filter(([id, origin]) => ids.has(id) && ids.has(origin)).map(([id, origin]) => [origin, id]));
  return available.map(activity => {
    const origin = transferOriginActivityIds[activity.id];
    const siblings = available.filter(item => item.courseId === activity.courseId);
    const position = siblings.findIndex(item => item.id === activity.id);
    const prerequisites = coursePrerequisites(framework, activity.skillId);
    return coursePathSchema.parse({ activityId: activity.id, position: position + 1, total: siblings.length,
      nextId: siblings[position + 1]?.id ?? null,
      transferId: transferIds.get(activity.id) ?? null,
      returnId: origin && ids.has(origin) ? origin : null,
      foundations: prerequisites.map(skill => ({ skillId: skill.id, title: skill.title,
        activityId: available.find(item => item.skillId === skill.id && item.level === activity.level && !transferOrigins[item.id])?.id
          ?? available.find(item => item.skillId === skill.id && !transferOrigins[item.id])?.id ?? null })),
    });
  });
}
