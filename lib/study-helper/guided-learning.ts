import type { AssignmentKind } from "@/lib/supabase/types";
import type { SupportIntensity } from "@/lib/support/policy";
import type { SourceAnchor } from "@/lib/student-state/model";

export type StudentResponseQuality = "not_started" | "attempted" | "needs_hint" | "ready_for_check";

export type GuidedQuestion = {
  prompt: string;
  sourceAnchor: string;
  expectedStudentAction: string;
};

export type HintLadder = {
  level: 1 | 2 | 3;
  hints: string[];
  stopBeforeFinalWork: string;
};

export type KnowledgeCheck = {
  question: string;
  successSignal: string;
  sourceAnchor: string;
};

export type NextTeachingMove = {
  kind: "ask" | "hint" | "explain" | "check" | "redirect";
  label: string;
  studentActionRequired: string;
};

export type LearningTurn = {
  assignmentKind: AssignmentKind;
  responseQuality: StudentResponseQuality;
  question: GuidedQuestion;
  hintLadder: HintLadder;
  explanationFrame: string;
  knowledgeCheck: KnowledgeCheck;
  nextTeachingMove: NextTeachingMove;
  authorshipBoundary: string;
};

export function buildLearningTurn(input: {
  assignmentKind: AssignmentKind;
  studentPrompt: string;
  sourceAnchors?: SourceAnchor[];
  supportIntensity: SupportIntensity;
  responseQuality?: StudentResponseQuality;
}): LearningTurn {
  const sourceAnchor = input.sourceAnchors?.[0]?.label ?? defaultAnchor(input.assignmentKind);
  const responseQuality = input.responseQuality ?? qualityFromPrompt(input.studentPrompt);
  const directAnswer = asksForFinalWork(input.studentPrompt);
  const nextTeachingMove = directAnswer
    ? {
        kind: "redirect" as const,
        label: "Turn the answer request into a learning move",
        studentActionRequired: actionFor(input.assignmentKind, input.supportIntensity),
      }
    : moveFor(responseQuality, input.assignmentKind, input.supportIntensity);

  return {
    assignmentKind: input.assignmentKind,
    responseQuality,
    question: {
      prompt: firstQuestionFor(input.assignmentKind),
      sourceAnchor,
      expectedStudentAction: actionFor(input.assignmentKind, input.supportIntensity),
    },
    hintLadder: {
      level: hintLevelFor(input.supportIntensity),
      hints: hintsFor(input.assignmentKind, sourceAnchor).slice(0, hintLevelFor(input.supportIntensity)),
      stopBeforeFinalWork: "Stop after the next student-owned line, choice, marked sentence, or claim.",
    },
    explanationFrame: explanationFrameFor(input.assignmentKind, sourceAnchor),
    knowledgeCheck: {
      question: checkFor(input.assignmentKind),
      successSignal: successSignalFor(input.assignmentKind),
      sourceAnchor,
    },
    nextTeachingMove,
    authorshipBoundary: "Diana may ask, hint, organize, and quiz. The final answer and final wording stay student-made.",
  };
}

export function asksForFinalWork(prompt: string): boolean {
  const value = prompt.toLowerCase();
  return /\b(write|give|make|solve|finish|complete)\b/.test(value) &&
    /\b(answer|essay|paragraph|solution|final|for me|submit)\b/.test(value);
}

function qualityFromPrompt(prompt: string): StudentResponseQuality {
  const trimmed = prompt.trim();
  if (trimmed.length < 8) return "not_started";
  if (/\b(stuck|help|hint|confused|lost)\b/i.test(trimmed)) return "needs_hint";
  if (trimmed.length > 80) return "ready_for_check";
  return "attempted";
}

function moveFor(
  quality: StudentResponseQuality,
  kind: AssignmentKind,
  supportIntensity: SupportIntensity,
): NextTeachingMove {
  if (supportIntensity === "one_move" || supportIntensity === "recovery") {
    return { kind: "ask", label: "Keep one move visible", studentActionRequired: actionFor(kind, supportIntensity) };
  }
  if (quality === "not_started") {
    return { kind: "ask", label: "Start with the first question", studentActionRequired: actionFor(kind, supportIntensity) };
  }
  if (quality === "needs_hint") {
    return { kind: "hint", label: "Offer a source-anchored hint", studentActionRequired: actionFor(kind, supportIntensity) };
  }
  if (quality === "ready_for_check") {
    return { kind: "check", label: "Check understanding", studentActionRequired: "Answer the quick check before opening more help." };
  }
  return { kind: "explain", label: "Explain the next concept", studentActionRequired: actionFor(kind, supportIntensity) };
}

function hintLevelFor(intensity: SupportIntensity): 1 | 2 | 3 {
  if (intensity === "scaffolded") return 3;
  if (intensity === "guided") return 2;
  return 1;
}

function defaultAnchor(kind: AssignmentKind): string {
  if (kind === "reading") return "Assigned passage";
  if (kind === "essay") return "Assignment prompt";
  if (kind === "lab") return "Lab prompt";
  return "Assignment source";
}

function firstQuestionFor(kind: AssignmentKind): string {
  switch (kind) {
    case "problem_set":
    case "test_prep":
      return "What is the problem asking you to find or prove?";
    case "essay":
      return "What is one claim you can write in your own words?";
    case "reading":
      return "Which sentence in this section carries the main idea?";
    case "lab":
      return "What relationship do you expect the data to show?";
    case "presentation":
      return "What should the audience remember first?";
    default:
      return "What is the first visible requirement in the prompt?";
  }
}

function actionFor(kind: AssignmentKind, intensity: SupportIntensity): string {
  const prefix = intensity === "one_move" || intensity === "recovery" ? "Do only this: " : "";
  switch (kind) {
    case "problem_set":
    case "test_prep":
      return `${prefix}write the known values and the thing being asked for.`;
    case "essay":
      return `${prefix}write one claim in your own words.`;
    case "reading":
      return `${prefix}mark one source sentence and say why it matters.`;
    case "lab":
      return `${prefix}write a hypothesis frame before the explanation.`;
    default:
      return `${prefix}copy the exact prompt line you will work from.`;
  }
}

function hintsFor(kind: AssignmentKind, sourceAnchor: string): string[] {
  const base = `Use ${sourceAnchor} before asking for another hint.`;
  switch (kind) {
    case "problem_set":
    case "test_prep":
      return [base, "Separate known values from the unknown.", "Name the formula or rule before substituting."];
    case "essay":
      return [base, "Underline the task verb.", "Pair one claim with one piece of evidence."];
    case "reading":
      return [base, "Reread the first and last sentence of the section.", "Turn the paragraph into a five-word gist."];
    case "lab":
      return [base, "Name the independent and dependent variables.", "Connect the pattern to the claim."];
    default:
      return [base, "Find the smallest visible requirement.", "Write the first student-owned line."];
  }
}

function explanationFrameFor(kind: AssignmentKind, sourceAnchor: string): string {
  if (kind === "problem_set" || kind === "test_prep") return `Explain the method from ${sourceAnchor}, then pause before computation.`;
  if (kind === "essay") return `Explain how ${sourceAnchor} turns into a claim, not a paragraph.`;
  if (kind === "reading") return `Explain the idea in ${sourceAnchor}, then ask for a student summary.`;
  if (kind === "lab") return `Explain how ${sourceAnchor} connects variables, data, and claim.`;
  return `Explain only the next concept tied to ${sourceAnchor}.`;
}

function checkFor(kind: AssignmentKind): string {
  if (kind === "problem_set" || kind === "test_prep") return "What would you check after the first step?";
  if (kind === "essay") return "Does your claim answer the whole prompt or only part of it?";
  if (kind === "reading") return "Can you say the main idea without rereading?";
  if (kind === "lab") return "What result would support the hypothesis?";
  return "What did you do, and what is the next student-owned move?";
}

function successSignalFor(kind: AssignmentKind): string {
  if (kind === "reading") return "Student can restate one source idea.";
  if (kind === "essay") return "Student has one claim they wrote.";
  if (kind === "problem_set" || kind === "test_prep") return "Student identified the unknown and first method.";
  return "Student named the next academic move.";
}
