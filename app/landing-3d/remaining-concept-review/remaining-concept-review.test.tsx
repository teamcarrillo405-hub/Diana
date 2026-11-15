// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { families, screenInfo } from "./catalog";
import { RemainingConceptReview } from "./remaining-concept-review";

afterEach(cleanup);

describe("remaining pages review", () => {
  it("keeps every screen in an addressable family", () => {
    const listed = families.flatMap(family => family.screens);
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.sort()).toEqual(Object.keys(screenInfo).sort());
  });

  it("keeps quiz drafting separate from saved responses", () => {
    render(<RemainingConceptReview screen="study-quiz" />);
    expect(screen.getByText("0 saved")).toBeVisible();
    fireEvent.click(screen.getByRole("radio", { name: "Cell wall" }));
    expect(screen.getByText("0 saved")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Save and continue/ }));
    expect(screen.getByText("1 saved")).toBeVisible();
    expect(screen.getByText("Question 2 / 3")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reveal answer" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Reveal answer" }));
    expect(screen.getByText("Genetic information")).toBeVisible();
    fireEvent.click(screen.getByRole("radio", { name: "Got it" }));
    fireEvent.click(screen.getByRole("button", { name: /Save and continue/ }));
    expect(screen.getByText("2 saved")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Your response" })).toBeVisible();
  });

  it("uses one quiz destination for recall cards and choices", () => {
    render(<RemainingConceptReview screen="study-library" />);
    expect(screen.getByRole("link", { name: "Quiz" })).toHaveAttribute("href", "/landing-3d/remaining-concept-review/study");
    expect(screen.queryByRole("link", { name: "Flashcards" })).not.toBeInTheDocument();
    expect(screen.queryByText("/study-artifacts/[id]")).not.toBeInTheDocument();
  });

  it("keeps note capture in memory and distinguishes the four input modes", () => {
    render(<RemainingConceptReview screen="notes-new" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Your note" }), { target: { value: "My own words" } });
    fireEvent.click(screen.getByRole("button", { name: /Save note/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Draft saved in this preview only");
    fireEvent.click(screen.getByRole("button", { name: "Voice" }));
    expect(screen.getByText(/microphone permission/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Photo or PDF" }));
    expect(screen.getByText(/Nothing is uploaded/)).toBeVisible();
  });

  it("shows only a neutral unavailable share to an accountless viewer", () => {
    render(<RemainingConceptReview screen="share-unavailable" />);
    expect(screen.getByRole("heading", { name: "This link is unavailable" })).toBeVisible();
    expect(screen.queryByText(/expired|revoked|student name/i)).not.toBeInTheDocument();
  });

  it("does not claim an unavailable token action succeeded", () => {
    render(<RemainingConceptReview screen="early-unsubscribe" />);
    fireEvent.click(screen.getByText("Preview tools"));
    fireEvent.change(screen.getByRole("combobox", { name: "Preview state" }), { target: { value: "attention" } });
    expect(screen.getByRole("heading", { name: "We could not confirm this request" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Email removed" })).not.toBeInTheDocument();
  });

  it("keeps the five student destinations primary and the screen catalog closed", () => {
    render(<RemainingConceptReview screen="study" />);
    const nav = within(screen.getByRole("navigation", { name: "Primary" }));
    expect(nav.getAllByRole("link").map(link => link.textContent)).toEqual(["Lobby", "Work", "Classes", "Calendar", "More"]);
    expect(nav.getByRole("link", { name: "More" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("navigation", { name: "Review screen catalog" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Preview tools"));
    expect(screen.getByRole("navigation", { name: "Review screen catalog" })).toBeVisible();
  });

  it("keeps public and account entry pages out of the student menu", () => {
    render(<RemainingConceptReview screen="public-home" />);
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Public navigation" })).toBeVisible();
    expect(screen.queryByRole("complementary", { name: "More tools" })).not.toBeInTheDocument();
  });

  it("carries keyboard-selected work into quiz setup", () => {
    render(<RemainingConceptReview screen="study" />);
    const initial = screen.getByRole("radio", { name: /Cell structure lab/i });
    fireEvent.keyDown(initial, { key: "ArrowDown" });
    expect(screen.getByRole("radio", { name: /Linear equations/i })).toHaveFocus();
    expect(screen.getByRole("radio", { name: /Linear equations/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("link", { name: "Start quiz" })).toHaveAttribute("href", "/landing-3d/remaining-concept-review/study-new?source=algebra");
  });

  it("reviews the answers actually entered for the selected assignment", () => {
    render(<RemainingConceptReview screen="study-quiz" initialSource="algebra" />);
    fireEvent.click(screen.getByRole("radio", { name: "x = 5" }));
    fireEvent.click(screen.getByRole("button", { name: /Save and continue/ }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Reveal answer" }));
    expect(screen.getByText("Apply the same operation to both sides.")).toBeVisible();
    fireEvent.click(screen.getByRole("radio", { name: "Review again" }));
    fireEvent.click(screen.getByRole("button", { name: /Save and continue/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your response" }), { target: { value: "Subtract four, then divide both sides by two." } });
    fireEvent.click(screen.getByRole("button", { name: /Save and review/ }));
    expect(screen.getByRole("heading", { name: "Your answers", level: 1 })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Your answers", level: 1 })).toHaveFocus();
    expect(screen.getByText("Subtract four, then divide both sides by two.")).toBeVisible();
    expect(screen.getByText("Review again")).toBeVisible();
    expect(screen.getByText("Correct")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(screen.getByText("0 saved")).toBeVisible();
  });

  it("keeps account eligibility visible without creating an account", () => {
    render(<RemainingConceptReview screen="signup" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "student@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "samplepass123" } });
    fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "2020-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("status")).toHaveTextContent("available from age 13");
    expect(screen.queryByText("Account preview only. No account was created.")).not.toBeInTheDocument();
  });

  it("keeps school connection optional after personalization", () => {
    render(<RemainingConceptReview screen="onboarding" />);
    fireEvent.click(screen.getByRole("radio", { name: "Staying focused" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Connect school work" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(screen.getByRole("status")).toHaveTextContent("No profile was saved");
  });
});
