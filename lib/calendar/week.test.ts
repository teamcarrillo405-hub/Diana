import { describe, it, expect } from "vitest";
import {
  buildWeek,
  groupByDay,
  workloadTier,
  workloadBarClass,
} from "./week";
import { adjustForUser } from "@/lib/scoring/next-five-minutes";
import type { Assignment } from "@/lib/scoring/next-five-minutes";

function makeAssignment(over: Partial<Assignment> = {}): Assignment {
  return {
    id: "a1",
    title: "Test",
    due_at: null,
    status: "captured",
    estimated_minutes: 30,
    difficulty: 3,
    class_id: "c1",
    kind: "other",
    reading_load: 1,
    writing_load: 1,
    ...over,
  };
}

describe("buildWeek", () => {
  it("returns 7 consecutive Date objects Monday-first", () => {
    // Wed 2026-05-13 → week is Mon 2026-05-11 .. Sun 2026-05-17
    const wed = new Date("2026-05-13T12:00:00Z");
    const week = buildWeek(wed);
    expect(week).toHaveLength(7);
    expect(week[0].getUTCDay()).toBe(1); // Monday
    expect(week[6].getUTCDay()).toBe(0); // Sunday
  });

  it("returns the same week regardless of which weekday is the anchor", () => {
    const mon = buildWeek(new Date("2026-05-11T12:00:00Z"));
    const fri = buildWeek(new Date("2026-05-15T12:00:00Z"));
    expect(mon[0].toDateString()).toBe(fri[0].toDateString());
  });
});

describe("groupByDay", () => {
  const week = buildWeek(new Date("2026-05-13T12:00:00Z"));

  it("buckets an assignment into the day matching its due_at", () => {
    const a = makeAssignment({
      id: "x",
      due_at: "2026-05-14T15:00:00Z", // Thursday
    });
    const buckets = groupByDay([a], week);
    expect(buckets.get("2026-05-14")?.map((x) => x.id)).toEqual(["x"]);
  });

  it("excludes assignments outside the 7-day window", () => {
    const a = makeAssignment({
      id: "out",
      due_at: "2026-06-01T15:00:00Z",
    });
    const buckets = groupByDay([a], week);
    const total = Array.from(buckets.values()).flat().length;
    expect(total).toBe(0);
  });

  it("returns a map with 7 keys for empty input", () => {
    const buckets = groupByDay([], week);
    expect(buckets.size).toBe(7);
    for (const arr of buckets.values()) {
      expect(arr).toEqual([]);
    }
  });

  it("skips assignments with null due_at", () => {
    const a = makeAssignment({ id: "n", due_at: null });
    const buckets = groupByDay([a], week);
    const total = Array.from(buckets.values()).flat().length;
    expect(total).toBe(0);
  });
});

describe("workloadTier", () => {
  it("classifies the boundary values per F9 spec", () => {
    expect(workloadTier(0)).toBe("light");
    expect(workloadTier(90)).toBe("light");
    expect(workloadTier(91)).toBe("moderate");
    expect(workloadTier(150)).toBe("moderate");
    expect(workloadTier(151)).toBe("heavy");
    expect(workloadTier(240)).toBe("heavy");
    expect(workloadTier(241)).toBe("overloaded");
    expect(workloadTier(9999)).toBe("overloaded");
  });

  it("treats negative minutes defensively as light", () => {
    expect(workloadTier(-5)).toBe("light");
  });
});

describe("workloadBarClass", () => {
  it("returns a non-empty Tailwind class for each tier", () => {
    expect(workloadBarClass("light")).toMatch(/bg-emerald/);
    expect(workloadBarClass("moderate")).toMatch(/bg-amber-100/);
    expect(workloadBarClass("heavy")).toMatch(/bg-amber-300/);
    expect(workloadBarClass("overloaded")).toMatch(/bg-violet/);
  });

  it("never uses red (calm invariant)", () => {
    for (const tier of ["light", "moderate", "heavy", "overloaded"] as const) {
      expect(workloadBarClass(tier)).not.toMatch(/red/);
    }
  });
});

describe("adjustForUser export (smoke)", () => {
  it("is importable and applies extra-time multiplier", () => {
    const a = makeAssignment({ estimated_minutes: 60 });
    const result = adjustForUser(a, {
      diagnoses: [],
      extra_time_pct: 50,
    });
    expect(result).toBe(90);
  });

  it("applies dyslexia 1.6x on reading-heavy tasks", () => {
    const a = makeAssignment({
      estimated_minutes: 60,
      reading_load: 4,
    });
    const result = adjustForUser(a, {
      diagnoses: ["dyslexia"],
      extra_time_pct: 0,
    });
    expect(result).toBe(96);
  });
});
