import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  rpc: vi.fn(),
  expiresAt: null as string | null,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  saveAssessmentResponseDraft,
  startAssessmentAttempt,
  submitAssessmentAttempt,
} from "./student-actions";

const userId = "11111111-1111-4111-8111-111111111111";
const blueprintId = "22222222-2222-4222-8222-222222222222";
const attemptId = "33333333-3333-4333-8333-333333333333";
const firstItemId = "44444444-4444-4444-8444-444444444444";
const secondItemId = "55555555-5555-4555-8555-555555555555";

function assessmentAttemptQuery() {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({
      data: {
        id: attemptId,
        blueprint_id: blueprintId,
        student_id: userId,
        status: "in_progress",
        expires_at: mocks.expiresAt,
      },
      error: null,
    })),
  };
  return chain;
}

function assessmentItemsQuery() {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(async () => ({
        data: [{ id: firstItemId }, { id: secondItemId }],
        error: null,
      })),
    })),
  };
}

describe("Course Mode student assessment actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.expiresAt = null;
    const attemptQuery = assessmentAttemptQuery();
    const itemQuery = assessmentItemsQuery();
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: userId } } })),
      },
      from: vi.fn((table: string) => {
        if (table === "assessment_attempts") return attemptQuery;
        if (table === "assessment_items") return itemQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
      rpc: mocks.rpc,
    });
  });

  afterEach(() => { vi.useRealTimers(); });

  it("saves a draft through the existing response RPC", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null });

    await expect(saveAssessmentResponseDraft({
      blueprintId,
      attemptId,
      itemId: firstItemId,
      response: "Draft response",
    })).resolves.toEqual({ ok: true });

    expect(mocks.rpc).toHaveBeenCalledWith("save_assessment_response", {
      p_attempt_id: attemptId,
      p_item_id: firstItemId,
      p_response: "Draft response",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns the signed student to the assessment inside their class after starting", async () => {
    const classId = "66666666-6666-4666-8666-666666666666";
    const input = new FormData();
    input.set("classId", classId);
    input.set("blueprintId", blueprintId);
    mocks.rpc.mockResolvedValueOnce({ data: attemptId, error: null });

    await startAssessmentAttempt(input);

    expect(mocks.rpc).toHaveBeenCalledWith("start_assessment_attempt", { p_blueprint_id: blueprintId });
    expect(mocks.redirect).toHaveBeenCalledWith(`/classes/${classId}/assessments/${blueprintId}?status=started`);
  });

  it("keeps the attempt open when any response is empty", async () => {
    const result = await submitAssessmentAttempt({
      blueprintId,
      attemptId,
      responses: [
        { itemId: firstItemId, response: "Ready" },
        { itemId: secondItemId, response: "" },
      ],
    });

    expect(result).toEqual({
      ok: false,
      message: "Add a response to every question before submitting.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("flushes every response before the existing submission RPC", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({
        data: { submitted: true, requiresTeacherScore: true },
        error: null,
      });

    const result = await submitAssessmentAttempt({
      blueprintId,
      attemptId,
      responses: [
        { itemId: firstItemId, response: "Response one" },
        { itemId: secondItemId, response: ["A", "C"] },
      ],
    });

    expect(result).toEqual({ ok: true, status: "teacher-review" });
    expect(mocks.rpc.mock.calls).toEqual([
      ["save_assessment_response", {
        p_attempt_id: attemptId,
        p_item_id: firstItemId,
        p_response: "Response one",
      }],
      ["save_assessment_response", {
        p_attempt_id: attemptId,
        p_item_id: secondItemId,
        p_response: ["A", "C"],
      }],
      ["submit_assessment_attempt", { p_attempt_id: attemptId }],
    ]);
  });

  it("submits an expired attempt from stored responses and ignores client edits", async () => {
    mocks.expiresAt = "2026-11-17T18:00:00Z";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T18:00:01Z"));
    mocks.rpc.mockResolvedValueOnce({ data: { submitted: true, requiresTeacherScore: false }, error: null });

    const result = await submitAssessmentAttempt({
      blueprintId, attemptId, responses: [{ itemId: firstItemId, response: "Change after expiry" }],
    });

    expect(result).toEqual({ ok: true, status: "scored" });
    expect(mocks.rpc.mock.calls).toEqual([["submit_assessment_attempt", { p_attempt_id: attemptId }]]);
  });

  it("preserves the database rule for missing saved responses after expiry", async () => {
    mocks.expiresAt = "2026-11-17T18:00:00Z";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T18:00:01Z"));
    mocks.rpc.mockResolvedValueOnce({
      data: { submitted: false, reason: "Every assessment item needs a response." }, error: null,
    });

    const result = await submitAssessmentAttempt({ blueprintId, attemptId, responses: [] });

    expect(result).toEqual({ ok: false, message: "Some responses weren’t saved before time ended. Ask your teacher to reopen this attempt." });
    expect(mocks.rpc.mock.calls).toEqual([["submit_assessment_attempt", { p_attempt_id: attemptId }]]);
  });

  it("continues with saved responses when time ends during the final server save", async () => {
    mocks.expiresAt = "2026-11-17T18:00:01Z";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T18:00:00Z"));
    mocks.rpc.mockImplementationOnce(async () => {
      vi.setSystemTime(new Date("2026-11-17T18:00:02Z"));
      return { data: false, error: null };
    }).mockResolvedValueOnce({ data: { submitted: true, requiresTeacherScore: true }, error: null });

    const result = await submitAssessmentAttempt({ blueprintId, attemptId, responses: [
      { itemId: firstItemId, response: "Response one" },
      { itemId: secondItemId, response: "A" },
    ] });

    expect(result).toEqual({ ok: true, status: "teacher-review" });
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual(["save_assessment_response", "submit_assessment_attempt"]);
  });
});
