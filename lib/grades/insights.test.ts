import { describe, it, expect } from "vitest";
import { gradeInsights, recoveryMoves, type GradeRecord } from "./insights";

let counter = 0;
function record(overrides: Partial<GradeRecord>): GradeRecord {
  counter += 1;
  return {
    externalAssignmentId: `a-${counter}`,
    courseId: "bio",
    courseName: "Biology",
    title: `Assignment ${counter}`,
    score: null,
    pointsPossible: 10,
    gradedAt: null,
    submitted: true,
    notTurnedIn: false,
    late: false,
    excused: false,
    dueAt: null,
    ...overrides,
  };
}

function graded(score: number, possible: number, when: string, overrides: Partial<GradeRecord> = {}): GradeRecord {
  return record({ score, pointsPossible: possible, gradedAt: when, ...overrides });
}

describe("recoveryMoves", () => {
  it("puts not-turned-in work first, biggest points first", () => {
    const moves = recoveryMoves([
      record({ notTurnedIn: true, submitted: false, pointsPossible: 10, title: "Small lab" }),
      record({ notTurnedIn: true, submitted: false, pointsPossible: 50, title: "Big essay" }),
      graded(5, 10, "2026-06-01", { title: "Quiz" }),
    ]);
    expect(moves[0]).toMatchObject({ kind: "turn_in", title: "Big essay", pointsAvailable: 50 });
    expect(moves[1]).toMatchObject({ kind: "turn_in", title: "Small lab" });
    expect(moves[2]).toMatchObject({ kind: "review_feedback", title: "Quiz", pointsAvailable: 5 });
  });

  it("never surfaces excused work and caps at three moves", () => {
    const moves = recoveryMoves([
      record({ notTurnedIn: true, excused: true, pointsPossible: 100, title: "Excused" }),
      record({ notTurnedIn: true, pointsPossible: 10, title: "A" }),
      record({ notTurnedIn: true, pointsPossible: 9, title: "B" }),
      record({ notTurnedIn: true, pointsPossible: 8, title: "C" }),
      record({ notTurnedIn: true, pointsPossible: 7, title: "D" }),
    ]);
    expect(moves).toHaveLength(3);
    expect(moves.map((m) => m.title)).toEqual(["A", "B", "C"]);
  });

  it("only flags graded work under 70% for feedback review", () => {
    const moves = recoveryMoves([
      graded(9, 10, "2026-06-01", { title: "Strong" }),
      graded(6, 10, "2026-06-02", { title: "Worth a look" }),
    ]);
    expect(moves).toHaveLength(1);
    expect(moves[0].title).toBe("Worth a look");
  });

  it("uses calm copy: no shame language in reasons", () => {
    const moves = recoveryMoves([
      record({ notTurnedIn: true, pointsPossible: 20, title: "Lab" }),
      graded(4, 10, "2026-06-01", { title: "Quiz" }),
    ]);
    const text = moves.map((m) => m.reason).join(" ").toLowerCase();
    for (const banned of ["missed", "failed", "behind", "overdue", "past due", "wrong"]) {
      expect(text).not.toContain(banned);
    }
  });
});

describe("gradeInsights", () => {
  it("computes per-course snapshots with provider scores", () => {
    const insights = gradeInsights(
      [
        graded(9, 10, "2026-06-01"),
        record({ notTurnedIn: true, submitted: false }),
        record({ courseId: "eng", courseName: "English", score: 8, pointsPossible: 10, gradedAt: "2026-06-02" }),
      ],
      new Map([["bio", 91.5]]),
    );
    expect(insights.courses).toHaveLength(2);
    const bio = insights.courses.find((c) => c.courseId === "bio")!;
    expect(bio).toMatchObject({ currentScorePct: 91.5, gradedCount: 1, notTurnedInCount: 1 });
    const eng = insights.courses.find((c) => c.courseId === "eng")!;
    expect(eng.currentScorePct).toBeNull();
  });

  it("detects a rising trend over the last three graded items", () => {
    const insights = gradeInsights([
      graded(6, 10, "2026-05-01"),
      graded(6, 10, "2026-05-05"),
      graded(7, 10, "2026-05-10"),
      graded(8, 10, "2026-05-15"),
      graded(9, 10, "2026-05-20"),
      graded(9, 10, "2026-05-25"),
    ]);
    expect(insights.courses[0].trend).toBe("rising");
  });

  it("calls a dip 'settling', not alarm language", () => {
    const insights = gradeInsights([
      graded(9, 10, "2026-05-01"),
      graded(9, 10, "2026-05-05"),
      graded(9, 10, "2026-05-10"),
      graded(7, 10, "2026-05-15"),
      graded(7, 10, "2026-05-20"),
      graded(6, 10, "2026-05-25"),
    ]);
    expect(insights.courses[0].trend).toBe("settling");
  });

  it("returns null trend with fewer than six graded items", () => {
    const insights = gradeInsights([graded(9, 10, "2026-05-01"), graded(8, 10, "2026-05-02")]);
    expect(insights.courses[0].trend).toBeNull();
  });

  it("surfaces wins when recent scores are strong", () => {
    const insights = gradeInsights([
      graded(9, 10, "2026-05-10"),
      graded(10, 10, "2026-05-15"),
      graded(9, 10, "2026-05-20"),
    ]);
    expect(insights.wins[0]).toContain("Biology");
  });

  it("ignores excused work in not-turned-in counts", () => {
    const insights = gradeInsights([
      record({ notTurnedIn: true, excused: true }),
      record({ notTurnedIn: true }),
    ]);
    expect(insights.courses[0].notTurnedInCount).toBe(1);
  });
});
