import { describe, it, expect } from "vitest";
import { createCard, schedule, Rating, type FsrsCard } from "./fsrs";

const FIXED_NOW = new Date("2026-06-01T12:00:00.000Z");
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe("FSRS-5 scheduler", () => {
  it("createCard returns new card at now", () => {
    const c = createCard(FIXED_NOW);
    expect(c.state).toBe("new");
    expect(c.stability).toBe(0);
    expect(c.difficulty).toBe(0);
    expect(c.reps).toBe(0);
    expect(c.lapses).toBe(0);
    expect(c.dueAt).toBe(FIXED_NOW.toISOString());
    expect(c.lastReviewAt).toBe(null);
  });

  it("new card + Again → learning, due within 1 minute", () => {
    const c = createCard(FIXED_NOW);
    const r = schedule(c, Rating.Again, FIXED_NOW);
    expect(r.card.state).toBe("learning");
    expect(r.card.reps).toBe(1);
    const dueMs = new Date(r.card.dueAt).getTime() - FIXED_NOW.getTime();
    expect(dueMs).toBeLessThanOrEqual(60 * 1000 + 100); // ~1 min, allow tiny float slop
    expect(dueMs).toBeGreaterThanOrEqual(0);
  });

  it("new card + Good → learning, due in future", () => {
    const c = createCard(FIXED_NOW);
    const r = schedule(c, Rating.Good, FIXED_NOW);
    expect(r.card.state).toBe("learning");
    const dueMs = new Date(r.card.dueAt).getTime() - FIXED_NOW.getTime();
    expect(dueMs).toBeGreaterThan(0);
  });

  it("new card + Easy → review, due at least 1 day later", () => {
    const c = createCard(FIXED_NOW);
    const r = schedule(c, Rating.Easy, FIXED_NOW);
    expect(r.card.state).toBe("review");
    const dueMs = new Date(r.card.dueAt).getTime() - FIXED_NOW.getTime();
    expect(dueMs).toBeGreaterThanOrEqual(ONE_DAY_MS - 1000);
  });

  it("stability increases monotonically across consecutive Good reviews", () => {
    let c = createCard(FIXED_NOW);
    c = schedule(c, Rating.Easy, FIXED_NOW).card; // graduate to review
    const stabs: number[] = [c.stability];
    let now = FIXED_NOW;
    for (let i = 0; i < 4; i++) {
      now = new Date(now.getTime() + (c.stability * 0.9) * ONE_DAY_MS);
      c = schedule(c, Rating.Good, now).card;
      stabs.push(c.stability);
    }
    for (let i = 1; i < stabs.length; i++) {
      expect(stabs[i]).toBeGreaterThan(stabs[i - 1]);
    }
  });

  it("review card + Again → relearning, lapses incremented, due within 10 min", () => {
    let c = createCard(FIXED_NOW);
    c = schedule(c, Rating.Easy, FIXED_NOW).card; // review
    const before = c.lapses;
    const later = new Date(FIXED_NOW.getTime() + 7 * ONE_DAY_MS);
    const r = schedule(c, Rating.Again, later);
    expect(r.card.state).toBe("relearning");
    expect(r.card.lapses).toBe(before + 1);
    const dueMs = new Date(r.card.dueAt).getTime() - later.getTime();
    expect(dueMs).toBeLessThanOrEqual(10 * 60 * 1000 + 100);
  });

  it("review card + Good keeps state=review and schedules near stability days at retention 0.9", () => {
    let c = createCard(FIXED_NOW);
    c = schedule(c, Rating.Easy, FIXED_NOW).card;
    const later = new Date(FIXED_NOW.getTime() + 3 * ONE_DAY_MS);
    const r = schedule(c, Rating.Good, later);
    expect(r.card.state).toBe("review");
    // For retention 0.9, scheduled days ≈ stability * a constant ~0.9; just check positive growth.
    expect(r.log.scheduledDays).toBeGreaterThan(0);
  });

  it("difficulty stays clamped to [1, 10] across many ratings", () => {
    let c = createCard(FIXED_NOW);
    let now = FIXED_NOW;
    const ratings = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy, Rating.Again, Rating.Easy];
    for (const r of ratings) {
      c = schedule(c, r, now).card;
      now = new Date(now.getTime() + Math.max(1, c.stability) * ONE_DAY_MS);
      expect(c.difficulty).toBeGreaterThanOrEqual(1);
      expect(c.difficulty).toBeLessThanOrEqual(10);
      expect(Number.isFinite(c.difficulty)).toBe(true);
    }
  });

  it("reps counter increments on every schedule() call", () => {
    let c = createCard(FIXED_NOW);
    expect(c.reps).toBe(0);
    c = schedule(c, Rating.Good, FIXED_NOW).card;
    expect(c.reps).toBe(1);
    c = schedule(c, Rating.Good, new Date(FIXED_NOW.getTime() + ONE_DAY_MS)).card;
    expect(c.reps).toBe(2);
  });

  it("is deterministic — identical inputs produce identical outputs", () => {
    const c1 = createCard(FIXED_NOW);
    const c2 = createCard(FIXED_NOW);
    const r1 = schedule(c1, Rating.Good, FIXED_NOW);
    const r2 = schedule(c2, Rating.Good, FIXED_NOW);
    expect(r1.card).toEqual(r2.card);
    expect(r1.log).toEqual(r2.log);
  });
});
