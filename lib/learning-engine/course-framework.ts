import { z } from "zod";
import { loadCurriculumGraph, type CurriculumGraph } from "./curriculum-graph";
import { domainSchema, courseLevelSchema } from "./course-domains";
export { domainSchema, courseLevelSchema, LEVEL_LABELS, type CourseLevel, type LearningDomain } from "./course-domains";
export const COURSE_FRAMEWORK_VERSION = "diana-course-framework-v2";
const id = z.string().regex(/^[a-z][a-z0-9_.:-]{1,159}$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const competencySchema = z.object({
    id, subject: domainSchema, title: z.string().min(2).max(120), objective: z.string().min(3).max(1000),
    revision: z.number().int().positive(), prerequisites: z.array(id).max(30),
    // Context for instruction, never an inferred ability or mastery score.
    levels: z.array(courseLevelSchema).min(1).max(4),
    legacy: z.object({ version: z.string(), contentDigest: digest }).strict().optional(),
}).strict();
export type Competency = z.infer<typeof competencySchema>;
export const courseMapSchema = z.object({
    id, revision: z.number().int().positive(), title: z.string().min(2).max(160), subject: domainSchema, level: courseLevelSchema,
    units: z.array(z.object({ id, title: z.string().min(2).max(160), skillIds: z.array(id).min(1).max(40) }).strict()).min(1).max(200),
    // Source locations are mappings, not the identity of a transferable skill.
    sources: z.array(z.object({ resourceId: id, edition: z.string().min(1).max(120), unitId: id, locator: z.string().min(1).max(200) }).strict()).max(300),
    alignments: z.array(z.object({ frameworkId: id, outcomeId: z.string().min(1).max(160), skillId: id, status: z.literal("proposed") }).strict()).max(300),
}).strict();
export type CourseMap = z.infer<typeof courseMapSchema>;
export const frameworkSchema = z.object({ schemaVersion: z.literal(COURSE_FRAMEWORK_VERSION), competencies: z.array(competencySchema).min(1).max(10000), courses: z.array(courseMapSchema).max(1000) }).strict().superRefine((value, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message }), skills = new Map<string, Competency>();
    for (const skill of value.competencies) {
        if (skills.has(skill.id))
            fail("Duplicate competency: " + skill.id);
        skills.set(skill.id, skill);
        if (!skill.id.startsWith(skill.subject + "."))
            fail("Competency subject mismatch: " + skill.id);
        if (new Set(skill.prerequisites).size !== skill.prerequisites.length || new Set(skill.levels).size !== skill.levels.length)
            fail("Duplicate competency relationship.");
    }
    const visiting = new Set<string>(), done = new Set<string>();
    function visit(key: string) { if (visiting.has(key)) {
        fail("Prerequisite cycle.");
        return;
    } if (done.has(key))
        return; const skill = skills.get(key); if (!skill) {
        fail("Unknown prerequisite: " + key);
        return;
    } visiting.add(key); skill.prerequisites.forEach(visit); visiting.delete(key); done.add(key); }
    skills.forEach(skill => visit(skill.id));
    const courses = new Set<string>();
    for (const course of value.courses) {
        if (courses.has(course.id))
            fail("Duplicate course.");
        courses.add(course.id);
        const units = new Set<string>();
        for (const unit of course.units) {
            if (units.has(unit.id))
                fail("Duplicate unit.");
            units.add(unit.id);
            if (new Set(unit.skillIds).size !== unit.skillIds.length)
                fail("Duplicate unit competency.");
            for (const key of unit.skillIds)
                if (!skills.has(key))
                    fail("Unknown course competency: " + key);
        }
        for (const source of course.sources)
            if (!units.has(source.unitId))
                fail("Unknown source unit.");
        for (const alignment of course.alignments)
            if (!course.units.some(unit => unit.skillIds.includes(alignment.skillId)))
                fail("Alignment outside course.");
    }
});
export type CourseFramework = z.infer<typeof frameworkSchema>;
function canonical(value: unknown): string {
    if (Array.isArray(value))
        return "[" + value.map(canonical).join(",") + "]";
    if (value && typeof value === "object")
        return "{" + Object.keys(value).filter(key => (value as Record<string, unknown>)[key] !== undefined).sort().map(key => JSON.stringify(key) + ":" + canonical((value as Record<string, unknown>)[key])).join(",") + "}";
    return JSON.stringify(value);
}
export async function courseContentHash(value: unknown) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value))); return Array.from(new Uint8Array(bytes), item => item.toString(16).padStart(2, "0")).join(""); }
/** V1 content/hashes remain unchanged; its book relationships become explicit mappings. */
export function adaptLegacyCurriculum(graph: CurriculumGraph): CourseFramework {
    const competencies: Competency[] = graph.skills.map(skill => ({ id: skill.id, subject: skill.subject, title: skill.title, objective: skill.objective, revision: skill.revision, prerequisites: [...skill.prerequisites], levels: skill.subject === "math" ? ["high_school", "college_intro"] : ["middle_school", "high_school", "college_intro"], legacy: { version: graph.version, contentDigest: skill.contentDigest } }));
    const units = Array.from({ length: 9 }, (_, index) => ({ id: "precalc-chapter-" + (index + 1), title: "Chapter " + (index + 1), skillIds: graph.skills.filter(skill => skill.chapters.includes(index + 1)).map(skill => skill.id) })).filter(unit => unit.skillIds.length);
    return frameworkSchema.parse({ schemaVersion: COURSE_FRAMEWORK_VERSION, competencies, courses: [{ id: "precalculus-reference", revision: 1, title: "Precalculus reference", subject: "math", level: "high_school", units, sources: units.map((unit, index) => ({ resourceId: "lippman-rasmussen-precalculus", edition: "2.3", unitId: unit.id, locator: "chapter:" + (index + 1) })), alignments: [] }] });
}
export function coursePrerequisites(framework: CourseFramework, skillId: string) {
    const byId = new Map(framework.competencies.map(skill => [skill.id, skill]));
    if (!byId.has(skillId))
        throw new Error("unknown_skill");
    const result: Competency[] = [], seen = new Set<string>();
    const visit = (key: string) => { if (seen.has(key))
        return; seen.add(key); const skill = byId.get(key); if (!skill)
        throw new Error("unknown_prerequisite"); skill.prerequisites.forEach(visit); result.push(skill); };
    byId.get(skillId)!.prerequisites.forEach(visit);
    return result;
}
export async function legacyCourseFramework() { return adaptLegacyCurriculum(await loadCurriculumGraph()); }
