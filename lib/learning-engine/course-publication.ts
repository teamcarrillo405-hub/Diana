import { z } from "zod";
import { frameworkSchema, courseContentHash, coursePrerequisites, type CourseFramework } from "./course-framework";
import { activitySchema, validateCourseActivities, type VersionedActivity } from "./course-activities";
import { responseRubric } from "./response-rubric";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const courseModuleSchema = z.object({
  version: z.literal("course-module-v1"), courseId: z.string().min(1).max(160),
  framework: frameworkSchema, activities: z.array(activitySchema).min(1).max(200),
}).strict();
export type CourseModule = z.infer<typeof courseModuleSchema>;
export const publicationSchema = z.object({
  course_id: z.string(), content_hash: digest,
  status: z.enum(["draft", "published", "withdrawn", "suspended"]),
}).strict();
export type CoursePublication = z.infer<typeof publicationSchema>;
export const REVIEW_CRITERIA = ["accuracy", "sourceRights", "instruction", "accessibility", "safety"] as const;
export const moduleReviewSchema = z.object({
  accuracy: z.boolean(), sourceRights: z.boolean(), instruction: z.boolean(),
  accessibility: z.boolean(), safety: z.boolean(),
}).strict();

/** Review the whole course snapshot, including dependencies and answer specifications. */
export async function buildCourseModule(framework: CourseFramework, activities: VersionedActivity[], courseId: string) {
  const course = framework.courses.find(item => item.id === courseId);
  const selected = activities.filter(item => item.courseId === courseId);
  if (!course || !selected.length) throw new Error("module_unavailable");
  const ids = new Set(course.units.flatMap(unit => unit.skillIds));
  for (const id of [...ids]) for (const prerequisite of coursePrerequisites(framework, id)) ids.add(prerequisite.id);
  const payload = courseModuleSchema.parse({
    version: "course-module-v1", courseId,
    framework: { ...framework, courses: [course], competencies: framework.competencies.filter(item => ids.has(item.id)) },
    activities: selected.map(({ versionId: _version, ...activity }) => activity),
  });
  return validateCourseModule(payload);
}

export async function validateCourseModule(raw: unknown) {
  const payload = courseModuleSchema.parse(raw);
  if (payload.framework.courses.length !== 1 || payload.framework.courses[0].id !== payload.courseId || payload.activities.some(item => item.courseId !== payload.courseId)) throw new Error("module_course_mismatch");
  // Private uploaded materials cannot be republished through the original-content catalog.
  if (payload.activities.some(item => item.sources.some(source => source.authorship !== "diana_authored"))) throw new Error("private_material_publication_denied");
  const activities = await validateCourseActivities(payload.framework, payload.activities);
  // The current checking implementation/limits are included through activity hashes.
  const contentHash = await courseContentHash({ payload, activityVersions: activities.map(item => item.versionId), responseRubrics: activities.map(responseRubric) });
  return { payload, activities, contentHash };
}

export async function catalogPublicationStates(framework: CourseFramework, activities: VersionedActivity[], raw: unknown[]) {
  const publications = raw.map(item => publicationSchema.parse(item));
  const states = new Map<string, CoursePublication["status"]>();
  for (const courseId of new Set(activities.map(item => item.courseId))) {
    const snapshot = await buildCourseModule(framework, activities, courseId);
    const matches = publications.filter(row => row.course_id === courseId && row.content_hash === snapshot.contentHash);
    if (matches.length > 1) throw new Error("duplicate_module_publication");
    states.set(courseId, matches[0]?.status ?? "draft");
  }
  return states;
}

export function courseIsAvailable(status: CoursePublication["status"]) { return status === "draft" || status === "published"; }
