import type { AssignmentKind } from "@/lib/supabase/types";
import type { SourceAnchor } from "@/lib/student-state/model";

export type VisualBreakdownKind =
  | "math_step_board"
  | "reading_passage_map"
  | "writing_structure_map"
  | "science_hypothesis_board"
  | "history_source_timeline"
  | "ap_exam_board"
  | "general_study_map";

export type VisualBreakdownBlock = {
  label: string;
  prompt: string;
  sourceAnchor: string;
  studentAction: string;
};

export type VisualBreakdown = {
  kind: VisualBreakdownKind;
  title: string;
  sourceAnchored: boolean;
  blocks: VisualBreakdownBlock[];
  quizPrompt: string;
};

export function buildVisualBreakdown(input: {
  assignmentKind: AssignmentKind;
  className?: string | null;
  sourceAnchors?: SourceAnchor[];
  title?: string;
}): VisualBreakdown {
  const kind = visualKindFor(input.assignmentKind, input.className ?? "");
  const anchors = input.sourceAnchors && input.sourceAnchors.length > 0
    ? input.sourceAnchors
    : [{ label: defaultSourceLabel(kind), sourceType: "assignment" as const, detail: input.title ?? "Assignment source" }];
  const labels = blockLabelsFor(kind);
  const blocks = labels.map((label, index) => {
    const anchor = anchors[index % anchors.length];
    return {
      label,
      prompt: blockPromptFor(kind, label),
      sourceAnchor: anchor.label,
      studentAction: blockActionFor(kind, label),
    };
  });

  return {
    kind,
    title: titleFor(kind),
    sourceAnchored: blocks.every((block) => block.sourceAnchor.length > 0),
    blocks,
    quizPrompt: quizPromptFor(kind, blocks[0]?.sourceAnchor ?? defaultSourceLabel(kind)),
  };
}

function visualKindFor(kind: AssignmentKind, className: string): VisualBreakdownKind {
  if (kind === "problem_set") return "math_step_board";
  if (kind === "reading") return "reading_passage_map";
  if (kind === "essay") return "writing_structure_map";
  if (kind === "lab") return "science_hypothesis_board";
  if (/\b(ap|advanced placement)\b/i.test(className) || kind === "test_prep") return "ap_exam_board";
  if (/\b(history|government|civics|geography|social studies)\b/i.test(className)) return "history_source_timeline";
  return "general_study_map";
}

function blockLabelsFor(kind: VisualBreakdownKind): string[] {
  return ({
    math_step_board: ["Known", "Needed", "Rule", "Check"],
    reading_passage_map: ["Paragraph", "Main idea", "Evidence", "Question"],
    writing_structure_map: ["Claim", "Evidence", "Reasoning", "Revision check"],
    science_hypothesis_board: ["Hypothesis", "Variables", "Data", "Conclusion"],
    history_source_timeline: ["Source", "Context", "Change", "Evidence"],
    ap_exam_board: ["Prompt", "Rubric", "Timing", "Practice"],
    general_study_map: ["Idea", "Source", "Connection", "Recall"],
  } satisfies Record<VisualBreakdownKind, string[]>)[kind];
}

function titleFor(kind: VisualBreakdownKind): string {
  return ({
    math_step_board: "Math step board",
    reading_passage_map: "Reading passage map",
    writing_structure_map: "Writing structure map",
    science_hypothesis_board: "Science hypothesis board",
    history_source_timeline: "History source timeline",
    ap_exam_board: "AP exam board",
    general_study_map: "General study map",
  } satisfies Record<VisualBreakdownKind, string>)[kind];
}

function blockPromptFor(kind: VisualBreakdownKind, label: string): string {
  if (kind === "math_step_board") return `Fill the ${label.toLowerCase()} box before solving.`;
  if (kind === "reading_passage_map") return `Use the source to complete the ${label.toLowerCase()} card.`;
  if (kind === "writing_structure_map") return `Draft only the ${label.toLowerCase()} piece in your own words.`;
  if (kind === "science_hypothesis_board") return `Name the ${label.toLowerCase()} before the explanation.`;
  if (kind === "history_source_timeline") return `Anchor the ${label.toLowerCase()} to a source detail.`;
  if (kind === "ap_exam_board") return `Set the ${label.toLowerCase()} move before answering.`;
  return `Connect the ${label.toLowerCase()} to the source.`;
}

function blockActionFor(kind: VisualBreakdownKind, label: string): string {
  if (kind === "math_step_board" && label === "Check") return "Write the check you will use after step one.";
  if (kind === "writing_structure_map" && label === "Revision check") return "Mark one sentence to revise later.";
  if (kind === "ap_exam_board" && label === "Timing") return "Choose the first timed practice move.";
  return `Add one student-owned note for ${label.toLowerCase()}.`;
}

function quizPromptFor(kind: VisualBreakdownKind, sourceAnchor: string): string {
  if (kind === "math_step_board") return `Before solving, what does ${sourceAnchor} ask you to find?`;
  if (kind === "reading_passage_map") return `What is the main idea from ${sourceAnchor}?`;
  if (kind === "writing_structure_map") return `Which part of your claim comes from ${sourceAnchor}?`;
  if (kind === "science_hypothesis_board") return `What data would support the hypothesis from ${sourceAnchor}?`;
  if (kind === "history_source_timeline") return `What context changes how you read ${sourceAnchor}?`;
  if (kind === "ap_exam_board") return `Which rubric move does ${sourceAnchor} require first?`;
  return `What should you remember from ${sourceAnchor}?`;
}

function defaultSourceLabel(kind: VisualBreakdownKind): string {
  if (kind === "history_source_timeline") return "Source excerpt";
  if (kind === "reading_passage_map") return "Passage paragraph 1";
  if (kind === "ap_exam_board") return "Prompt line 1";
  return "Assignment prompt";
}
