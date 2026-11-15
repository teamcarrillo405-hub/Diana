import { NextResponse } from "next/server";
import { z } from "zod";
import { createLearningClient, learningAccess, retrieveForAssignment } from "@/lib/learning-engine/server";
import { effectiveAiMode } from "@/supabase/functions/_shared/auth-policy";
import { materialBindingSchema, materialPassage, parseMaterialDocument, assertMaterialScope, startMaterialSession, restoreMaterialSession, readMaterialBinding, type MaterialScope } from "@/lib/learning-engine/material-activity";
import { loadMaterialDocuments } from "@/lib/learning-engine/material-practice-store";
import { readProblem, saveProblem } from "@/lib/learning-engine/problem-store";
import { recordAssignmentAssistance, type StudyBuddyAssistanceClient } from "@/lib/learning-engine/study-buddy-assistance";
import { runActivitySession } from "@/lib/learning-engine/activity-session";
import { presentCourseActivity, COURSE_ACTIVITY_VERSION } from "@/lib/learning-engine/course-activities";
import { loadCourseCatalog } from "@/lib/learning-engine/course-catalog";
import { suggestSourceCompetencies } from "@/lib/learning-engine/competency-mapping";
const uuid = z.string().uuid(), digest = z.string().regex(/^[a-f0-9]{64}$/);
const requestSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("start"), id: uuid, requestId: uuid, classId: uuid, assignmentId: uuid, binding: materialBindingSchema }).strict(),
    z.object({ action: z.literal("respond"), id: uuid, requestId: uuid, expectedRevision: z.number().int().min(1).max(9999), mode: z.enum(["check", "hint", "example", "save"]), response: z.string().max(4000), confirmed: z.boolean(), modality: z.enum(["typed", "handwriting", "voice"]) }).strict(),
]);
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
type Client = Awaited<ReturnType<typeof createLearningClient>>;
async function access(): Promise<{
    response: NextResponse;
} | {
    client: Client;
    user: {
        id: string;
    };
}> {
    const client = await createLearningClient(), { data: { user } } = await client.auth.getUser();
    if (!user)
        return { response: json({ error: "Sign in to practice." }, 401) };
    if (!await learningAccess("assessment", user.id) || !await learningAccess("retrieval", user.id))
        return { response: json({ error: "Material practice is not enabled for this account." }, 404) };
    return { client, user };
}
async function authorize(client: Client, scope: MaterialScope) {
    const [assignment, course] = await Promise.all([
        client.from("assignments").select("class_id,ai_mode_override").eq("id", scope.assignmentId).eq("owner_id", scope.ownerId).maybeSingle(),
        client.from("classes").select("ai_mode").eq("id", scope.classId).eq("owner_id", scope.ownerId).maybeSingle(),
    ]);
    if (assignment.error || course.error)
        throw new Error("store_unavailable");
    if (!assignment.data || !course.data || assignment.data.class_id !== scope.classId)
        return json({ error: "Material unavailable." }, 404);
    if (effectiveAiMode(assignment.data.ai_mode_override, course.data.ai_mode) !== "green")
        return json({ error: "This assignment does not allow tutoring practice." }, 403);
    return null;
}
function failure(error: unknown) {
    const message = error instanceof Error ? error.message : "", conflict = /conflict/.test(message), unavailable = /source_unavailable|passage_unavailable/.test(message);
    return json({ error: conflict ? "This practice or its sources changed. Reopen saved work before continuing." : unavailable ? "That passage is unavailable. Choose confirmed text from your material." : "Practice could not load. Your saved work is still available." }, conflict ? 409 : unavailable ? 404 : 503);
}
export async function GET(request: Request) {
    const auth = await access();
    if ("response" in auth)
        return auth.response;
    const parsed = z.object({ classId: uuid, assignmentId: uuid, versionId: digest, page: z.coerce.number().int().min(1).max(1500).default(1), query: z.string().trim().max(1000).optional(), sessionId: uuid.optional() }).strict().safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success)
        return json({ error: "Choose your material and page." }, 400);
    const { client, user } = auth, input = parsed.data, scope = { ownerId: user.id, classId: input.classId, assignmentId: input.assignmentId };
    try {
        const denied = await authorize(client, scope);
        if (denied)
            return denied;
        const version = await client.from("learning_documents").select("id,metadata,pages").eq("id", input.versionId).eq("owner_id", user.id).eq("assignment_id", scope.assignmentId).eq("class_id", scope.classId).maybeSingle();
        if (version.error)
            throw new Error("store_unavailable");
        if (!version.data)
            throw new Error("source_unavailable");
        const document = parseMaterialDocument({ ...version.data, blocks: [] });
        assertMaterialScope(document, scope);
        if (document.version.id !== input.versionId)
            throw new Error("source_conflict");
        let query = client.from("learning_blocks").select("payload", { count: "exact" }).eq("owner_id", user.id).eq("version_id", input.versionId);
        if (input.query) {
            const retrieved = await retrieveForAssignment({ ...scope, query: input.query, versionIds: [input.versionId], allowSemanticFallback: false });
            if (retrieved.status === "index_unavailable")
                throw new Error("store_unavailable");
            const ids = [...new Set(retrieved.chunks.flatMap(item => item.anchors.filter(anchor => anchor.versionId === input.versionId).map(anchor => anchor.blockId)))];
            query = query.in("id", ids.length ? ids : ["0".repeat(64)]);
        }
        else
            query = query.eq("payload->location->>page", String(input.page));
        const blocks = await query.order("id").range(0, 49);
        if (blocks.error)
            throw new Error("store_unavailable");
        const full = parseMaterialDocument({ ...version.data, blocks: (blocks.data ?? []).map(item => item.payload) });
        const passages = full.blocks.sort((a, b) => a.location.page - b.location.page || a.location.startOffset - b.location.startOffset).flatMap(block => { try {
            return [materialPassage(full, block)];
        }
        catch {
            return [];
        } });
        const recent = await client.from("learning_problem_records").select("id,updated_at").eq("owner_id", user.id).eq("class_id", scope.classId).eq("assignment_id", scope.assignmentId).like("exercise_id", COURSE_ACTIVITY_VERSION + ":%:material-%").order("updated_at", { ascending: false }).limit(10);
        if (recent.error)
            throw new Error("store_unavailable");
        let session = null, activity = null, binding = null;
        if (input.sessionId) {
            session = await readProblem(client, user.id, input.sessionId);
            if (!session)
                return json({ error: "Saved practice unavailable." }, 404);
            const restored = await restoreMaterialSession(session, scope, await loadMaterialDocuments(client, scope, readMaterialBinding(session).passages));
            activity = presentCourseActivity(restored.activity);
            binding = restored.binding;
        }
        const mapping=await suggestSourceCompetencies((await loadCourseCatalog()).framework,full.version,full.blocks,full.pages);
        return json({ passages, competencySuggestions:mapping.suggestions.map(item=>({skillId:item.skillId,title:item.title,blockId:item.anchor.blockId,matchedTerms:item.matchedTerms,mappingHash:item.mappingHash,status:item.status})), pages: document.pages.map(item => ({ page: item.page, label: item.pageLabel })), documentId:document.version.documentId,subject: document.version.subject, title: document.version.title,
            limited: (blocks.count ?? 0) > 50, searchLimited: !!input.query, excluded: full.blocks.length - passages.length, recent: recent.data ?? [], session, activity, binding, providerRequired: false });
    }
    catch (error) {
        return failure(error);
    }
}
export async function POST(request: Request) {
    const auth = await access();
    if ("response" in auth)
        return auth.response;
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
        return json({ error: "Check your practice request." }, 400);
    const { client, user } = auth, input = parsed.data;
    try {
        const previous = await readProblem(client, user.id, input.id, input.action === "respond" ? input.expectedRevision : undefined);
        const assignmentId = input.action === "start" ? input.assignmentId : previous?.scope.assignmentId, classId = input.action === "start" ? input.classId : previous?.scope.classId;
        if (!assignmentId || !classId)
            return json({ error: "Practice unavailable." }, 404);
        const scope = { ownerId: user.id, assignmentId, classId }, denied = await authorize(client, scope);
        if (denied)
            return denied;
        if (input.action === "start") {
            const documents = await loadMaterialDocuments(client, scope, input.binding.passages), created = await startMaterialSession(input.id, scope, input.binding, documents);
            if (previous) {
                const restored = await restoreMaterialSession(previous, scope, documents);
                if (restored.activity.versionId !== created.activity.versionId)
                    throw new Error("start_conflict");
                return json({ state: previous, activity: presentCourseActivity(created.activity) });
            }
            await saveProblem(client, user.id, created.state, 0, input.requestId);
            return json({ state: created.state, activity: presentCourseActivity(created.activity) });
        }
        if (!previous)
            return json({ error: "Practice unavailable." }, 404);
        const restored = await restoreMaterialSession(previous, scope, await loadMaterialDocuments(client, scope, readMaterialBinding(previous).passages));
        const result = await runActivitySession(previous, restored.state, restored.activity, input);
        if (result.feedback.assistance !== "unchanged") {
            await recordAssignmentAssistance(client as unknown as StudyBuddyAssistanceClient,
                { ownerId: user.id, assignmentId, requestId: input.requestId, selectedProblemId: null,
                    channel: "local", kind: input.mode === "hint" ? "hint" : input.mode === "example" ? "example" : "check" },
                JSON.parse(JSON.stringify({ route: "learning/material-practice", input,
                    activity: restored.activity, binding: readMaterialBinding(previous) })));
        }
        await saveProblem(client, user.id, result.state, input.expectedRevision, input.requestId);
        return json(result);
    }
    catch (error) {
        return failure(error);
    }
}
