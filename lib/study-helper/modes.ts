import type { AssignmentKind } from "@/lib/supabase/types";
import type { SupportIntensity } from "@/lib/support/policy";

export type StudyHelperMode =
  | "guided_steps"
  | "visual_breakdown"
  | "retrieval_quiz"
  | "flashcard_builder";

export type StudyBarId = "start" | "understand" | "remember" | "trust" | "adapt";

export type StudyHelperAiMode = "red" | "yellow" | "green";

export type StudyHelperModeOption = {
  mode: StudyHelperMode;
  label: string;
  shortLabel: string;
  bar: StudyBarId;
  competitorPattern: string;
  description: string;
  actionLabel: string;
};

export type StudyBarSummary = {
  id: StudyBarId;
  label: string;
  status: "active" | "available" | "guarded";
  detail: string;
};

export type StudyHelperContext = {
  selectedMode: StudyHelperMode;
  recommendedMode: StudyHelperMode;
  reason: string;
  nextStep: string;
  escapeValve: string;
  aiPolicyLabel: string;
  trustNote: string;
  adaptNote: string;
  learningLoopNote: string | null;
  modeOptions: StudyHelperModeOption[];
  bars: StudyBarSummary[];
};

export type StudyHelperShellContext = {
  selectedMode: StudyHelperMode;
  modeLabel: string;
  aiPolicyLabel: string;
  reason: string;
  nextStep: string;
  escapeValve: string;
  trustNote: string;
};

export const STUDY_HELPER_MODES: StudyHelperModeOption[] = [
  {
    mode: "guided_steps",
    label: "Guide me through this",
    shortLabel: "Guide me",
    bar: "start",
    competitorPattern: "ChatGPT Study Mode",
    description: "Step-by-step questions that keep the work in your hands.",
    actionLabel: "Use guided steps",
  },
  {
    mode: "visual_breakdown",
    label: "Show it another way",
    shortLabel: "Show visually",
    bar: "understand",
    competitorPattern: "Gemini Guided Learning",
    description: "Turn the task into a board, diagram, timeline, or cards.",
    actionLabel: "Use visual breakdown",
  },
  {
    mode: "retrieval_quiz",
    label: "Quiz me on this",
    shortLabel: "Quiz me",
    bar: "remember",
    competitorPattern: "Khanmigo-style checks",
    description: "Practice recall with hints and passage/source anchors.",
    actionLabel: "Use quiz mode",
  },
  {
    mode: "flashcard_builder",
    label: "Make cards from this",
    shortLabel: "Make cards",
    bar: "remember",
    competitorPattern: "Quizlet AI tools",
    description: "Create study cards from this assignment, notes, or terms.",
    actionLabel: "Build study cards",
  },
];

export function normalizeStudyHelperMode(value: string | null | undefined): StudyHelperMode | null {
  return STUDY_HELPER_MODES.some((option) => option.mode === value)
    ? (value as StudyHelperMode)
    : null;
}

export function studyHelperModeOption(mode: StudyHelperMode): StudyHelperModeOption {
  return STUDY_HELPER_MODES.find((option) => option.mode === mode) ?? STUDY_HELPER_MODES[0];
}

export function buildStudyHelperContext(input: {
  assignmentKind: AssignmentKind;
  classAiMode: StudyHelperAiMode;
  selectedMode?: StudyHelperMode | null;
  readingLoad?: number | null;
  writingLoad?: number | null;
  supportIntensity?: SupportIntensity | null;
  focusNextStep?: boolean;
  /** Mode that has demonstrably worked for this student (effectiveness loop). */
  learnedPreference?: StudyHelperMode | null;
  learningLoopNote?: string | null;
}): StudyHelperContext {
  const recommendedMode = recommendedModeFor(input);
  const selectedMode = input.selectedMode ?? recommendedMode;
  const selected = studyHelperModeOption(selectedMode);

  return {
    selectedMode,
    recommendedMode,
    reason: reasonFor(input, selectedMode),
    nextStep: nextStepFor(input.assignmentKind, selectedMode, input.focusNextStep),
    escapeValve: escapeValveFor(selectedMode),
    aiPolicyLabel: aiPolicyLabel(input.classAiMode),
    trustNote: trustNoteFor(input.classAiMode),
    adaptNote: adaptNoteFor(input.supportIntensity, input.focusNextStep),
    learningLoopNote: input.learningLoopNote ?? null,
    modeOptions: STUDY_HELPER_MODES,
    bars: barsFor(input, selected),
  };
}

export function shellContextFromStudyHelper(context: StudyHelperContext): StudyHelperShellContext {
  const selected = studyHelperModeOption(context.selectedMode);
  return {
    selectedMode: context.selectedMode,
    modeLabel: selected.shortLabel,
    aiPolicyLabel: context.aiPolicyLabel,
    reason: context.reason,
    nextStep: context.nextStep,
    escapeValve: context.escapeValve,
    trustNote: context.trustNote,
  };
}

function recommendedModeFor(input: {
  assignmentKind: AssignmentKind;
  readingLoad?: number | null;
  writingLoad?: number | null;
  supportIntensity?: SupportIntensity | null;
  focusNextStep?: boolean;
  learnedPreference?: StudyHelperMode | null;
}): StudyHelperMode {
  if (input.focusNextStep || input.supportIntensity === "one_move" || input.supportIntensity === "recovery") return "guided_steps";
  // Learned preference beats kind heuristics but never the support guards
  // above — recovery and one-move support stay one move.
  if (input.learnedPreference) return input.learnedPreference;
  if (input.assignmentKind === "reading") return "retrieval_quiz";
  if (input.assignmentKind === "test_prep") return "retrieval_quiz";
  if (input.assignmentKind === "lab" || input.assignmentKind === "presentation") return "visual_breakdown";
  if (input.assignmentKind === "problem_set") return "guided_steps";
  if (input.assignmentKind === "essay" && (input.writingLoad ?? 0) >= 3) return "guided_steps";
  if ((input.readingLoad ?? 0) >= 3) return "retrieval_quiz";
  return "guided_steps";
}

function reasonFor(
  input: {
    assignmentKind: AssignmentKind;
    classAiMode: StudyHelperAiMode;
    supportIntensity?: SupportIntensity | null;
    focusNextStep?: boolean;
    learnedPreference?: StudyHelperMode | null;
  },
  mode: StudyHelperMode,
): string {
  if (input.classAiMode === "red") {
    return "This class has content AI off, so Diana keeps support to reading, organization, and student-authored work.";
  }
  if (input.focusNextStep || input.supportIntensity === "one_move" || input.supportIntensity === "recovery") {
    return "Diana is keeping one academic move visible before adding more options.";
  }
  if (input.learnedPreference && mode === input.learnedPreference) {
    return "This shape has worked for you before, so Diana starts here.";
  }
  if (mode === "visual_breakdown") return "This assignment benefits from seeing the pieces before writing or solving.";
  if (mode === "retrieval_quiz") return "This is stronger as active recall than as rereading.";
  if (mode === "flashcard_builder") return "This task has terms or facts worth bringing back later.";
  return "This is the safest first mode: questions and steps before answers.";
}

function nextStepFor(kind: AssignmentKind, mode: StudyHelperMode, focusNextStep?: boolean): string {
  if (focusNextStep) return "Use the first visible step, then decide whether to open a helper.";
  if (mode === "flashcard_builder") return "Pick three terms, facts, or formulas from this assignment to turn into cards.";
  if (mode === "retrieval_quiz") return "Answer one recall question before rereading or asking for more explanation.";
  if (mode === "visual_breakdown") return "Turn the prompt into a board: goal, evidence, steps, and one open question.";

  switch (kind) {
    case "problem_set":
    case "test_prep":
      return "Write what the first problem is asking for before solving anything.";
    case "essay":
      return "Copy the prompt, then write one claim in your own words.";
    case "reading":
      return "Read one short section and mark one sentence that matters.";
    case "lab":
      return "Name the claim the data might support before writing the report.";
    case "presentation":
      return "Write the title and one point the audience should remember.";
    default:
      return "Open the assignment and copy the exact prompt into your work area.";
  }
}

function escapeValveFor(mode: StudyHelperMode): string {
  if (mode === "guided_steps") return "Ask for a similar example, not this exact answer.";
  if (mode === "visual_breakdown") return "Switch to one card: what is known, what is needed, and what is unclear.";
  if (mode === "retrieval_quiz") return "Ask for a hint anchored to your notes or the passage.";
  return "Make fewer cards first: one term, one definition, one example.";
}

function aiPolicyLabel(mode: StudyHelperAiMode): string {
  if (mode === "red") return "AI policy: no content help";
  if (mode === "yellow") return "AI policy: scaffolding only";
  return "AI policy: full study support";
}

function trustNoteFor(mode: StudyHelperAiMode): string {
  if (mode === "red") return "Diana will not generate assignment content in this class.";
  if (mode === "yellow") return "Diana can guide, validate, and organize, but not write final work.";
  return "Diana can brainstorm and quiz, while authorship stays visible.";
}

function adaptNoteFor(intensity?: SupportIntensity | null, focusNextStep?: boolean): string {
  if (focusNextStep || intensity === "one_move" || intensity === "recovery") return "Adapt bar is active: fewer choices and one move at a time.";
  if (intensity === "scaffolded") return "Adapt bar is active: Diana should add more structure.";
  if (intensity === "guided") return "Adapt bar is active: Diana should start with a guided first move.";
  return "Adapt bar is ready: body/focus and task signals can change the support level.";
}

function barsFor(
  input: {
    classAiMode: StudyHelperAiMode;
    supportIntensity?: SupportIntensity | null;
    focusNextStep?: boolean;
  },
  selected: StudyHelperModeOption,
): StudyBarSummary[] {
  return [
    {
      id: "start",
      label: "Start",
      status: selected.bar === "start" ? "active" : "available",
      detail: "One next school move tied to this assignment.",
    },
    {
      id: "understand",
      label: "Understand",
      status: selected.bar === "understand" ? "active" : "available",
      detail: "Questions, visuals, and step boards before answers.",
    },
    {
      id: "remember",
      label: "Remember",
      status: selected.bar === "remember" ? "active" : "available",
      detail: "Recall, practice, and cards from class material.",
    },
    {
      id: "trust",
      label: "Trust",
      status: input.classAiMode === "red" ? "guarded" : "active",
      detail: trustNoteFor(input.classAiMode),
    },
    {
      id: "adapt",
      label: "Adapt",
      status: input.focusNextStep || input.supportIntensity ? "active" : "available",
      detail: adaptNoteFor(input.supportIntensity, input.focusNextStep),
    },
  ];
}
