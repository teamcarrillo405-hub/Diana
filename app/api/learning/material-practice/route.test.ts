import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: { id: "00000000-0000-4000-8000-000000000001" } as {
        id: string;
    } | null, enrolled: true, mode: "green", override: null as null | "green" | "yellow" | "red", classId: "00000000-0000-4000-8000-000000000003", classFound: true, read: vi.fn(), save: vi.fn(), load: vi.fn(), search: vi.fn(), eq: vi.fn(), document: null as unknown, blocks: [] as unknown[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/learning-engine/server", () => ({ learningAccess: async () => mocks.enrolled, retrieveForAssignment: mocks.search, createLearningClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) }, from: (table: string) => {
            const q = { select: () => q, eq: (...args: unknown[]) => { mocks.eq(...args); return q; }, in: () => q, like: () => q, order: () => q,
                maybeSingle: async () => ({ data: table === "assignments" ? { class_id: mocks.classId, ai_mode_override: mocks.override } : table === "classes" ? mocks.classFound ? { ai_mode: mocks.mode } : null : mocks.document, error: null }),
                limit: async () => ({ data: [], error: null }), range: async () => ({ data: mocks.blocks, error: null, count: mocks.blocks.length }) };
            return q;
        } }) }));
vi.mock("@/lib/learning-engine/problem-store", () => ({ readProblem: mocks.read, saveProblem: mocks.save }));
vi.mock("@/lib/learning-engine/material-practice-store", () => ({ loadMaterialDocuments: mocks.load }));
const assistance = vi.hoisted(() => vi.fn());
vi.mock("@/lib/learning-engine/study-buddy-assistance", () => ({ recordAssignmentAssistance: assistance }));
import { GET, POST } from "./route";
import { structureDocument } from "@/lib/learning-engine/curriculum";
import { startMaterialSession, type MaterialBinding } from "@/lib/learning-engine/material-activity";
const scope = { ownerId: "00000000-0000-4000-8000-000000000001", assignmentId: "00000000-0000-4000-8000-000000000002", classId: "00000000-0000-4000-8000-000000000003" }, id = "00000000-0000-4000-8000-000000000004", requestId = "00000000-0000-4000-8000-000000000005";
async function fixture() {
    const document = await structureDocument({ ...scope, documentId: "source", title: "Science reading", edition: "1", subject: "science", instructionRights: "owner_provided" }, [{ page: 1, pageLabel: "1", text: "The room was warmer during the second trial.", interpretation: "original" }]);
    const binding: MaterialBinding = { version: "material-practice-v1", task: "explain", level: "middle_school", passages: [{ versionId: document.version.id, blockId: document.blocks[0].id }] };
    mocks.load.mockResolvedValue([document]);
    mocks.document = { id: document.version.id, metadata: document.version, pages: document.pages };
    mocks.blocks = document.blocks.map(payload => ({ payload }));
    return { document, binding };
}
const request = (body: unknown) => new Request("http://localhost/api/learning/material-practice", { method: "POST", body: JSON.stringify(body) });
const start = (binding: MaterialBinding) => ({ action: "start", id, requestId, classId: scope.classId, assignmentId: scope.assignmentId, binding });
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: scope.ownerId }; mocks.mode = "green"; mocks.override = null; mocks.enrolled = true; mocks.classFound = true; mocks.classId = scope.classId; mocks.read.mockResolvedValue(null); mocks.save.mockResolvedValue(undefined); mocks.search.mockResolvedValue({ status: "no_evidence", chunks: [] }); });
describe("material practice access and persistence", () => {
    it("withholds local material help until assignment assistance commits", async () => {
        assistance.mockRejectedValueOnce(new Error("assistance_receipt_unavailable"));
        const { document, binding } = await fixture();
        const created = await startMaterialSession(id, scope, binding, [document]);
        mocks.read.mockResolvedValue(created.state);
        const response = await POST(request({ action: "respond", id, requestId,
            expectedRevision: created.state.revision, mode: "hint", response: "", confirmed: true, modality: "typed" }));
        expect(response.status).toBe(503); expect((await response.json()).feedback).toBeUndefined();
        expect(assistance).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ ownerId: scope.ownerId,
            assignmentId: scope.assignmentId, requestId, selectedProblemId: null, channel: "local", kind: "hint" }),
            expect.objectContaining({ route: "learning/material-practice" }));
        expect(mocks.save).not.toHaveBeenCalled();
    });
    it("requires authentication, enrollment, owned assignment/class and the current effective assignment policy", async () => {
        const { binding } = await fixture(), body = start(binding);
        mocks.user = null;
        expect((await POST(request(body))).status).toBe(401);
        mocks.user = { id: scope.ownerId };
        mocks.enrolled = false;
        expect((await POST(request(body))).status).toBe(404);
        mocks.enrolled = true;
        mocks.classId = id;
        expect((await POST(request(body))).status).toBe(404);
        mocks.classId = scope.classId;
        mocks.mode = "yellow";
        expect((await POST(request(body))).status).toBe(403);
        mocks.mode = "green";
        mocks.override = "red";
        expect((await POST(request(body))).status).toBe(403);
        expect(mocks.load).not.toHaveBeenCalled();
        expect(mocks.save).not.toHaveBeenCalled();
        expect(mocks.eq).toHaveBeenCalledWith("owner_id", scope.ownerId);
    });
    it("keeps client answer keys, fabricated passages and approval flags out of requests", async () => {
        const { binding } = await fixture();
        for (const extra of [{ reviewed: true }, { expected: "arbitrary answer" }, { text: "forged passage" }])
            expect((await POST(request({ ...start(binding), ...extra }))).status).toBe(400);
        expect((await POST(request(start({ ...binding, passages: [{ ...binding.passages[0], text: "forged" }] } as unknown as MaterialBinding)))).status).toBe(400);
        expect(mocks.save).not.toHaveBeenCalled();
    });
    it("starts with owned sources and restores idempotently without exposing example answers", async () => {
        const { document, binding } = await fixture(), response = await POST(request(start(binding))), body = await response.json();
        expect(response.status).toBe(200);
        expect(body.activity.sources[0].text).toBe(document.blocks[0].text);
        expect(body.activity).not.toHaveProperty("example");
        expect(mocks.save).toHaveBeenCalledTimes(1);
        mocks.read.mockResolvedValue(body.state);
        expect((await POST(request(start(binding)))).status).toBe(200);
        expect(mocks.save).toHaveBeenCalledTimes(1);
        expect((await POST(request(start({ ...binding, task: "read" })))).status).toBe(409);
    });
    it("reconstructs historical revisions for retries and returns feedback only after a durable write", async () => {
        const { document, binding } = await fixture(), created = await startMaterialSession(id, scope, binding, [document]);
        mocks.read.mockResolvedValue(created.state);
        const body = { action: "respond", id, requestId, expectedRevision: 1, mode: "check", response: '"The room was warmer during the second trial."', modality: "typed", confirmed: true };
        const result = await POST(request(body));
        expect((await result.json()).feedback).toMatchObject({ outcome: "unverified", providerCalled: false });
        expect(mocks.read).toHaveBeenCalledWith(expect.anything(), scope.ownerId, id, 1);
        mocks.save.mockRejectedValueOnce(new Error("revision_conflict"));
        expect((await POST(request(body))).status).toBe(409);
        mocks.save.mockRejectedValueOnce(new Error("store_unavailable"));
        const unavailable = await POST(request(body));
        expect(unavailable.status).toBe(503);
        expect(await unavailable.json()).not.toHaveProperty("feedback");
    });
    it("searches pinned source versions with provider fallback disabled", async () => {
        const { document } = await fixture();
        const result = await GET(new Request("http://localhost/api/learning/material-practice?" + new URLSearchParams({ classId: scope.classId, assignmentId: scope.assignmentId, versionId: document.version.id, query: "temperature" })));
        expect(result.status).toBe(200);
        expect(mocks.search).toHaveBeenCalledWith({ ...scope, versionIds: [document.version.id], query: "temperature", allowSemanticFallback: false });
        expect(result.headers.get("Cache-Control")).toBe("no-store");
    });
});
