// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RubricPanel } from "./rubric-panel";

const RUBRIC = {
  id: "rubric-one",
  title: "Biology lab rubric",
  rawText:
    "Quantitative precision - Show each result to 3 decimal places - 40 pts\nPeer collaboration - Respond to two discussion threads - 30 pts",
};

const SYLLABUS = {
  title: "BIO 204 Analytics",
  policies: [
    { kind: "Citations", text: "Use APA formatting for the final submission." },
  ],
};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Rubric Scout", () => {
  it("renders real rubric and syllabus context with owner-safe actions", () => {
    render(
      <RubricPanel
        classId="class-one"
        className="Biology"
        teacher="Dr. Okafor"
        aiMode="green"
        rubric={RUBRIC}
        syllabus={SYLLABUS}
        assignments={[{ id: "assignment-one", title: "Cell respiration lab" }]}
        scanOpen={false}
        rubricForm={<div>Rubric edit form</div>}
        syllabusForm={<div>Syllabus edit form</div>}
      />,
    );

    expect(screen.getByRole("heading", { name: "Course insights" })).toBeInTheDocument();
    expect(screen.getByText(/syllabus: bio 204 analytics/iu)).toBeInTheDocument();
    expect(screen.getByText("Quantitative precision")).toBeInTheDocument();
    expect(screen.getByText("Peer collaboration")).toBeInTheDocument();
    expect(screen.getByText("Use APA formatting for the final submission.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to classes" })).toHaveAttribute(
      "href",
      "/classes",
    );
    expect(screen.getByRole("link", { name: "Open rubric work" })).toHaveAttribute(
      "href",
      "/assignments/assignment-one",
    );
    expect(screen.getByRole("link", { name: "Work on Quantitative precision with Diana" })).toHaveAttribute(
      "href",
      expect.stringContaining("/study-buddy?"),
    );

    const criterion = screen.getByRole("button", { name: /quantitative precision/iu });
    expect(criterion).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(criterion);
    expect(criterion).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps AI assistance unavailable when the class policy is not green", () => {
    render(
      <RubricPanel
        classId="class-one"
        className="Biology"
        teacher={null}
        aiMode="yellow"
        rubric={RUBRIC}
        syllabus={null}
        assignments={[]}
        scanOpen
        rubricForm={<div>Rubric edit form</div>}
        syllabusForm={<div>Syllabus edit form</div>}
      />,
    );

    expect(screen.queryByRole("link", { name: /with Diana/iu })).not.toBeInTheDocument();
    expect(screen.getByText("Rubric edit form")).toBeInTheDocument();
    expect(screen.getByText("Syllabus edit form")).toBeInTheDocument();
    expect(screen.getByText(/AI help follows this class's yellow policy/iu)).toBeInTheDocument();
  });
});
