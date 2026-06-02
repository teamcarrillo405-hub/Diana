export type ActivityType =
  | "walk"
  | "run"
  | "bike"
  | "team_sport"
  | "strength"
  | "stretch"
  | "dance"
  | "other";

export type ActivityFelt = "steady" | "tired" | "energized" | "sore" | "proud" | "not_sure";
export type WellnessGoalCategory = "skill" | "endurance" | "strength" | "flexibility" | "consistency" | "recovery";
export type SleepQuality = "rested" | "ok" | "rough";

export type SleepLogLike = {
  sleep_date: string;
  sleep_quality: SleepQuality;
  sleep_hours: number | null;
};

export type SleepRecoveryAdjustment = {
  energyOverride: "low" | null;
  show: boolean;
  message: string | null;
};

export type HealthMode = "health_question" | "movement_goal" | "cpr_first_aid" | "sleep_recovery";

export type HealthScaffoldResult = {
  mode: HealthMode;
  prompts: string[];
  cards: Array<{ title: string; body: string; action: string }>;
  checklist: string[];
};

const FALLBACKS: Record<HealthMode, HealthScaffoldResult> = {
  health_question: {
    mode: "health_question",
    prompts: [
      "What is the exact question from class?",
      "Is this asking for a definition, a process, or a decision?",
      "What does your teacher want you to cite?",
    ],
    cards: [
      {
        title: "Class answer frame",
        body: "Start with the classroom term, add one plain-language explanation, then name when to ask a trusted adult or clinician.",
        action: "Write the term first.",
      },
    ],
    checklist: ["Use class vocabulary", "Keep it factual", "Name a support person when the topic is personal"],
  },
  movement_goal: {
    mode: "movement_goal",
    prompts: ["What skill are you practicing?", "What is one small next step?", "How should it feel when it is a good fit?"],
    cards: [
      {
        title: "Student-owned goal",
        body: "Choose a skill, consistency, recovery, or endurance goal that is about capability and care.",
        action: "Make the next step small enough for one session.",
      },
    ],
    checklist: ["Pick a skill", "Choose a next step", "Set a check-in day"],
  },
  cpr_first_aid: {
    mode: "cpr_first_aid",
    prompts: ["What situation are you studying?", "What is the first safety check?", "Who should be contacted?"],
    cards: [
      {
        title: "First pass",
        body: "Check the scene, call for help, then follow the class protocol for the situation.",
        action: "Turn the protocol into three study cards.",
      },
    ],
    checklist: ["Scene safety", "Call for help", "Use class protocol", "Practice recall"],
  },
  sleep_recovery: {
    mode: "sleep_recovery",
    prompts: ["How did sleep affect focus today?", "Which task should be smaller?", "What recovery cue helps tonight?"],
    cards: [
      {
        title: "Recovery plan",
        body: "When sleep is rough, make the next academic step smaller and choose a visible stopping point.",
        action: "Pick one short task and one break cue.",
      },
    ],
    checklist: ["Log sleep", "Lower task intensity", "Choose a stopping point"],
  },
};

const FIRST_AID_CARDS = [
  {
    front: "CPR study: first check",
    back: "Check the scene for safety, check responsiveness, and ask someone nearby to call emergency services.",
  },
  {
    front: "CPR study: compressions",
    back: "For class study, remember hard and fast chest compressions in the center of the chest, following your course protocol.",
  },
  {
    front: "First aid study: bleeding",
    back: "Use direct pressure with clean material and get adult or emergency help for heavy bleeding.",
  },
  {
    front: "First aid study: burn",
    back: "Cool the area with clean running water and follow your class protocol for covering it and getting help.",
  },
  {
    front: "First aid study: choking",
    back: "Recognize inability to breathe or speak and follow your certified class steps for the person's age.",
  },
] as const;

const GOAL_BLOCK_TERMS = [
  "weight",
  "weigh",
  "pounds",
  "lbs",
  "skinny",
  "thin",
  "bmi",
  "calorie",
  "calories",
  "look better",
  "appearance",
];

export function fallbackHealthScaffold(mode: HealthMode): HealthScaffoldResult {
  return FALLBACKS[mode];
}

export function parseHealthScaffold(raw: string, mode: HealthMode): HealthScaffoldResult {
  try {
    const parsed = JSON.parse(raw) as Partial<HealthScaffoldResult>;
    return {
      mode,
      prompts: normalizeStrings(parsed.prompts, FALLBACKS[mode].prompts),
      cards: normalizeCards(parsed.cards, FALLBACKS[mode].cards),
      checklist: normalizeStrings(parsed.checklist, FALLBACKS[mode].checklist),
    };
  } catch {
    return fallbackHealthScaffold(mode);
  }
}

export function firstAidStudyCards(): Array<{ front: string; back: string }> {
  return FIRST_AID_CARDS.map((card) => ({ ...card }));
}

export function goalTextIsAllowed(...parts: string[]): boolean {
  const text = parts.join(" ").toLowerCase();
  return !GOAL_BLOCK_TERMS.some((term) => text.includes(term));
}

export function sleepRecoveryAdjustment(
  latest: SleepLogLike | null | undefined,
  now: Date = new Date(),
): SleepRecoveryAdjustment {
  if (!latest) return { energyOverride: null, show: false, message: null };
  const ageDays = daysBetweenIsoDates(todayIsoDate(now), latest.sleep_date);
  if (ageDays < 0 || ageDays > 1) return { energyOverride: null, show: false, message: null };

  const shortSleep = typeof latest.sleep_hours === "number" && latest.sleep_hours > 0 && latest.sleep_hours < 6;
  if (latest.sleep_quality === "rough" || shortSleep) {
    return {
      energyOverride: "low",
      show: true,
      message: "Sleep looked light, so Diana will favor smaller tasks unless you choose a different energy.",
    };
  }
  if (latest.sleep_quality === "ok") {
    return {
      energyOverride: null,
      show: true,
      message: "Sleep was logged. Diana will keep the usual task mix and you can adjust energy anytime.",
    };
  }
  return { energyOverride: null, show: false, message: null };
}

export function todayIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function daysBetweenIsoDates(today: string, other: string): number {
  const todayMs = Date.parse(`${today}T00:00:00.000Z`);
  const otherMs = Date.parse(`${other}T00:00:00.000Z`);
  if (!Number.isFinite(todayMs) || !Number.isFinite(otherMs)) return Number.POSITIVE_INFINITY;
  return Math.round((todayMs - otherMs) / 86400000);
}

function normalizeStrings(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const out = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 8);
  return out.length > 0 ? out : fallback;
}

function normalizeCards(value: unknown, fallback: HealthScaffoldResult["cards"]): HealthScaffoldResult["cards"] {
  if (!Array.isArray(value)) return fallback;
  const cards = value
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item.title === "string" && typeof item.body === "string")
    .map((item) => ({
      title: String(item.title).trim(),
      body: String(item.body).trim(),
      action: typeof item.action === "string" ? item.action.trim() : "Try one small step.",
    }))
    .filter((item) => item.title && item.body)
    .slice(0, 5);
  return cards.length > 0 ? cards : fallback;
}
