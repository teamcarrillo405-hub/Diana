// Test Prep Engine — curriculum-position-aware study planning.
//
// The ADHD failure mode for tests isn't "can't study" — it's "didn't know
// where to start, started the night before." This module removes that load:
// given the test date and the student's concept mastery for the class, it
// backward-plans the days (practice early, light recall the night before —
// the evidence is firmly against cramming), triages concepts weakest-first,
// and says readiness calmly. Pure functions, no IO.

export type TestPrepConcept = {
  id: string;
  name: string;
  /** 0–4 mastery scale (Phase 15). */
  masteryLevel: number;
};

export type PrepEntryKind =
  | "concept_review"
  | "make_cards"
  | "practice_test"
  | "review_results"
  | "light_recall";

export type PrepDay = {
  /** Days from today (0 = today). */
  offset: number;
  heading: string;
  isToday: boolean;
  entries: Array<{ kind: PrepEntryKind; label: string }>;
};

export type TestPrepPlan = {
  daysUntil: number;
  /** All concepts, weakest first. */
  triage: TestPrepConcept[];
  /** Mastery <= 2 — where prep time pays most. */
  shaky: TestPrepConcept[];
  days: PrepDay[];
  readiness: string;
};

const SHAKY_THRESHOLD = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Is this assignment a quiz/test/final the prep engine should plan for? */
export function looksLikeTest(title: string | null | undefined, kind: string | null | undefined): boolean {
  if (kind === "test_prep") return true;
  if (!title) return false;
  return /\b(quiz|test|final|finals|exam|midterm|assessment)\b/i.test(title);
}

/**
 * Where "what's on this test" starts: the previous test's due date when one
 * exists, otherwise a four-week window. Material before the last test was
 * already tested — the new window is the student's curriculum position.
 */
export function coverageWindowStart(
  previousTestDueAt: string | null,
  now: Date,
): string {
  if (previousTestDueAt) return previousTestDueAt;
  return new Date(now.getTime() - 28 * MS_PER_DAY).toISOString();
}

/** The most recent earlier test-like assignment, for the coverage window. */
export function previousTestDueAt(
  assignments: Array<{ title: string | null; kind: string | null; due_at: string | null }>,
  testDueAt: string,
): string | null {
  const earlier = assignments
    .filter(
      (a) =>
        a.due_at != null &&
        a.due_at < testDueAt &&
        looksLikeTest(a.title, a.kind),
    )
    .sort((a, b) => (b.due_at ?? "").localeCompare(a.due_at ?? ""));
  return earlier[0]?.due_at ?? null;
}

/** Next upcoming test-like assignment — the dashboard countdown's source. */
export function nextUpcomingTest<
  T extends { title: string | null; kind: string | null; due_at: string | null },
>(assignments: T[], now: Date): T | null {
  const upcoming = assignments
    .filter((a) => a.due_at != null && new Date(a.due_at).getTime() >= now.getTime() && looksLikeTest(a.title, a.kind))
    .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));
  return upcoming[0] ?? null;
}

export function buildTestPrepPlan(input: {
  testDueAt: string;
  now: Date;
  concepts: TestPrepConcept[];
}): TestPrepPlan {
  const daysUntil = daysBetween(input.now, new Date(input.testDueAt));
  const triage = [...input.concepts].sort(
    (a, b) => a.masteryLevel - b.masteryLevel || a.name.localeCompare(b.name),
  );
  const shaky = triage.filter((c) => c.masteryLevel <= SHAKY_THRESHOLD);

  return {
    daysUntil,
    triage,
    shaky,
    days: planDays(daysUntil, shaky),
    readiness: readinessLine(triage, shaky),
  };
}

/**
 * Backward planning from the test date. Slots are defined by days-before-test:
 * night before is always light recall; practice tests sit earlier so their
 * results can still change what gets reviewed. Long runways get a single
 * lead-in touch today instead of a wall of identical days.
 */
function planDays(daysUntil: number, shaky: TestPrepConcept[]): PrepDay[] {
  const weakestNames = shaky.slice(0, 2).map((c) => c.name);
  const conceptLabel =
    weakestNames.length > 0
      ? `Walk through ${weakestNames.join(" and ")} with your notes open`
      : "Walk through your two least-comfortable topics with your notes open";

  if (daysUntil <= 0) {
    return [
      day(0, "Today", [
        entry("light_recall", "Light recall only: flip through your cards once, then rest your brain."),
      ]),
    ];
  }

  if (daysUntil === 1) {
    return [
      day(0, "Today", [
        entry("practice_test", "One short practice test — it shows exactly what to look at tonight."),
        entry("light_recall", "Then light recall before bed. Sleep is part of studying."),
      ]),
    ];
  }

  const days: PrepDay[] = [];
  const start = Math.min(daysUntil, 5);
  const firstOffset = daysUntil - start;

  if (firstOffset > 0) {
    days.push(
      day(0, "Today", [
        entry("make_cards", "Early touch: make cards from your newest notes so reviews start counting."),
      ]),
    );
  }

  for (let before = start; before >= 1; before -= 1) {
    const offset = daysUntil - before;
    const heading = offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : `In ${offset} days`;
    const entries: Array<{ kind: PrepEntryKind; label: string }> = [];

    if (before === 1) {
      entries.push(entry("light_recall", "Night before: light recall only — cards once through, then sleep."));
    } else if (before === 2) {
      entries.push(
        start >= 4
          ? entry("practice_test", "Second practice test — confirm the shaky spots moved.")
          : entry("practice_test", "Practice test, then review what it surfaces."),
      );
      if (start < 4) entries.push(entry("review_results", "Spend the rest of the time on whatever the practice test surfaced."));
    } else if (before === 3) {
      entries.push(entry("review_results", "Review what the practice test surfaced — those topics first."));
      if (shaky.length > 0) entries.push(entry("concept_review", conceptLabel));
    } else if (before === 4) {
      entries.push(entry("practice_test", "First practice test — early enough that the results can change the plan."));
    } else {
      entries.push(entry("concept_review", conceptLabel));
      entries.push(entry("make_cards", "Turn anything fuzzy into cards — Diana schedules the reviews."));
    }

    days.push(day(offset, heading, entries));
  }

  return days;
}

function readinessLine(triage: TestPrepConcept[], shaky: TestPrepConcept[]): string {
  if (triage.length === 0) {
    return "No concept map for this class yet — generate a practice test and Diana starts mapping what's on it.";
  }
  if (shaky.length === 0) {
    return `All ${triage.length} concepts Diana is tracking feel solid — keep them warm with light recall.`;
  }
  return `Diana is tracking ${triage.length} concept${triage.length === 1 ? "" : "s"} for this class — ${shaky.length} still feel${shaky.length === 1 ? "s" : ""} shaky. That's where prep time pays off.`;
}

function day(offset: number, heading: string, entries: Array<{ kind: PrepEntryKind; label: string }>): PrepDay {
  return { offset, heading, isToday: offset === 0, entries };
}

function entry(kind: PrepEntryKind, label: string): { kind: PrepEntryKind; label: string } {
  return { kind, label };
}

/** Whole days between two instants, by local start-of-day. */
function daysBetween(now: Date, target: Date): number {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}
