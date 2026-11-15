export type QuizQuestion =
  | { kind: "choice"; prompt: string; choices: readonly string[]; answer: string }
  | { kind: "recall"; prompt: string; answer: string }
  | { kind: "written"; prompt: string };

export const learningRows = [
  { id: "biology", title: "Cell structure lab", subject: "Biology", detail: "Notes and observations ready", image: "/assets/landing-10k/subjects/biology.webp", questions: [
    { kind: "choice", prompt: "Sample A has a rigid outer layer. Which structure is it?", choices: ["Cell wall", "Chloroplast", "Cell membrane"], answer: "Cell wall" },
    { kind: "recall", prompt: "What does the nucleus hold?", answer: "Genetic information" },
    { kind: "written", prompt: "How does a cell wall help a plant cell?" },
  ] },
  { id: "algebra", title: "Linear equations", subject: "Algebra I", detail: "Problem work ready", image: "/assets/landing-10k/subjects/math.webp", questions: [
    { kind: "choice", prompt: "Which value makes 3x + 5 = 20 true?", choices: ["x = 3", "x = 5", "x = 8"], answer: "x = 5" },
    { kind: "recall", prompt: "What keeps an equation balanced?", answer: "Apply the same operation to both sides." },
    { kind: "written", prompt: "Explain how you would solve 2x + 4 = 12." },
  ] },
  { id: "english", title: "A claim with evidence", subject: "English 10", detail: "Draft and source ready", image: "/assets/landing-10k/subjects/english.webp", questions: [
    { kind: "choice", prompt: "Which sentence makes a claim you could support?", choices: ["The story has ten chapters.", "The narrator's choices reveal a fear of change.", "The book is on the desk."], answer: "The narrator's choices reveal a fear of change." },
    { kind: "recall", prompt: "What connects evidence to a claim?", answer: "Analysis explains how the evidence supports the claim." },
    { kind: "written", prompt: "What would you look for in the text to support a claim about the narrator?" },
  ] },
] as const satisfies readonly { id: string; title: string; subject: string; detail: string; image: string; questions: readonly QuizQuestion[] }[];

export type LearningSourceId = typeof learningRows[number]["id"];
export function resolveSource(value: unknown): LearningSourceId {
  return learningRows.some(source => source.id === value) ? value as LearningSourceId : "biology";
}
