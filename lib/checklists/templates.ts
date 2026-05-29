import type { AssignmentKind, Diagnosis } from "@/lib/supabase/types";

export type ChecklistItem = {
  label: string;
  detail: string | null;
  required: boolean;
};

const BASE: ChecklistItem[] = [
  { label: "Your name is on the file", detail: "Or required in the document header.", required: true },
  { label: "File is in the format the teacher asked for", detail: "PDF, .docx, link, etc.", required: true },
  { label: "You actually answered the prompt — not a tangent", detail: null, required: true },
];

const ESSAY: ChecklistItem[] = [
  { label: "Thesis is in the intro, not buried", detail: "First or last sentence of the opening paragraph.", required: true },
  { label: "Every body paragraph has evidence", detail: "Quote, citation, or specific example — not just opinion.", required: true },
  { label: "Conclusion doesn't introduce new ideas", detail: null, required: false },
  { label: "Citations match the style the teacher specified", detail: "MLA / APA / Chicago — pick one and stick with it.", required: true },
];

const LAB: ChecklistItem[] = [
  { label: "Hypothesis and method are clearly separated", detail: null, required: true },
  { label: "Data table or chart is included and labeled", detail: "Units on every axis.", required: true },
  { label: "Conclusion explicitly says whether the hypothesis held", detail: null, required: true },
  { label: "Sources of error are listed honestly", detail: "Teachers reward this; don't skip it.", required: false },
];

const PROBLEM_SET: ChecklistItem[] = [
  { label: "Every problem has work shown, not just an answer", detail: "Even if the answer is right, no work usually means partial credit.", required: true },
  { label: "Units are included where they apply", detail: null, required: true },
  { label: "Final answers are boxed or underlined", detail: "Makes grading faster, often counts toward neatness.", required: false },
];

const PRESENTATION: ChecklistItem[] = [
  { label: "Slides are readable from the back of the room", detail: "Aim for ≤6 lines per slide, font 24pt+.", required: true },
  { label: "You've said the words out loud at least once", detail: "Time it. Aim slightly under the limit.", required: true },
  { label: "You have a plan for the first 15 seconds", detail: "The opening is what gets graded hardest.", required: false },
];

const TEST_PREP: ChecklistItem[] = [
  { label: "You've reviewed your last test or quiz", detail: "Mistakes there usually repeat.", required: true },
  { label: "You've done at least one practice problem under timed conditions", detail: null, required: true },
  { label: "Bag is packed for tomorrow with everything allowed", detail: "Calculator, scratch paper, notes if permitted.", required: true },
];

const READING: ChecklistItem[] = [
  { label: "You can summarize the main idea in one sentence", detail: "If you can't, re-skim before declaring it done.", required: true },
  { label: "You've written down anything you'll be quizzed on", detail: "Names, dates, formulas, definitions.", required: true },
];

const BY_KIND: Record<AssignmentKind, ChecklistItem[]> = {
  essay: ESSAY,
  lab: LAB,
  problem_set: PROBLEM_SET,
  presentation: PRESENTATION,
  test_prep: TEST_PREP,
  reading: READING,
  other: [],
};

const DYSLEXIA_EXTRAS: ChecklistItem[] = [
  {
    label: "Spell-check was reviewed by you, not just accepted",
    detail: "Autocorrect can swap a real word for an unintended one (e.g. 'defiantly' for 'definitely'). Skim each suggestion.",
    required: true,
  },
  {
    label: "Read it out loud (or have it read to you) once",
    detail: "Catches sentences that look right but don't sound right.",
    required: false,
  },
];

const ADHD_EXTRAS: ChecklistItem[] = [
  {
    label: "You re-read the prompt one more time",
    detail: "Last check that you actually did what was asked — not what you remembered being asked.",
    required: true,
  },
];

/**
 * Build the submission checklist for an assignment, blending:
 *   - generic baseline items (name on file, format, answered the prompt)
 *   - per-kind items (essay, lab, problem set, etc.)
 *   - per-diagnosis items (dyslexia / ADHD specifics)
 */
export function buildChecklist(
  kind: AssignmentKind,
  diagnoses: Diagnosis[] | string[],
): ChecklistItem[] {
  const items = [...BASE, ...BY_KIND[kind]];
  if (diagnoses.includes("dyslexia")) items.push(...DYSLEXIA_EXTRAS);
  if (diagnoses.includes("adhd")) items.push(...ADHD_EXTRAS);
  return items;
}

export const KIND_LABEL: Record<AssignmentKind, string> = {
  essay: "Essay",
  lab: "Lab report",
  problem_set: "Problem set",
  presentation: "Presentation",
  test_prep: "Test prep",
  reading: "Reading",
  other: "Other",
};
