import { describe, expect, it, vi } from "vitest";

import { AssignmentDraftCoordinator, assignmentDraftLabel } from "./assignment-draft-coordinator";

describe("AssignmentDraftCoordinator", () => {
  it("merges pending work and keeps newer edits when a sync must be restored", () => {
    const coordinator = new AssignmentDraftCoordinator();
    coordinator.queue("problem-1", { work: "first" });
    const syncing = coordinator.take("problem-1");
    coordinator.queue("problem-1", { work: "newer" });
    coordinator.restore("problem-1", syncing ?? {});

    expect(coordinator.get("problem-1")).toEqual({ work: "newer" });
  });

  it("reports one visible draft state", () => {
    const coordinator = new AssignmentDraftCoordinator();
    const listener = vi.fn();
    coordinator.subscribe(listener);
    coordinator.queue("problem-1", { workInk: "ink" });
    coordinator.localOnly();
    coordinator.retryableError("Try again");

    expect(coordinator.snapshot()).toMatchObject({ state: "retryable_error", error: "Try again" });
    expect(assignmentDraftLabel("local_only")).toBe("Saved on this device");
    expect(listener).toHaveBeenCalled();
  });

  it("does not let a later concurrent success mask a pending retryable error", () => {
    const coordinator = new AssignmentDraftCoordinator();
    coordinator.queue("problem-1", { work: "first" });
    coordinator.queue("problem-2", { answer: "second" });

    const failedPatch = coordinator.take("problem-1");
    coordinator.take("problem-2");
    coordinator.restore("problem-1", failedPatch ?? {});
    coordinator.retryableError("Try the save again");

    coordinator.synced();

    expect(coordinator.snapshot()).toEqual({
      state: "retryable_error",
      error: "Try the save again",
      pendingProblemIds: ["problem-1"],
    });

    coordinator.take("problem-1");
    coordinator.syncing();
    coordinator.synced();
    expect(coordinator.snapshot()).toMatchObject({ state: "synced", error: "" });
  });
});
