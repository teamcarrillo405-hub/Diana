import type { Tables } from "@/lib/supabase/types";

export type Assignment = Pick<
  Tables<"assignments">,
  | "id"
  | "title"
  | "due_at"
  | "status"
  | "estimated_minutes"
  | "difficulty"
  | "class_id"
  | "kind"
  | "reading_load"
  | "writing_load"
> & {
  classes?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export type EnergyLevel = "low" | "medium" | "high";

export type ScorerProfile = {
  diagnoses: string[];
  extra_time_pct: number;
};

export type ScorerLearningLoop = {
  friction?: {
    readingHeavyNeedsSmallerSteps?: boolean;
    writingHeavyNeedsScaffold?: boolean;
    stuckPattern?: "none" | "restart" | "direct_answer" | "still_stuck" | "overload";
  };
};

export type ScoredAssignment = Assignment & {
  score: number;
  reasons: string[];
  effective_minutes: number | null;   // user's true cost, after accommodations
};

/**
 * A task_signals row narrowed to the fields the scorer needs.
 * Fetched by the dashboard for the last 4 hours, filtered to
 * kind in ('started', 'completed').
 */
export type RecentSignal = {
  assignment_id: string;
  occurred_at: string; // ISO 8601
};

/**
 * Phase 8: Interleaving penalty. When the previous top task was from the same
 * class, this much score is subtracted to favor subject variety (g=0.42 effect
 * from interleaved-practice research). NOT applied to "due now" / "due today"
 * assignments — urgency wins (Pitfall 6).
 */
const INTERLEAVE_PENALTY = 15;
const CORE_ACADEMIC_BONUS = 24;
const WELLNESS_SUPPORT_LANE_PENALTY = 18;

const CORE_CLASS_PATTERN =
  /\b(english|ela|literature|writing|algebra|geometry|math|biology|chemistry|physics|science|history|world|government|civics|economics|spanish|french|latin|language)\b/i;
const WELLNESS_CLASS_PATTERN =
  /\b(health|wellness|physical education|\bpe\b|\bp\.e\.\b|fitness)\b/i;

/**
 * Rule-based "what should I do in the next 5 minutes?" scorer.
 *
 * Heuristics (intentionally simple and inspectable):
 *   - closer deadline → higher score
 *   - already-started → momentum bump
 *   - high energy promotes harder/longer tasks; low energy promotes quick wins
 *   - core academic work gets priority over wellness/support tasks unless the
 *     support task is urgent or high-consequence
 *   - if dyslexia is in the profile, reading-heavy tasks are de-promoted at
 *     low energy and inflated in time estimate
 *   - if extra_time_pct > 0, the displayed effective minutes reflect it
 */
export function rankAssignments(
  assignments: Assignment[],
  signals: RecentSignal[] = [],
  now: Date = new Date(),
  energy: EnergyLevel = "medium",
  profile: ScorerProfile = { diagnoses: [], extra_time_pct: 0 },
  lastShownClassId: string | null = null,
  learningLoop: ScorerLearningLoop | null = null,
): ScoredAssignment[] {
  const scored = assignments
    .filter(
      (a) =>
        a.status !== "submitted" &&
        a.status !== "graded" &&
        a.status !== "abandoned",
    )
    .map((a) => score(a, signals, now, energy, profile, learningLoop));

  if (lastShownClassId) {
    for (const s of scored) {
      if (s.class_id === lastShownClassId) {
        const isUrgent =
          s.reasons.includes("due now") || s.reasons.includes("due today");
        if (!isUrgent) {
          s.score = Math.max(0, s.score - INTERLEAVE_PENALTY);
          // Silent de-promotion: no reason pushed so the UI doesn't reveal the
          // mechanic to the student (avoids self-fulfilling avoidance).
        }
      }
    }
  }

  return scored.sort((x, y) => y.score - x.score);
}

function score(
  a: Assignment,
  signals: RecentSignal[],
  now: Date,
  energy: EnergyLevel,
  profile: ScorerProfile,
  learningLoop: ScorerLearningLoop | null,
): ScoredAssignment {
  let s = 0;
  const reasons: string[] = [];
  const hasDyslexia = profile.diagnoses.includes("dyslexia");
  const readingHeavy = (a.reading_load ?? 0) >= 3;
  const writingHeavy = (a.writing_load ?? 0) >= 3;
  const className = assignmentClassName(a);
  const coreAcademic = isCoreAcademicClassName(className);
  const wellnessSupport = isWellnessSupportClassName(className);
  let hoursUntilDue: number | null = null;

  if (a.due_at) {
    hoursUntilDue = (new Date(a.due_at).getTime() - now.getTime()) / 36e5;
    if (hoursUntilDue < 0) {
      s += 80;
      reasons.push("due now");
    } else if (hoursUntilDue < 24) {
      s += 60;
      reasons.push("due today");
    } else if (hoursUntilDue < 72) {
      s += 30;
      reasons.push(`due in ${Math.ceil(hoursUntilDue / 24)} days`);
    } else if (hoursUntilDue < 168) {
      s += 10;
      reasons.push(`due in ${Math.ceil(hoursUntilDue / 24)} days`);
    }
  }

  const highConsequence =
    hoursUntilDue != null && hoursUntilDue < 24 ||
    a.kind === "test_prep" ||
    (a.difficulty ?? 3) >= 4;

  if (coreAcademic) {
    s += CORE_ACADEMIC_BONUS;
    reasons.push("core class priority");
  } else if (wellnessSupport && !highConsequence) {
    s = Math.max(0, s - WELLNESS_SUPPORT_LANE_PENALTY);
    reasons.push("body support lane");
  }

  const lastSignal = signals.find((sig) => sig.assignment_id === a.id);
  if (lastSignal) {
    const ageHours =
      (now.getTime() - new Date(lastSignal.occurred_at).getTime()) / 36e5;
    if (ageHours < 2) {
      s += 25;
      reasons.push("recently worked on");
    } else if (ageHours < 8) {
      s += 10;
      reasons.push("worked on earlier today");
    }
    // Older than 8h: no bump (decay floor)
  }

  const est = a.estimated_minutes ?? null;
  const diff = a.difficulty ?? 3;

  if (energy === "low") {
    if (est !== null && est <= 15) {
      s += 15;
      reasons.push("quick win for low energy");
    }
    if (diff <= 2) s += 8;
    if (diff >= 4) s -= 10;
    if (hasDyslexia && readingHeavy) {
      s -= 12;
      reasons.push("reading-heavy — save for higher energy");
    }
  } else if (energy === "high") {
    if (diff >= 4) {
      s += 15;
      reasons.push("good fit while focused");
    }
    if (est !== null && est >= 30) s += 8;
    if (hasDyslexia && readingHeavy) {
      s += 6;
      reasons.push("focus window is the right time for this");
    }
    if (writingHeavy) s += 4;
  }

  if (learningLoop?.friction?.readingHeavyNeedsSmallerSteps && readingHeavy && !highConsequence) {
    s -= 6;
    reasons.push("reading needs a smaller first move");
  }

  if (learningLoop?.friction?.writingHeavyNeedsScaffold && writingHeavy) {
    s += 4;
    reasons.push("writing scaffold ready");
  }

  if (
    learningLoop?.friction?.stuckPattern === "restart" &&
    lastSignal &&
    a.status !== "todo"
  ) {
    s += 5;
    reasons.push("restart support available");
  }

  if (est === null) s -= 3;

  const effective_minutes = adjustForUser(a, profile);

  return { ...a, score: s, reasons, effective_minutes };
}

export function assignmentClassName(a: Pick<Assignment, "classes">): string {
  const joined = Array.isArray(a.classes) ? a.classes[0] : a.classes;
  return joined?.name?.trim() ?? "";
}

export function isCoreAcademicAssignment(a: Pick<Assignment, "classes">): boolean {
  return isCoreAcademicClassName(assignmentClassName(a));
}

export function isWellnessSupportAssignment(a: Pick<Assignment, "classes">): boolean {
  return isWellnessSupportClassName(assignmentClassName(a));
}

function isCoreAcademicClassName(className: string) {
  return CORE_CLASS_PATTERN.test(className);
}

function isWellnessSupportClassName(className: string) {
  return WELLNESS_CLASS_PATTERN.test(className);
}

/**
 * Convert a teacher-estimated minutes value into the student's actual
 * expected minutes, factoring (a) IEP/504 extra-time percentage and
 * (b) a dyslexia penalty on reading-heavy tasks.
 */
export function adjustForUser(a: Assignment, p: ScorerProfile): number | null {
  if (a.estimated_minutes == null) return null;
  let minutes = a.estimated_minutes;
  if (p.extra_time_pct > 0) {
    minutes = Math.round(minutes * (1 + p.extra_time_pct / 100));
  }
  if (p.diagnoses.includes("dyslexia") && (a.reading_load ?? 0) >= 3) {
    minutes = Math.round(minutes * 1.6);
  }
  return minutes;
}
