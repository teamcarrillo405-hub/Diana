import { describe, it, expect } from "vitest";
import {
  buildParentDigestEmail,
  parentDigestIdempotencyKey,
  parentDigestRecipient,
} from "./parent-digest";

const STORY = {
  headline: "Momentum is building.",
  facts: ["Finished 5 pieces of work in the last 4 weeks.", "Showed up to work on 8 different days."],
};

describe("buildParentDigestEmail", () => {
  it("leads with the growth headline and includes the facts", () => {
    const email = buildParentDigestEmail({
      studentName: "Sam",
      story: STORY,
      stats: { completedThisWeek: 3, minutesThisWeek: 95, upcomingNext7Days: 2 },
    });
    expect(email.subject).toBe("Sam's week with Diana: Momentum is building.");
    expect(email.text).toContain("Finished 5 pieces of work");
    expect(email.text).toContain("95 minutes of focused study time");
    expect(email.html).toContain("Momentum is building.");
  });

  it("states the privacy boundary in every email", () => {
    const email = buildParentDigestEmail({
      studentName: "Sam",
      story: STORY,
      stats: { completedThisWeek: 0, minutesThisWeek: 0, upcomingNext7Days: 0 },
    });
    for (const body of [email.text, email.html]) {
      expect(body).toContain("never includes");
      expect(body).toContain("grades");
    }
  });

  it("never uses shame language and escapes HTML", () => {
    const email = buildParentDigestEmail({
      studentName: "<script>",
      story: { headline: "A quieter stretch lately: rhythms vary, and the structure is holding.", facts: [] },
      stats: { completedThisWeek: 1, minutesThisWeek: 10, upcomingNext7Days: 1 },
    });
    expect(email.html).not.toContain("<script>");
    const text = email.text.toLowerCase();
    for (const banned of ["behind", "failed", "missed", "lazy", "concern"]) {
      expect(text).not.toContain(banned);
    }
  });

  it("derives the recipient only from the same student's opted-in profile", () => {
    expect(parentDigestRecipient({
      user_id: "student-a",
      display_name: "Sam",
      notification_preferences: {
        parentDigest: { enabled: true, email: " Parent@Example.com " },
        anotherStudent: { ownerId: "student-b", email: "other@example.com" },
      },
    })).toEqual({ ownerId: "student-a", studentName: "Sam", email: "parent@example.com" });

    expect(parentDigestRecipient({
      user_id: "student-b",
      display_name: "Lee",
      notification_preferences: { parentDigest: { enabled: false, email: "parent@example.com" } },
    })).toBeNull();
  });

  it("uses a stable weekly key without exposing the student id", () => {
    const first = parentDigestIdempotencyKey("student-private-id", new Date("2026-07-26T18:00:00Z"));
    const retry = parentDigestIdempotencyKey("student-private-id", new Date("2026-07-27T01:00:00Z"));

    expect(first).toBe(retry);
    expect(first).toMatch(/^parent-digest\/2026-07-26\/[a-f0-9]{24}$/u);
    expect(first).not.toContain("student-private-id");
  });
});
