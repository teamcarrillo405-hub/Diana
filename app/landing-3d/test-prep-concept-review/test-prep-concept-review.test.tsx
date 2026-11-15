// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TestPrepConceptReview } from "./test-prep-concept-review";

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("test-prep concept review local workflow", () => {
  it("starts at the test event with its complete preparation deck", () => {
    render(<TestPrepConceptReview />);
    expect(screen.getByRole("heading", { name: "Unit 4 assessment" })).toBeVisible();
    expect(screen.getAllByRole("tab").map(tab => tab.textContent?.replace(/\d/g, "").trim())).toEqual(["Event", "Scouting", "Training", "Playbook", "Review"]);
    expect(screen.getByRole("button", { name: "Enter training" })).toBeVisible();
    expect(screen.getByText(/Sample data/)).toBeVisible();
    expect(screen.getByRole("img", { name: "Glassware and solutions in a chemistry laboratory" })).toBeVisible();
  });

  it("moves tab selection and focus with arrows, Home, and End", () => {
    render(<TestPrepConceptReview />);
    const event = screen.getByRole("tab", { name: /Event/ });
    event.focus();
    fireEvent.keyDown(event, { key: "ArrowDown" });
    const scouting = screen.getByRole("tab", { name: /Scouting/ });
    expect(scouting).toHaveFocus();
    expect(scouting).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(scouting, { key: "End" });
    const review = screen.getByRole("tab", { name: /Review/ });
    expect(review).toHaveFocus();
    expect(review).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(review, { key: "Home" });
    expect(event).toHaveFocus();
    expect(event).toHaveAttribute("aria-selected", "true");
  });

  it("keeps an unfinished event focus entry when changing categories", () => {
    render(<TestPrepConceptReview />);
    fireEvent.click(screen.getByText("Edit prep focus"));
    const focus = screen.getByRole("textbox", { name: "Current prep focus" });
    fireEvent.change(focus, { target: { value: "Set up the ratio before calculating" } });
    fireEvent.click(screen.getByRole("tab", { name: /Scouting/ }));
    fireEvent.click(screen.getByRole("tab", { name: /Event/ }));
    expect(screen.getByRole("textbox", { name: "Current prep focus" })).toHaveValue("Set up the ratio before calculating");
  });

  it("supports a sample practice decision without generating a real test", () => {
    render(<TestPrepConceptReview />);
    fireEvent.click(screen.getByRole("button", { name: "Enter training" }));
    expect(screen.getByRole("tab", { name: /Training/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Start training rep" }));
    const check = screen.getByRole("button", { name: "Check sample" });
    expect(check).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /A, because its ratio supports/ }));
    expect(check).toBeEnabled();
    fireEvent.click(check);
    expect(screen.getByText(/Compare each amount to the balanced ratio/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Return to practice formats" })).toBeVisible();
    expect(screen.queryByText(/test generated/i)).not.toBeInTheDocument();
  });

  it("validates and adds a local-only practice record", () => {
    render(<TestPrepConceptReview />);
    fireEvent.click(screen.getByRole("tab", { name: /Review/ }));
    fireEvent.click(screen.getByText("Log a result"));
    fireEvent.change(screen.getByRole("textbox", { name: "Correct answers" }), { target: { value: "13" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Total questions" }), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Log local rep" }));
    expect(screen.getByText(/correct count does not exceed the total/)).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Correct answers" }), { target: { value: "10" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Next review focus" }), { target: { value: "Recheck setup units" } });
    fireEvent.click(screen.getByRole("button", { name: "Log local rep" }));
    expect(screen.getByText("Local practice result added. Nothing was saved to your account.")).toBeVisible();
    expect(screen.getByText("Recheck setup units")).toBeVisible();
    expect(screen.getByText("10 / 12")).toBeVisible();
  });

  it("keeps records isolated per preview fixture", () => {
    render(<TestPrepConceptReview />);
    fireEvent.click(screen.getByRole("tab", { name: /Review/ }));
    fireEvent.click(screen.getByText("Log a result"));
    fireEvent.change(screen.getByRole("textbox", { name: "Correct answers" }), { target: { value: "10" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Total questions" }), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Log local rep" }));
    fireEvent.change(screen.getByLabelText("Preview test"), { target: { value: "english" } });
    expect(screen.queryByText("10 / 12")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Preview test"), { target: { value: "chemistry" } });
    expect(screen.getByText("10 / 12")).toBeVisible();
  });

  it("preserves a written response across categories without inventing a grade", () => {
    render(<TestPrepConceptReview />);
    fireEvent.click(screen.getByRole("button", { name: "Enter training" }));
    fireEvent.click(screen.getByRole("button", { name: "Written response" }));
    fireEvent.click(screen.getByRole("button", { name: "Start training rep" }));
    expect(screen.getByRole("button", { name: "Review explanation" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Your response" }), { target: { value: "Compare amounts using the balanced ratio." } });
    fireEvent.click(screen.getByRole("tab", { name: "Review" }));
    fireEvent.click(screen.getByText("Log a result"));
    fireEvent.change(screen.getByRole("combobox", { name: "Practice format" }), { target: { value: "Multiple choice" } });
    fireEvent.click(screen.getByRole("tab", { name: "Scouting" }));
    fireEvent.click(screen.getByRole("tab", { name: "Training" }));
    expect(screen.getByRole("textbox", { name: "Your response" })).toHaveValue("Compare amounts using the balanced ratio.");
    fireEvent.click(screen.getByRole("button", { name: "Review explanation" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Compare each amount to the balanced ratio/);
    expect(screen.queryByText(/grade|score/i)).not.toBeInTheDocument();
  });

  it("never uses browser storage, network, permission, or account writes", () => {
    const fetch = vi.fn(() => { throw new Error("Unexpected network call"); });
    vi.stubGlobal("fetch", fetch);
    const get = vi.spyOn(Storage.prototype, "getItem");
    const set = vi.spyOn(Storage.prototype, "setItem");
    const request = vi.fn();
    vi.stubGlobal("Notification", { requestPermission: request });
    render(<TestPrepConceptReview />);
    fireEvent.click(screen.getByRole("button", { name: "Enter training" }));
    fireEvent.click(screen.getByRole("button", { name: "Start training rep" }));
    fireEvent.click(screen.getByRole("radio", { name: /A, because its ratio supports/ }));
    fireEvent.click(screen.getByRole("button", { name: "Check sample" }));
    for (const spy of [fetch, get, set, request]) expect(spy).not.toHaveBeenCalled();
  });
});
