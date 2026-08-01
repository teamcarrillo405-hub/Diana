import { describe, expect, it } from "vitest";
import {
  buildDeckInstallCards,
  collaborativeNoteRefreshMeetsBudget,
  isInviteOnlySurface,
  memberScopedGroupRows,
  normalizeJoinCode,
  sharedSessionMeetsLatencyBudget,
  socialCopyAvoidsRanking,
  statusLabel,
} from "./collaboration";

describe("social collaboration helpers", () => {
  it("normalizes invite codes without leaking punctuation", () => {
    expect(normalizeJoinCode(" ab-12 cd ")).toBe("AB12CD");
  });

  it("keeps social surfaces invite-only", () => {
    expect(isInviteOnlySurface("invite_only")).toBe(true);
    expect(isInviteOnlySurface("public")).toBe(false);
  });

  it("tracks the shared-session creation latency target", () => {
    expect(sharedSessionMeetsLatencyBudget(29_999)).toBe(true);
    expect(sharedSessionMeetsLatencyBudget(30_001)).toBe(false);
  });

  it("tracks collaborative note refresh budget", () => {
    expect(collaborativeNoteRefreshMeetsBudget(500)).toBe(true);
    expect(collaborativeNoteRefreshMeetsBudget(750)).toBe(false);
  });

  it("builds trimmed deck install cards", () => {
    expect(buildDeckInstallCards([
      { front: " term ", back: " meaning " },
      { front: "", back: "skip" },
    ])).toEqual([{ front: "term", back: "meaning", position: 0 }]);
  });

  it("uses neutral project labels and rejects ranking copy", () => {
    expect(statusLabel("in_progress")).toBe("In progress");
    expect(socialCopyAvoidsRanking("Group room with a shared timer")).toBe(true);
    expect(socialCopyAvoidsRanking("Leaderboard")).toBe(false);
  });

  it("keeps community activity inside rooms the authenticated student joined", () => {
    const groups = [
      { id: "owned", owner_id: "student-a", name: "Owned room" },
      { id: "joined", owner_id: "student-b", name: "Joined room" },
      { id: "private", owner_id: "student-b", name: "Other room" },
    ];
    const memberships = [
      { group_id: "joined", owner_id: "student-a" },
      { group_id: "private", owner_id: "student-c" },
    ];

    expect(memberScopedGroupRows(groups, memberships, "student-a").map((group) => group.id))
      .toEqual(["owned", "joined"]);
  });
});
