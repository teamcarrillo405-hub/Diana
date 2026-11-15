import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { composeSystemPrompt } from "./system-prompts";
import { buildFallbackMathScaffold } from "@/lib/math/scaffold";
import { fallbackScienceScaffold } from "@/lib/science/scaffold";
import { parseWritingCoauthorResponse } from "@/lib/writing/coauthor";

const DIRECT_TO_STUDENT_HOMEWORK_EDGE_FUNCTIONS = [
  "ap-scaffold",
  "arts-scaffold",
  "assignment-review",
  "citation-gen",
  "cs-scaffold",
  "health-scaffold",
  "history-scaffold",
  "language-scaffold",
  "math-example",
  "math-scaffold",
  "math-step",
  "note-synthesis",
  "note-tags",
  "reading-level",
  "reading-scaffold",
  "science-scaffold",
  "study-artifacts",
  "task-breakdown",
  "visual-tools",
  "vocab-hover",
  "writing-aid",
  "writing-cowrite",
] as const;

function edgeSource(functionName: string): string {
  return readFileSync(join(process.cwd(), "supabase", "functions", functionName, "index.ts"), "utf8");
}

describe("AI methodology contracts", () => {
  it("composes every default safety fragment around feature prompts", () => {
    const prompt = composeSystemPrompt("Feature-specific student support.");

    expect(prompt).toContain("Feature-specific student support.");
    expect(prompt).toContain("Tone: calm");
    expect(prompt).toContain("If the student asks you to do the work for them");
    expect(prompt).toContain("If the student shows frustration");
    expect(prompt).toContain("anchor help to that material");
    expect(prompt).toContain("The student is a minor");
  });

  it("keeps fallback math support Socratic and action-oriented", () => {
    const result = buildFallbackMathScaffold(
      "A cart moves 10 meters in 2 seconds. Find the speed.",
      "physics",
    );
    const prompts = result.steps.map((step) => step.prompt.toLowerCase()).join(" ");

    expect(result.steps[0]?.label).toBe("Read the ask");
    expect(prompts).toContain("choose");
    expect(prompts).toContain("next algebraic or numeric move");
    expect(prompts).not.toContain("final answer");
    expect(result.unitTracker.some((hint) => hint.unit === "m")).toBe(true);
  });

  it("starts science help with prediction before explanation", () => {
    const result = fallbackScienceScaffold("hypothesis");

    expect(result.cards[0]).toMatchObject({
      label: "Predict",
      exampleFrame: "I predict...",
    });
    expect(result.cards[0]?.prompt.toLowerCase()).toContain("before reading the explanation");
  });

  it("keeps writing co-author output student-led when AI JSON is unavailable", () => {
    const result = parseWritingCoauthorResponse("not-json", "cowrite");

    expect(result.authorshipNote.toLowerCase()).toContain("student");
    expect(result.suggestions[0]?.rationale.toLowerCase()).toContain("student-led");
    expect(result.suggestions[0]?.action.toLowerCase()).toContain("your own");
  });

  it.each(DIRECT_TO_STUDENT_HOMEWORK_EDGE_FUNCTIONS)(
    "%s uses the shared homework adapter without school-policy red/yellow blockers",
    (functionName) => {
      const source = edgeSource(functionName);

      expect(source).toContain("runOpenAIHomeworkAdapter({");
      expect(source).not.toMatch(/aiMode\s*===\s*"red"/u);
      expect(source).not.toMatch(/aiMode\s*===\s*"yellow"/u);
      expect(source).not.toContain("AI not available for this class");
      expect(source).toContain("composeSystemPrompt");
      expect(source).toMatch(/includeMinorSafety:\s*true/u);
    },
  );

  it("keeps non-homework classifier and reflection routes outside the homework adapter contract", () => {
    for (const functionName of ["classify-inbox", "weekly-reflection", "agent-coach"]) {
      const source = edgeSource(functionName);
      expect(source).toContain("callSafeStudentTextModel");
    }
  });
});