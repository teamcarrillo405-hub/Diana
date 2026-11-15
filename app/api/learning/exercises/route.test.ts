import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  user: { id: "student-owner" } as { id: string } | null,
  allowed: true,
  invoke: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  filters: [] as Array<[string, string, unknown]>,
  blocks: [] as Array<{ id: string; owner_id: string; version_id: string; payload: unknown }>,
  blockError: null as { message: string } | null,
}));

vi.mock("@/lib/learning-engine/server", () => ({
  learningAccess: async () => mock.allowed,
  createLearningClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mock.user } }) },
    functions: { invoke: mock.invoke },
    rpc: mock.rpc,
    from: mock.from,
  }),
}));

import { POST } from "./route";

const assignmentId = "0a56fa43-3e0a-4fc1-9f43-dc65c529f080";
const versionId = "b".repeat(64);
const blockId = "a".repeat(64);
const sourceText = "Students planned a school garden. They measured rainfall and compared plants. The principal asked for a maintenance schedule before the garden could expand.";
const legacyPrompt = "What can you infer from this passage? Show the detail you used.";
const exercise = (reviewed = false) => ({ id: blockId + ":inference", version_id: versionId,
  skill_id: "reading.inference", prompt: legacyPrompt, reviewed, next_revision: 1 });
const payload = () => ({ id: blockId, text: sourceText, kind: "paragraph", needsConfirmation: false, problemNumber: null,
  location: { page: 4, pageLabel: "Page 4", startOffset: 20, endOffset: 20 + sourceText.length } });
const request = (body: unknown = { assignmentId, versionId }) => new Request("http://localhost/api/learning/exercises", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  mock.user = { id: "student-owner" };
  mock.allowed = true;
  mock.filters = [];
  mock.blockError = null;
  mock.blocks = [{ id: blockId, owner_id: "student-owner", version_id: versionId, payload: payload() }];
  mock.invoke.mockResolvedValue({ data: { ok: true, coverage: {
    exerciseLimitReached: false, exerciseLimit: 30, scope: "one_reading_excerpt", sourceBlocks: 1,
  } }, error: null });
  mock.rpc.mockResolvedValue({ data: [exercise()], error: null });
  mock.from.mockImplementation((table: string) => {
    const query: Array<[string, unknown]> = [];
    const chain = {
      select: () => chain,
      eq: (column: string, value: unknown) => { query.push([column, value]); mock.filters.push([table, column, value]); return chain; },
      in: async (column: string, values: unknown[]) => {
        mock.filters.push([table, column, values]);
        const rows = mock.blocks.filter(row => query.every(([key, value]) => row[key as keyof typeof row] === value)
          && values.includes(row[column as keyof typeof row]));
        return { data: rows.map(row => ({ id: row.id, payload: row.payload })), error: mock.blockError };
      },
    };
    return chain;
  });
});

describe("practice exercise route", () => {
  it("rejects anonymous requests before any preparation or data query", async () => {
    mock.user = null;
    expect((await POST(request())).status).toBe(401);
    expect(mock.invoke).not.toHaveBeenCalled();
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("retains the assessment rollout gate", async () => {
    mock.allowed = false;
    expect((await POST(request())).status).toBe(404);
    expect(mock.invoke).not.toHaveBeenCalled();
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("rejects an invalid assignment or source version before invoking the service", async () => {
    expect((await POST(request({ assignmentId: "not-an-id", versionId }))).status).toBe(400);
    expect(mock.invoke).not.toHaveBeenCalled();
  });

  it("attaches the original excerpt to a legacy unreviewed prompt without mutating its saved record", async () => {
    const saved = exercise();
    mock.rpc.mockResolvedValue({ data: [saved], error: null });
    const response = await POST(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.exercises[0]).toMatchObject({ id: saved.id, reviewed: false, pageNumber: 4, label: "inference" });
    expect(body.exercises[0].prompt).toContain("Source excerpt (Page 4):\n" + sourceText);
    expect(body.exercises[0].prompt).toContain("About this excerpt:");
    expect(saved.prompt).toBe(legacyPrompt);
    expect(mock.invoke).toHaveBeenCalledWith("learning-prepare", { body: { assignmentId, versionId } });
    expect(mock.rpc).toHaveBeenCalledWith("learning_list_exercises", { p_assignment: assignmentId, p_versions: [versionId] });
    expect(mock.filters).toEqual([
      ["learning_blocks", "owner_id", "student-owner"],
      ["learning_blocks", "version_id", versionId],
      ["learning_blocks", "id", [blockId]],
    ]);
  });

  it("preserves the educator-reviewed prompt exactly", async () => {
    const reviewed = { ...exercise(true), prompt: "Educator's prompt\nwith intentional formatting." };
    mock.rpc.mockResolvedValue({ data: [reviewed], error: null });
    const body = await (await POST(request())).json();
    expect(body.exercises[0].prompt).toBe(reviewed.prompt);
    expect(body.exercises[0].reviewed).toBe(true);
  });

  it.each([
    { owner_id: "another-student", version_id: versionId },
    { owner_id: "student-owner", version_id: "c".repeat(64) },
  ])("does not attach source content outside the owned current version: %j", async (scope) => {
    mock.blocks = [{ id: blockId, ...scope, payload: { ...payload(), text: "Private unrelated source. ".repeat(10) } }];
    const body = await (await POST(request())).json();
    expect(body.exercises[0].prompt).toBe(legacyPrompt);
    expect(JSON.stringify(body)).not.toContain("Private unrelated source");
    expect(mock.filters).toContainEqual(["learning_blocks", "owner_id", "student-owner"]);
    expect(mock.filters).toContainEqual(["learning_blocks", "version_id", versionId]);
  });

  it("does not silently treat unconfirmed extracted text as the exercise's original excerpt", async () => {
    mock.blocks[0].payload = { ...payload(), needsConfirmation: true };
    const body = await (await POST(request())).json();
    expect(body.exercises[0].prompt).toBe(legacyPrompt);
    expect(body.exercises[0].prompt).not.toContain(sourceText);
  });

  it("forwards the explicit source-size limit without querying or returning an arbitrary practice subset", async () => {
    mock.invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({
      sourceTruncated: true, error: "Internal detail that must not be forwarded", sourceBlockLimit: 10000,
    }), { status: 422, headers: { "Content-Type": "application/json" } }) } });
    const response = await POST(request());
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Choose a chapter or a shorter source to prepare practice.", sourceTruncated: true });
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("does not mislabel unrelated provider errors as source truncation", async () => {
    mock.invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ error: "Another issue" }), { status: 422 }) } });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Practice is unavailable right now." });
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("forwards validated practice scope and limits while stripping unrelated backend fields", async () => {
    mock.invoke.mockResolvedValue({ data: { coverage: {
      exerciseLimitReached: true, exerciseLimit: 30, scope: "supported_equation_values", privateDebug: "not client data",
    } }, error: null });
    const body = await (await POST(request())).json();
    expect(body.coverage).toEqual({ exerciseLimitReached: true, exerciseLimit: 30, scope: "supported_equation_values" });
    expect(JSON.stringify(body)).not.toContain("privateDebug");
  });

  it("omits malformed coverage instead of making an unsupported coverage claim", async () => {
    mock.invoke.mockResolvedValue({ data: { coverage: { exerciseLimitReached: false, exerciseLimit: -1, scope: "all_textbook_exercises" } }, error: null });
    const body = await (await POST(request())).json();
    expect(body).not.toHaveProperty("coverage");
  });

  it("does not return partially sourced questions when source access fails", async () => {
    mock.blockError = { message: "source lookup unavailable" };
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Question order is unavailable." });
  });
});
