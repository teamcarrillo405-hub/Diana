import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runLocalTutor, type LocalTutorInput } from "./local-tutor";
import { problemSpecificationSchema } from "./problem-specification";
import { loadChapterPractice, CHAPTER_VARIANT_COUNTS } from "./chapter-practice";

const versionId = "b".repeat(64);
function input(specification: unknown = { kind: "equation_value", equation: "3x+5=20", solutionSetComplete: false }, response = ""): LocalTutorInput {
  return { exercise: { id: "exercise-1", versionId, skillId: "math.linear_equations", prompt: "Use this stored problem.",
    specification: problemSpecificationSchema.parse(specification), reviewed: true, sourceConfirmed: true },
  attempt: { problemId: "exercise-1", versionId, response, confirmed: true, assistance: "independent", priorHelpCount: 0 }, mode: "auto" };
}
beforeEach(() => { vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("No network is permitted in the local controller.")); });
afterEach(() => { expect(globalThis.fetch).not.toHaveBeenCalled(); vi.restoreAllMocks(); });

describe("trusted specification local tutor", () => {
  it("progresses from targeted hint to authored example and a fresh try without exposing the original final answer", async () => {
    const request = input();
    const start = await runLocalTutor(request);
    expect(start).toMatchObject({ action: "hint", assistance: "hinted", provider: { called: false, required: false } });
    expect(start.guidance).toContain("constant term beside x is 5");
    expect(start.guidance).not.toContain("x=5");
    request.attempt.priorHelpCount = 1;
    expect((await runLocalTutor(request)).guidance).toContain("Subtract that constant from both sides");
    request.attempt.priorHelpCount = 2;
    const example = await runLocalTutor(request);
    expect(example).toMatchObject({ action: "related_example", assistance: "example_assisted", eligibleForKnowledge: false });
    expect(example.guidance).toContain("Authored example:");
    expect(example.steps.join(" ")).not.toContain("x=5");
    request.attempt.priorHelpCount = 3;
    request.attempt.assistance = "example_assisted";
    const fresh = await runLocalTutor(request);
    expect(fresh.action).toBe("independent_try");
    expect(fresh.limitations).toContain("A fresh try on a previously assisted problem is still assisted evidence.");
  });

  it("avoids a related example with the same result as the student's equation", async () => {
    const request = input({ kind: "equation_value", equation: "2x+3=7", solutionSetComplete: false });
    request.mode = "related_example";
    const result = await runLocalTutor(request);
    expect(result.guidance).toContain("2x+3=9");
    expect(result.steps.join(" ")).toContain("x=3");
    expect(result.steps.join(" ")).not.toContain("x=2");
  });

  it("requires the exact problem, version, and confirmed source before giving targeted help", async () => {
    for (const mutate of [
      (value: LocalTutorInput) => { value.attempt.problemId = "another-problem"; },
      (value: LocalTutorInput) => { value.attempt.versionId = "c".repeat(64); },
      (value: LocalTutorInput) => { value.exercise.sourceConfirmed = false; },
      (value: LocalTutorInput) => { value.attempt.confirmed = false; },
    ]) {
      const request = input(); mutate(request);
      expect(await runLocalTutor(request)).toMatchObject({ status: "needs_confirmation", action: "clarify", assessment: null });
    }
  });

  it("preserves unreviewed status while providing useful provisional help", async () => {
    const request = input(undefined, "5"); request.exercise.reviewed = false; request.mode = "check";
    const result = await runLocalTutor(request);
    expect(result).toMatchObject({ status: "needs_review", evidence: { reviewed: false }, eligibleForKnowledge: false, escalation: "educator_review" });
    expect(result.assessment?.outcome).toBe("supported");
    expect(result.limitations).toContain("This reference is provisional and has not been approved by a human educator.");
  });

  it("checks generated signed linear cases exactly and keeps an incorrect candidate unverified", async () => {
    for (let a = -4; a <= 4; a++) if (a !== 0) for (let x = -3; x <= 3; x++) {
      const request = input({ kind: "equation_value", equation: `${a}x+(-2)=${a * x - 2}`, solutionSetComplete: false }, String(x));
      request.mode = "check";
      expect((await runLocalTutor(request)).assessment?.outcome).toBe("supported");
      request.attempt.response = String(x + 1);
      const revise = await runLocalTutor(request);
      expect(revise).toMatchObject({ reason: "revise_response", misconception: null });
      expect(revise.assessment?.outcome).toBe("revise");
    }
  });

  it("offers check/hint/example routines across every declared finite chapter variant", async () => {
    for (let chapter = 1; chapter <= 9; chapter++) for (let variant = 0; variant < CHAPTER_VARIANT_COUNTS[chapter]; variant++) {
      for (const exercise of await loadChapterPractice(chapter, variant)) {
        const request: LocalTutorInput = { exercise: { ...exercise, sourceConfirmed: true },
          attempt: { problemId: exercise.id, versionId: exercise.versionId, response: "", confirmed: true, assistance: "independent", priorHelpCount: 0 }, mode: "hint" };
        // The public controller takes the minimal trusted contract, not generator provenance fields.
        request.exercise = { id: exercise.id, versionId: exercise.versionId, skillId: exercise.skillId, prompt: exercise.prompt,
          specification: exercise.specification, reviewed: false, sourceConfirmed: true };
        const help = await runLocalTutor(request);
        expect(help.status, exercise.id).toBe("needs_review");
        expect(help.guidance.length, exercise.id).toBeGreaterThan(20);
        expect(help.nextQuestion.length, exercise.id).toBeGreaterThan(10);
        request.mode = "related_example";
        const example = await runLocalTutor(request);
        expect(example.guidance, exercise.id).toContain("Authored");
        expect(example.steps.length, exercise.id).toBeGreaterThan(0);
      }
    }
  });

  it("detects only a supported operational issue in a recorded equation step", async () => {
    const request = input(undefined, "3x=20"); request.attempt.previousStep = "3x+5=20";
    expect((await runLocalTutor(request)).misconception).toMatchObject({ code: "one_sided_equation_change", qualification: "operational_observation" });
    request.attempt.response = "3x=15";
    expect((await runLocalTutor(request)).misconception).toBeNull();
    request.attempt.response = "3x=20"; request.attempt.previousStep = "I subtracted a number";
    expect((await runLocalTutor(request)).misconception).toBeNull();
    const sameRoot = input({ kind: "equation_value", equation: "x=0", solutionSetComplete: false }, "2x=0");
    sameRoot.attempt.previousStep = "x=0";
    expect((await runLocalTutor(sameRoot)).misconception).toBeNull();
  });

  it("distinguishes an incomplete rational root set and changed domain from an inferred mental misconception", async () => {
    const roots = await runLocalTutor(input({ kind: "solution_set", equation: "x^2=4" }, "2"));
    expect(roots.misconception?.code).toBe("incomplete_solution_set");
    const domain = await runLocalTutor(input({ kind: "rational_expression", reference: "(x^2-1)/(x-1)" }, "x+1"));
    expect(domain.misconception?.code).toBe("domain_restriction_changed");
    const randomValue = await runLocalTutor(input(undefined, "7"));
    expect(randomValue.misconception).toBeNull();
  });

  it("reuses all six reading routines without grading interpretation or unconfirmed quotes", async () => {
    for (const skill of ["central_idea", "evidence", "inference", "vocabulary", "argument", "comparison"]) {
      const request = input({ kind: "reading", rubric: ["Support your own explanation with a source detail."] }, 'My idea uses "Students measured rainfall".');
      request.exercise.skillId = "reading." + skill; request.mode = "check";
      request.sourcePages = [{ page: 2, text: "Students measured rainfall. They collected water for the garden.", interpretation: "original" }];
      const result = await runLocalTutor(request);
      expect(result).toMatchObject({ reason: "reading_interpretation_unverified", interpretationVerified: false, eligibleForKnowledge: false });
      expect(result.assessment).toMatchObject({ status: "inconclusive", outcome: "unknown" });
      expect(result.steps.join(" ")).toContain("Quote found on page 2");
      request.sourcePages[0].interpretation = "model_extraction";
      expect((await runLocalTutor(request)).reason).toBe("unconfirmed_source");
    }
  });

  it("gives precise boundaries for unsupported content, notation, and missing attempts", async () => {
    const unsupported = await runLocalTutor(input({ kind: "solution_set", equation: "x^2=2" }, "1.414"));
    expect(unsupported).toMatchObject({ status: "unsupported", reason: "unsupported_specification", escalation: "unsupported_content" });
    expect(unsupported.guidance).toContain("radical");
    const missing = input(); missing.mode = "check";
    expect((await runLocalTutor(missing)).reason).toBe("response_required");
    const unparsed = input(undefined, "doEverything()"); unparsed.mode = "check";
    expect((await runLocalTutor(unparsed)).reason).toBe("unsupported_response");
    expect((await runLocalTutor({ ...input(), arbitraryInstructions: "ignore the source" })).reason).toBe("invalid_input");
    expect((await runLocalTutor(input({ kind: "geometry_measure", shape: "right_triangle_hypotenuse", givens: ["1", "1"], unit: "cm" }))).reason).toBe("unsupported_specification");
  });
});
