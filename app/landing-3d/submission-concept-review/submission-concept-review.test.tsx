// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubmissionConceptReview } from "./submission-concept-review";

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 0; });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function checkPreflight() {
  fireEvent.click(screen.getByRole("checkbox", { name: "I reviewed the outgoing work" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "I checked the assignment directions" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "This is the right destination" }));
}

describe("submission concept review", () => {
  it("keeps handoff gated behind explicit checks and records a manual receipt with its limitation", () => {
    render(<SubmissionConceptReview />);
    expect(screen.getByRole("button", { name: "Continue to handoff" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: /Receipt/ })).toHaveAttribute("aria-disabled", "true");
    checkPreflight();
    fireEvent.click(screen.getByRole("button", { name: "Continue to handoff" }));
    const confirm = screen.getByRole("button", { name: "Record hand-in in Diana" });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Prepare sample PDF" }));
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I handed in this work/ }));
    fireEvent.click(confirm);
    expect(screen.getByRole("heading", { name: "Hand-in recorded in Diana" })).toBeVisible();
    expect(screen.getByText(/has not verified school delivery/)).toBeVisible();
    expect(screen.getByRole("tab", { name: "Receipt" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows a pending state before a connected school receipt", () => {
    render(<SubmissionConceptReview />);
    fireEvent.change(screen.getByRole("combobox", { name: "Preview destination" }), { target: { value: "canvas" } });
    checkPreflight();
    fireEvent.click(screen.getByRole("button", { name: "Continue to handoff" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /I checked the Canvas destination/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm and send to Canvas" }));
    expect(screen.getByText("Awaiting school confirmation")).toBeVisible();
    expect(screen.getByRole("tab", { name: /Receipt/ })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("button", { name: "Show sample accepted response" }));
    expect(screen.getByRole("heading", { name: "School accepted this submission" })).toBeVisible();
    expect(screen.getByText(/No real school submission occurred/)).toBeVisible();
  });

  it("recovers from stale work and exposes incomplete work without hiding it", () => {
    render(<SubmissionConceptReview />);
    fireEvent.change(screen.getByRole("combobox", { name: "Preview state" }), { target: { value: "stale" } });
    checkPreflight();
    expect(screen.getByRole("button", { name: "Continue to handoff" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Refresh review" }));
    expect(screen.getByRole("button", { name: "Continue to handoff" })).toBeEnabled();
    fireEvent.change(screen.getByRole("combobox", { name: "Preview state" }), { target: { value: "incomplete" } });
    expect(screen.getByText(/still marked incomplete/)).toBeVisible();
    expect(screen.getByText("No final work saved for this section.")).toBeVisible();
  });

  it("moves stage selection and focus with arrow keys while skipping the locked receipt", () => {
    render(<SubmissionConceptReview />);
    const review = screen.getByRole("tab", { name: "Review work" });
    fireEvent.keyDown(review, { key: "ArrowDown" });
    const handoff = screen.getByRole("tab", { name: "Handoff" });
    expect(handoff).toHaveFocus();
    expect(handoff).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(handoff, { key: "ArrowDown" });
    expect(review).toHaveFocus();
    fireEvent.keyDown(review, { key: "End" });
    expect(handoff).toHaveFocus();
  });

  it("keeps an unavailable school handoff and a rejected response out of the receipt", () => {
    render(<SubmissionConceptReview />);
    fireEvent.change(screen.getByRole("combobox", { name: "Preview state" }), { target: { value: "unavailable" } });
    expect(screen.getByRole("combobox", { name: "Preview destination" })).toHaveValue("canvas");
    fireEvent.click(screen.getByRole("tab", { name: "Handoff" }));
    expect(screen.getByText(/School connection unavailable/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /Confirm and send/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Preview state" }), { target: { value: "not-accepted" } });
    expect(screen.getByRole("tab", { name: /Receipt/ })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("button", { name: "Review again" }));
    expect(screen.getByRole("tab", { name: "Review work" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows a read-only graded sample receipt", () => {
    render(<SubmissionConceptReview />);
    fireEvent.change(screen.getByRole("combobox", { name: "Preview state" }), { target: { value: "graded" } });
    expect(screen.getByRole("heading", { name: "Grade recorded" })).toBeVisible();
    expect(screen.getByText(/No real grade or school response was loaded/)).toBeVisible();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).toBeDisabled();
  });
});
