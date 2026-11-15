import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: { id: "00000000-0000-4000-8000-000000000001" } as {
        id: string;
    } | null, enabled: true, eq: vi.fn(), single: vi.fn(), rows: [] as unknown[] }));
vi.mock("@/lib/learning-engine/server", () => ({ learningAccess: async () => mocks.enabled, createLearningClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) }, from: () => { const q = { select: () => q, eq: (...args: unknown[]) => { mocks.eq(...args); return q; }, order: () => q, limit: async () => ({ data: [...mocks.rows], error: null }), maybeSingle: mocks.single }; return q; } }) }));
import { GET } from "./route";
const assignmentId = "00000000-0000-4000-8000-000000000002", pinned = "a".repeat(64);
const url = (suffix = "") => new Request("http://localhost/api/learning/documents?assignmentId=" + assignmentId + suffix);
const row = (id: string) => ({ id, metadata: {}, pages: [{ page: 1, pageLabel: "1", text: "Pinned source page", interpretation: "original" }], created_at: "2026-09-25T00:00:00Z" });
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: "00000000-0000-4000-8000-000000000001" }; mocks.enabled = true; mocks.rows = [row("b".repeat(64))]; mocks.single.mockResolvedValue({ data: row(pinned), error: null }); });
it("includes an older cited source version outside the recent list with ownership and assignment filters", async () => {
    const result = await GET(url("&versionId=" + pinned));
    expect(result.status).toBe(200);
    expect((await result.json()).documents.map((item: {
        id: string;
    }) => item.id)).toEqual(["b".repeat(64), pinned]);
    expect(mocks.eq).toHaveBeenCalledWith("owner_id", mocks.user!.id);
    expect(mocks.eq).toHaveBeenCalledWith("assignment_id", assignmentId);
    expect(mocks.eq).toHaveBeenCalledWith("id", pinned);
});
it("does not duplicate a recent pinned version or accept invalid version identifiers", async () => {
    mocks.rows = [row(pinned)];
    expect((await (await GET(url("&versionId=" + pinned))).json()).documents).toHaveLength(1);
    expect(mocks.single).not.toHaveBeenCalled();
    expect((await GET(url("&versionId=invalid"))).status).toBe(400);
});
it("retains authentication, enrollment and source-read failure boundaries", async () => {
    mocks.user = null;
    expect((await GET(url())).status).toBe(401);
    mocks.user = { id: assignmentId };
    mocks.enabled = false;
    expect((await GET(url())).status).toBe(404);
    mocks.enabled = true;
    mocks.single.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    expect((await GET(url("&versionId=" + pinned))).status).toBe(503);
});
