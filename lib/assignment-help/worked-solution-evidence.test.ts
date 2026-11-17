import { describe, expect, it, vi } from "vitest";
import {
  observeWorkedSolutionEvidence,
  recordWorkedSolutionDelivery,
} from "../../supabase/functions/_shared/learning/worked-solution-evidence";

const ownerId = "a59ca8e4-07b2-42dc-b3fc-c5af8f6a75b1";
const assignmentId = "7eee7a4e-2b80-4976-8b6c-8a92896d72e4";
const problemId = "28c6efe2-3e3b-45cc-894c-e8700aa6f379";
const attemptId = "e9780054-be69-4e32-bacc-ef069c837a81";
const scope = {
  problemId,
  problemText: "Solve 2x + 5 = 11.",
  studentWork: "Saved reasoning: Subtract 5: 2x = 6",
  attemptId,
  problemVersion: "a".repeat(64),
  attemptDigest: "b".repeat(64),
  attemptCount: 3,
  stuckRequests: 2,
  requiresSupport: false,
};

function fixture(overrides: Record<string, unknown> = {}) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: problemId }, error: null }),
  };
  const from = vi.fn(() => query);
  const rpc = vi.fn().mockResolvedValue({
    data: {
      ...scope,
      hasAccommodation: false, lowEnergy: false, scatteredFocus: false,
      ...overrides,
    },
    error: null,
  });
  const serviceClient = { rpc };
  const input = {
    userClient: { from }, serviceClient, ownerId, assignmentId, problemId,
    mode: "guide", question: "I’m still stuck.",
  };
  return { input, query, from, rpc, serviceClient };
}

describe("worked solution evidence boundary", () => {
  it("selects the owned problem and supplies only authenticated identifiers and the current explicit stuck bit to SQL", async () => {
    const { input, query, rpc } = fixture();
    expect(await observeWorkedSolutionEvidence(input)).toEqual({
      decision: { allowed: true, support: "worked_solution", reason: "sustained_difficulty" },
      scope,
    });
    expect(query.eq.mock.calls).toEqual([
      ["id", problemId], ["assignment_id", assignmentId], ["owner_id", ownerId],
    ]);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("observe_tutor_problem_effort", {
      p_owner: ownerId, p_assignment: assignmentId, p_problem: problemId, p_stuck: true,
    });
  });

  it("never counts a direct answer request as a new stuck statement", async () => {
    const { input, rpc } = fixture({ attemptCount: 1, stuckRequests: 0 });
    const decision = await observeWorkedSolutionEvidence({ ...input, question: "I’m stuck. Just tell me the answer." });
    expect(decision).toMatchObject({ decision: { allowed: false } });
    expect(decision.scope).toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("observe_tutor_problem_effort", expect.objectContaining({ p_stuck: false }));
  });

  it("requires the continued effort and a bound current cofactor for the lower threshold", async () => {
    const standard = fixture({ attemptCount: 2 });
    const supported = fixture({ attemptCount: 2, lowEnergy: true });
    expect((await observeWorkedSolutionEvidence(standard.input)).decision.allowed).toBe(false);
    expect(await observeWorkedSolutionEvidence(supported.input)).toMatchObject({
      decision: { allowed: true }, scope: { attemptCount: 2, stuckRequests: 2, requiresSupport: true },
    });
  });

  it("does not call the ledger without an owned problem or an eligible mode", async () => {
    const { input, from, query, rpc } = fixture();
    expect((await observeWorkedSolutionEvidence({ ...input, mode: "hint" })).decision.allowed).toBe(false);
    expect(from).not.toHaveBeenCalled();
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect((await observeWorkedSolutionEvidence(input)).decision.allowed).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("denies malformed evidence, foreign problem IDs, and storage outages", async () => {
    const malformed = fixture({ attemptCount: 3, stuckRequests: 4 });
    const mismatched = fixture({ problemId: attemptId });
    await expect(observeWorkedSolutionEvidence(malformed.input)).resolves.toMatchObject({ decision: { allowed: false } });
    await expect(observeWorkedSolutionEvidence(mismatched.input)).resolves.toMatchObject({ decision: { allowed: false } });
    malformed.rpc.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(observeWorkedSolutionEvidence(malformed.input)).resolves.toMatchObject({ decision: { allowed: false } });
  });

  it("binds the delivery to the exact attempt and only accepts a confirmed write", async () => {
    const { serviceClient, rpc } = fixture();
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });
    const input = { serviceClient, ownerId, assignmentId, scope };
    await expect(recordWorkedSolutionDelivery(input)).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("record_tutor_worked_solution_delivery", {
      p_owner: ownerId, p_assignment: assignmentId, p_problem: problemId, p_attempt: attemptId,
      p_version: scope.problemVersion, p_digest: scope.attemptDigest,
      p_attempt_count: 3, p_stuck_count: 2, p_requires_support: false,
    });
    await expect(recordWorkedSolutionDelivery(input)).resolves.toBe(false);
    await expect(recordWorkedSolutionDelivery({ ...input, scope: { ...scope, attemptDigest: "invalid" } })).resolves.toBe(false);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});
