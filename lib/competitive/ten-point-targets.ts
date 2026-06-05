import type { CompetitorBarId, CompetitorId } from "./capability-matrix";

export type TenPointTarget = {
  id: Extract<
    CompetitorBarId,
    | "start_the_work"
    | "step_by_step_learning"
    | "guided_visual_learning"
    | "socratic_trust"
    | "study_artifacts"
    | "student_state_adaptation"
  >;
  label: string;
  bestCompetitor: CompetitorId;
  honestScoreBefore: number;
  tenPointTarget: string;
  implementationEvidence: string[];
  liveEvidenceRequired: string[];
};

export const TEN_POINT_COMPETITIVE_TARGETS: TenPointTarget[] = [
  {
    id: "start_the_work",
    label: "Start the work",
    bestCompetitor: "diana",
    honestScoreBefore: 9.5,
    tenPointTarget: "Diana gets from stuck to one assignment-specific academic action faster than generic chat.",
    implementationEvidence: [
      "next-five-minutes scorer",
      "dashboard focus card",
      "student-state rule path",
      "time-to-first-action benchmark",
    ],
    liveEvidenceRequired: [
      "4 of 5 teens explain the next move without hunting",
      "median first academic action beats generic chat on the same task",
    ],
  },
  {
    id: "step_by_step_learning",
    label: "Step-by-step learning",
    bestCompetitor: "chatgpt_study_mode",
    honestScoreBefore: 9,
    tenPointTarget: "Every helper runs a full teaching loop: diagnose, ask, hint, explain, check, reflect.",
    implementationEvidence: [
      "diagnostic probe",
      "teaching phase sequence",
      "source-anchored hint ladder",
      "direct-answer redirect",
      "knowledge check",
    ],
    liveEvidenceRequired: [
      "students can state what Diana is asking before opening another hint",
      "no final-work confusion in direct-answer tests",
    ],
  },
  {
    id: "guided_visual_learning",
    label: "Guided visual learning",
    bestCompetitor: "gemini_guided_learning",
    honestScoreBefore: 8.7,
    tenPointTarget: "Every major subject has a source-grounded board plus a media-ready storyboard for showing it another way.",
    implementationEvidence: [
      "subject-specific visual breakdowns",
      "source anchors on every block",
      "storyboard format, layout, alt text, and interaction prompt",
      "quiz prompt tied to source",
    ],
    liveEvidenceRequired: [
      "teens choose the visual mode without needing instructions",
      "visual explanation helps students make the next academic move",
    ],
  },
  {
    id: "socratic_trust",
    label: "Socratic trust and anti-cheat",
    bestCompetitor: "khanmigo",
    honestScoreBefore: 9.3,
    tenPointTarget: "Diana proves help without takeover through receipts that separate student, Diana, source, and private readiness data.",
    implementationEvidence: [
      "ownership meter",
      "authorship receipt detail",
      "teacher-safe summary",
      "sensitive readiness excluded from share proof",
      "refusal redirect logging",
    ],
    liveEvidenceRequired: [
      "students find proof Diana helped but did not do the work",
      "teachers can understand support without seeing readiness details",
    ],
  },
  {
    id: "study_artifacts",
    label: "Study artifacts",
    bestCompetitor: "quizlet_ai_tools",
    honestScoreBefore: 8.9,
    tenPointTarget: "Generated artifacts become an editable review loop: source, helper, artifact, FSRS review, mastery, next support.",
    implementationEvidence: [
      "editable cards",
      "practice settings",
      "artifact review loop",
      "source anchors carried into cards and quiz",
      "FSRS recall signals",
    ],
    liveEvidenceRequired: [
      "4 of 5 teens create or start a study artifact",
      "students understand what to edit before saving",
    ],
  },
  {
    id: "student_state_adaptation",
    label: "Student-state adaptation",
    bestCompetitor: "diana",
    honestScoreBefore: 9.6,
    tenPointTarget: "Support changes by explicit rule path from readiness, starts, restarts, help, mode switches, recall, policy, and assignment type.",
    implementationEvidence: [
      "two-question readiness",
      "friction signal summary",
      "support intensity decision trace",
      "one-move support",
      "non-medical body and focus language",
    ],
    liveEvidenceRequired: [
      "students feel supported without medical claims",
      "support escalation improves completion or recall on repeated stuck tasks",
    ],
  },
];

export function tenPointTarget(id: TenPointTarget["id"]): TenPointTarget {
  return TEN_POINT_COMPETITIVE_TARGETS.find((target) => target.id === id) ?? TEN_POINT_COMPETITIVE_TARGETS[0];
}
