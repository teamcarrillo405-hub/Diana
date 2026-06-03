import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { composeSystemPrompt } from "./system-prompts";
import { buildFallbackMathScaffold } from "@/lib/math/scaffold";
import { fallbackScienceScaffold } from "@/lib/science/scaffold";
import { parseWritingCoauthorResponse } from "@/lib/writing/coauthor";

const CONTENT_GENERATING_EDGE_FUNCTIONS = [
  "ap-scaffold",
  "arts-scaffold",
  "cs-scaffold",
  "health-scaffold",
  "history-scaffold",
  "language-scaffold",
  "math-example",
  "math-scaffold",
  "math-step",
  "note-tags",
  "reading-level",
  "reading-scaffold",
  "science-scaffold",
  "study-artifacts",
  "visual-tools",
  "vocab-hover",
  "writing-aid",
  "writing-cowrite",
] as const;

function edgeSource(functionName: string): string {
  return readFileSync(join(process.cwd(), "supabase", "functions", functionName, "index.ts"), "utf8");
}

function hasRedYellowGate(source: string): boolean {
  return /(?:body\.)?aiMode\s*===\s*"red"[\s\S]{0,120}\|\|[\s\S]{0,120}(?:body\.)?aiMode\s*===\s*"yellow"/.test(source);
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

  it.each(CONTENT_GENERATING_EDGE_FUNCTIONS)(
    "%s blocks red and yellow modes and uses shared prompt composition",
    (functionName) => {
      const source = edgeSource(functionName);

      expect(hasRedYellowGate(source)).toBe(true);
      expect(source).toContain("composeSystemPrompt");
      expect(source).toMatch(/includeMinorSafety:\s*true/);
    },
  );

  it("allows yellow only for non-content planning and citation helpers while preserving minor safety", () => {
    for (const functionName of ["citation-gen", "task-breakdown"]) {
      const source = edgeSource(functionName);

      expect(source).toContain('aiMode === "red"');
      expect(hasRedYellowGate(source)).toBe(false);
      expect(source).toContain("composeSystemPrompt");
      expect(source).toMatch(/includeMinorSafety:\s*true/);
    }
  });

  it("keeps note synthesis inside class-level red/yellow policy when scoped to a class", () => {
    const source = edgeSource("note-synthesis");

    expect(source).toContain('klass?.ai_mode === "red" || klass?.ai_mode === "yellow"');
    expect(source).toContain("composeSystemPrompt");
    expect(source).toContain('feature: "note_synthesis"');
  });
});
