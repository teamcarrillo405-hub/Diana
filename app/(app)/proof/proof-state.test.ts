import { describe, expect, it } from "vitest";

import { selectLatestProofMilestone } from "./proof-state";

describe("selectLatestProofMilestone", () => {
  const completed = [
    {
      id: "signal-1",
      occurred_at: "2026-09-14T16:30:00.000Z",
      assignments: {
        id: "assignment-1",
        title: "Identity quote response",
        kind: "essay",
      },
    },
  ];

  it("returns the latest real completed proof when celebration was requested", () => {
    expect(
      selectLatestProofMilestone({
        requested: true,
        completed,
        authorship: [{ assignment_id: "assignment-1" }],
      }),
    ).toEqual({
      assignmentId: "assignment-1",
      title: "Identity quote response",
      kind: "essay",
      occurredAt: "2026-09-14T16:30:00.000Z",
      hasAuthorshipReceipt: true,
    });
  });

  it("never creates a celebration when no completed proof exists", () => {
    expect(
      selectLatestProofMilestone({
        requested: true,
        completed: [],
        authorship: [{ assignment_id: "assignment-1" }],
      }),
    ).toBeNull();
  });

  it("keeps real proof in the normal gallery when celebration was not requested", () => {
    expect(
      selectLatestProofMilestone({
        requested: false,
        completed,
        authorship: [],
      }),
    ).toBeNull();
  });
});
