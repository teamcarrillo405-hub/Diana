import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: { id: "00000000-0000-4000-8000-000000000002" } as {
        id: string;
    } | null, enabled: true, course: { ai_mode: "green" } as {
        ai_mode: string;
    } | null, recent: [] as {
        id: string;
    }[], read: vi.fn(), save: vi.fn(), eq: vi.fn() }));
vi.mock("server-only", () => ({}));
const publicationMocks=vi.hoisted(()=>({load:vi.fn()}));
vi.mock("@/lib/learning-engine/publication-store",()=>({loadCoursePublications:publicationMocks.load}));
beforeEach(()=>publicationMocks.load.mockResolvedValue(new Map()));
vi.mock("@/lib/learning-engine/server", () => ({ learningAccess: async () => mocks.enabled, createLearningClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) }, from: () => { const query = { select: () => query, eq: (...args: unknown[]) => { mocks.eq(...args); return query; }, is: () => query, like: () => query, order: () => query, limit: async () => ({ data: mocks.recent, error: null }), maybeSingle: async () => ({ data: mocks.course, error: null }) }; return query; } }) }));
vi.mock("@/lib/learning-engine/problem-store", () => ({ readProblem: mocks.read, saveProblem: mocks.save }));
import { GET, POST } from "./route";
import { loadCourseCatalog } from "@/lib/learning-engine/course-catalog";
import { startCourseSession } from "@/lib/learning-engine/course-session";
import {signRecognitionDraft} from "@/lib/learning-engine/recognition-provenance";
import type {RecognitionDraft} from "@/lib/learning-engine/recognition";
const id = "00000000-0000-4000-8000-000000000004", classId = "00000000-0000-4000-8000-000000000003", requestId = "00000000-0000-4000-8000-000000000005";
const request = (body: unknown) => new Request("http://localhost/api/learning/course-practice", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: "00000000-0000-4000-8000-000000000002" }; mocks.enabled = true; mocks.course = { ai_mode: "green" }; mocks.recent = []; mocks.read.mockResolvedValue(null); mocks.save.mockResolvedValue(undefined);process.env.DIANA_LOCAL_RECOGNITION_ENABLED="1";process.env.DIANA_RECOGNITION_PROVENANCE_KEY="12".repeat(32);delete process.env.VERCEL; });
describe("course practice API", () => {
    beforeEach(() => { vi.spyOn(console, "info").mockImplementation(() => {}); });
    afterEach(() => { vi.restoreAllMocks(); });
    it("runs content-free shadow observation after saving without adding feedback fields or assistance", async () => {
        const exercise = (await loadCourseCatalog()).activities.find(item => item.method.kind === "science_balance")!;
        mocks.read.mockResolvedValue(await startCourseSession(id, classId, exercise.id));
        const body = { action: "respond", id, classId, requestId, expectedRevision: 1, mode: "hint", response: "Private learner attempt", confirmed: true, modality: "typed" };
        const result = await POST(request(body)), payload = await result.json();
        expect(result.status).toBe(200);
        expect(Object.keys(payload).sort()).toEqual(["feedback", "state"]);
        expect(payload.state.supportCount).toBe(1);
        expect(mocks.save).toHaveBeenCalledTimes(1);
        expect(console.info).toHaveBeenCalledTimes(1);
        const receipt = JSON.parse(vi.mocked(console.info).mock.calls[0][1]);
        expect(receipt).toMatchObject({ adapter: "course_tutor", route: "local_scaffold", feedbackEqual: true, authoritative: false, providerCalled: false });
        expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(console.info).mock.invocationCallOrder[0]);
        const logged = JSON.stringify(vi.mocked(console.info).mock.calls);
        for (const privateValue of [body.response, id, classId, exercise.id, exercise.versionId]) expect(logged).not.toContain(privateValue);
        vi.mocked(console.info).mockImplementation(() => { throw new Error("logging_unavailable"); });
        expect((await POST(request(body))).status).toBe(200);
        mocks.save.mockRejectedValueOnce(new Error("store_unavailable"));
        vi.mocked(console.info).mockClear();
        expect((await POST(request(body))).status).toBe(503);
        expect(console.info).not.toHaveBeenCalled();
    });
    it("stops withdrawn instruction while preserving the ability to save a draft",async()=>{
        const exercise=(await loadCourseCatalog()).activities[0];
        publicationMocks.load.mockResolvedValue(new Map([[exercise.courseId,"withdrawn"]]));
        expect((await POST(request({action:"start",id,classId,requestId,exerciseId:exercise.id}))).status).toBe(409);
        mocks.read.mockResolvedValue(await startCourseSession(id,classId,exercise.id));
        const body={action:"respond",id,classId,requestId,expectedRevision:1,mode:"check",response:"A draft",confirmed:true,modality:"typed"};
        expect((await POST(request(body))).status).toBe(409);
        expect((await POST(request({...body,mode:"save"}))).status).toBe(200);
    });
    it("requires authentication, enrollment, an owned class and its current AI policy", async () => {
        const url = new Request("http://localhost/api/learning/course-practice?classId=" + classId);
        mocks.user = null;
        expect((await GET(url)).status).toBe(401);
        mocks.user = { id: classId };
        mocks.enabled = false;
        expect((await GET(url)).status).toBe(404);
        mocks.enabled = true;
        mocks.course = null;
        expect((await GET(url)).status).toBe(404);
        mocks.course = { ai_mode: "yellow" };
        expect((await GET(url)).status).toBe(403);
        expect(mocks.save).not.toHaveBeenCalled();
    });
    it("lists supported activities without leaking expected answers or worked examples", async () => {
        const result = await GET(new Request("http://localhost/api/learning/course-practice?classId=" + classId));
        expect(result.status).toBe(200);
        const body = await result.json();
        expect(body.courses).toHaveLength(72);
        expect(body.activities).toHaveLength(155);
        expect(body.paths).toHaveLength(155);
        const transition = body.activities.find((activity: { method: string }) => activity.method === 'math_row_stochastic');
        expect(transition.transitionGivens.convention).toBe('row_vector_p_times_P');
        expect(transition).not.toHaveProperty('answer');
        const paths = body.paths as { activityId: string; transferId: string | null; returnId: string | null }[];
        expect(paths.find(item => item.activityId === "course-practice-v2:math-algebra-probability:expand")?.transferId).toBeNull();
        expect(paths.find(item => item.activityId === "course-practice-v2:math-algebra-probability:average-change")?.transferId).toBeNull();
        expect(paths.find(item => item.activityId === "course-practice-v2:math-algebra-probability:conditional")?.transferId)
            .toBe("course-practice-v2:math-algebra-probability-transfer:apply");
        expect(paths.find(item => item.activityId === "course-practice-v2:math-algebra-probability-transfer:apply")?.returnId)
            .toBe("course-practice-v2:math-algebra-probability:conditional");
        for (const activity of body.activities) {
            expect(typeof activity.method).toBe("string");
            expect(activity).not.toHaveProperty("expected");
            expect(activity).not.toHaveProperty("example");
        }
        expect(mocks.eq).toHaveBeenCalledWith("owner_id", mocks.user!.id);
    });
    it("omits paused navigation targets even while preserving a paused saved draft", async () => {
        const { activities } = await loadCourseCatalog();
        const transfer = activities.find(item => item.courseId === "math-rational-models-transfer")!;
        publicationMocks.load.mockResolvedValue(new Map([[transfer.courseId, "suspended"], ["math-middle-school", "withdrawn"]]));
        mocks.recent = [{ id }];
        mocks.read.mockResolvedValue(await startCourseSession(id, classId, transfer.id));
        const result = await GET(new Request("http://localhost/api/learning/course-practice?classId=" + classId));
        expect(result.status).toBe(200);
        const body = await result.json();
        expect(body.activities.some((item: { id: string }) => item.id === transfer.id)).toBe(true);
        expect(body.paths.some((item: { activityId: string }) => item.activityId === transfer.id)).toBe(false);
        const paths = body.paths.filter((item: { activityId: string }) => item.activityId.includes(":math-rational-models:"));
        expect(paths.length).toBeGreaterThan(0);
        for (const path of paths) {
            expect(path.transferId).toBeNull();
            expect(path.foundations.find((item: { skillId: string }) => item.skillId === "math.ratio_foundations").activityId).toBeNull();
        }
    });
    it("rejects client methods, answer keys and approval flags", async () => {
        const exercise = (await loadCourseCatalog()).activities[0];
        for (const extra of [{ expected: "anything" }, { reviewed: true }, { method: { kind: "universal_grader" } }])
            expect((await POST(request({ action: "start", id, classId, requestId, exerciseId: exercise.id, ...extra }))).status).toBe(400);
        expect(mocks.save).not.toHaveBeenCalled();
    });
    it("reconstructs historical revisions for retries and waits for a durable save before returning feedback", async () => {
        const exercise = (await loadCourseCatalog()).activities.find(item => item.method.kind === "science_balance")!;
        mocks.read.mockResolvedValue(await startCourseSession(id, classId, exercise.id));
        const body = { action: "respond", id,classId, requestId, expectedRevision: 1, mode: "check", response: "2H2 + O2 -> 2H2O", confirmed: true, modality: "typed" };
        const result = await POST(request(body));
        expect((await result.json()).feedback.outcome).toBe("matches");
        expect(mocks.read).toHaveBeenCalledWith(expect.anything(), mocks.user!.id, id, 1);
        mocks.save.mockRejectedValueOnce(new Error("revision_conflict"));
        expect((await POST(request(body))).status).toBe(409);
        mocks.save.mockRejectedValueOnce(new Error("store_unavailable"));
        expect((await POST(request(body))).status).toBe(503);
    });
    it("does not repurpose an existing session for a different class", async () => {
        const exercise = (await loadCourseCatalog()).activities[0];
        mocks.read.mockResolvedValue(await startCourseSession(id, "00000000-0000-4000-8000-000000000099", exercise.id));
        expect((await POST(request({ action: "start", id, classId, requestId, exerciseId: exercise.id }))).status).toBe(409);
        expect(mocks.save).not.toHaveBeenCalled();
    });
    it("rejects a response whose explicit class differs from the saved session",async()=>{
        const exercise=(await loadCourseCatalog()).activities[0];
        mocks.read.mockResolvedValue(await startCourseSession(id,classId,exercise.id));
        expect((await POST(request({action:"respond",id,classId:requestId,requestId,expectedRevision:1,mode:"save",response:"Draft",confirmed:false,modality:"typed"}))).status).toBe(404);
        expect(mocks.save).not.toHaveBeenCalled();
    });
    it("persists only a server-verified machine transcript with source and model identity",async()=>{
        const exercise=(await loadCourseCatalog()).activities[0],text="I think the passage supports the claim";
        mocks.read.mockResolvedValue(await startCourseSession(id,classId,exercise.id));
        const draft:RecognitionDraft={version:"recognition-draft-v1",contentHash:"a".repeat(64),text,confirmedHash:null,
            recognition:{version:"local-recognition-v1",kind:"speech",assetHash:"b".repeat(64),modelId:"fixture/speech",revision:"c".repeat(40),fileManifestHash:"d".repeat(64),text,elapsedMs:42,device:"cpu",confidence:null,networkUsed:false}};
        const proof=signRecognitionDraft(draft,mocks.user!.id,Buffer.from(process.env.DIANA_RECOGNITION_PROVENANCE_KEY!,"hex"));
        const body={action:"respond",id,classId,requestId,expectedRevision:1,mode:"save",response:text,confirmed:true,modality:"voice",recognitionProof:proof};
        const result=await POST(request(body));expect(result.status).toBe(200);
        const saved=mocks.save.mock.calls[0][2],response=saved.observations.find((item:{id:string})=>item.id==="response");
        expect(response).toMatchObject({provenance:"machine_interpretation",modality:"voice",recognitionEvidence:{assetHash:draft.recognition.assetHash,modelId:draft.recognition.modelId}});
        expect(response.confirmedHash).toBe(response.contentHash);
        mocks.save.mockClear();
        expect((await POST(request({...body,response:text+" changed"}))).status).toBe(400);
        expect(mocks.save).not.toHaveBeenCalled();
        mocks.read.mockResolvedValue(saved);
        expect((await POST(request({...body,requestId:"00000000-0000-4000-8000-000000000006",expectedRevision:2,confirmed:false,recognitionProof:undefined}))).status).toBe(200);
        const revised=mocks.save.mock.calls[0][2].observations.find((item:{id:string})=>item.id==="response");
        expect(revised.recognitionEvidence.assetHash).toBe(draft.recognition.assetHash);
        expect(revised.confirmedHash).toBeNull();
        mocks.read.mockResolvedValue(mocks.save.mock.calls[0][2]);mocks.save.mockClear();
        expect((await POST(request({...body,requestId:"00000000-0000-4000-8000-000000000007",expectedRevision:3,response:text+" revised",confirmed:false,recognitionProof:undefined}))).status).toBe(200);
        const edited=mocks.save.mock.calls[0][2].observations.find((item:{id:string})=>item.id==="response");
        expect(edited).toMatchObject({provenance:"student_entered",text:text+" revised"});
        expect(edited.recognitionEvidence).toBeUndefined();
    });
    it("reopens an owned question without discarding its draft, and rejects stale or mismatched scope", async () => {
        const exercise = (await loadCourseCatalog()).activities[0], state = await startCourseSession(id, classId, exercise.id);
        mocks.recent = [{ id }];
        mocks.read.mockResolvedValue(state);
        const url = () => new Request(`http://localhost/api/learning/course-practice?classId=${classId}&exerciseId=${encodeURIComponent(exercise.id)}`);
        const result = await GET(url());
        expect((await result.json()).session.id).toBe(id);
        expect(mocks.eq).toHaveBeenCalledWith("exercise_id", exercise.id);
        mocks.read.mockResolvedValue({ ...state, exerciseVersionId: "b".repeat(64) });
        expect(await (await GET(url())).json()).toMatchObject({ session: null, staleSession: true });
        mocks.read.mockResolvedValue({ ...state, scope: { ...state.scope, classId: requestId } });
        expect((await GET(url())).status).toBe(409);
        expect((await GET(new Request(`http://localhost/api/learning/course-practice?classId=${classId}&exerciseId=unknown`))).status).toBe(400);
        expect(mocks.save).not.toHaveBeenCalled();
    });
});
