import type { AssignmentKind, AssignmentStatus } from "@/lib/supabase/types";
import {
  buildSupportPlan,
  energyFromBody,
  summarizeFrictionSignals,
  type BodyState,
  type FocusState,
  type FrictionSignals,
  type MilestoneMemory,
  type ReadinessCheckIn,
  type SupportIntensity,
  type SupportPlan,
} from "@/lib/support/policy";
import type { EnergyLevel } from "@/lib/scoring/next-five-minutes";

export type StudentStateAiPolicy = "green" | "yellow" | "red";

export type StudentStateAssignment = {
  id: string;
  title: string;
  kind: AssignmentKind;
  status: AssignmentStatus;
  reading_load: number | null;
  writing_load: number | null;
  difficulty: number | null;
  effective_minutes: number;
  class_id?: string | null;
};

export type StudentStateSignal = {
  kind: string;
  assignment_id?: string | null;
  value?: unknown;
  occurred_at?: string;
};

export type RecallSummary = {
  attempts7d: number;
  secure7d: number;
  needsReview7d: number;
  averageRating: number | null;
  lastSourceAnchor: string | null;
};

export type MasterySummary = {
  linkedConcepts: number;
  averageMastery: number | null;
  weakestConcept: string | null;
};

export type HelpOwnershipMeter = {
  studentSharePercent: number;
  aiContribution: "none" | "organize" | "hint" | "practice" | "draft_suggestion";
  studentActionRequired: string;
  finalWorkProtection: string;
};

export type SourceAnchor = {
  label: string;
  sourceType: "assignment" | "rubric" | "note" | "artifact" | "card";
  detail: string;
};

export type StudentStateModel = {
  assignment: StudentStateAssignment;
  aiPolicy: StudentStateAiPolicy;
  readiness: ReadinessCheckIn | null;
  energy: EnergyLevel;
  friction: FrictionSignals;
  recall: RecallSummary;
  mastery: MasterySummary;
  supportPlan: SupportPlan;
  ownershipMeter: HelpOwnershipMeter;
  sourceAnchors: SourceAnchor[];
  rulePath: string[];
};

export function buildStudentStateModel(input: {
  assignment: StudentStateAssignment;
  aiPolicy: StudentStateAiPolicy;
  readiness?: ReadinessCheckIn | null;
  energy?: EnergyLevel | null;
  signals?: StudentStateSignal[];
  mastery?: Partial<MasterySummary> | null;
  milestones?: MilestoneMemory | null;
  sourceAnchors?: SourceAnchor[];
  studentSharePercent?: number | null;
}): StudentStateModel {
  const readiness = input.readiness ?? null;
  const energy = input.energy ?? energyFromBody(readiness?.body) ?? "medium";
  const friction = summarizeFrictionSignals(input.signals ?? [], input.assignment.id);
  const recall = summarizeRecall(input.signals ?? [], input.assignment.id);
  const mastery: MasterySummary = {
    linkedConcepts: input.mastery?.linkedConcepts ?? 0,
    averageMastery: input.mastery?.averageMastery ?? null,
    weakestConcept: input.mastery?.weakestConcept ?? null,
  };
  const supportPlan = buildSupportPlan({
    assignment: {
      ...input.assignment,
      reading_load: input.assignment.reading_load ?? 0,
      writing_load: input.assignment.writing_load ?? 0,
      difficulty: input.assignment.difficulty ?? 3,
    },
    readiness,
    energy,
    friction,
    milestones: input.milestones ?? undefined,
  });
  const ownershipMeter = buildHelpOwnershipMeter({
    aiPolicy: input.aiPolicy,
    supportIntensity: supportPlan.intensity,
    studentSharePercent: input.studentSharePercent,
    recall,
  });

  return {
    assignment: input.assignment,
    aiPolicy: input.aiPolicy,
    readiness,
    energy,
    friction,
    recall,
    mastery,
    supportPlan,
    ownershipMeter,
    sourceAnchors: (input.sourceAnchors ?? []).slice(0, 6),
    rulePath: rulePathFor({
      readiness,
      friction,
      recall,
      intensity: supportPlan.intensity,
      aiPolicy: input.aiPolicy,
    }),
  };
}

export function summarizeRecall(signals: StudentStateSignal[], assignmentId: string): RecallSummary {
  const events = signals
    .filter((signal) => signal.assignment_id === assignmentId && signal.kind === "recall_result")
    .map((signal) => {
      const value = signal.value && typeof signal.value === "object" ? signal.value as Record<string, unknown> : {};
      const rating = typeof value.rating === "number" ? Math.max(1, Math.min(4, value.rating)) : null;
      return {
        rating,
        sourceAnchor: typeof value.sourceAnchor === "string" ? value.sourceAnchor : null,
      };
    })
    .filter((event): event is { rating: number; sourceAnchor: string | null } => event.rating !== null);

  const secure7d = events.filter((event) => event.rating >= 3).length;
  const needsReview7d = events.filter((event) => event.rating <= 2).length;
  return {
    attempts7d: events.length,
    secure7d,
    needsReview7d,
    averageRating: events.length > 0
      ? Math.round((events.reduce((sum, event) => sum + event.rating, 0) / events.length) * 10) / 10
      : null,
    lastSourceAnchor: events.find((event) => event.sourceAnchor)?.sourceAnchor ?? null,
  };
}

export function buildHelpOwnershipMeter(input: {
  aiPolicy: StudentStateAiPolicy;
  supportIntensity: SupportIntensity;
  studentSharePercent?: number | null;
  recall?: RecallSummary | null;
}): HelpOwnershipMeter {
  const studentSharePercent = clampPercent(input.studentSharePercent ?? 100);
  const aiContribution = contributionFor(input.aiPolicy, input.supportIntensity);
  const studentActionRequired = studentActionFor(input.supportIntensity, input.recall ?? null);

  return {
    studentSharePercent,
    aiContribution,
    studentActionRequired,
    finalWorkProtection: input.aiPolicy === "green"
      ? "Diana can guide, quiz, and organize, but final wording and final answers stay student-made."
      : input.aiPolicy === "yellow"
        ? "This class allows scaffolding only, so Diana keeps work as prompts, checks, and organization."
        : "This class has content AI off, so Diana stays with organization, reading access, and student-authored work.",
  };
}

export function sourceAnchorsFromAssignment(input: {
  title: string;
  description?: string | null;
  rubricText?: string | null;
  noteTitles?: string[];
}): SourceAnchor[] {
  const anchors: SourceAnchor[] = [
    {
      label: "Assignment title",
      sourceType: "assignment",
      detail: input.title,
    },
  ];
  if (input.description?.trim()) {
    anchors.push({
      label: "Assignment prompt",
      sourceType: "assignment",
      detail: firstSentence(input.description),
    });
  }
  if (input.rubricText?.trim()) {
    anchors.push({
      label: "Rubric line 1",
      sourceType: "rubric",
      detail: firstNonEmptyLine(input.rubricText),
    });
  }
  for (const title of input.noteTitles ?? []) {
    if (!title.trim()) continue;
    anchors.push({
      label: `Class note: ${title.trim().slice(0, 48)}`,
      sourceType: "note",
      detail: "Recent class note available as supporting material.",
    });
  }
  return anchors.slice(0, 6);
}

function contributionFor(
  aiPolicy: StudentStateAiPolicy,
  supportIntensity: SupportIntensity,
): HelpOwnershipMeter["aiContribution"] {
  if (aiPolicy === "red") return "none";
  if (supportIntensity === "steady") return "organize";
  if (supportIntensity === "guided") return "hint";
  return "practice";
}

function studentActionFor(intensity: SupportIntensity, recall: RecallSummary | null): string {
  if (recall && recall.needsReview7d > 0) {
    return "Try one source-anchored recall item before opening another explanation.";
  }
  if (intensity === "one_move" || intensity === "recovery") return "Complete one visible academic move, then choose whether to ask for the next step.";
  if (intensity === "scaffolded") return "Write the next line, claim, marked sentence, or known value before Diana adds more help.";
  if (intensity === "guided") return "Answer Diana's first question or edit the suggested card before continuing.";
  return "Use Diana to organize the work, then keep the final response in your own words.";
}

function rulePathFor(input: {
  readiness: ReadinessCheckIn | null;
  friction: FrictionSignals;
  recall: RecallSummary;
  intensity: SupportIntensity;
  aiPolicy: StudentStateAiPolicy;
}): string[] {
  const path = [`policy:${input.aiPolicy}`, `support:${input.intensity}`];
  if (input.readiness) path.push(`body:${input.readiness.body}`, `focus:${input.readiness.focus}`);
  if ((input.friction.restartsLast24h ?? 0) > 0) path.push(`restarts:${input.friction.restartsLast24h}`);
  if ((input.friction.helpRequestsLast24h ?? 0) > 0) path.push(`help:${input.friction.helpRequestsLast24h}`);
  if ((input.friction.modeSwitchesLast24h ?? 0) > 0) path.push(`mode-switches:${input.friction.modeSwitchesLast24h}`);
  if ((input.friction.directAnswerRequestsLast24h ?? 0) > 0) path.push(`direct-answer:${input.friction.directAnswerRequestsLast24h}`);
  if ((input.friction.stillStuckLast24h ?? 0) > 0) path.push(`still-stuck:${input.friction.stillStuckLast24h}`);
  if ((input.friction.longIdleResumesLast24h ?? 0) > 0) path.push(`idle-resume:${input.friction.longIdleResumesLast24h}`);
  if (input.recall.needsReview7d > 0) path.push(`recall-review:${input.recall.needsReview7d}`);
  return path;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function firstSentence(text: string): string {
  return text.trim().split(/(?<=[.!?])\s+/)[0]?.slice(0, 180) ?? text.trim().slice(0, 180);
}

function firstNonEmptyLine(text: string): string {
  return text.split(/\r?\n/).map((line) => line.trim()).find(Boolean)?.slice(0, 180) ?? text.trim().slice(0, 180);
}

export function readinessLabel(readiness: ReadinessCheckIn | null): string {
  if (!readiness) return "No check-in yet";
  return `${bodyLabel(readiness.body)} body, ${focusLabel(readiness.focus)} focus`;
}

function bodyLabel(body: BodyState): string {
  return body === "low" ? "low-energy" : body === "ready" ? "ready" : "okay";
}

function focusLabel(focus: FocusState): string {
  return focus === "locked" ? "locked-in" : focus;
}
