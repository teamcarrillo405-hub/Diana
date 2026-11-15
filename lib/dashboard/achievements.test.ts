import { describe, expect, it } from "vitest";

import {
  ACHIEVEMENTS,
  createAchievementLedger,
  getAchievements,
  parseAchievementLedger,
  recordAchievementEvent,
  type AchievementEvent,
  type AchievementKind,
  type AchievementLedger,
} from "./achievements";

const at = (day: number) => `2026-09-${String(day).padStart(2, "0")}T18:00:00.000Z`;
const event = (id: string, kind: AchievementKind = "work", occurredAt = at(1)): AchievementEvent => ({
  id, kind, occurredAt,
});
const history = (kind: AchievementKind, count: number) =>
  Array.from({ length: count }, (_, index) => event(`${kind}-${index + 1}`, kind, at(index + 1)));
const award = (ledger: AchievementLedger, id: string) =>
  getAchievements(ledger).find((entry) => entry.id === id);
const parse = (value: unknown) => parseAchievementLedger(JSON.stringify(value));

describe("achievement definitions", () => {
  it("keeps the public order, thresholds, titles, and tiers", () => {
    expect(ACHIEVEMENTS.map(({ id, title, kind, target, tier }) => ({ id, title, kind, target, tier }))).toEqual([
      { id: "first-finish", title: "First Finish", kind: "work", target: 1, tier: 1 },
      { id: "first-check-in", title: "First Check-In", kind: "check-in", target: 1, tier: 1 },
      { id: "handed-in", title: "Handed In", kind: "submitted", target: 1, tier: 1 },
      { id: "five-finished", title: "Five Finished", kind: "work", target: 5, tier: 2 },
      { id: "ten-sessions", title: "Ten Sessions", kind: "focus", target: 10, tier: 2 },
      { id: "five-submitted", title: "Five Submitted", kind: "submitted", target: 5, tier: 2 },
    ]);
  });

  it("uses compact requirements for the achievement menu", () => {
    expect(ACHIEVEMENTS.map(({ id, requirement }) => ({ id, requirement }))).toEqual([
      { id: "first-finish", requirement: "Complete 1 assignment." },
      { id: "first-check-in", requirement: "Save 1 check-in." },
      { id: "handed-in", requirement: "Confirm 1 assignment submission." },
      { id: "five-finished", requirement: "Complete 5 assignments." },
      { id: "ten-sessions", requirement: "Finish 10 study sessions." },
      { id: "five-submitted", requirement: "Confirm 5 assignment submissions." },
    ]);
  });
});

describe("createAchievementLedger", () => {
  it("creates a fresh empty lifetime ledger", () => {
    const ledger = createAchievementLedger();
    expect(ledger).toEqual({ version: 1, events: [], earned: [] });
    expect(createAchievementLedger()).not.toBe(ledger);
    expect(createAchievementLedger().events).not.toBe(ledger.events);
  });

  it.each(ACHIEVEMENTS)("awards $id only at its exact crossing event", (definition) => {
    const events = history(definition.kind, definition.target);
    const before = createAchievementLedger(events.slice(0, -1));
    expect(award(before, definition.id)).toMatchObject({ progress: definition.target - 1, earnedAt: null });

    const crossing = recordAchievementEvent(before, events[events.length - 1]);
    expect(award(crossing, definition.id)).toMatchObject({ progress: definition.target, earnedAt: at(definition.target) });
    const after = recordAchievementEvent(crossing, event("later", definition.kind, at(20)));
    expect(award(after, definition.id)).toMatchObject({ progress: definition.target + 1, earnedAt: at(definition.target) });
  });

  it("seeds unsorted history at historical crossings, not input order or the current date", () => {
    const events = [...history("work", 6), ...history("focus", 11), ...history("submitted", 6), ...history("check-in", 1)].reverse();
    const ledger = createAchievementLedger(events);
    expect(ledger.earned).toEqual([
      { id: "first-finish", earnedAt: at(1) },
      { id: "first-check-in", earnedAt: at(1) },
      { id: "handed-in", earnedAt: at(1) },
      { id: "five-finished", earnedAt: at(5) },
      { id: "ten-sessions", earnedAt: at(10) },
      { id: "five-submitted", earnedAt: at(5) },
    ]);
    expect(createAchievementLedger([...events].reverse())).toEqual(ledger);
  });

  it("canonicalizes dates and IDs and retains the earliest same-kind duplicate", () => {
    const ledger = createAchievementLedger([
      event(" assignment ", "work", "2026-09-02T10:00:00-07:00"),
      event("assignment", "work", "2026-09-02T16:00:00Z"),
      event("other", "work", "2026-09-01"),
    ]);
    expect(ledger.events).toEqual([
      event("other", "work", "2026-09-01T00:00:00.000Z"),
      event("assignment", "work", "2026-09-02T16:00:00.000Z"),
    ]);
    expect(award(ledger, "first-finish")?.progress).toBe(2);
  });

  it("keeps done and explicitly submitted independent even for the same assignment", () => {
    const done = createAchievementLedger([event("assignment")]);
    expect(award(done, "handed-in")).toMatchObject({ progress: 0, earnedAt: null });
    const submitted = recordAchievementEvent(done, event("assignment", "submitted", at(2)));
    expect(award(submitted, "first-finish")).toMatchObject({ progress: 1, earnedAt: at(1) });
    expect(award(submitted, "handed-in")).toMatchObject({ progress: 1, earnedAt: at(2) });
    expect(award(createAchievementLedger([event("assignment", "submitted")]), "first-finish"))
      .toMatchObject({ progress: 0, earnedAt: null });
  });

  it("counts focus session IDs, including several sessions for the same assignment", () => {
    const sessions = history("focus", 10).map((session) => ({ ...session, id: `assignment-a/${session.id}` }));
    const ledger = createAchievementLedger([...sessions, ...sessions, event("assignment-a")]);
    expect(award(ledger, "ten-sessions")).toMatchObject({ progress: 10, earnedAt: at(10) });
    expect(award(ledger, "first-finish")?.progress).toBe(1);
    expect(award(ledger, "first-check-in")).toMatchObject({ progress: 0, earnedAt: null });
  });

  it("awards a saved check-in independently of work, sessions, and submissions", () => {
    const ledger = createAchievementLedger([event("2026-09-01", "check-in")]);
    expect(ledger.earned).toEqual([{ id: "first-check-in", earnedAt: at(1) }]);
    expect(award(ledger, "ten-sessions")?.progress).toBe(0);
    expect(award(ledger, "first-finish")?.progress).toBe(0);
    expect(award(ledger, "handed-in")?.progress).toBe(0);
  });

  it("keeps lifetime counts across weeks, months, and years without clamping progress", () => {
    const ledger = createAchievementLedger([
      event("old", "work", "2024-01-01T00:00:00.000Z"),
      event("prior-month", "work", "2026-08-01T00:00:00.000Z"),
      ...history("work", 6),
    ]);
    expect(award(ledger, "first-finish")).toMatchObject({ progress: 8, earnedAt: "2024-01-01T00:00:00.000Z" });
    expect(award(ledger, "five-finished")).toMatchObject({ progress: 8, earnedAt: at(3) });
  });

  it.each([
    null,
    {},
    event(""),
    event(" \t "),
    { ...event("a"), id: 1 },
    { ...event("a"), kind: "done" },
    { ...event("a"), kind: "__proto__" },
    { ...event("a"), occurredAt: 0 },
    event("a", "work", ""),
    event("a", "work", "not-a-date"),
    event("a", "work", "2026-02-30T00:00:00Z"),
    event("a", "work", "2026-02-29"),
    event("a", "work", "2026-13-01"),
    event("a", "work", "2026-09-01T24:00:00Z"),
    event("a", "work", "2026-09-01T18:00:00"),
  ])("ignores invalid event %j when seeding or recording", (input) => {
    const invalid = input as AchievementEvent;
    expect(createAchievementLedger([invalid])).toEqual(createAchievementLedger());
    const ledger = createAchievementLedger([event("valid")]);
    expect(recordAchievementEvent(ledger, invalid)).toEqual(ledger);
  });

  it("accepts real leap days", () => {
    expect(createAchievementLedger([event("leap", "work", "2024-02-29")]).events)
      .toEqual([event("leap", "work", "2024-02-29T00:00:00.000Z")]);
  });

  it.each([
    "0000-01-01T00:00:00+01:00",
    "9999-12-31T23:00:00-02:00",
    "2026-09-01T18:00:00.123456Z",
  ])("round-trips canonical UTC dates for %s", (occurredAt) => {
    const ledger = createAchievementLedger([event("a", "work", occurredAt)]);
    expect(ledger.events).toHaveLength(1);
    expect(parseAchievementLedger(JSON.stringify(ledger))).toEqual(ledger);
  });
});

describe("recordAchievementEvent", () => {
  it("ignores duplicate deliveries, including a conflicting earlier timestamp", () => {
    const ledger = createAchievementLedger([event("assignment", "work", at(5))]);
    expect(recordAchievementEvent(ledger, event("assignment", "work", at(1)))).toEqual(ledger);
    expect(recordAchievementEvent(ledger, event("assignment", "work", at(10)))).toEqual(ledger);
  });

  it("never mutates or shares mutable records with the input ledger or event", () => {
    const source = Object.freeze(event("first"));
    const input = Object.freeze([source]);
    const ledger = createAchievementLedger(input);
    ledger.events.forEach(Object.freeze);
    ledger.earned.forEach(Object.freeze);
    Object.freeze(ledger.events);
    Object.freeze(ledger.earned);
    Object.freeze(ledger);
    const addition = Object.freeze(event("second", "work", at(2)));

    const next = recordAchievementEvent(ledger, addition);
    expect(next).not.toBe(ledger);
    expect(next.events).not.toBe(ledger.events);
    expect(next.events[0]).not.toBe(ledger.events[0]);
    expect(next.events[1]).not.toBe(addition);
    expect(next.earned[0]).not.toBe(ledger.earned[0]);
    expect(ledger.events).toEqual([source]);
    expect(input).toEqual([event("first")]);

    next.events[0].id = "changed";
    next.earned[0].earnedAt = at(20);
    expect(ledger.events[0].id).toBe("first");
    expect(ledger.earned[0].earnedAt).toBe(at(1));
    expect(recordAchievementEvent(ledger, source)).not.toBe(ledger);
  });

  it("preserves persisted award dates after backfilling earlier distinct events", () => {
    const original = createAchievementLedger(history("work", 5));
    const restored = parseAchievementLedger(JSON.stringify(original));
    expect(restored).toEqual(original);
    const updated = recordAchievementEvent(restored!, event("backfill", "work", "2025-01-01T00:00:00.000Z"));
    expect(updated.earned).toEqual(original.earned);
    expect(parseAchievementLedger(JSON.stringify(updated))).toEqual(updated);
    expect(award(updated, "five-finished")?.progress).toBe(6);
  });

  it("never revokes previously earned awards when passed a reduced in-memory history", () => {
    const ledger = createAchievementLedger(history("work", 5));
    const reduced = { ...ledger, events: [] };
    expect(recordAchievementEvent(reduced, event("new", "check-in", at(20))).earned).toEqual([
      { id: "first-finish", earnedAt: at(1) },
      { id: "first-check-in", earnedAt: at(20) },
      { id: "five-finished", earnedAt: at(5) },
    ]);
  });
});

describe("getAchievements", () => {
  it("distinguishes unavailable data from zero progress", () => {
    expect(getAchievements(null)).toEqual(ACHIEVEMENTS.map((definition) => ({ ...definition, progress: null, earnedAt: null })));
    expect(getAchievements(createAchievementLedger())).toEqual(ACHIEVEMENTS.map((definition) => ({ ...definition, progress: 0, earnedAt: null })));
  });
});

describe("parseAchievementLedger", () => {
  it("retires First Focus without resetting history or inventing a saved check-in", () => {
    const ledger = createAchievementLedger([...history("work", 5), ...history("focus", 10)]);
    const migrated = parse({ ...ledger, earned: [...ledger.earned, { id: "first-focus", earnedAt: at(1) }] });
    expect(migrated).toEqual(ledger);
    expect(award(migrated!, "first-check-in")).toMatchObject({ progress: 0, earnedAt: null });
    expect(award(migrated!, "ten-sessions")).toMatchObject({ progress: 10, earnedAt: at(10) });
  });

  it.each([
    null, "", "{", "null", "[]", "1", "true",
    JSON.stringify({}),
    JSON.stringify({ version: 2, events: [], earned: [] }),
    JSON.stringify({ version: "1", events: [], earned: [] }),
    JSON.stringify({ version: 1, events: [] }),
    JSON.stringify({ version: 1, events: {}, earned: [] }),
    JSON.stringify({ version: 1, events: [], earned: {} }),
    JSON.stringify({ version: 1, events: [null], earned: [] }),
    JSON.stringify({ version: 1, events: [event("a", "work", "bad-date")], earned: [] }),
    JSON.stringify({ version: 1, events: [{ ...event("a"), kind: "unknown" }], earned: [] }),
    JSON.stringify({ version: 1, events: [event(" ")], earned: [] }),
  ])("returns null for malformed storage %j", (raw) => {
    expect(parseAchievementLedger(raw)).toBeNull();
  });

  it("recomputes missing awards from canonicalized events", () => {
    const events = history("work", 5).reverse();
    expect(parse({ version: 1, events: [...events, ...events], earned: [] }))
      .toEqual(createAchievementLedger(events));
    expect(parse({ version: 1, events: [], earned: [] })).toEqual(createAchievementLedger());
  });

  it.each([
    null,
    {},
    { id: "unknown", earnedAt: at(1) },
    { id: "first-finish", earnedAt: "invalid" },
    { id: "first-finish", earnedAt: 0 },
    { id: "first-finish", earnedAt: "2026-08-01T00:00:00.000Z" },
    { id: "first-finish", earnedAt: at(20) },
    { id: "five-finished", earnedAt: at(4) },
    { id: "first-focus", earnedAt: at(1) },
  ])("rejects unsupported persisted award %j", (earned) => {
    expect(parse({ version: 1, events: history("work", 5), earned: [earned] })).toBeNull();
  });

  it("does not trust duplicate events as evidence for a threshold", () => {
    expect(parse({
      version: 1,
      events: Array.from({ length: 5 }, () => event("same")),
      earned: [{ id: "five-finished", earnedAt: at(1) }],
    })).toBeNull();
  });

  it("rejects duplicate awards and awards without supporting history", () => {
    const ledger = createAchievementLedger([event("a")]);
    expect(parse({ ...ledger, earned: [...ledger.earned, ...ledger.earned] })).toBeNull();
    expect(parse({ ...ledger, events: [] })).toBeNull();
  });

  it("normalizes valid persisted timestamps and discards unrelated stored fields", () => {
    const ledger = createAchievementLedger([event("a")]);
    expect(parse({
      ...ledger,
      progress: 1000,
      earned: [{ id: "first-finish", earnedAt: "2026-09-01T11:00:00-07:00", target: 0 }],
    })).toEqual(ledger);
  });
});
