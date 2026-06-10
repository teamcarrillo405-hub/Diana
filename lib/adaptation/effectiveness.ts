// Scaffold-effectiveness engine — the learning half of the loop.
//
// Input: the student's own "that helped / not really" taps (ai_help_feedback).
// Output: per-feature effectiveness with a stance (lean_in / neutral /
// ease_off), a preferred study mode, one calm prompt line for AI helpers, and
// student-facing transparency strings. All plain math — Laplace-smoothed
// helpful rates over a recent window — inspectable, private, and exportable.
// No AI call ever depends on this succeeding; absence of data means absence
// of opinion, never a worse experience.

import type { StudyHelperMode } from "@/lib/study-helper/modes";

export type FeedbackEvent = {
  feature: string;
  helpful: boolean;
  createdAt: string;
};

export type HelperEffectiveness = {
  feature: string;
  samples: number;
  /** Laplace-smoothed helpful rate in [0,1]. */
  score: number;
  stance: "lean_in" | "neutral" | "ease_off";
};

/** Minimum taps before Diana forms an opinion about a feature. */
export const MIN_SAMPLES = 3;
const LEAN_IN_SCORE = 0.6;
const EASE_OFF_SCORE = 0.35;
/** Only the most recent events count — students change. */
const RECENT_WINDOW_PER_FEATURE = 40;

export function computeEffectiveness(events: FeedbackEvent[]): HelperEffectiveness[] {
  const byFeature = new Map<string, FeedbackEvent[]>();
  for (const event of events) {
    const list = byFeature.get(event.feature);
    if (list) list.push(event);
    else byFeature.set(event.feature, [event]);
  }

  const out: HelperEffectiveness[] = [];
  for (const [feature, all] of byFeature) {
    const recent = all
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_WINDOW_PER_FEATURE);
    const samples = recent.length;
    const helpfulCount = recent.filter((e) => e.helpful).length;
    const score = (helpfulCount + 1) / (samples + 2);
    const confident = samples >= MIN_SAMPLES;
    const stance: HelperEffectiveness["stance"] =
      confident && score >= LEAN_IN_SCORE
        ? "lean_in"
        : confident && score <= EASE_OFF_SCORE
          ? "ease_off"
          : "neutral";
    out.push({ feature, samples, score, stance });
  }

  return out.sort((a, b) => b.score - a.score || b.samples - a.samples);
}

const STUDY_MODE_PREFIX = "study_mode:";
const STUDY_MODES: StudyHelperMode[] = [
  "guided_steps",
  "visual_breakdown",
  "retrieval_quiz",
  "flashcard_builder",
];

/**
 * The study mode that has demonstrably worked for this student, or null when
 * no mode has earned a lean_in. Used as a gentle default — never overrides
 * recovery/one-move support or the student's explicit choice.
 */
export function preferredStudyMode(effectiveness: HelperEffectiveness[]): StudyHelperMode | null {
  const candidate = effectiveness.find(
    (e) =>
      e.stance === "lean_in" &&
      e.feature.startsWith(STUDY_MODE_PREFIX) &&
      STUDY_MODES.includes(e.feature.slice(STUDY_MODE_PREFIX.length) as StudyHelperMode),
  );
  return candidate ? (candidate.feature.slice(STUDY_MODE_PREFIX.length) as StudyHelperMode) : null;
}

/**
 * One calm sentence of learned context for AI system prompts, or null when
 * Diana has no confident opinion yet. Never names scores or counts — just
 * direction.
 */
export function adaptationPromptLine(effectiveness: HelperEffectiveness[]): string | null {
  const leanIn = effectiveness.filter((e) => e.stance === "lean_in").slice(0, 2);
  const easeOff = effectiveness.filter((e) => e.stance === "ease_off").slice(0, 1);
  if (leanIn.length === 0 && easeOff.length === 0) return null;

  const parts: string[] = [];
  if (leanIn.length > 0) {
    parts.push(
      `${leanIn.map((e) => humanFeature(e.feature)).join(" and ")} ${leanIn.length === 1 ? "has" : "have"} landed well for this student — lead with that shape when natural`,
    );
  }
  if (easeOff.length > 0) {
    parts.push(`${humanFeature(easeOff[0].feature)} has not been landing — try a different shape first`);
  }
  return `Learned context: ${parts.join("; ")}.`;
}

/** Student-facing transparency lines for the Settings panel. */
export function adaptationSummary(effectiveness: HelperEffectiveness[]): string[] {
  const lines: string[] = [];
  for (const e of effectiveness) {
    if (e.stance === "lean_in") {
      lines.push(`${humanFeature(e.feature)} has been working for you — Diana reaches for it sooner.`);
    } else if (e.stance === "ease_off") {
      lines.push(`${humanFeature(e.feature)} hasn't been clicking — Diana tries other shapes first.`);
    }
  }
  return lines.slice(0, 6);
}

// ---------------------------------------------------------------------------
// Automatic outcome signals — learning even when students don't tap.
// An assignment completed shortly after AI help is treated as one quiet
// "helpful" vote for each kind of help used on it. Only positive inference:
// an absent completion proves nothing, so it never counts against a feature.
// ---------------------------------------------------------------------------

export type HelpInteraction = {
  feature: string;
  assignmentId: string | null;
  createdAt: string;
};

export type CompletionSignal = {
  assignmentId: string;
  occurredAt: string;
};

/** Help must precede the completion within this window to get credit. */
const OUTCOME_WINDOW_MS = 72 * 60 * 60 * 1000;

export function outcomeEvents(input: {
  interactions: HelpInteraction[];
  completions: CompletionSignal[];
}): FeedbackEvent[] {
  const completionsByAssignment = new Map<string, string[]>();
  for (const completion of input.completions) {
    const list = completionsByAssignment.get(completion.assignmentId) ?? [];
    list.push(completion.occurredAt);
    completionsByAssignment.set(completion.assignmentId, list);
  }

  const seen = new Set<string>(); // one vote per (assignment, feature)
  const events: FeedbackEvent[] = [];
  for (const interaction of input.interactions) {
    if (!interaction.assignmentId) continue;
    const key = `${interaction.assignmentId}::${interaction.feature}`;
    if (seen.has(key)) continue;
    const completions = completionsByAssignment.get(interaction.assignmentId) ?? [];
    const helpedAt = new Date(interaction.createdAt).getTime();
    const match = completions.find((occurredAt) => {
      const completedAt = new Date(occurredAt).getTime();
      return completedAt >= helpedAt && completedAt - helpedAt <= OUTCOME_WINDOW_MS;
    });
    if (!match) continue;
    seen.add(key);
    events.push({ feature: interaction.feature, helpful: true, createdAt: match });
  }
  return events;
}

export function humanFeature(feature: string): string {
  const known: Record<string, string> = {
    math_step: "Math hints",
    math_example: "Worked examples",
    math_scaffold: "The math step board",
    writing_aid: "Writing rule help",
    writing_cowrite: "Writing structure help",
    reading_scaffold: "The reading scaffold",
    task_breakdown: "Task breakdown",
    study_artifact: "Study artifacts",
    science_scaffold: "The science helper",
    history_scaffold: "The history helper",
    cs_scaffold: "Coding hints",
    language_scaffold: "Language practice",
    ap_scaffold: "AP practice",
    visual_tool: "Visual learning",
    "subject:math": "The math helper",
    "subject:science": "The science helper",
    "subject:history": "The history helper",
    "subject:writing": "The writing studio",
    "subject:reading": "The reading scaffold",
    "subject:ap": "The AP helper",
    "subject:wellness": "The health helper",
    "study_mode:guided_steps": "Step-by-step guidance",
    "study_mode:visual_breakdown": "Visual breakdowns",
    "study_mode:retrieval_quiz": "Quiz-style recall",
    "study_mode:flashcard_builder": "Card building",
    study_buddy: "The study buddy",
    study_artifacts: "Study artifacts",
  };
  return known[feature] ?? feature.replace(/^subject:/, "").replace(/^study_mode:/, "").replaceAll("_", " ");
}
