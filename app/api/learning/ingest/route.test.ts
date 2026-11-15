import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  user: { id: "student-owner" } as { id: string } | null,
  allowed: true,
  loadKernel: vi.fn(),
  indexSource: vi.fn(),
  enqueuePdf: vi.fn(),
  invoke: vi.fn(),
  filters: [] as Array<[string, unknown]>,
  source: { mime_type: "text/plain" } as { mime_type: string } | null,
  sourceError: null as { message: string } | null,
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: mock.user } }) },
  functions: { invoke: mock.invoke },
  from: () => {
    const chain = {
      select: () => chain,
      eq: (column: string, value: unknown) => { mock.filters.push([column, value]); return chain; },
      maybeSingle: async () => ({ data: mock.source, error: mock.sourceError }),
    };
    return chain;
  },
}) }));
vi.mock("@/lib/assignment-help/server-understanding", () => ({ loadAssignmentHomeworkKernel: mock.loadKernel }));
vi.mock("@/lib/learning-engine/server", () => ({ indexAssignmentSource: mock.indexSource, learningAccess: async () => mock.allowed }));
vi.mock("@/lib/learning-engine/ingestion", () => ({ enqueuePdf: mock.enqueuePdf }));

import { POST } from "./route";

const assignmentId = "0a56fa43-3e0a-4fc1-9f43-dc65c529f080";
const sourceId = "4e743a64-5a1b-462c-a6e5-651a9b87983c";
const versionId = "b".repeat(64);
const kernel = { assignment: { id: assignmentId }, sources: [{ id: sourceId, extracted_text: "Original classroom source." }] };
const request = (body: unknown = { assignmentId, sourceId: "assignment-directions", subject: "reading" }) => new Request("http://localhost/api/learning/ingest", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  mock.user = { id: "student-owner" };
  mock.allowed = true;
  mock.source = { mime_type: "text/plain" };
  mock.sourceError = null;
  mock.filters = [];
  mock.loadKernel.mockResolvedValue(kernel);
  mock.indexSource.mockResolvedValue({ status: "ready", versionId, blockCount: 2, chunkCount: 2 });
  mock.enqueuePdf.mockResolvedValue({ jobId: "pending-job", status: "queued" });
  mock.invoke.mockRejectedValue(new Error("No hosted model is configured."));
});

describe("local material preparation", () => {
  it.each(["english","science","history","computing","other"])("prepares %s text and PDF without routing to a hosted provider",async subject=>{
    expect((await POST(request({assignmentId,sourceId,subject}))).status).toBe(200);
    expect(mock.indexSource).toHaveBeenCalledWith(expect.objectContaining({subject}));
    mock.source={mime_type:"application/pdf"};expect((await POST(request({assignmentId,sourceId,subject}))).status).toBe(200);
    expect(mock.enqueuePdf).toHaveBeenCalledWith(expect.objectContaining({subject}));expect(mock.invoke).not.toHaveBeenCalled();
  });
  it.each(["ready", "needs_confirmation"])("indexes ordinary text with status %s and makes zero hosted function requests", async (status) => {
    mock.indexSource.mockResolvedValue({ status, versionId, blockCount: 2, chunkCount: 2 });
    const response = await POST(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toEqual({ ok: true, status, versionId, blockCount: 2, chunkCount: 2,
      semanticIndex: { status: "not_requested", requested: false } });
    expect(mock.indexSource).toHaveBeenCalledWith({ ownerId: "student-owner", kernel, assignmentId,
      sourceId: "assignment-directions", subject: "reading" });
    expect(mock.invoke).not.toHaveBeenCalled();
    expect(mock.enqueuePdf).not.toHaveBeenCalled();
  });

  it("checks a file's owner and assignment before local text indexing", async () => {
    const response = await POST(request({ assignmentId, sourceId, subject: "math" }));
    expect(response.status).toBe(200);
    expect(mock.filters).toEqual([["id", sourceId], ["owner_id", "student-owner"], ["assignment_id", assignmentId]]);
    expect(mock.loadKernel).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "student-owner", assignmentId }));
    expect(mock.indexSource).toHaveBeenCalledWith({ ownerId: "student-owner", kernel, assignmentId, sourceId, subject: "math" });
    expect(mock.invoke).not.toHaveBeenCalled();
  });

  it("rejects anonymous preparation before any indexing", async () => {
    mock.user = null;
    expect((await POST(request())).status).toBe(401);
    expect(mock.loadKernel).not.toHaveBeenCalled();
    expect(mock.indexSource).not.toHaveBeenCalled();
    expect(mock.invoke).not.toHaveBeenCalled();
  });

  it("preserves the retrieval access gate", async () => {
    mock.allowed = false;
    expect((await POST(request())).status).toBe(404);
    expect(mock.loadKernel).not.toHaveBeenCalled();
    expect(mock.indexSource).not.toHaveBeenCalled();
    expect(mock.invoke).not.toHaveBeenCalled();
  });

  it("rejects unsupported source input before loading or indexing an assignment", async () => {
    expect((await POST(request({ assignmentId, sourceId: "another-system", subject: "reading" }))).status).toBe(400);
    expect(mock.loadKernel).not.toHaveBeenCalled();
    expect(mock.indexSource).not.toHaveBeenCalled();
  });

  it("returns a missing owned assignment accurately", async () => {
    mock.loadKernel.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Assignment not found." });
    expect(mock.indexSource).not.toHaveBeenCalled();
    expect(mock.invoke).not.toHaveBeenCalled();
  });

  it("does not index a file whose owned source record is absent", async () => {
    mock.source = null;
    const response = await POST(request({ assignmentId, sourceId, subject: "reading" }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Source not found." });
    expect(mock.indexSource).not.toHaveBeenCalled();
    expect(mock.enqueuePdf).not.toHaveBeenCalled();
    expect(mock.invoke).not.toHaveBeenCalled();
  });

  it("reports a source-access outage separately from a missing source", async () => {
    mock.source = null;
    mock.sourceError = { message: "database unavailable" };
    const response = await POST(request({ assignmentId, sourceId, subject: "reading" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Source access could not be checked." });
    expect(mock.indexSource).not.toHaveBeenCalled();
    expect(mock.invoke).not.toHaveBeenCalled();
  });

  it("preserves the local source failure instead of presenting an embedding failure", async () => {
    mock.indexSource.mockRejectedValue(new Error("The source is not ready to index."));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "The source is not ready to index." });
    expect(mock.invoke).not.toHaveBeenCalled();
  });
});
