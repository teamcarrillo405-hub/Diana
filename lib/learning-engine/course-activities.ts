import { z } from "zod";
import { problemSpecificationSchema } from "./problem-specification";
import { verifyQuantityInExpectedUnit } from "@/lib/assignment-help/deterministic-verifiers";
import { courseLevelSchema, domainSchema, type CourseFramework, courseContentHash } from "./course-framework";
import {evidenceAnchorSchema} from "./contracts";
import { verifyCompoundQuantity, validateIonicSpecies } from "./science-checks";
import { responseRubric } from "./response-rubric";
import { courseDataGraphSchema, graphTaskSchema, graphAnswerExpression } from "./course-graphs";
import { stochasticSpecificationSchema, STOCHASTIC_LIMIT } from './stochastic-matrix';
export const COURSE_ACTIVITY_VERSION = "course-practice-v2";
const id = z.string().regex(/^[a-z][a-z0-9_.:-]{1,159}$/), text = z.string().min(1).max(4000);
const sourceFields = { id, title: z.string().min(1).max(160), text: z.string().min(1).max(12000), trainingPermission: z.literal("excluded") };
export const courseSourceSchema = z.discriminatedUnion("authorship", [
    z.object({...sourceFields,authorship:z.literal("diana_authored"),instructionRights:z.literal("original_practice")}).strict(),
    z.object({...sourceFields,authorship:z.literal("course_material"),instructionRights:z.enum(["owner_provided","licensed","public_domain"]),
        documentId:z.string().min(1).max(200),anchor:evidenceAnchorSchema,nativePdf:z.boolean(),assetHash:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict(),
]);
export const activityMethodSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal('math_row_stochastic'), specification: stochasticSpecificationSchema }).strict(),
    z.object({ kind: z.literal("computing_rubric"), criteria: z.array(text).min(2).max(6) }).strict(),
    z.object({ kind: z.literal("science_graph"), graph: courseDataGraphSchema, task: graphTaskSchema }).strict(),
    z.object({ kind: z.literal("math_exact"), specification: problemSpecificationSchema }).strict(),
    z.object({ kind: z.literal("reading_evidence"), minimumSources: z.number().int().min(1).max(3), criteria: z.array(text).min(2).max(6) }).strict(),
    z.object({ kind: z.literal("writing_revision"), criteria: z.array(text).min(2).max(6) }).strict(),
    z.object({ kind: z.literal("science_quantity"), expected: z.string().min(1).max(100), significantFigures: z.number().int().min(1).max(8) }).strict(),
    z.object({ kind: z.literal("science_balance"), reactants: z.array(z.string().regex(/^[A-Za-z0-9()[\]]+$/)).min(1).max(6), products: z.array(z.string().regex(/^[A-Za-z0-9()[\]]+$/)).min(1).max(6) }).strict(),
    z.object({ kind: z.literal("science_explanation"), criteria: z.array(text).min(2).max(6) }).strict(),
    z.object({ kind: z.literal("science_data_comparison"), groups: z.tuple([
        z.object({ label: z.string().min(1).max(80), values: z.array(z.number().int().min(0).max(1000000)).min(2).max(12) }).strict(),
        z.object({ label: z.string().min(1).max(80), values: z.array(z.number().int().min(0).max(1000000)).min(2).max(12) }).strict(),
    ]), unit: z.string().regex(/^[A-Za-z]{1,12}$/u), decimalPlaces: z.number().int().min(0).max(2) }).strict(),
    z.object({ kind: z.literal("science_dimensions"), expected:z.string().min(1).max(160), significantFigures:z.number().int().min(1).max(8) }).strict(),
    z.object({ kind: z.literal("science_ionic"), reactants:z.array(z.object({formula:z.string().min(1).max(120),charge:z.number().int().min(-8).max(8)}).strict()).min(1).max(6), products:z.array(z.object({formula:z.string().min(1).max(120),charge:z.number().int().min(-8).max(8)}).strict()).min(1).max(6) }).strict(),
    z.object({ kind: z.literal("history_sources"), minimumSources:z.number().int().min(1).max(3), criteria:z.array(text).min(2).max(6) }).strict(),
]);
export type ActivityMethod = z.infer<typeof activityMethodSchema>;
export const activitySchema = z.object({
    id, courseId: id, skillId: id, subject: domainSchema, level: courseLevelSchema, title: z.string().min(2).max(160), prompt: text,
    sources: z.array(courseSourceSchema).max(3), method: activityMethodSchema,
    hints: z.array(text).min(2).max(4), example: z.object({ prompt: text, steps: z.array(text).min(1).max(6) }).strict(),
    review: z.literal("pending"), revision: z.number().int().positive(),
}).strict();
export type CourseActivity = z.infer<typeof activitySchema>;
export type VersionedActivity = CourseActivity & {
    versionId: string;
};
export const CAPABILITIES = {
    math_row_stochastic: { subjects: ['math'], check: 'bounded_exact_probability_vector', limits: STOCHASTIC_LIMIT },
    computing_rubric: { subjects: ["computing"], check: "guided_rubric", limits: "Authored traces, contracts and design explanations require review. No code is executed, no tests are run and correctness, complexity, security or mastery is not automatically established." },
    science_graph: { subjects: ["science"], check: "bounded_exact_result", limits: "Checks a declared point value, signed change or average rate from authored plotted observations. Causation, uncertainty, interpolation and instantaneous rates are not verified." },
    math_exact: { subjects: ["math"], check: "bounded_exact_result", limits: "Only the explicitly supplied mathematical specification and its declared bounds." },
    reading_evidence: { subjects: ["reading", "english"], check: "source_correspondence_only", limits: "Exact quotations across at most three selected passages. Relevance and interpretation require review." },
    writing_revision: { subjects: ["english"], check: "guided_rubric", limits: "Draft structure observations and revision questions. No automatic grade for quality, grammar or originality." },
    science_quantity: { subjects: ["science"], check: "bounded_numeric_result", limits: "The requested common single unit and 1–8 significant figures. No compound units or offset temperatures." },
    science_balance: { subjects: ["science"], check: "bounded_exact_result", limits: "Atom conservation for the same stated species. Charge, reaction conditions and plausibility require review." },
    science_explanation: { subjects: ["science"], check: "guided_rubric", limits: "Source correspondence and explanation prompts. Scientific interpretation and experimental validity require review." },
    science_data_comparison: { subjects: ["science"], check: "bounded_numeric_result", limits: "Checks only the two arithmetic means and their numerical difference for the stated integer observations. Causation, study quality and generalization require review." },
    science_dimensions: { subjects:["science"],check:"bounded_numeric_result",limits:"Case-sensitive listed units, products and one division, integer powers from -6 to 6, requested units and 1–8 significant figures. No offset temperatures, uncertainty propagation or physical-model validation." },
    science_ionic: { subjects:["science"],check:"bounded_exact_result",limits:"Explicit species and integer charges; positive coefficients from 1 to 9999. Atom and charge conservation only. No reaction prediction, conditions or chemical plausibility judgment." },
    history_sources: { subjects:["history"],check:"source_correspondence_only",limits:"Exact source quotations and sourcing/corroboration criteria. Historical interpretation, factual completeness and causal claims require review." },
} as const;
export async function validateCourseActivities(framework: CourseFramework, raw: unknown[]): Promise<VersionedActivity[]> {
    const seen = new Set<string>(), activities = raw.map(item => activitySchema.parse(item));
    return Promise.all(activities.map(async (activity) => {
        if (seen.has(activity.id))
            throw new Error("duplicate_activity");
        seen.add(activity.id);
        if (!activity.id.startsWith(COURSE_ACTIVITY_VERSION + ":" + activity.courseId + ":"))
            throw new Error("activity_identity_mismatch");
        const course = framework.courses.find(item => item.id === activity.courseId), skill = framework.competencies.find(item => item.id === activity.skillId);
        if (!course || !skill || !course.units.some(unit => unit.skillIds.includes(skill.id)) || activity.level !== course.level || !skill.levels.includes(activity.level))
            throw new Error("activity_course_mismatch");
        if (activity.subject !== skill.subject || !(CAPABILITIES[activity.method.kind].subjects as readonly string[]).includes(activity.subject))
            throw new Error("activity_method_mismatch");
        if (activity.method.kind === "math_exact" && activity.method.specification.kind === "reading")
            throw new Error("activity_method_mismatch");
        if (activity.method.kind === "science_graph") graphAnswerExpression(activity.method.graph, activity.method.task);
        if (activity.method.kind === "science_quantity" && verifyQuantityInExpectedUnit({ expected: activity.method.expected, actual: activity.method.expected, requiredSignificantFigures: activity.method.significantFigures }).verifierResult.status !== "passed")
            throw new Error("unsupported_quantity_specification");
        if (activity.method.kind === "science_dimensions" && verifyCompoundQuantity(activity.method.expected,activity.method.expected,activity.method.significantFigures).status !== "matches") throw new Error("unsupported_dimension_specification");
        if (activity.method.kind === "science_ionic") {
            const atoms=[...activity.method.reactants,...activity.method.products].map(validateIonicSpecies);
            if(atoms.some(value=>value===null)||!atoms.some(value=>value&&Object.keys(value).length)) throw new Error("unsupported_ionic_specification");
        }
        if (activity.method.kind === "science_data_comparison") {
            const [first, second] = activity.method.groups;
            if (first.label.trim().toLowerCase() === second.label.trim().toLowerCase())
                throw new Error("duplicate_comparison_group");
            if (!activity.sources.length || activity.method.groups.some(group => group.values.some(value =>
                !activity.sources.some(source => new RegExp(`(^|[^0-9.])${value}($|[^0-9.])`, "u").test(source.text)))))
                throw new Error("unsupported_comparison_source");
        }
        if (new Set(activity.sources.map(source => source.id)).size !== activity.sources.length)
            throw new Error("duplicate_source");
        if(activity.sources.some(source=>source.authorship==="course_material"&&source.text!==source.anchor.exactText))
            throw new Error("source_anchor_mismatch");
        if ((activity.method.kind === "reading_evidence" || activity.method.kind === "history_sources") && activity.sources.length < activity.method.minimumSources)
            throw new Error("source_count_mismatch");
        if ((activity.method.kind === "science_explanation" || activity.method.kind === "computing_rubric") && !activity.sources.length)
            throw new Error("source_required");
        return { ...activity, versionId: await courseContentHash({ activity, course, skill, capability: CAPABILITIES[activity.method.kind], engine: COURSE_ACTIVITY_VERSION }) };
    }));
}
/** Never expose an expected answer or authored worked example before the student asks for it. */
export function presentCourseActivity(activity: VersionedActivity) { return { id: activity.id, courseId: activity.courseId, skillId: activity.skillId, subject: activity.subject, level: activity.level, title: activity.title, prompt: activity.prompt, sources: activity.sources, method: activity.method.kind, versionId: activity.versionId, review: activity.review, limits: CAPABILITIES[activity.method.kind].limits, criteria: "criteria" in activity.method ? activity.method.criteria : [], rubric: responseRubric(activity), ...(activity.method.kind === "science_graph" ? { graph: activity.method.graph } : {}), ...(activity.method.kind === 'math_row_stochastic' ? { transitionGivens: activity.method.specification } : {}) }; }
