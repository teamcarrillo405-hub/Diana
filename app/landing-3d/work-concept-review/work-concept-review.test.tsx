// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { WorkConceptReview } from "./work-concept-review";
import { assignmentAction, CONCEPT_ASSIGNMENTS } from "./fixtures";

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
});
afterEach(cleanup);

describe("Work concept comparison", () => {
  it("opens the Franchise concept with sample content and one selected assignment", () => {
    render(<WorkConceptReview />);
    expect(screen.getByRole("button", { name: "A Franchise hub" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("tab", { name: /Chemistry Reaction lab notes/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Reaction lab notes" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Resume" })).toBeVisible();
  });

  it("keeps the selected assignment when comparing compositions", () => {
    render(<WorkConceptReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Friday, September 18" }));
    fireEvent.click(screen.getByRole("tab", { name: /Biology Inside the cell/i }));
    fireEvent.click(screen.getByRole("button", { name: "B Card carousel" }));
    expect(screen.getByRole("tab", { name: /Inside the cell/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Start" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "A Franchise hub" }));
    expect(screen.getByRole("tab", { name: /Biology Inside the cell/i })).toHaveAttribute("aria-selected", "true");
  });

  it("supports arrow, Home and End navigation with matching focus", () => {
    render(<WorkConceptReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Friday, September 18" }));
    const first = screen.getByRole("tab", { name: /Biology Inside the cell/i });
    fireEvent.keyDown(first, { key: "ArrowDown" });
    const second = screen.getByRole("tab", { name: /History Reading the archive/i });
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(second, { key: "End" });
    const last = second;
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Home" });
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute("tabindex", "0");
  });

  it("filters the same collection in both concepts and recovers from no results", () => {
    render(<WorkConceptReview />);
    fireEvent.change(screen.getByRole("textbox", { name: "Find assignment" }), { target: { value: "archive" } });
    expect(within(screen.getByRole("tablist", { name: "Choose assignment" })).getAllByRole("tab")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "Friday, September 18" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "B Card carousel" }));
    expect(screen.getAllByRole("tab")).toHaveLength(1);
    fireEvent.change(screen.getByRole("combobox", { name: "Subject" }), { target: { value: "Chemistry" } });
    expect(screen.getByRole("heading", { name: "No matching assignments" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByRole("tab")).toHaveLength(4);
  });

  it("separates review, submission and submitted states without implying launch", () => {
    render(<WorkConceptReview />);
    const status = screen.getByRole("group", { name: "Assignment status" });
    fireEvent.click(within(status).getByRole("button", { name: "Review 1" }));
    expect(screen.getByRole("button", { name: "Review work" })).toBeVisible();
    fireEvent.click(within(status).getByRole("button", { name: "Ready to submit 1" }));
    expect(screen.getByRole("button", { name: "Review submission" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "B Card carousel" }));
    expect(within(screen.getByRole("tab")).getByText("READY TO SUBMIT")).toBeVisible();
    fireEvent.click(within(status).getByRole("button", { name: "Submitted 1" }));
    expect(screen.getByRole("button", { name: "View submission" })).toBeVisible();
    expect(within(screen.getByRole("tab")).getByText("SUBMITTED")).toBeVisible();
  });

  it("keeps carousel boundary controls and grid selection consistent", () => {
    render(<WorkConceptReview />);
    fireEvent.click(screen.getByRole("button", { name: "B Card carousel" }));
    expect(screen.getByRole("button", { name: "Previous assignment" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next assignment" }));
    expect(screen.getByRole("tab", { name: /Inside the cell/i })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Show grid" }));
    expect(screen.getByRole("button", { name: "Show carousel" })).toBeVisible();
    expect(screen.getByRole("tab", { name: /Inside the cell/i })).toHaveAttribute("aria-selected", "true");
  });

  it("uses only synthetic IDs and appropriate actions", () => {
    expect(new Set(CONCEPT_ASSIGNMENTS.map(item => item.id)).size).toBe(CONCEPT_ASSIGNMENTS.length);
    expect(CONCEPT_ASSIGNMENTS.every(item => !/^[\da-f]{8}-/i.test(item.id))).toBe(true);
    expect(assignmentAction(CONCEPT_ASSIGNMENTS[0])).toBe("Resume");
    expect(assignmentAction(CONCEPT_ASSIGNMENTS[1])).toBe("Start");
  });

  it("keeps the art, brief, progress, action, and resources in one selected panel", () => {
    render(<WorkConceptReview />);
    const panel = screen.getByRole("tabpanel", { name: "Chemistry Reaction lab notes" });
    expect(panel).toHaveAttribute("id", "work-selected-panel");
    expect(within(panel).getByRole("img", { name: CONCEPT_ASSIGNMENTS[0].imageAlt })).toBeVisible();
    const brief = within(panel).getByRole("complementary", { name: "Assignment details" });
    expect(within(brief).getByText("Thu, Sep 17")).toBeVisible();
    expect(within(brief).getByText("4:00 PM")).toBeVisible();
    expect(within(brief).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    expect(within(brief).getByRole("button", { name: "Resume" })).toBeVisible();
    const disclosure = within(panel).getByText("Requirements & materials").closest("details")!;
    expect(disclosure).not.toHaveAttribute("open");
    fireEvent.click(within(panel).getByText("Requirements & materials"));
    expect(disclosure).toHaveAttribute("open");
    expect(within(panel).getByRole("region", { name: "Assignment requirements" })).toBeVisible();
    expect(within(panel).getByRole("region", { name: "Assignment materials" })).toBeVisible();
    expect(screen.getByRole("tablist", { name: "Assignment days" })).toBeVisible();
  });

  it("preserves known saved progress while switching assignments and concepts", () => {
    render(<WorkConceptReview />);
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    fireEvent.click(screen.getByRole("tab", { name: "Monday, September 21" }));
    fireEvent.click(screen.getByRole("tab", { name: "Algebra Functions & graphs" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "8");
    fireEvent.click(screen.getByRole("button", { name: "B Card carousel" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
    fireEvent.click(screen.getByRole("button", { name: "A Franchise hub" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    fireEvent.click(screen.getByRole("tab", { name: "Friday, September 18" }));
    fireEvent.click(screen.getByRole("tab", { name: "Biology Inside the cell" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("Not started")).toBeVisible();
    expect(screen.getByRole("button", { name: "Start" })).toBeVisible();
  });

  it("distinguishes the submitted record from an upcoming deadline", () => {
    render(<WorkConceptReview />);
    fireEvent.click(screen.getByRole("button", { name: "Submitted 1" }));
    const brief = screen.getByRole("complementary", { name: "Assignment details" });
    expect(within(brief).getByText("Submission record")).toBeVisible();
    expect(within(brief).queryByText("Due")).not.toBeInTheDocument();
    expect(within(brief).queryByText("Estimated work")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View submission" })).toBeVisible();
  });

  it("opens only a sample dialog and returns focus to the matching action", () => {
    render(<WorkConceptReview />);
    const resume = screen.getByRole("button", { name: "Resume" });
    fireEvent.click(resume);
    const dialog = screen.getByRole("dialog", { name: "Reaction lab notes" });
    expect(within(dialog).getByText(/No study session has started/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Close session preview" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(resume).toHaveFocus();
  });

  it("uses the original Calendar date ribbon with only the selected day's assignments", () => {
    render(<WorkConceptReview />);
    const days = screen.getByRole("tablist", { name: "Assignment days" });
    expect(within(days).getAllByRole("tab")).toHaveLength(7);
    expect(screen.getByRole("tab", { name: "Thursday, September 17" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Wednesday, September 16" })).toHaveAttribute("aria-current", "date");
    expect(within(screen.getByRole("tablist", { name: "Choose assignment" })).getAllByRole("tab")).toHaveLength(1);
    fireEvent.click(screen.getByRole("tab", { name: "Friday, September 18" }));
    expect(within(screen.getByRole("tablist", { name: "Choose assignment" })).getAllByRole("tab")).toHaveLength(2);
    expect(screen.queryByRole("tab", { name: /Chemistry Reaction lab notes/ })).not.toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: "Friday, September 18" })).toHaveAttribute("id", "work-day-panel");
  });

  it("supports date arrow, Home and End keys and restores the selected date's focus", async () => {
    render(<WorkConceptReview />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Thursday, September 17" }), { key: "ArrowRight" });
    const friday = screen.getByRole("tab", { name: "Friday, September 18" });
    await waitFor(() => expect(friday).toHaveFocus());
    expect(friday).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(friday, { key: "End" });
    const sunday = screen.getByRole("tab", { name: "Sunday, September 20" });
    await waitFor(() => expect(sunday).toHaveFocus());
    fireEvent.keyDown(sunday, { key: "ArrowRight" });
    const monday = screen.getByRole("tab", { name: "Monday, September 14" });
    await waitFor(() => expect(monday).toHaveFocus());
    fireEvent.keyDown(monday, { key: "End" });
    fireEvent.keyDown(sunday, { key: "Home" });
    await waitFor(() => expect(monday).toHaveFocus());
    expect(within(screen.getByRole("tablist", { name: "Assignment days" })).getAllByRole("tab").filter(tab => tab.tabIndex === 0)).toHaveLength(1);
  });

  it("keeps date navigation available on empty days and recovers to the next assignment", () => {
    render(<WorkConceptReview />);
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { name: "NO WORK DUE" })).toBeVisible();
    expect(screen.getByRole("tablist", { name: "Assignment days" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next assignment day" }));
    expect(screen.getByRole("heading", { name: "Reaction lab notes" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("heading", { name: "Sep 21 - 27, 2026" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("heading", { name: "Sep 28 - Oct 4, 2026" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    fireEvent.click(screen.getByRole("tab", { name: "Monday, September 21" }));
    expect(screen.getByRole("heading", { name: "Functions & graphs" })).toBeVisible();
  });

  it("jumps to matching assignment dates when filtering and clears an empty franchise view", () => {
    render(<WorkConceptReview />);
    fireEvent.change(screen.getByRole("combobox", { name: "Subject" }), { target: { value: "Algebra" } });
    expect(screen.getByRole("tab", { name: "Monday, September 21" })).toHaveAttribute("aria-selected", "true");
    fireEvent.change(screen.getByRole("textbox", { name: "Find assignment" }), { target: { value: "archive" } });
    expect(screen.getByRole("heading", { name: "No matching assignments" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("heading", { name: "Reaction lab notes" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Thursday, September 17" })).toHaveAttribute("aria-selected", "true");
  });
});
