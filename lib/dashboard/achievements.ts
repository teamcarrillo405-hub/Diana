export type AchievementKind = "work" | "focus" | "submitted" | "check-in";

/** Use assignment IDs, distinct focus-session IDs, and local dates for saved check-ins. */
export type AchievementEvent = {
  id: string;
  kind: AchievementKind;
  occurredAt: string;
};

export type AchievementLedger = {
  version: 1;
  events: AchievementEvent[];
  earned: { id: string; earnedAt: string }[];
};

export const ACHIEVEMENTS = [
  {
    id: "first-finish",
    title: "First Finish",
    kind: "work",
    target: 1,
    tier: 1,
    requirement: "Complete 1 assignment.",
  },
  {
    id: "first-check-in",
    title: "First Check-In",
    kind: "check-in",
    target: 1,
    tier: 1,
    requirement: "Save 1 check-in.",
  },
  {
    id: "handed-in",
    title: "Handed In",
    kind: "submitted",
    target: 1,
    tier: 1,
    requirement: "Confirm 1 assignment submission.",
  },
  {
    id: "five-finished",
    title: "Five Finished",
    kind: "work",
    target: 5,
    tier: 2,
    requirement: "Complete 5 assignments.",
  },
  {
    id: "ten-sessions",
    title: "Ten Sessions",
    kind: "focus",
    target: 10,
    tier: 2,
    requirement: "Finish 10 study sessions.",
  },
  {
    id: "five-submitted",
    title: "Five Submitted",
    kind: "submitted",
    target: 5,
    tier: 2,
    requirement: "Confirm 5 assignment submissions.",
  },
] as const satisfies readonly {
  id: string;
  title: string;
  kind: AchievementKind;
  target: number;
  tier: 1 | 2;
  requirement: string;
}[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isKind(value: unknown): value is AchievementKind {
  return value === "work" || value === "focus" || value === "submitted" || value === "check-in";
}

// Accept ISO dates or zoned timestamps, never machine-local/ambiguous dates.
function canonicalDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^((?:\d{4}|[+-]\d{6})-\d{2}-\d{2})(?:T(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(value);
  if (!match || (match[2] !== undefined && Number(match[2]) > 23)) return null;

  const day = new Date(`${match[1]}T00:00:00.000Z`);
  const timestamp = Date.parse(value);
  if (
    !Number.isFinite(day.getTime()) ||
    day.toISOString().split("T")[0] !== match[1] ||
    !Number.isFinite(timestamp)
  ) return null;
  return new Date(timestamp).toISOString();
}

function canonicalEvent(value: unknown): AchievementEvent | null {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim() || !isKind(value.kind)) {
    return null;
  }
  const occurredAt = canonicalDate(value.occurredAt);
  return occurredAt ? { id: value.id.trim(), kind: value.kind, occurredAt } : null;
}

function eventKey(event: AchievementEvent): string {
  return `${event.kind}:${event.id}`;
}

/** Seed history is sorted chronologically; the earliest duplicate wins. */
export function createAchievementLedger(
  events: readonly AchievementEvent[] = [],
): AchievementLedger {
  const validated = events
    .map(canonicalEvent)
    .filter((event): event is AchievementEvent => event !== null)
    .sort((left, right) => {
      const time = Date.parse(left.occurredAt) - Date.parse(right.occurredAt);
      if (time !== 0) return time;
      const leftKey = eventKey(left);
      const rightKey = eventKey(right);
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });
  const seen = new Set<string>();
  const canonical = validated.filter((event) => {
    const key = eventKey(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    version: 1,
    events: canonical,
    earned: ACHIEVEMENTS.flatMap((definition) => {
      const crossing = canonical.filter((event) => event.kind === definition.kind)[definition.target - 1];
      return crossing ? [{ id: definition.id, earnedAt: crossing.occurredAt }] : [];
    }),
  };
}

/** Append-only lifetime history: duplicate delivery cannot change an event or award. */
export function recordAchievementEvent(
  ledger: AchievementLedger,
  event: AchievementEvent,
): AchievementLedger {
  let next = createAchievementLedger(ledger.events);
  const candidate = canonicalEvent(event);
  if (candidate && !next.events.some((existing) => eventKey(existing) === eventKey(candidate))) {
    next = createAchievementLedger([...next.events, candidate]);
  }

  return {
    ...next,
    earned: ACHIEVEMENTS.flatMap((definition) => {
      const award = ledger.earned.find((entry) => entry.id === definition.id)
        ?? next.earned.find((entry) => entry.id === definition.id);
      return award ? [{ ...award }] : [];
    }),
  };
}

export function getAchievements(ledger: AchievementLedger | null) {
  const events = ledger === null ? [] : createAchievementLedger(ledger.events).events;
  return ACHIEVEMENTS.map((definition) => ({
    ...definition,
    progress: ledger === null ? null : events.filter((event) => event.kind === definition.kind).length,
    earnedAt: ledger?.earned.find((award) => award.id === definition.id)?.earnedAt ?? null,
  }));
}

/** Validate preview storage, not authenticity. A production ledger needs trusted events. */
export function parseAchievementLedger(raw: string | null): AchievementLedger | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.events) || !Array.isArray(value.earned)) {
    return null;
  }

  const events: AchievementEvent[] = [];
  for (const input of value.events) {
    const event = canonicalEvent(input);
    if (!event) return null;
    events.push(event);
  }
  const ledger = createAchievementLedger(events);
  const persisted = new Map<string, string>();
  for (const input of value.earned) {
    if (!isRecord(input) || typeof input.id !== "string" || persisted.has(input.id)) return null;
    // Retire the old badge without discarding session history or awarding a check-in.
    const definition = ACHIEVEMENTS.find((entry) => entry.id === input.id)
      ?? (input.id === "first-focus" ? { kind: "focus" as const, target: 1 } : undefined);
    const earnedAt = canonicalDate(input.earnedAt);
    const crossing = definition && ledger.events.filter((event) => event.kind === definition.kind)[definition.target - 1];
    if (!definition || !earnedAt || !crossing) return null;

    // Backfilled history can move a crossing earlier without rewriting a saved award.
    // A saved date still needs a real event and enough distinct events by that date.
    if (
      Date.parse(earnedAt) < Date.parse(crossing.occurredAt) ||
      !ledger.events.some((event) => event.kind === definition.kind && event.occurredAt === earnedAt)
    ) return null;
    persisted.set(input.id, earnedAt);
  }

  return {
    ...ledger,
    earned: ledger.earned.map((award) => ({
      ...award,
      earnedAt: persisted.get(award.id) ?? award.earnedAt,
    })),
  };
}
