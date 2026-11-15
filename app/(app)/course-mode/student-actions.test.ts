import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  rpc: vi.fn(),
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
});
