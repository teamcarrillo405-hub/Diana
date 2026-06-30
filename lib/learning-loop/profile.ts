import { computeEffectiveness, outcomeEvents } from "@/lib/adaptation/effectiveness";
import { intervalMultiplier, MIN_SAMPLES_FOR_CALIBRATION, type ReviewSample } from "@/lib/fsrs/personalize";
import type { StudyHelperMode } from "@/lib/study-helper/modes";

export type StuckPattern = "none" | "restart" | "direct_answer" | "still_stuck" | "overload";

export type LearnerProfile = {
  ownerId: string;
  version: number;
  computedAt: string;
  preferences: {
    preferredStudyMode: StudyHelperMode | null;
    leanInFeatures: string[];
    easeOffFeatures: string[];
  };
  friction: {
    readingHeavyNeedsSmallerSteps: boolean;
    writingHeavyNeedsScaffold: boolean;
    stuckPattern: StuckPattern;
  };
  mastery: {
    weakestConcepts: string[];
    averageMastery: number | null;
  };
  fsrs: {
    reviewSamples: number;
    calibrated: boolean;
    intervalMultiplier: number;
  };
  confidence: {
    feedbackSamples: number;
    taskOutcomeSamples: number;
    masterySamples: number;
  };
};

export type LearnerProfileSourceCounts = LearnerProfile["confidence"] & {
  taskSignals: number;
  studentStateSnapshots: number;
  flashcardReviews: number;
};

export type LearnerFeedbackEvent = {
  feature: string;
  helpful: boolean;
  createdAt: string;
};

export type LearnerHelpInteraction = {
  feature: string;
  assignmentId: string | null;
  createdAt: string;
};

export type LearnerCompletionSignal = {
  assignmentId: string;
  occurredAt: string;
};

export type LearnerTaskSignal = {
  kind: string;
  assignmentId?: string | null;
  value?: unknown;
  occurredAt?: string;
};

export type LearnerStateSnapshot = {
  assignmentKind?: string | null;
  supportIntensity?: string | null;
  struggleState?: string | null;
  frictionSignals?: unknown;
  createdAt?: string;
};

export type LearnerMasteryConcept = {
  name: string;
  masteryLevel: number;
};

export type ComputeLearnerProfileInput = {
  ownerId: string;
  now?: Date;
  feedbackEvents?: LearnerFeedbackEvent[];
  helpInteractions?: LearnerHelpInteraction[];
  completions?: LearnerCompletionSignal[];
  taskSignals?: LearnerTaskSignal[];
  studentStateSnapshots?: LearnerStateSnapshot[];
  masteryConcepts?: LearnerMasteryConcept[];
  flashcardReviews?: ReviewSample[];
};

const VERSION = 1;
const STUDY_MODE_PREFIX = "study_mode:";
const STUDY_MODES: StudyHelperMode[] = [
  "guided_steps",
  "visual_breakdown",
  "retrieval_quiz",
  "flashcard_builder",
];

export function defaultLearnerProfile(ownerId: string, now: Date = new Date()): LearnerProfile {
  return {
    ownerId,
    version: VERSION,
    computedAt: now.toISOString(),
    preferences: {
      preferredStudyMode: null,
      leanInFeatures: [],
      easeOffFeatures: [],
    },
    friction: {
      readingHeavyNeedsSmallerSteps: false,
      writingHeavyNeedsScaffold: false,
      stuckPattern: "none",
    },
    mastery: {
      weakestConcepts: [],
      averageMastery: null,
    },
    fsrs: {
      reviewSamples: 0,
      calibrated: false,
      intervalMultiplier: 1,
    },
    confidence: {
      feedbackSamples: 0,
      taskOutcomeSamples: 0,
      masterySamples: 0,
    },
  };
}

export function computeLearnerProfile(input: ComputeLearnerProfileInput): {
  profile: LearnerProfile;
  sourceCounts: LearnerProfileSourceCounts;
} {
  const feedbackEvents = input.feedbackEvents ?? [];
  const inferredOutcomes = outcomeEvents({
    interactions: input.helpInteractions ?? [],
    completions: input.completions ?? [],
  });
  const effectiveness = computeEffectiveness([...feedbackEvents, ...inferredOutcomes]);
  const leanInFeatures = effectiveness.filter((event) => event.stance === "lean_in").map((event) => event.feature);
  const easeOffFeatures = effectiveness.filter((event) => event.stance === "ease_off").map((event) => event.feature);
  const preferredStudyMode = preferredStudyModeFromFeatures(leanInFeatures, easeOffFeatures);

  const masteryConcepts = (input.masteryConcepts ?? [])
    .filter((concept) => Number.isFinite(concept.masteryLevel))
    .sort((a, b) => a.masteryLevel - b.masteryLevel || a.name.localeCompare(b.name));
  const averageMastery = masteryConcepts.length > 0
    ? Math.round((masteryConcepts.reduce((sum, concept) => sum + concept.masteryLevel, 0) / masteryConcepts.length) * 10) / 10
    : null;

  const flashcardReviews = input.flashcardReviews ?? [];
  const fsrsMultiplier = intervalMultiplier(flashcardReviews);
  const profile: LearnerProfile = {
    ownerId: input.ownerId,
    version: VERSION,
    computedAt: (input.now ?? new Date()).toISOString(),
    preferences: {
      preferredStudyMode,
      leanInFeatures: leanInFeatures.slice(0, 8),
      easeOffFeatures: easeOffFeatures.slice(0, 8),
    },
    friction: {
      readingHeavyNeedsSmallerSteps: needsSmallerSteps(input.studentStateSnapshots ?? [], "reading"),
      writingHeavyNeedsScaffold: needsSmallerSteps(input.studentStateSnapshots ?? [], "writing"),
      stuckPattern: stuckPatternFor(input.taskSignals ?? []),
    },
    mastery: {
      weakestConcepts: masteryConcepts.slice(0, 3).map((concept) => concept.name),
      averageMastery,
    },
    fsrs: {
      reviewSamples: flashcardReviews.length,
      calibrated: flashcardReviews.length >= MIN_SAMPLES_FOR_CALIBRATION,
      intervalMultiplier: fsrsMultiplier,
    },
    confidence: {
      feedbackSamples: feedbackEvents.length,
      taskOutcomeSamples: inferredOutcomes.length,
      masterySamples: masteryConcepts.length,
    },
  };

  return {
    profile,
    sourceCounts: {
      ...profile.confidence,
      taskSignals: input.taskSignals?.length ?? 0,
      studentStateSnapshots: input.studentStateSnapshots?.length ?? 0,
      flashcardReviews: flashcardReviews.length,
    },
  };
}

export function explainLearnerProfileChoice(
  profile: LearnerProfile,
  context: {
    surface: "dashboard" | "assignment" | "voice" | "settings";
    recommendedMode?: StudyHelperMode | null;
    supportIntensity?: string | null;
  },
): string {
  if (context.recommendedMode && context.recommendedMode === profile.preferences.preferredStudyMode) {
    return `${studyModeLabel(context.recommendedMode)} has worked for you before, so Diana is starting there.`;
  }
  if (context.supportIntensity === "one_move" || context.supportIntensity === "recovery") {
    return "Diana is keeping one move visible because recent signals call for fewer choices.";
  }
  if (profile.friction.stuckPattern === "direct_answer") {
    return "Diana is steering toward questions and examples because direct-answer moments have shown up recently.";
  }
  if (profile.friction.stuckPattern === "still_stuck") {
    return "Diana is using a more structured path because this kind of work has been sticky recently.";
  }
  if (profile.friction.readingHeavyNeedsSmallerSteps) {
    return "Diana is making reading-heavy work smaller because that pattern has needed extra structure.";
  }
  if (profile.friction.writingHeavyNeedsScaffold) {
    return "Diana is adding writing structure before asking for more output.";
  }
  if (profile.mastery.weakestConcepts[0]) {
    return `Diana is watching ${profile.mastery.weakestConcepts[0]} because it is one of your current review spots.`;
  }
  if (context.surface === "voice") {
    return "Diana uses the same private learning profile for voice and text commands.";
  }
  return "Diana is using defaults until it has enough private learning signals.";
}

export function learnerPromptLine(profile: LearnerProfile): string | null {
  const parts: string[] = [];
  if (profile.preferences.preferredStudyMode) {
    parts.push(`${studyModeLabel(profile.preferences.preferredStudyMode)} has worked for this student; use that shape when it fits`);
  }
  if (profile.preferences.easeOffFeatures[0]) {
    parts.push(`${humanFeature(profile.preferences.easeOffFeatures[0])} has not been landing; try a different support shape first`);
  }
  if (profile.friction.stuckPattern === "direct_answer") {
    parts.push("when the student asks for final work, redirect to a student-owned first move");
  } else if (profile.friction.stuckPattern === "still_stuck") {
    parts.push("use a smaller hint ladder before adding more explanation");
  }
  return parts.length > 0 ? `Learned context: ${parts.slice(0, 2).join("; ")}.` : null;
}

export function studentLearnerSummary(profile: LearnerProfile): string[] {
  const lines: string[] = [];
  if (profile.preferences.preferredStudyMode) {
    lines.push(`${studyModeLabel(profile.preferences.preferredStudyMode)} has been working for you, so Diana reaches for it sooner.`);
  }
  for (const feature of profile.preferences.easeOffFeatures.slice(0, 2)) {
    lines.push(`${humanFeature(feature)} has not been clicking, so Diana tries other shapes first.`);
  }
  if (profile.friction.readingHeavyNeedsSmallerSteps) lines.push("Reading-heavy work gets smaller first moves.");
  if (profile.friction.writingHeavyNeedsScaffold) lines.push("Writing-heavy work gets more structure before output.");
  if (profile.mastery.weakestConcepts.length > 0) {
    lines.push(`Current review spots: ${profile.mastery.weakestConcepts.join(", ")}.`);
  }
  if (profile.fsrs.calibrated) lines.push("Flashcard timing is calibrated from your own review history.");
  return lines.slice(0, 6);
}

function preferredStudyModeFromFeatures(leanInFeatures: string[], easeOffFeatures: string[]): StudyHelperMode | null {
  for (const feature of leanInFeatures) {
    if (!feature.startsWith(STUDY_MODE_PREFIX)) continue;
    const mode = feature.slice(STUDY_MODE_PREFIX.length) as StudyHelperMode;
    if (STUDY_MODES.includes(mode) && !easeOffFeatures.includes(feature)) return mode;
  }
  return null;
}

function needsSmallerSteps(snapshots: LearnerStateSnapshot[], kind: "reading" | "writing"): boolean {
  const matching = snapshots.filter((snapshot) => {
    const assignmentKind = (snapshot.assignmentKind ?? "").toLowerCase();
    const support = snapshot.supportIntensity;
    const struggle = snapshot.struggleState;
    const loadMatches = kind === "reading"
      ? assignmentKind.includes("reading")
      : assignmentKind.includes("essay") || assignmentKind.includes("writing");
    const supportMatches = support === "one_move" || support === "scaffolded" || struggle === "blocked" || struggle === "overload";
    return loadMatches && supportMatches;
  });
  return matching.length >= 2;
}

function stuckPatternFor(signals: LearnerTaskSignal[]): StuckPattern {
  let starts = 0;
  let completions = 0;
  let directAnswers = 0;
  let stillStuck = 0;
  let overwhelmed = 0;
  for (const signal of signals) {
    if (signal.kind === "started") starts += 1;
    if (signal.kind === "completed") completions += 1;
    if (signal.kind === "overwhelmed") overwhelmed += 1;
    const event = signalEvent(signal.value);
    if (event === "direct_answer_request") directAnswers += 1;
    if (event === "still_stuck" || event === "escape_valve") stillStuck += 1;
  }
  if (overwhelmed >= 2) return "overload";
  if (stillStuck >= 2) return "still_stuck";
  if (directAnswers >= 1) return "direct_answer";
  if (starts >= 2 && completions === 0) return "restart";
  return "none";
}

function signalEvent(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const event = (value as { event?: unknown }).event;
  return typeof event === "string" ? event : null;
}

function studyModeLabel(mode: StudyHelperMode): string {
  return ({
    guided_steps: "Step-by-step guidance",
    visual_breakdown: "Visual breakdowns",
    retrieval_quiz: "Quiz-style recall",
    flashcard_builder: "Card building",
  } satisfies Record<StudyHelperMode, string>)[mode];
}

function humanFeature(feature: string): string {
  if (feature.startsWith(STUDY_MODE_PREFIX)) {
    const mode = feature.slice(STUDY_MODE_PREFIX.length) as StudyHelperMode;
    if (STUDY_MODES.includes(mode)) return studyModeLabel(mode);
  }
  return feature.replace(/^subject:/, "").replaceAll("_", " ");
}
