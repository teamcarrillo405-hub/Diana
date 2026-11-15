import { describe, expect, it } from "vitest";
import { createLinearEquationReview, createLinearEquationStudyResponse, parseLinearEquation } from "./linear-equation-tutor";

const fields = [
  { label: "Problem", value: "Solve 3x + 5 = 20" },
  { label: "Student work", value: "3x=15 is what I get" },
];

describe("linear equation tutor guardrail", () => {
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
