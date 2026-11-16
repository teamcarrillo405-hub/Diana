import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/assignment-help/server-understanding", () => ({ loadAssignmentHomeworkKernel: vi.fn() }));
vi.mock("./actions", () => ({ transitionAssignment: vi.fn() }));

import { loadAssignmentHomeworkKernel } from "@/lib/assignment-help/server-understanding";
import { transitionAssignment } from "./actions";
import { confirmAssignmentProblemText, markProblemDone, markProblemReviewed, prepareAssignmentReview } from "./hm-actions";

const problemId = "11111111-1111-4111-8111-111111111111";
const assignmentId = "22222222-2222-4222-8222-222222222222";

function fluentResult(data: unknown) {
  const query = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.select.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
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

describe("submission review readiness for saved sections", () => {
  it.each([
    { work: "The interview explains why families used the evening hours.", ready: true },
    { work: "  ", ready: false },
  ])("requires student work when the section has no artifact block ($ready)", async ({ work, ready }) => {
    vi.clearAllMocks();
    vi.mocked(loadAssignmentHomeworkKernel).mockResolvedValue({
      assignment: { title: "Evidence and Claims", work_profile: "writing" },
      profile: { legacyMode: "writing", artifactType: null },
    } as unknown as Awaited<ReturnType<typeof loadAssignmentHomeworkKernel>>);
    vi.mocked(transitionAssignment).mockResolvedValue({ ok: true });

    const assignmentQuery = fluentResult({ status: "checking", saved_work: {} });
    const problemQuery = fluentResult(null);
    problemQuery.eq.mockReturnValueOnce(problemQuery).mockResolvedValueOnce({ data: [
      { problem_number: 1, problem_text: "Compare two primary sources.", student_work: { work } },
    ] });
    const artifactQuery = { ...fluentResult(null), order: vi.fn().mockResolvedValue({ data: [] }) };
    artifactQuery.select.mockReturnValue(artifactQuery);
    artifactQuery.eq.mockReturnValue(artifactQuery);
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "student-1" } } }) },
      from: vi.fn((table: string) => ({ assignments: assignmentQuery, assignment_problems: problemQuery, artifact_blocks: artifactQuery })[table]),
    });

    const result = await prepareAssignmentReview({ assignmentId });

    if (ready) {
      expect(result).toEqual({ ok: true });
      expect(transitionAssignment).toHaveBeenCalledWith({ id: assignmentId, from: "checking", to: "exporting" });
    } else {
      expect(result).toEqual({ ok: false, error: "Add a little of your own work before reviewing the submission." });
      expect(transitionAssignment).not.toHaveBeenCalled();
    }
  });
});

describe("assignment problem progress actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("binds imported text confirmation to the owner, assignment and exact saved wording", async () => {
    const { queries } = clientForRows([{ id: problemId }]);
    await expect(confirmAssignmentProblemText({ assignmentId, problemId, expectedText: "Solve 7x = 21" })).resolves.toEqual({ ok: true });
    expect(queries[0].update).toHaveBeenCalledWith(expect.objectContaining({ source: "student_confirmed_source" }));
    expect(queries[0].eq).toHaveBeenCalledWith("id", problemId);
    expect(queries[0].eq).toHaveBeenCalledWith("assignment_id", assignmentId);
    expect(queries[0].eq).toHaveBeenCalledWith("owner_id", "student-1");
    expect(queries[0].eq).toHaveBeenCalledWith("problem_text", "Solve 7x = 21");
    expect(queries[0].eq).toHaveBeenCalledWith("unit_type", "problem");
    expect(queries[0].in).toHaveBeenCalledWith("source", ["assignment_source", "photo_scan"]);
  });

  it("does not confirm a changed or inaccessible imported problem", async () => {
    const { queries } = clientForRows([null]);
    await expect(confirmAssignmentProblemText({ assignmentId, problemId, expectedText: "Solve 7x = 21" }))
      .resolves.toEqual({ ok: false, error: "This problem changed. Reopen it before confirming the wording." });
    expect(queries[0].update).toHaveBeenCalledTimes(1);
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
