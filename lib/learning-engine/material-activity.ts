import { z } from "zod";
import { blockSchema, documentVersionSchema, sourcePageSchema, type StructuredDocument, type SourceBlock } from "./contracts";
import { validateDocumentAnchor } from "./curriculum";
import { courseContentHash } from "./course-framework";
import { courseActivity, loadCourseCatalog } from "./course-catalog";
import { validateCourseActivities, COURSE_ACTIVITY_VERSION, type CourseActivity } from "./course-activities";
import { startActivitySession, validateActivitySession } from "./activity-session";
import type { ProblemState } from "./problem-state";
export const materialBindingSchema = z.object({
    version: z.literal("material-practice-v1"), task: z.enum(["read", "revise", "explain"]), level: z.enum(["middle_school", "high_school", "college_intro"]),
    passages: z.array(z.object({ versionId: z.string().regex(/^[a-f0-9]{64}$/), blockId: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).min(1).max(3),
}).strict().refine(value => new Set(value.passages.map(item => item.versionId + ":" + item.blockId)).size === value.passages.length, "Choose distinct passages.");
export type MaterialBinding = z.infer<typeof materialBindingSchema>;
export type MaterialDocument = Pick<StructuredDocument, "version" | "pages" | "blocks">;
export type MaterialScope = {
    ownerId: string;
    assignmentId: string;
    classId: string;
};
export function parseMaterialDocument(raw: {
    metadata: unknown;
    pages: unknown;
    blocks: unknown;
}): MaterialDocument {
    return { version: documentVersionSchema.parse(raw.metadata), pages: z.array(sourcePageSchema).parse(raw.pages), blocks: z.array(blockSchema).parse(raw.blocks) };
}
export function materialPassage(document: MaterialDocument, block: SourceBlock) {
    const anchor = { versionId: document.version.id, blockId: block.id, contentHash: document.version.contentHash, location: block.location, exactText: block.text };
    if (block.versionId !== document.version.id || block.needsConfirmation || block.interpretation === "model_extraction" || ["heading", "diagram", "table"].includes(block.kind) || !validateDocumentAnchor(anchor, { ...document, chunks: [] }))
        throw new Error("passage_unavailable");
    const page = document.pages.find(item => item.page === block.location.page);
    if (!page || page.interpretation === "model_extraction")
        throw new Error("passage_unavailable");
    return { id: "material-" + block.id, title: (document.version.title.slice(0, 110) + " · " + block.location.pageLabel).slice(0, 160), text: block.text, authorship: "course_material" as const,
        instructionRights: document.version.instructionRights, trainingPermission: "excluded" as const, documentId: document.version.documentId, anchor,
        nativePdf: !!document.version.sourceAssetHash && page.interpretation === "original", ...(document.version.sourceAssetHash ? { assetHash: document.version.sourceAssetHash } : {}) };
}
export function assertMaterialScope(document: MaterialDocument, scope: MaterialScope) {
    if (document.version.ownerId !== scope.ownerId || document.version.assignmentId !== scope.assignmentId || document.version.classId !== scope.classId)
        throw new Error("material_scope_conflict");
}
export async function buildMaterialActivity(raw: unknown, documents: MaterialDocument[], scope: MaterialScope) {
    const binding = materialBindingSchema.parse(raw);
    const sources = binding.passages.map(pick => {
        const document = documents.find(item => item.version.id === pick.versionId);
        if (!document)
            throw new Error("source_unavailable");
        assertMaterialScope(document, scope);
        const block = document.blocks.find(item => item.id === pick.blockId);
        if (!block)
            throw new Error("passage_unavailable");
        return materialPassage(document, block);
    });
    const courseId = (binding.task === "explain" ? "science-" : "english-") + binding.level.replaceAll("_", "-");
    const template = await courseActivity(COURSE_ACTIVITY_VERSION + ":" + courseId + ":" + ({ read: "compare", revise: "revise", explain: "explain" } as const)[binding.task]);
    const { versionId: _version, ...base } = template;
    const id = COURSE_ACTIVITY_VERSION + ":" + courseId + ":material-" + (await courseContentHash(binding)).slice(0, 48);
    const prompts = {
        read: sources.length === 1 ? "What is the passage's main idea or claim? Use a short exact quotation, explain how it supports your reading, and identify a question the passage leaves open." : "Compare the main ideas or claims in the selected passages. Use a short exact quotation from each, explain a connection or difference, and identify what remains uncertain.",
        revise: "Write or revise a short argument using the selected passages. State your audience, make a claim the evidence can support, explain the connection, and acknowledge a limit. Mark any direct quotations.",
        explain: "Choose a scientific claim or explanation from the selected passages. Separate what the source reports from your reasoning. Cite a detail, explain its connection, and identify a limit or a question that would need more evidence. Do not invent measurements or observations.",
    };
    const rawActivity: CourseActivity = { ...base, id, title: { read: "Read with evidence", revise: "Build an argument", explain: "Explain with evidence" }[binding.task], sources, prompt: prompts[binding.task],
        hints: ["Identify the relevant idea or claim in your selected passage. Separate the author's words from your own explanation.", "Choose a short quotation and name its passage. Explain what it supports and what cannot be concluded from this excerpt."],
        method: base.method.kind === "reading_evidence" ? { ...base.method, minimumSources: sources.length, criteria: ["State the main idea or claim in your own words.", "Identify each passage you use and quote its wording accurately.", "Explain the connection between the evidence and your interpretation, including a limit."] } : base.method };
    const { framework } = await loadCourseCatalog();
    const [activity] = await validateCourseActivities(framework, [rawActivity]);
    return { binding, activity };
}
export function readMaterialBinding(state: ProblemState) {
    const observation = state.observations.find(item => item.id === "binding");
    if (!observation)
        throw new Error("binding_conflict");
    return materialBindingSchema.parse(JSON.parse(observation.text));
}
export async function startMaterialSession(id: string, scope: MaterialScope, raw: unknown, documents: MaterialDocument[]) {
    const { binding, activity } = await buildMaterialActivity(raw, documents, scope);
    const state = await startActivitySession(id, { classId: scope.classId, assignmentId: scope.assignmentId, exerciseId: activity.id }, activity, JSON.stringify(binding));
    return { binding, activity, state };
}
export async function restoreMaterialSession(previous: ProblemState, scope: MaterialScope, documents: MaterialDocument[]) {
    const result = await startMaterialSession(previous.id, scope, readMaterialBinding(previous), documents);
    await validateActivitySession(previous, result.state);
    return result;
}
