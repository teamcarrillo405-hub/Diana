// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ClassesConceptReview } from "./classes-concept-review";
import { CONCEPT_COURSES, courseSummary } from "./fixtures";

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
});
afterEach(cleanup);

describe("Classes roster preview", () => {
  it("opens Biology with four course sections and a sample-data label", () => {
    render(<ClassesConceptReview />);
    expect(screen.getByText(/SAMPLE DATA/)).toBeVisible();
    expect(screen.getByRole("tab", { name: "Biology" })).toHaveAttribute("aria-selected", "true");
    expect(within(screen.getByRole("tablist", { name: "Course sections" })).getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByRole("tabpanel", { name: "Overview" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Course library" })).not.toBeInTheDocument();
  });

  it("moves class selection and focus with arrows, Home, and End", () => {
    render(<ClassesConceptReview />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Biology" }), { key: "ArrowDown" });
    const english = screen.getByRole("tab", { name: "English 9" });
    expect(english).toHaveFocus();
    expect(screen.getByRole("heading", { name: "English 9" })).toBeVisible();
    fireEvent.keyDown(english, { key: "End" });
    const media = screen.getByRole("tab", { name: "Digital Media" });
    expect(media).toHaveFocus();
    fireEvent.keyDown(media, { key: "Home" });
    expect(screen.getByRole("tab", { name: "Biology" })).toHaveFocus();
  });

  it("keeps section selection when changing class and supports section keyboard navigation", () => {
    render(<ClassesConceptReview />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Overview" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Assignments" })).toHaveFocus();
    fireEvent.click(screen.getByRole("tab", { name: "Chemistry" }));
    expect(screen.getByRole("tab", { name: "Assignments" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Open Reaction lab notes" })).toBeVisible();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Assignments" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "Practice" })).toHaveFocus();
  });

  it("filters the lineup and recovers from empty search", () => {
    render(<ClassesConceptReview />);
    const input = screen.getByRole("textbox", { name: "Find a class" });
    fireEvent.change(input, { target: { value: "science" } });
    expect(within(screen.getByRole("tablist", { name: "Choose a class" })).getAllByRole("tab")).toHaveLength(2);
    fireEvent.change(input, { target: { value: "no-such-course" } });
    expect(screen.getByRole("heading", { name: "No matching classes" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("heading", { name: "Biology" })).toBeVisible();
  });

  it("shows unavailable grades and genuine empty current work", () => {
    render(<ClassesConceptReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Algebra I" }));
    expect(screen.getByText("No grade recorded")).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "Digital Media" }));
    expect(screen.getByRole("heading", { name: "No active assignments" })).toBeVisible();
    expect(screen.getByText("Nothing scheduled")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "View all" }));
    expect(screen.getByRole("tab", { name: "Assignments" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Open A story in three frames" })).toBeVisible();
  });

  it("preserves assignment filters between section visits without mixing ready and submitted", () => {
    render(<ClassesConceptReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Chemistry" }));
    fireEvent.click(screen.getByRole("tab", { name: "Assignments" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Assignment status" }), { target: { value: "ready" } });
    expect(screen.getByRole("button", { name: "Open Balancing equations" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Open Elements & compounds" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    fireEvent.click(screen.getByRole("tab", { name: "Assignments" }));
    expect(screen.getByRole("combobox", { name: "Assignment status" })).toHaveValue("ready");
  });

  it("filters notes and materials and opens the sample reader with return focus", () => {
    render(<ClassesConceptReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Notes & Materials" }));
    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    const opener = screen.getByRole("button", { name: /Assignment rubric/ });
    fireEvent.click(opener);
    expect(screen.getByRole("dialog", { name: "Assignment rubric" })).toBeVisible();
    expect(screen.getByText(/Reasoning: explain the connection/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    expect(opener).toHaveFocus();
    fireEvent.change(screen.getByRole("textbox", { name: "Find a material" }), { target: { value: "unlisted" } });
    expect(screen.getByText("No matching materials.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("button", { name: /Cell structure notes/ })).toBeVisible();
  });

  it("opens assignment previews without starting real sessions", () => {
    render(<ClassesConceptReview />);
    const opener = screen.getByRole("button", { name: "Open Cell structure & function" });
    fireEvent.click(opener);
    expect(screen.getByRole("dialog", { name: "Cell structure & function" })).toBeVisible();
    expect(screen.getByText("Preview only. No study session has started.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back to class" }));
    expect(opener).toHaveFocus();
  });

  it("runs a complete local sample practice with neutral feedback and replay", () => {
    render(<ClassesConceptReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Practice" }));
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "Cell membrane" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Chloroplasts contain chlorophyll/);
    fireEvent.click(screen.getByRole("button", { name: "Next question" }));
    fireEvent.click(screen.getByRole("radio", { name: "Control what enters and leaves the cell" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish practice" }));
    expect(screen.getByRole("heading", { name: "Practice complete" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Practice again" }));
    expect(screen.getByText("QUESTION 1 / 2")).toBeVisible();
  });

  it("keeps synthetic snapshot counts and question answer indexes consistent", () => {
    expect(courseSummary(CONCEPT_COURSES[0])).toEqual({ open: 2, submitted: 1, nextDue: "Sep 17" });
    expect(courseSummary(CONCEPT_COURSES[5])).toEqual({ open: 0, submitted: 3, nextDue: null });
    for (const course of CONCEPT_COURSES) {
      expect(course.assignments.every(item => item.id.startsWith(course.id))).toBe(true);
      expect(course.questions.every(item => item.answer >= 0 && item.answer < item.choices.length)).toBe(true);
    }
  });
});
