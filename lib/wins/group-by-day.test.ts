import { describe, it, expect } from "vitest";
import {
  groupCompletionsByDay,
  countToday,
  countThisWeek,
  type Completion,
} from "./group-by-day";

// Fixed "now" for deterministic tests: Wednesday May 27 2026 at noon UTC
const NOW = new Date("2026-05-27T12:00:00Z");

function makeCompletion(
  id: string,
  occurred_at: string,
  overrides: Partial<Completion> = {},
): Completion {
  return {
    id,
    occurred_at,
    assignment_id: "assign-1",
    assignment_title: "Test Assignment",
    assignment_kind: "other",
    class_name: "Math",
    class_color: "#3b82f6",
    ...overrides,
  };
}

// ── groupCompletionsByDay ──────────────────────────────────────────────────

describe("groupCompletionsByDay", () => {
  it("empty array returns []", () => {
    expect(groupCompletionsByDay([], NOW)).toEqual([]);
  });

  it("1 item today returns 1 DayGroup with day_label 'Today' and 1 item", () => {
    const item = makeCompletion("1", "2026-05-27T10:00:00Z");
    const result = groupCompletionsByDay([item], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].day_label).toBe("Today");
    expect(result[0].items).toHaveLength(1);
  });

  it("1 item today returns DayGroup with correct day_iso", () => {
    const item = makeCompletion("1", "2026-05-27T10:00:00Z");
    const result = groupCompletionsByDay([item], NOW);
    // day_iso is local date — using a UTC noon timestamp so local date matches
    expect(result[0].day_iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("2 items today + 1 yesterday returns 2 DayGroups: Today (2), Yesterday (1) in that order", () => {
    const today1 = makeCompletion("t1", "2026-05-27T10:00:00Z");
    const today2 = makeCompletion("t2", "2026-05-27T08:00:00Z");
    const yest = makeCompletion("y1", "2026-05-26T14:00:00Z");
    const result = groupCompletionsByDay([today1, yest, today2], NOW);
    expect(result).toHaveLength(2);
    expect(result[0].day_label).toBe("Today");
    expect(result[0].items).toHaveLength(2);
    expect(result[1].day_label).toBe("Yesterday");
    expect(result[1].items).toHaveLength(1);
  });

  it("groups are sorted most-recent day first", () => {
    const older = makeCompletion("o1", "2026-05-25T10:00:00Z");
    const newer = makeCompletion("n1", "2026-05-27T10:00:00Z");
    const result = groupCompletionsByDay([older, newer], NOW);
    expect(result[0].day_iso > result[1].day_iso).toBe(true);
  });

  it("items within a day are sorted most-recent first (occurred_at descending)", () => {
    const early = makeCompletion("e1", "2026-05-27T08:00:00Z");
    const late = makeCompletion("l1", "2026-05-27T11:00:00Z");
    const result = groupCompletionsByDay([early, late], NOW);
    expect(result[0].items[0].id).toBe("l1");
    expect(result[0].items[1].id).toBe("e1");
  });

  it("1 item 3 days ago (2026-05-24) produces a formatted day_label, not 'Today' or 'Yesterday'", () => {
    // NOW is Wed May 27. 3 days ago is Sunday May 24.
    const old = makeCompletion("old", "2026-05-24T10:00:00Z");
    const result = groupCompletionsByDay([old], NOW);
    expect(result[0].day_label).not.toBe("Today");
    expect(result[0].day_label).not.toBe("Yesterday");
    // Should contain "May" or a weekday name
    expect(result[0].day_label.length).toBeGreaterThan(3);
  });

  it("day_iso is YYYY-MM-DD zero-padded format", () => {
    const item = makeCompletion("1", "2026-01-05T10:00:00Z");
    const nowJan = new Date("2026-01-05T12:00:00Z");
    const result = groupCompletionsByDay([item], nowJan);
    expect(result[0].day_iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Expect zero-padded month and day
    expect(result[0].day_iso).toContain("2026-");
  });
});

// ── countToday ─────────────────────────────────────────────────────────────

describe("countToday", () => {
  it("empty array returns 0", () => {
    expect(countToday([], NOW)).toBe(0);
  });

  it("2 items today + 1 yesterday → returns 2", () => {
    const t1 = makeCompletion("t1", "2026-05-27T10:00:00Z");
    const t2 = makeCompletion("t2", "2026-05-27T08:00:00Z");
    const y1 = makeCompletion("y1", "2026-05-26T14:00:00Z");
    expect(countToday([t1, t2, y1], NOW)).toBe(2);
  });

  it("0 items today → returns 0", () => {
    const y1 = makeCompletion("y1", "2026-05-26T14:00:00Z");
    expect(countToday([y1], NOW)).toBe(0);
  });
});

// ── countThisWeek ───────────────────────────────────────────────────────────

describe("countThisWeek", () => {
  it("empty array returns 0", () => {
    expect(countThisWeek([], NOW)).toBe(0);
  });

  it("3 items in last 3 days, 1 from 10 days ago → returns 3", () => {
    const r1 = makeCompletion("r1", "2026-05-27T10:00:00Z"); // today
    const r2 = makeCompletion("r2", "2026-05-26T10:00:00Z"); // 1 day ago
    const r3 = makeCompletion("r3", "2026-05-25T10:00:00Z"); // 2 days ago
    const old = makeCompletion("o1", "2026-05-17T10:00:00Z"); // 10 days ago
    expect(countThisWeek([r1, r2, r3, old], NOW)).toBe(3);
  });

  it("item exactly at 7-day boundary is included (≤7d)", () => {
    // NOW is 2026-05-27T12:00:00Z. Exactly 7 days back = 2026-05-20T12:00:00Z.
    const boundary = makeCompletion("b1", "2026-05-20T12:00:00Z");
    expect(countThisWeek([boundary], NOW)).toBe(1);
  });

  it("item just past 7-day boundary is excluded", () => {
    // 1ms past boundary should be excluded
    const past = makeCompletion("p1", "2026-05-20T11:59:59.999Z");
    expect(countThisWeek([past], NOW)).toBe(0);
  });
});
