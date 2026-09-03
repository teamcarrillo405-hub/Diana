import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/assignment-help/server-understanding", () => ({ loadAssignmentHomeworkKernel: vi.fn() }));
vi.mock("./actions", () => ({ transitionAssignment: vi.fn() }));

import { markProblemDone, markProblemReviewed, startAssignmentWorkspace } from "./hm-actions";

const problemId = "11111111-1111-4111-8111-111111111111";
const assignmentId = "22222222-2222-4222-8222-222222222222";

function fluentResult(data: unknown) {
  const query = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.select.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function clientForRows(rows: unknown[]) {
  const queries = rows.map(fluentResult);
  const assignmentProblems = [...queries];
  const authorshipInsert = vi.fn().mockResolvedValue({ error: null });
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "student-1" } } }) },
    from: vi.fn((table: string) => {
      if (table === "authorship_log") return { insert: authorshipInsert };
      if (table === "assignment_problems") {
        const next = assignmentProblems.shift();
        if (!next) throw new Error("Unexpected assignment problem query");
        return next;
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  };
  mocks.createClient.mockResolvedValue(client);
  return { client, authorshipInsert, queries };
}

function clientForAssignmentStatus(status: string | null) {
  const assignmentQuery = fluentResult(status ? { status } : null);
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "student-1" } } }) },
    from: vi.fn((table: string) => {
      if (table === "assignments") return assignmentQuery;
      throw new Error(`Unexpected table ${table}`);
    }),
  };
  mocks.createClient.mockResolvedValue(client);
  return { assignmentQuery, client };
}

describe("assignment problem progress actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves a new workspace from to do to drafting", async () => {
    const { assignmentQuery } = clientForAssignmentStatus("todo");
    const transitionAssignment = vi.mocked(await import("./actions")).transitionAssignment;
    transitionAssignment.mockResolvedValue({ ok: true });

    await expect(startAssignmentWorkspace({ assignmentId })).resolves.toEqual({ ok: true });
    expect(assignmentQuery.eq).toHaveBeenCalledWith("owner_id", "student-1");
    expect(transitionAssignment).toHaveBeenCalledWith({ id: assignmentId, from: "todo", to: "drafting" });
  });

  it("does not reopen an assignment that is already in progress", async () => {
    clientForAssignmentStatus("drafting");
    const transitionAssignment = vi.mocked(await import("./actions")).transitionAssignment;

    await expect(startAssignmentWorkspace({ assignmentId })).resolves.toEqual({ ok: true });
    expect(transitionAssignment).not.toHaveBeenCalled();
  });

  it("records a Diana review without completing the problem", async () => {
    const reviewedAt = "2026-08-11T12:00:00.000Z";
    const reviewedSnapshot = { work: "x = 5" };
    const updatedAt = "2026-08-11T11:59:00.000Z";
    const { authorshipInsert, queries } = clientForRows([
      { student_work: reviewedSnapshot, updated_at: updatedAt },
      {
        assignment_id: assignmentId,
        progress_status: "in_progress",
        reviewed_at: reviewedAt,
        completed_at: null,
      },
    ]);

    await expect(markProblemReviewed({ problemId, reviewedSnapshot })).resolves.toEqual({
      ok: true,
      progressStatus: "in_progress",
      reviewedAt,
      completedAt: null,
    });
    expect(queries[1].eq).toHaveBeenCalledWith("updated_at", updatedAt);
    expect(authorshipInsert).toHaveBeenCalledWith(expect.objectContaining({
      assignment_id: assignmentId,
      actor: "diana",
      event_type: "problem_reviewed",
    }));
  });

  it("does not mark a newer work revision reviewed", async () => {
    const reviewedSnapshot = { work: "Subtract 4 from both sides." };
    const { authorshipInsert, client } = clientForRows([{
      student_work: { work: "Subtract 4 from both sides, then divide." },
      updated_at: "2026-08-11T12:00:01.000Z",
    }]);

    await expect(markProblemReviewed({ problemId, reviewedSnapshot })).resolves.toEqual({
      ok: false,
      error: "Your work changed while Diana was reviewing. Review the latest version when you're ready.",
    });
    expect(client.from).toHaveBeenCalledTimes(1);
    expect(authorshipInsert).not.toHaveBeenCalled();
  });

  it("rejects a save that lands between snapshot verification and the review update", async () => {
    const reviewedSnapshot = { work: "Subtract 4 from both sides." };
    const updatedAt = "2026-08-11T12:00:00.000Z";
    const { authorshipInsert, queries } = clientForRows([
      { student_work: reviewedSnapshot, updated_at: updatedAt },
      null,
    ]);

    await expect(markProblemReviewed({ problemId, reviewedSnapshot })).resolves.toEqual({
      ok: false,
      error: "Your work changed while Diana was reviewing. Review the latest version when you're ready.",
    });
    expect(queries[1].eq).toHaveBeenCalledWith("updated_at", updatedAt);
    expect(authorshipInsert).not.toHaveBeenCalled();
  });

  it("requires student work and a Diana review before completion", async () => {
    clientForRows([{
      assignment_id: assignmentId,
      student_work: { work: "x = 5" },
      reviewed_at: null,
    }]);

    await expect(markProblemDone({ problemId })).resolves.toEqual({
      ok: false,
      error: "Review this problem before marking it done.",
    });
  });

  it("persists completion and the student authorship event", async () => {
    const reviewedAt = "2026-08-11T12:00:00.000Z";
    const completedAt = "2026-08-11T12:05:00.000Z";
    const { authorshipInsert } = clientForRows([
      { assignment_id: assignmentId, student_work: { work: "x = 5" }, reviewed_at: reviewedAt },
      { progress_status: "done", reviewed_at: reviewedAt, completed_at: completedAt },
    ]);

    await expect(markProblemDone({ problemId })).resolves.toEqual({
      ok: true,
      progressStatus: "done",
      reviewedAt,
      completedAt,
    });
    expect(authorshipInsert).toHaveBeenCalledWith(expect.objectContaining({
      assignment_id: assignmentId,
      actor: "student",
      event_type: "problem_marked_done",
    }));
  });
});
