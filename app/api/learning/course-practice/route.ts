import { NextResponse } from "next/server";
import { z } from "zod";
import { createLearningClient, learningAccess } from "@/lib/learning-engine/server";
import { loadCourseCatalog, courseActivity } from "@/lib/learning-engine/course-catalog";
import { presentCourseActivity, COURSE_ACTIVITY_VERSION } from "@/lib/learning-engine/course-activities";
import { coursePrerequisites } from "@/lib/learning-engine/course-framework";
import { buildCoursePaths } from "@/lib/learning-engine/course-sequence";
import { readProblem, saveProblem } from "@/lib/learning-engine/problem-store";
import { startCourseSession, runCourseSession } from "@/lib/learning-engine/course-session";
import { loadCoursePublications } from "@/lib/learning-engine/publication-store";
import { courseIsAvailable } from "@/lib/learning-engine/course-publication";
import {recognitionProofKey,verifyRecognitionProof} from "@/lib/learning-engine/recognition-provenance";
import type {RecognitionEvidence} from "@/lib/learning-engine/recognition";
import { observeCourseTutorShadow } from "@/lib/learning-engine/capability-shadow";
const requestSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("start"), id: z.string().uuid(), requestId: z.string().uuid(), classId: z.string().uuid(), exerciseId: z.string().min(1).max(200) }).strict(),
    z.object({ action: z.literal("respond"), id: z.string().uuid(),requestId: z.string().uuid(),classId:z.string().uuid(),expectedRevision: z.number().int().min(1).max(9999), mode: z.enum(["check", "hint", "example", "save"]), response: z.string().max(4000), confirmed: z.boolean(), modality: z.enum(["typed", "handwriting", "voice"]), recognitionProof:z.string().min(1).max(2000).optional() }).strict(),
]);
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
        return { response: NextResponse.json({ error: "Sign in to practice." }, { status: 401 }) };
    if (!await learningAccess("assessment", user.id))
        return { response: NextResponse.json({ error: "Practice is not enabled for this account." }, { status: 404 }) };
    return { client, user };
}
async function authorizeClass(client: Client, userId: string, classId: string) {
    const result = await client.from("classes").select("ai_mode").eq("id", classId).eq("owner_id", userId).maybeSingle();
    if (result.error)
        throw new Error("store_unavailable");
    if (!result.data)
        return NextResponse.json({ error: "Class unavailable." }, { status: 404 });
    if (result.data.ai_mode !== "green")
        return NextResponse.json({ error: "This class does not allow tutoring practice." }, { status: 403 });
    return null;
}
function failure(error: unknown) { const conflict = error instanceof Error && /conflict/.test(error.message); return NextResponse.json({ error: conflict ? "This saved question changed. Reload practice before continuing." : "Practice could not load. Your saved work is still available." }, { status: conflict ? 409 : 503 }); }
export async function GET(request: Request) {
    const auth = await access();
    if ("response" in auth)
        return auth.response;
    const parsed = z.object({ classId: z.string().uuid(), exerciseId: z.string().min(1).max(200).optional() }).strict().safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success)
        return NextResponse.json({ error: "Choose a class and question." }, { status: 400 });
    const { client, user } = auth;
    try {
        const denied = await authorizeClass(client, user.id, parsed.data.classId);
        if (denied)
            return denied;
        const { framework, activities: allActivities } = await loadCourseCatalog();
        const publications = await loadCoursePublications(client);
        const activities = allActivities.filter(item => courseIsAvailable(publications.get(item.courseId) ?? "draft"));
        const paths = buildCoursePaths(framework, activities);
        if (parsed.data.exerciseId && !activities.some(item => item.id === parsed.data.exerciseId))
            return NextResponse.json({ error: "Choose an available question." }, { status: 400 });
        let query = client.from("learning_problem_records").select("id").eq("owner_id", user.id).eq("class_id", parsed.data.classId).is("assignment_id", null).like("exercise_id", COURSE_ACTIVITY_VERSION + ":%");
        if (parsed.data.exerciseId)
            query = query.eq("exercise_id", parsed.data.exerciseId);
        const recent = await query.order("updated_at", { ascending: false }).limit(1);
        if (recent.error)
            throw new Error("store_unavailable");
        const saved = recent.data?.[0] ? await readProblem(client, user.id, recent.data[0].id) : null;
        if (saved && (saved.scope.classId !== parsed.data.classId || saved.scope.assignmentId !== null || (parsed.data.exerciseId && saved.scope.exerciseId !== parsed.data.exerciseId)))
            throw new Error("scope_conflict");
        const current = saved ? allActivities.find(item => item.id === saved.scope.exerciseId && item.versionId === saved.exerciseVersionId) : null;
        if (current && !activities.some(item=>item.id===current.id)) activities.push(current);
        return NextResponse.json({ courses: framework.courses.filter(course => activities.some(item => item.courseId === course.id)), activities: activities.map(item => ({ ...presentCourseActivity(item), publication: publications.get(item.courseId) ?? "draft" })), competencies: framework.competencies.filter(skill => activities.some(item => item.skillId === skill.id)).map(skill => ({ ...skill, prerequisiteTitles: coursePrerequisites(framework, skill.id).map(item => item.title) })), paths, session: current ? saved : null, staleSession: Boolean(saved && !current), providerRequired: false }, { headers: { "Cache-Control": "no-store" } });
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
        return NextResponse.json({ error: "Check your practice request." }, { status: 400 });
    const { client, user } = auth, input = parsed.data;
    try {
        let recognitionEvidence:RecognitionEvidence|undefined;
        if(input.action==="respond"&&input.recognitionProof){
            const key=recognitionProofKey(process.env.DIANA_RECOGNITION_PROVENANCE_KEY);
            if(process.env.DIANA_LOCAL_RECOGNITION_ENABLED!=="1"||process.env.VERCEL||!key)return NextResponse.json({error:"The local transcription changed or expired. Review and enter your work manually."},{status:400});
            try{recognitionEvidence=verifyRecognitionProof(input.recognitionProof,user.id,input.response,input.modality,key);}
            catch{return NextResponse.json({error:"The local transcription changed or expired. Review and enter your work manually."},{status:400});}
        }
        const previous = await readProblem(client, user.id, input.id, input.action === "respond" ? input.expectedRevision : undefined), classId = input.classId;
        if (!classId)
            return NextResponse.json({ error: "Practice unavailable." }, { status: 404 });
        if(input.action==="respond"&&previous?.scope.classId!==classId)
            return NextResponse.json({error:"Practice unavailable for this class."},{status:404});
        const denied = await authorizeClass(client, user.id, classId);
        if (denied)
            return denied;
        const publications = await loadCoursePublications(client);
        const selected = await courseActivity(input.action === "start" ? input.exerciseId : previous!.scope.exerciseId);
        const publication = publications.get(selected.courseId) ?? "draft";
        // Preserve drafts when a version is withdrawn, but stop new instruction/checks.
        if (!courseIsAvailable(publication) && !(input.action === "respond" && input.mode === "save"))
            return NextResponse.json({ error: "This course version is paused for review. Your saved work is retained." }, { status: 409 });
        if (input.action === "start") {
            const activity = await courseActivity(input.exerciseId);
            if (previous) {
                if (previous.scope.classId !== classId || previous.scope.assignmentId !== null || previous.scope.exerciseId !== activity.id || previous.exerciseVersionId !== activity.versionId)
                    throw new Error("start_conflict");
                return NextResponse.json({ state: previous }, { headers: { "Cache-Control": "no-store" } });
            }
            const state = await startCourseSession(input.id, classId, activity.id);
            await saveProblem(client, user.id, state, 0, input.requestId);
            return NextResponse.json({ state }, { headers: { "Cache-Control": "no-store" } });
        }
        if (!previous)
            return NextResponse.json({ error: "Practice unavailable." }, { status: 404 });
        const result = await runCourseSession(previous, {...input,...(recognitionEvidence?{recognitionEvidence}:{})});
        await saveProblem(client, user.id, result.state, input.expectedRevision, input.requestId);
        await observeCourseTutorShadow(selected, result.state, { mode: input.mode, response: input.response,
            confirmed: input.confirmed, priorSupport: previous.supportCount }, result.feedback);
        if (publication === "published") result.feedback.limitations = result.feedback.limitations.map(item => item === "Practice guidance is awaiting educator review. This feedback does not establish mastery." ? "This course version has educator review. This feedback does not establish mastery." : item);
        return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }
    catch (error) {
        return failure(error);
    }
}
