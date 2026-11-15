import { describe, expect, it } from "vitest";
import { loadCurriculumGraph, selectPrerequisites } from "./curriculum-graph";
import { adaptLegacyCurriculum, coursePrerequisites, frameworkSchema, COURSE_FRAMEWORK_VERSION } from "./course-framework";
import { validateCourseActivities, presentCourseActivity } from "./course-activities";
import { loadCourseCatalog } from "./course-catalog";
const base = () => frameworkSchema.parse({ schemaVersion: COURSE_FRAMEWORK_VERSION, competencies: [{ id: "english.argument", subject: "english", title: "Argument", objective: "Support a claim with evidence.", revision: 1, prerequisites: [], levels: ["middle_school", "high_school"] }], courses: [{ id: "english-foundations", revision: 1, title: "English foundations", subject: "english", level: "middle_school", units: [{ id: "unit-one", title: "Arguments", skillIds: ["english.argument"] }], sources: [], alignments: [] }] });
const activity = () => ({ id: "course-practice-v2:english-foundations:evidence", courseId: "english-foundations", skillId: "english.argument", subject: "english", level: "middle_school", title: "Use evidence", prompt: "Explain which detail supports your claim.", sources: [{ id: "passage-one", title: "Garden", text: "The class watered dry soil.", authorship: "diana_authored", instructionRights: "original_practice", trainingPermission: "excluded" }], method: { kind: "reading_evidence", minimumSources: 1, criteria: ["Choose a claim.", "Explain evidence."] }, hints: ["Read the passage.", "Select supporting words."], example: { prompt: "A separate example.", steps: ["Connect a detail to a claim."] }, review: "pending", revision: 1 });
describe("shared course framework", () => {
    it("keeps legacy skill identities and prerequisite results while separating book mappings", async () => {
        const old = await loadCurriculumGraph(), framework = adaptLegacyCurriculum(old);
        expect(framework.competencies).toHaveLength(34);
        for (const skill of old.skills) {
            expect(framework.competencies.find(item => item.id === skill.id)?.legacy?.contentDigest).toBe(skill.contentDigest);
            expect(coursePrerequisites(framework, skill.id).map(item => item.id)).toEqual(selectPrerequisites(old, skill.id).map(item => item.id));
        }
        expect(framework.courses[0].sources).toHaveLength(9);
        expect(framework.competencies.every(skill => !("chapters" in skill))).toBe(true);
    });
    it("rejects broken links, cycles, duplicate courses and false approval", () => {
        const graph = base();
        graph.competencies[0].prerequisites = ["math.missing"];
        expect(() => frameworkSchema.parse(graph)).toThrow();
        graph.competencies[0].prerequisites = ["english.argument"];
        expect(() => frameworkSchema.parse(graph)).toThrow();
        const duplicate = base();
        duplicate.courses.push(duplicate.courses[0]);
        expect(() => frameworkSchema.parse(duplicate)).toThrow();
        expect(() => frameworkSchema.parse({ ...base(), review: "approved" })).toThrow();
    });
    it("binds a saved activity version to content, skill and course changes", async () => {
        const original = (await validateCourseActivities(base(), [activity()]))[0];
        expect((await validateCourseActivities(base(), [{ ...activity(), prompt: "Explain a different detail." }]))[0].versionId).not.toBe(original.versionId);
        const graph = base();
        graph.competencies[0].objective = "Evaluate a different claim.";
        expect((await validateCourseActivities(graph, [activity()]))[0].versionId).not.toBe(original.versionId);
        expect(presentCourseActivity(original)).not.toHaveProperty("example");
    });
    it("rejects unknown methods, cross-subject checks, missing sources and claimed educator review", async () => {
        await expect(validateCourseActivities(base(), [{ ...activity(), method: { kind: "universal_grader" } }])).rejects.toThrow();
        await expect(validateCourseActivities(base(), [{ ...activity(), method: { kind: "science_quantity", expected: "2 m", significantFigures: 1 } }])).rejects.toThrow();
        await expect(validateCourseActivities(base(), [{ ...activity(), sources: [] }])).rejects.toThrow();
        await expect(validateCourseActivities(base(), [{ ...activity(), review: "approved" }])).rejects.toThrow();
    });
    it("rejects a conversion specification outside its declared unit and precision bounds", async () => {
        const { framework, activities } = await loadCourseCatalog();
        const existing = activities.find(item => item.method.kind === "science_quantity")!;
        const { versionId, ...candidate } = existing;
        void versionId;
        await expect(validateCourseActivities(framework, [{ ...candidate, method: { kind: "science_quantity", expected: "2.50 m/s", significantFigures: 3 } }])).rejects.toThrow("unsupported_quantity_specification");
        await expect(validateCourseActivities(framework, [{ ...candidate, method: { kind: "science_quantity", expected: "2.50 m", significantFigures: 2 } }])).rejects.toThrow("unsupported_quantity_specification");
    });
});
