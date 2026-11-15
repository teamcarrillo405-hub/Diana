import { describe, expect, it } from "vitest";
import { createLinearEquationReview, createLinearEquationStudyResponse, parseLinearEquation } from "./linear-equation-tutor";

const fields = [
  { label: "Problem", value: "Solve 3x + 5 = 20" },
  { label: "Student work", value: "3x=15 is what I get" },
];

describe("linear equation tutor guardrail", () => {
  it.each([
    "0.5x + 1 = 2", "1/2x + 1 = 2", "x² + 2x = 8", "x + x = 2",
    "3x = 2 + 4", "3x = 2y", "3x = 1e6", "3x = 1/2", "3x = 2.5",
    "0x + 1 = 2", "1000001x = 2", "9007199254740993x = 2",
    "x - 1000000 = 1000000", "3x=6\n4x=8", "Example: 3x=6",
  ])("declines unsupported or out-of-bound equation syntax: %s", equation => {
    expect(parseLinearEquation(equation)).toBeNull();
  });

  it.each([5, 7, 8, -7])("keeps exact rational solutions for coefficient %s", coefficient => {
    const answer = coefficient < 0 ? `-1/${-coefficient}` : `1/${coefficient}`;
    const result = createLinearEquationStudyResponse({
      source: `Problem: Solve ${coefficient}x + 1 = 2\nStudent work: ${coefficient}x=1`,
      question: answer, mode: "guide",
    });
    expect(result?.main).toContain(`${answer} works for x`);
    expect(result?.steps[0]).toBe(`Write x = ${answer}.`);
    expect(result?.steps[1]).toBe(`Check: ${coefficient}(${answer}) + 1 = 2.`);
  });

  it("uses the current answer rather than stale conversation or answer-box text", () => {
    const result = createLinearEquationStudyResponse({
      source: "Problem: 3x+5=20\nStudent work: 3x=15\nStudent answer: 4",
      question: "5", mode: "guide",
      conversation: [{ role: "student", text: "4" }],
    });
    expect(result?.main).toContain("5 works for x");
  });

  it.each(["1/0", "1/5 + 2", "0.200001", "0.2000000001", "I got 1 then 2", "1,0", "1e0"])("does not accept malformed or approximate answers: %s", question => {
    const result = createLinearEquationStudyResponse({ source: "Problem: 5x+1=2\nStudent work: 5x=1", question, mode: "guide" });
    expect(result?.main).not.toContain("works for x");
    expect(result?.steps).not.toContain("Put the checked answer in the answer box.");
  });

  it("preserves the sign of a negative mixed-number zero", () => {
    const result = createLinearEquationStudyResponse({ source: "Problem: 2x+1=0\nStudent work: 2x=-1", question: "-0 1/2", mode: "guide" });
    expect(result?.main).toContain("-1/2 works for x");
  });

  it("preserves a negative constant in both a check and review instructions", () => {
    const source = "Problem: 3x-5=10\nStudent work: 3x=15";
    const result = createLinearEquationStudyResponse({ source, question: "5", mode: "guide" });
    expect(result?.steps[1]).toBe("Check: 3(5) - 5 = 10.");
    const mismatch = createLinearEquationStudyResponse({ source, question: "4", mode: "guide" });
    expect(mismatch?.reason).toContain("minus 5");
    const review = createLinearEquationReview([{ label: "Problem", value: "3x-5=10" }]);
    expect(review?.nextMove).toContain("Add 5");
  });

  it.each([
    "Problem: 3x+5=20\nProblem: 4x+1=9",
    "Example: 3x+5=20\nThe current problem has not been selected.",
    "Problem: 3x+5=20\nReference: 4x+1=9",
    "Student work: 3x=15",
  ])("does not pick an equation from ambiguous or unselected context", source => {
    expect(createLinearEquationStudyResponse({ source, question: "help", mode: "guide" })).toBeNull();
  });

  it("does not treat a problem statement itself as student work", () => {
    const result = createLinearEquationStudyResponse({ source: "Problem: 3x=15", question: "help", mode: "guide" });
    expect(result?.main).not.toMatch(/Yes|Correct/u);
    expect(result?.reason).not.toContain("checking the last thing");
  });

  it("does not approve one isolated line while ignoring a conflicting line", () => {
    const result = createLinearEquationStudyResponse({ source: "Problem: 3x+5=20\nStudent work: 3x=15", question: "3x=14", mode: "guide" });
    expect(result?.main).not.toMatch(/Yes|Correct/u);
  });

  it("does not grade answers to an unrelated prior arithmetic question", () => {
    const result = createLinearEquationStudyResponse({ source: "Problem: 3x+5=20", question: "15", mode: "guide", conversation: [{ role: "assistant", text: "What does 8 - 2 equal?" }] });
    expect(result?.main).not.toMatch(/Correct|Close/u);
  });

  it("does not assert a whole-number quotient is nonintegral", () => {
    const result = createLinearEquationStudyResponse({ source: "Problem: 3x+5=20", question: "4", mode: "guide", conversation: [{ role: "assistant", text: "What is 15 / 3?" }] });
    expect(result?.main).not.toContain("does not divide evenly");
  });

  it.each(["do not divide", "divide by 4"])("does not approve an unrelated division instruction: %s", question => {
    const result = createLinearEquationStudyResponse({ source: "Problem: 3x+5=20", question, mode: "guide", conversation: [{ role: "assistant", text: "Now 3x = 15. What operation should we use to undo multiplying by 3?" }] });
    expect(result?.main).not.toContain("Correct");
  });

  it("assignment review does not select the student's equation as the original problem", () => {
    expect(createLinearEquationReview([{ label: "Student work", value: "3x=15" }])).toBeNull();
    expect(createLinearEquationReview([{ label: "Problem", value: "3x=15" }, { label: "Assignment", value: "4x=20" }])).toBeNull();
  });

  it("parses a two-step linear equation", () => {
    expect(parseLinearEquation("Solve 3x + 5 = 20")).toEqual(expect.objectContaining({
      coefficient: 3,
      constant: 5,
      rhs: 20,
      isolatedRhs: 15,
      solution: 5,
    }));
  });

  it("tells the student not to subtract from the x term", () => {
    const response = createLinearEquationStudyResponse({
      source: "Problem: Solve 3x + 5 = 20",
      question: "do i subtract 5 from 3x",
      mode: "guide",
    });

    expect(response?.main).toContain("not from 3x");
    expect(response?.steps[0]).toBe("Write 3x + 5 - 5 = 20 - 5.");
    expect(response?.visualAid?.kind).toBe("equation_steps");
    expect(response?.visualAid?.steps).toEqual(["3x + 5 = 20", "-5      -5", "3x = 15", "Your turn: divide both sides by 3"]);
  });

  it("uses the student's 3x=15 step and moves to division", () => {
    const response = createLinearEquationStudyResponse({
      source: "Problem: Solve 3x + 5 = 20",
      question: "3x=15 is what i get",
      mode: "guide",
    });

    expect(response?.main).toContain("divide both sides by 3");
    expect(JSON.stringify(response)).not.toContain("x = 4");
  });

  it("reviews a correct chat answer instead of repeating the divide step", () => {
    const response = createLinearEquationStudyResponse({
      source: "Problem: Solve 3x + 5 = 20\nStudent work: 3x=15",
      question: "5",
      mode: "guide",
      conversation: [
        { role: "assistant", text: "What does 15 divided by 3 equal?" },
        { role: "student", text: "5" },
      ],
    });

    expect(response?.main).toContain("5 works for x");
    expect(response?.steps[0]).toBe("Write x = 5.");
    expect(response?.main).not.toContain("divide both sides by 3");
  });

  it("reviews a conflicting chat answer against the shown work", () => {
    const response = createLinearEquationStudyResponse({
      source: "Problem: Solve 3x + 5 = 20\nStudent work: 3x=15",
      question: "4",
      mode: "guide",
      conversation: [
        { role: "assistant", text: "What does 15 divided by 3 equal?" },
        { role: "student", text: "4" },
      ],
    });

    expect(response?.main).toContain("answer is not ready yet");
    expect(response?.main).toContain("Do not jump to 4");
    expect(response?.reason).toContain("does not make 20");
  });
  it("walks a freshman through 3x - 5 = 15 one answer at a time", () => {
    const source = "Freshman Algebra 1\nProblem: Solve 3x - 5 = 15";

    const confused = createLinearEquationStudyResponse({
      source,
      question: "i am confused",
      mode: "guide",
      conversation: [
        { role: "assistant", text: "What operation would undo subtracting 5?" },
        { role: "student", text: "i am confused" },
      ],
    });
    expect(confused?.main).toContain("balanced scale");
    expect(confused?.main).toContain("3x - 5 + 5 = 15 + 5");
    expect(confused?.main).toContain("What does 15 + 5 equal?");

    const added = createLinearEquationStudyResponse({
      source,
      question: "20",
      mode: "guide",
      conversation: [
        { role: "assistant", text: confused?.main ?? "What does 15 + 5 equal?" },
        { role: "student", text: "20" },
      ],
    });
    expect(added?.main).toContain("Correct");
    expect(added?.main).toContain("3x = 20");
    expect(added?.main).toContain("undo multiplying by 3");

    const operation = createLinearEquationStudyResponse({
      source,
      question: "3",
      mode: "guide",
      conversation: [
        { role: "assistant", text: added?.main ?? "what operation should we use to undo multiplying by 3?" },
        { role: "student", text: "3" },
      ],
    });
    expect(operation?.main).toContain("very close");
    expect(operation?.main).toContain("dividing both sides by 3");
    expect(operation?.main).toContain("What is 20 / 3?");

    const rounded = createLinearEquationStudyResponse({
      source,
      question: "6",
      mode: "guide",
      conversation: [
        { role: "assistant", text: operation?.main ?? "What is 20 / 3?" },
        { role: "student", text: "6" },
      ],
    });
    expect(rounded?.main).toContain("Close");
    expect(rounded?.main).toContain("3 x 6 = 18");
    expect(rounded?.main).toContain("there are 2 left over");
    expect(rounded?.main).toContain("fraction or mixed number");

    const mixed = createLinearEquationStudyResponse({
      source,
      question: "6 2/3",
      mode: "guide",
      conversation: [
        { role: "assistant", text: rounded?.main ?? "How could you write 20 / 3 as a fraction or mixed number?" },
        { role: "student", text: "6 2/3" },
      ],
    });
    expect(mixed?.main).toContain("Correct");
    expect(mixed?.main).toContain("x = 6 2/3");
    expect(mixed?.main).toContain("what is 3 x 6 2/3");
    expect(mixed?.steps).toEqual([]);
  });
  it("keeps assignment review from inventing a check value", () => {
    const review = createLinearEquationReview(fields, "");

    expect(review?.strength).toContain("3x = 15");
    expect(review?.nextMove).toContain("3x / 3 = 15 / 3");
    expect(review?.visualAid.kind).toBe("equation_steps");
    expect(review?.visualAid.steps).toContain("-5      -5");
    expect(JSON.stringify(review)).not.toContain("x = 4");
  });
  it("notices when the answer box conflicts with the shown algebra work", () => {
    const response = createLinearEquationStudyResponse({
      source: "Problem: Solve 3x + 5 = 20\nStudent answer: 4\nStudent work: 3x=15",
      question: "check my work",
      mode: "guide",
    });

    expect(response?.main).toContain("answer box is not ready yet");
    expect(response?.main).toContain("Do not jump to 4");
    expect(response?.reason).toContain("does not make 20");
    expect(response?.steps[0]).toBe("Write 3x / 3 = 15 / 3.");
  });

  it("calls out a conflicting answer during assignment review", () => {
    const review = createLinearEquationReview([
      { label: "Problem", value: "Solve 3x + 5 = 20" },
      { label: "Student answer", value: "4" },
      { label: "Student work", value: "3x=15" },
    ], "");

    expect(review?.improvement).toContain("answer box is not ready yet");
    expect(review?.improvement).toContain("Do not jump to 4");
    expect(review?.nextMove).toBe("Write 3x / 3 = 15 / 3.");
  });
});
