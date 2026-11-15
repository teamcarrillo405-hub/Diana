import { checkEquationValue, equationDegree } from "./algebra.ts";

export const PRACTICE_SOURCE_PAGE_SIZE = 500;
export const MAX_PRACTICE_SOURCE_BLOCKS = 10000;
export const MAX_PRACTICE_SOURCE_CHARACTERS = 8_000_000;
export const MAX_PREPARED_EXERCISES = 30;
const MAX_READING_EXCERPT_CHARACTERS = 700;

export type PracticeSourceBlock = {
  id: string;
  text: string;
  kind: string;
  needsConfirmation: false;
  location: { page: number; pageLabel: string; startOffset: number; endOffset: number };
};
type PracticeExercise = {
  id: string;
  skill_id: string;
  prompt: string;
  specification:
    | { kind: "equation_value"; equation: string; variable: "x"; solutionSetComplete: false }
    | { kind: "reading"; rubric: string[] };
  reviewed: false;
};
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Source positions determine teaching order. Hashes provide only a stable final tie-break. */
export function orderedPracticeBlocks(payloads: unknown[]) {
  const blocks: PracticeSourceBlock[] = [];
  for (const value of payloads) {
    if (!record(value) || typeof value.id !== "string" || !value.id || value.id.length > 200
      || typeof value.text !== "string" || !value.text.trim() || value.text.length > 12000
      || typeof value.kind !== "string" || value.needsConfirmation !== false || !record(value.location)) continue;
    const { page, pageLabel, startOffset, endOffset } = value.location;
    if (typeof page !== "number" || !Number.isSafeInteger(page) || page < 1 || page > 1500
      || typeof pageLabel !== "string" || !pageLabel || pageLabel.length > 120
      || typeof startOffset !== "number" || !Number.isSafeInteger(startOffset) || startOffset < 0
      || typeof endOffset !== "number" || !Number.isSafeInteger(endOffset) || endOffset <= startOffset) continue;
    blocks.push({ id: value.id, text: value.text, kind: value.kind, needsConfirmation: false,
      location: { page, pageLabel, startOffset, endOffset } });
  }
  blocks.sort((a, b) => a.location.page - b.location.page || a.location.startOffset - b.location.startOffset
    || a.location.endOffset - b.location.endOffset || a.id.localeCompare(b.id));
  return { blocks, discardedCount: payloads.length - blocks.length };
}

const readingSkills = [
  ["central_idea", "What is the central idea? Support it with one detail.", "State a defensible central idea and connect it to an exact excerpt detail."],
  ["evidence", "Which detail best supports the excerpt's main point?", "Select relevant evidence and explain how it supports the point."],
  ["inference", "What can you infer? Show the detail you used.", "Distinguish an inference from an explicit fact and support it with an excerpt detail."],
  ["vocabulary", "Choose one unfamiliar word. What does its context suggest it means?", "Use nearby language to explain a word's meaning in this excerpt."],
  ["argument", "What is the author's purpose? Point to evidence.", "Identify the purpose or argument and explain the supporting language in the excerpt."],
  ["comparison", "Compare two details or ideas in this excerpt.", "Describe a meaningful similarity or difference using both excerpt details."],
] as const;

function readingExcerpt(text: string): string {
  if (text.length <= MAX_READING_EXCERPT_CHARACTERS) return text;
  const boundary = text.lastIndexOf(" ", MAX_READING_EXCERPT_CHARACTERS);
  // Keep an exact source substring. Do not insert ellipses or rewrite incomplete source text.
  return text.slice(0, boundary >= 500 ? boundary : MAX_READING_EXCERPT_CHARACTERS).trimEnd();
}

/** Creates only explicitly supported practice; source availability does not imply full coverage. */
export function prepareSourceExercises(subject: "math" | "reading", payloads: unknown[]) {
  const characters = payloads.reduce<number>((total, value) => total + (record(value) && typeof value.text === "string" ? value.text.length : 0), 0);
  if (payloads.length > MAX_PRACTICE_SOURCE_BLOCKS || characters > MAX_PRACTICE_SOURCE_CHARACTERS) {
    throw new Error("The complete source exceeds the practice preparation limit; no partial source was selected.");
  }
  const { blocks, discardedCount } = orderedPracticeBlocks(payloads);
  const exercises: PracticeExercise[] = [];
  let exerciseLimitReached = false;
  let readingExcerptTruncated = false;
  for (const block of blocks) {
    if (subject === "math" && block.kind === "problem") {
      const problemText = block.text.replace(/^(?:problem\s+)?\d+[.)]\s*/i, "");
      const expressions = [...problemText.matchAll(/(?:[0-9xX()+*/^.\-]+\s*)+(?:[+\-]\s*(?:[0-9xX()+*/^.\-]+\s*)+)*=\s*(?:[0-9xX()+*/^.\-]+\s*)+(?:[+\-]\s*(?:[0-9xX()+*/^.\-]+\s*)+)*/g)]
        .map(match => match[0].trim().replace(/[.,;:]$/, "")).filter(text => text.toLowerCase().includes("x"));
      // Ambiguous multi-equation blocks require a reviewed exercise specification.
      if (expressions.length !== 1 || checkEquationValue(expressions[0], "0").status !== "supported") continue;
      if (exercises.length === MAX_PREPARED_EXERCISES) { exerciseLimitReached = true; break; }
      exercises.push({ id: block.id + ":value", skill_id: equationDegree(expressions[0]) === 1 ? "math.linear_equations" : "math.polynomials",
        prompt: "Find a value of x that satisfies " + expressions[0] + ".",
        specification: { kind: "equation_value", equation: expressions[0], variable: "x", solutionSetComplete: false }, reviewed: false });
    } else if (subject === "reading" && block.text.length >= 100 && block.kind !== "heading") {
      const excerpt = readingExcerpt(block.text);
      const sourceLabel = block.location.pageLabel.slice(0, 60);
      readingExcerptTruncated = excerpt.length < block.text.length;
      for (const [skill, question, rubric] of readingSkills) exercises.push({
        id: block.id + ":" + skill, skill_id: "reading." + skill,
        prompt: "Source excerpt (" + sourceLabel + "):\n" + excerpt
          + (readingExcerptTruncated ? "\n\nThe source continues after this excerpt." : "") + "\n\nAbout this excerpt: " + question,
        specification: { kind: "reading", rubric: [rubric] }, reviewed: false,
      });
      break;
    }
  }
  return { exercises, coverage: { sourceBlocks: payloads.length, eligibleSourceBlocks: blocks.length,
    discardedSourceBlocks: discardedCount, sourceTruncated: false as const, exerciseLimit: MAX_PREPARED_EXERCISES,
    exerciseLimitReached, readingExcerptTruncated, scope: subject === "reading" ? "one_reading_excerpt" as const : "supported_equation_values" as const } };
}
