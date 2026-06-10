import { describe, it, expect } from "vitest";
import { buildDailyDigest, type DigestAssignment } from "./digest";

const NOW = new Date("2026-06-10T13:00:00");

function due(daysFromNow: number): string {
  return new Date(NOW.getTime() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

describe("buildDailyDigest", () => {
  it("stays silent when nothing is on deck", () => {
    expect(buildDailyDigest([], NOW)).toBeNull();
    expect(
      buildDailyDigest([{ title: "Essay", kind: "essay", due_at: due(6) }], NOW),
    ).toBeNull();
  });

  it("a near test beats due work and reads calm", () => {
    const digest = buildDailyDigest(
      [
        { title: "Worksheet", kind: "other", due_at: due(0) },
        { title: "Bio quiz", kind: null, due_at: due(2) },
      ],
      NOW,
    );
    expect(digest?.title).toBe("Bio quiz is in 2 days");
    expect(digest?.body).toContain("one move for today");
  });

  it("test day says light recall, not cramming", () => {
    const digest = buildDailyDigest([{ title: "Algebra final", kind: null, due_at: due(0) }], NOW);
    expect(digest?.title).toContain("today");
    expect(digest?.body).toContain("Light recall");
  });

  it("due work today produces one calm nudge, singular or plural", () => {
    expect(
      buildDailyDigest([{ title: "Lab report", kind: "lab", due_at: due(0) }], NOW)?.title,
    ).toBe("Lab report is due today");
    expect(
      buildDailyDigest(
        [
          { title: "Lab report", kind: "lab", due_at: due(0) },
          { title: "Reading", kind: "reading", due_at: due(0) },
        ],
        NOW,
      )?.title,
    ).toBe("2 things are due today");
  });

  it("never uses pressure language", () => {
    const digest = buildDailyDigest([{ title: "History test", kind: null, due_at: due(1) }], NOW);
    const text = `${digest?.title} ${digest?.body}`.toLowerCase();
    for (const banned of ["overdue", "behind", "missed", "failed", "hurry", "don't forget"]) {
      expect(text).not.toContain(banned);
    }
  });
});
