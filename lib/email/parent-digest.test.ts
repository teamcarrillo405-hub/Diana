import { describe, it, expect } from "vitest";
import { buildParentDigestEmail } from "./parent-digest";

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
});
