import type { AssignmentKind } from "@/lib/supabase/types";
import type { EnergyLevel, ScoredAssignment } from "@/lib/scoring/next-five-minutes";

export type BodyState = "low" | "okay" | "ready";
export type FocusState = "scattered" | "steady" | "locked";
export type ReadinessCheckIn = {
  body: BodyState;
  focus: FocusState;
};

export type StruggleState = "steady" | "productive" | "blocked" | "overload";
export type SupportIntensity = "steady" | "guided" | "scaffolded" | "one_move" | "recovery";

export type FrictionSignals = {
  startsLast24h?: number;
  restartsLast24h?: number;
  completionsLast24h?: number;
  overwhelmedLast24h?: number;
  contextSwitchesLast24h?: number;
  helpRequestsLast24h?: number;
  modeSwitchesLast24h?: number;
  directAnswerRequestsLast24h?: number;
  stillStuckLast24h?: number;
  longIdleResumesLast24h?: number;
  artifactGenerationsLast24h?: number;
  cardsSavedLast24h?: number;
  recallAttemptsLast7d?: number;
  recallNeedsReviewLast7d?: number;
  recallSecureLast7d?: number;
};

export type MilestoneMemory = {
  sameKindCompletions14d?: number;
};

export type SupportPlan = {
  intensity: SupportIntensity;
  struggle: StruggleState;
  headline: string;
  rationale: string;
  nextStep: string;
  bodyCue: string | null;
  patternNote: string | null;
  decisionTrace: string[];
  ruleConfidence: "medium" | "high";
  chips: string[];
};

type SupportAssignment = Pick<
  ScoredAssignment,
  "kind" | "reading_load" | "writing_load" | "difficulty" | "effective_minutes" | "status"
>;

export function moodFromReadiness(checkIn: ReadinessCheckIn): "good" | "meh" | "rough" {
  if (checkIn.body === "low" && checkIn.focus === "scattered") return "rough";
  if (checkIn.body === "low" || checkIn.focus === "scattered") return "meh";
  return "good";
}

export function energyFromBody(body: BodyState | null | undefined): EnergyLevel | null {
  if (body === "low") return "low";
  if (body === "ready") return "high";
  if (body === "okay") return "medium";
  return null;
}

export function readinessFromSignalValue(value: unknown): ReadinessCheckIn | null {
  if (!value || typeof value !== "object") return null;
  const body = (value as { body?: unknown }).body;
  const focus = (value as { focus?: unknown }).focus;
  if (!isBodyState(body) || !isFocusState(focus)) return null;
  return { body, focus };
}

export function summarizeFrictionSignals(
  signals: Array<{ kind: string; assignment_id?: string | null; value?: unknown }>,
  assignmentId: string,
): FrictionSignals {
  const matching = signals.filter((signal) => signal.assignment_id === assignmentId);
  const helperEvents = matching.filter((signal) => signal.kind === "study_helper_event");
  const recallEvents = matching.filter((signal) => signal.kind === "recall_result");
  const starts = matching.filter((signal) => signal.kind === "started").length;
  const completions = matching.filter((signal) => signal.kind === "completed").length;
  return {
    startsLast24h: starts,
    restartsLast24h: Math.max(0, starts - Math.max(completions, 1)),
    completionsLast24h: completions,
    overwhelmedLast24h: matching.filter((signal) => signal.kind === "overwhelmed").length,
    contextSwitchesLast24h: signals.filter((signal) => signal.kind === "context_switch").length,
    helpRequestsLast24h: helperEvents.filter((signal) => signalValueEvent(signal.value) === "escape_valve").length,
    modeSwitchesLast24h: helperEvents.filter((signal) => signalValueEvent(signal.value) === "mode_selected").length,
    directAnswerRequestsLast24h: helperEvents.filter((signal) => signalValueEvent(signal.value) === "direct_answer_request").length,
    stillStuckLast24h: helperEvents.filter((signal) => signalValueEvent(signal.value) === "still_stuck").length,
    longIdleResumesLast24h: helperEvents.filter((signal) => signalValueEvent(signal.value) === "long_idle_resume").length,
    artifactGenerationsLast24h: helperEvents.filter((signal) => signalValueEvent(signal.value) === "artifact_generated").length,
    cardsSavedLast24h: helperEvents.filter((signal) => signalValueEvent(signal.value) === "cards_saved").length,
    recallAttemptsLast7d: recallEvents.length,
    recallNeedsReviewLast7d: recallEvents.filter((signal) => {
      const rating = signalValueRating(signal.value);
      return rating > 0 && rating <= 2;
    }).length,
    recallSecureLast7d: recallEvents.filter((signal) => signalValueRating(signal.value) >= 3).length,
  };
}

export function buildSupportPlan(input: {
  assignment: SupportAssignment;
  readiness?: ReadinessCheckIn | null;
  energy: EnergyLevel;
  friction?: FrictionSignals;
  milestones?: MilestoneMemory;
}): SupportPlan {
  const struggle = classifyStruggle(input);
  const intensity = chooseIntensity(input, struggle);
  const nextStep = nextLogicalStep(input.assignment, intensity, input.readiness);
  const bodyCue = bodyCueFor(input.readiness);
  const patternNote = patternNoteFor(input.assignment.kind, input.milestones);

  return {
    intensity,
    struggle,
    headline: headlineFor(intensity),
    rationale: rationaleFor(input, struggle),
    nextStep,
    bodyCue,
    patternNote,
    decisionTrace: decisionTraceFor(input, struggle, intensity),
    ruleConfidence: ruleConfidenceFor(input, struggle),
    chips: chipsFor(input, struggle, intensity),
  };
}

function classifyStruggle(input: {
  readiness?: ReadinessCheckIn | null;
  friction?: FrictionSignals;
}): StruggleState {
  const friction = input.friction ?? {};
  const readiness = input.readiness;
  const starts = friction.startsLast24h ?? 0;
  const completions = friction.completionsLast24h ?? 0;
  const overwhelmed = friction.overwhelmedLast24h ?? 0;
  const contextSwitches = friction.contextSwitchesLast24h ?? 0;
  const helpRequests = friction.helpRequestsLast24h ?? 0;
  const modeSwitches = friction.modeSwitchesLast24h ?? 0;
  const directAnswerRequests = friction.directAnswerRequestsLast24h ?? 0;
  const stillStuck = friction.stillStuckLast24h ?? 0;
  const longIdleResumes = friction.longIdleResumesLast24h ?? 0;
  const recallNeedsReview = friction.recallNeedsReviewLast7d ?? 0;

  if (overwhelmed >= 2 || stillStuck >= 2 || (readiness?.body === "low" && readiness.focus === "scattered")) {
    return "overload";
  }
  if (
    (starts >= 2 && completions === 0) ||
    contextSwitches >= 3 ||
    helpRequests >= 3 ||
    directAnswerRequests >= 1 ||
    longIdleResumes >= 2 ||
    recallNeedsReview >= 3 ||
    (modeSwitches >= 2 && completions === 0)
  ) {
    return "blocked";
  }
  if (starts > 0 && completions === 0) return "productive";
  if (recallNeedsReview > 0) return "productive";
  return "steady";
}

function chooseIntensity(
  input: {
    assignment: SupportAssignment;
    readiness?: ReadinessCheckIn | null;
    energy: EnergyLevel;
    friction?: FrictionSignals;
  },
  struggle: StruggleState,
): SupportIntensity {
  if (struggle === "overload") return "one_move";
  if (struggle === "blocked") return "scaffolded";
  if (input.readiness?.body === "low" && input.readiness.focus === "locked") return "guided";
  if (input.readiness?.body === "ready" && input.readiness.focus === "scattered") return "guided";
  if ((input.friction?.recallNeedsReviewLast7d ?? 0) >= 2) return "guided";
  if (input.energy === "low" && ((input.assignment.difficulty ?? 3) >= 4 || (input.assignment.reading_load ?? 0) >= 3)) {
    return "scaffolded";
  }
  if (struggle === "productive") return "guided";
  return "steady";
}

function nextLogicalStep(
  assignment: SupportAssignment,
  intensity: SupportIntensity,
  readiness?: ReadinessCheckIn | null,
): string {
  const lowBodyLockedFocus = readiness?.body === "low" && readiness.focus === "locked";
  const prefix = lowBodyLockedFocus
    ? "Keep the start low-lift: "
    : intensity === "one_move" || intensity === "recovery"
      ? "Use one tiny academic action: "
      : "";

  switch (assignment.kind as AssignmentKind) {
    case "problem_set":
    case "test_prep":
      return `${prefix}open the first problem and write what it is asking for before solving anything.`;
    case "essay":
      return `${prefix}copy the prompt, then write one possible claim sentence in your own words.`;
    case "reading":
      return `${prefix}read the first paragraph and mark one sentence that seems important.`;
    case "lab":
      return `${prefix}write the claim you think the data supports, even if it is rough.`;
    case "presentation":
      return `${prefix}write the title slide and one point the audience should remember.`;
    default:
      return `${prefix}open the assignment and copy the exact prompt into your work area.`;
  }
}

function bodyCueFor(readiness?: ReadinessCheckIn | null): string | null {
  if (!readiness) return null;
  if (readiness.body === "low" && readiness.focus === "locked") {
    return "Focus is available, but energy is low. Keep the academic step small and check food or water if that fits your day.";
  }
  if (readiness.body === "low" && readiness.focus === "scattered") {
    return "Body and focus both look low. Diana will keep only one school move visible at a time.";
  }
  if (readiness.body === "ready" && readiness.focus === "scattered") {
    return "Energy is available, so Diana will contain the work instead of adding more choices.";
  }
  return null;
}

function patternNoteFor(kind: AssignmentKind, milestones?: MilestoneMemory): string | null {
  const count = milestones?.sameKindCompletions14d ?? 0;
  if (count < 2) return null;
  return `You have completed ${count} ${labelForKind(kind)} tasks recently. Diana will offer the next step first, and you can choose a different start.`;
}

function headlineFor(intensity: SupportIntensity): string {
  if (intensity === "one_move" || intensity === "recovery") return "One-move support";
  if (intensity === "scaffolded") return "Extra structure";
  if (intensity === "guided") return "Guided start";
  return "Steady support";
}

function rationaleFor(
  input: {
    assignment: SupportAssignment;
    readiness?: ReadinessCheckIn | null;
    friction?: FrictionSignals;
  },
  struggle: StruggleState,
): string {
  if (struggle === "overload") return "Today calls for smaller steps and fewer visible choices.";
  if (struggle === "blocked") return "This task has had a few restarts, so Diana is making the next move more specific.";
  if ((input.friction?.recallNeedsReviewLast7d ?? 0) > 0) {
    return "Recent recall says this needs one more anchored practice pass before moving on.";
  }
  if (input.readiness?.body === "low" && input.readiness.focus === "locked") {
    return "Focus is strong enough for setup, but energy says not to make the first move too heavy.";
  }
  if ((input.assignment.reading_load ?? 0) >= 3) return "Reading load is high, so the first move is concrete.";
  return "This is the lightest support level likely to get the task moving.";
}

function decisionTraceFor(
  input: {
    assignment: SupportAssignment;
    readiness?: ReadinessCheckIn | null;
    friction?: FrictionSignals;
  },
  struggle: StruggleState,
  intensity: SupportIntensity,
): string[] {
  const friction = input.friction ?? {};
  const trace = [
    `assignment:${input.assignment.kind}`,
    `struggle:${struggle}`,
    `support:${intensity}`,
  ];
  if (input.readiness) trace.push(`body:${input.readiness.body}`, `focus:${input.readiness.focus}`);
  if ((friction.startsLast24h ?? 0) > 0) trace.push(`starts:${friction.startsLast24h}`);
  if ((friction.restartsLast24h ?? 0) > 0) trace.push(`restarts:${friction.restartsLast24h}`);
  if ((friction.helpRequestsLast24h ?? 0) > 0) trace.push(`help:${friction.helpRequestsLast24h}`);
  if ((friction.modeSwitchesLast24h ?? 0) > 0) trace.push(`mode-switches:${friction.modeSwitchesLast24h}`);
  if ((friction.directAnswerRequestsLast24h ?? 0) > 0) trace.push(`answer-redirects:${friction.directAnswerRequestsLast24h}`);
  if ((friction.stillStuckLast24h ?? 0) > 0) trace.push(`still-stuck:${friction.stillStuckLast24h}`);
  if ((friction.longIdleResumesLast24h ?? 0) > 0) trace.push(`idle-resumes:${friction.longIdleResumesLast24h}`);
  if ((friction.recallNeedsReviewLast7d ?? 0) > 0) trace.push(`recall-review:${friction.recallNeedsReviewLast7d}`);
  return trace.slice(0, 10);
}

function ruleConfidenceFor(
  input: {
    readiness?: ReadinessCheckIn | null;
    friction?: FrictionSignals;
  },
  struggle: StruggleState,
): SupportPlan["ruleConfidence"] {
  const friction = input.friction ?? {};
  const signalCount = [
    input.readiness,
    (friction.startsLast24h ?? 0) > 0,
    (friction.helpRequestsLast24h ?? 0) > 0,
    (friction.modeSwitchesLast24h ?? 0) > 0,
    (friction.directAnswerRequestsLast24h ?? 0) > 0,
    (friction.stillStuckLast24h ?? 0) > 0,
    (friction.recallNeedsReviewLast7d ?? 0) > 0,
  ].filter(Boolean).length;
  return signalCount >= 2 || struggle === "blocked" || struggle === "overload" ? "high" : "medium";
}

function chipsFor(
  input: {
    assignment: SupportAssignment;
    readiness?: ReadinessCheckIn | null;
    friction?: FrictionSignals;
  },
  struggle: StruggleState,
  intensity: SupportIntensity,
): string[] {
  const chips = [intensityLabel(intensity)];
  if (struggle !== "steady") chips.push(struggleLabel(struggle));
  if ((input.assignment.reading_load ?? 0) >= 3) chips.push("reading-aware");
  if ((input.assignment.writing_load ?? 0) >= 3) chips.push("writing-aware");
  if (input.readiness?.body === "low") chips.push("low-energy");
  if (input.readiness?.focus === "scattered") chips.push("focus-contained");
  if ((input.friction?.recallNeedsReviewLast7d ?? 0) > 0) chips.push("recall-aware");
  return chips.slice(0, 4);
}

function intensityLabel(intensity: SupportIntensity): string {
  return intensity === "recovery"
    || intensity === "one_move"
    ? "one move visible"
    : intensity === "scaffolded"
      ? "more structure"
      : intensity === "guided"
        ? "guided start"
        : "steady";
}

function struggleLabel(struggle: StruggleState): string {
  return struggle === "overload"
    ? "extra support"
    : struggle === "blocked"
      ? "sticky step"
      : "moving";
}

function labelForKind(kind: AssignmentKind): string {
  return kind === "problem_set"
    ? "problem-set"
    : kind === "test_prep"
      ? "test-prep"
      : kind.replace(/_/g, " ");
}

function isBodyState(value: unknown): value is BodyState {
  return value === "low" || value === "okay" || value === "ready";
}

function isFocusState(value: unknown): value is FocusState {
  return value === "scattered" || value === "steady" || value === "locked";
}

function signalValueEvent(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const event = (value as { event?: unknown }).event;
  return typeof event === "string" ? event : null;
}

function signalValueRating(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const rating = (value as { rating?: unknown }).rating;
  return typeof rating === "number" ? rating : 0;
}
