import { describe, it, expect } from "vitest";
import {
  buildTestPrepPlan,
  coverageWindowStart,
  looksLikeTest,
  nextUpcomingTest,
  previousTestDueAt,
  type TestPrepConcept,
} from "./plan";

const NOW = new Date("2026-06-09T12:00:00");

function concept(name: string, masteryLevel: number): TestPrepConcept {
  return { id: `c-${name}`, name, masteryLevel };
}

function dueInDays(n: number): string {
  return new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000).toISOString();
}

describe("looksLikeTest", () => {
  it("matches test_prep kind and test-like titles", () => {
    expect(looksLikeTest("anything", "test_prep")).toBe(true);
    expect(looksLikeTest("Unit 4 Quiz", "homework")).toBe(true);
    expect(looksLikeTest("Biology FINAL", null)).toBe(true);
    expect(looksLikeTest("Midterm review packet", null)).toBe(true);
  });

  it("does not match ordinary work or embedded words", () => {
    expect(looksLikeTest("Read chapter 5", "reading")).toBe(false);
    expect(looksLikeTest("Essay on protest movements", "essay")).toBe(false);
    expect(looksLikeTest(null, null)).toBe(false);
  });
});

describe("coverage window", () => {
  it("starts at the previous test when one exists", () => {
    expect(coverageWindowStart("2026-05-20T00:00:00Z", NOW)).toBe("2026-05-20T00:00:00Z");
  });

  it("falls back to four weeks", () => {
    const start = new Date(coverageWindowStart(null, NOW));
    expect(Math.round((NOW.getTime() - start.getTime()) / 86_400_000)).toBe(28);
  });

  it("previousTestDueAt picks the latest earlier test only", () => {
    const due = previousTestDueAt(
      [
        { title: "Unit 1 Quiz", kind: null, due_at: "2026-05-01T00:00:00Z" },
        { title: "Unit 2 Quiz", kind: null, due_at: "2026-05-20T00:00:00Z" },
        { title: "Homework", kind: "homework", due_at: "2026-06-01T00:00:00Z" },
        { title: "Unit 4 Quiz", kind: null, due_at: "2026-07-01T00:00:00Z" }, // after the test
      ],
      "2026-06-12T00:00:00Z",
    );
    expect(due).toBe("2026-05-20T00:00:00Z");
  });
});

describe("nextUpcomingTest", () => {
  it("returns the soonest future test-like assignment", () => {
    const next = nextUpcomingTest(
      [
        { title: "Bio final", kind: null, due_at: dueInDays(9) },
        { title: "Algebra quiz", kind: null, due_at: dueInDays(3) },
        { title: "Old test", kind: null, due_at: dueInDays(-2) },
        { title: "Essay", kind: "essay", due_at: dueInDays(1) },
      ],
      NOW,
    );
    expect(next?.title).toBe("Algebra quiz");
  });

  it("returns null when nothing test-like is coming", () => {
    expect(nextUpcomingTest([{ title: "Essay", kind: "essay", due_at: dueInDays(2) }], NOW)).toBeNull();
  });
});

describe("buildTestPrepPlan", () => {
  const concepts = [
    concept("Photosynthesis", 1),
    concept("Cell respiration", 2),
    concept("Mitosis", 4),
    concept("Osmosis", 3),
  ];

  it("triages weakest first and identifies shaky concepts", () => {
    const plan = buildTestPrepPlan({ testDueAt: dueInDays(5), now: NOW, concepts });
    expect(plan.triage[0].name).toBe("Photosynthesis");
    expect(plan.shaky.map((c) => c.name)).toEqual(["Photosynthesis", "Cell respiration"]);
  });

  it("five-day runway: concepts first, practice early, light recall the night before", () => {
    const plan = buildTestPrepPlan({ testDueAt: dueInDays(5), now: NOW, concepts });
    expect(plan.daysUntil).toBe(5);
    expect(plan.days).toHaveLength(5);
    expect(plan.days[0].isToday).toBe(true);
    expect(plan.days[0].entries.map((e) => e.kind)).toEqual(["concept_review", "make_cards"]);
    expect(plan.days[0].entries[0].label).toContain("Photosynthesis");
    expect(plan.days[1].entries[0].kind).toBe("practice_test");
    const nightBefore = plan.days[plan.days.length - 1];
    expect(nightBefore.entries).toHaveLength(1);
    expect(nightBefore.entries[0].kind).toBe("light_recall");
  });

  it("long runway adds a single lead-in touch today", () => {
    const plan = buildTestPrepPlan({ testDueAt: dueInDays(10), now: NOW, concepts });
    expect(plan.days[0].isToday).toBe(true);
    expect(plan.days[0].entries[0].kind).toBe("make_cards");
    expect(plan.days[1].offset).toBe(5);
    expect(plan.days).toHaveLength(6);
  });

  it("one day out: short practice then rest, no cram framing", () => {
    const plan = buildTestPrepPlan({ testDueAt: dueInDays(1), now: NOW, concepts });
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].entries.map((e) => e.kind)).toEqual(["practice_test", "light_recall"]);
    expect(plan.days[0].entries[1].label).toContain("Sleep");
  });

  it("test day: light recall only", () => {
    const plan = buildTestPrepPlan({ testDueAt: dueInDays(0), now: NOW, concepts });
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].entries[0].kind).toBe("light_recall");
  });

  it("readiness stays calm with and without a concept map", () => {
    const withMap = buildTestPrepPlan({ testDueAt: dueInDays(4), now: NOW, concepts });
    expect(withMap.readiness).toContain("2 still feel shaky");
    const noMap = buildTestPrepPlan({ testDueAt: dueInDays(4), now: NOW, concepts: [] });
    expect(noMap.readiness).toContain("No concept map");
    const solid = buildTestPrepPlan({
      testDueAt: dueInDays(4),
      now: NOW,
      concepts: [concept("Mitosis", 4), concept("Osmosis", 3)],
    });
    expect(solid.readiness).toContain("feel solid");
    for (const text of [withMap.readiness, noMap.readiness, solid.readiness]) {
      for (const banned of ["behind", "failed", "missed", "wrong", "cram"]) {
        expect(text.toLowerCase()).not.toContain(banned);
      }
    }
  });
});
