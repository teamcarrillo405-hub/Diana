// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MoreConceptReview } from "./more-concept-review";
import { MORE_SECTIONS } from "./destinations";

let resize: (() => void) | undefined;
let compact = false;
beforeEach(() => {
  compact = false;
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    get matches() { return compact; },
    addEventListener: (_: string, callback: () => void) => { resize = callback; },
    removeEventListener: vi.fn(),
  })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("More game-menu preview", () => {
  it("opens Study tools with four categories and only one accessible panel", () => {
    render(<MoreConceptReview />);
    expect(screen.getByRole("heading", { name: "More", level: 1 })).toBeVisible();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "Study tools" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("search", { name: "Search Diana" })).toHaveAttribute("action", "/landing-3d/remaining-concept-review/search");
    expect(screen.getByRole("link", { name: "Quiz" })).toHaveAttribute("href", "/landing-3d/remaining-concept-review/study");
    expect(screen.queryByRole("link", { name: "Flashcards" })).not.toBeInTheDocument();
    expect(screen.getByText("LOCAL PREVIEW")).toBeVisible();
  });

  it("supports arrow wrapping, Home, and End with selection and focus together", () => {
    render(<MoreConceptReview />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Study tools" }), { key: "ArrowUp" });
    expect(screen.getByRole("tab", { name: "Account" })).toHaveFocus();
    expect(screen.getByRole("tabpanel", { name: "Account" })).toBeVisible();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Account" }), { key: "ArrowDown" });
    expect(screen.getByRole("tab", { name: "Study tools" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Study tools" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Record" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Record" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "Account" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Account" }), { key: "Home" });
    expect(screen.getByRole("tab", { name: "Study tools" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Study tools" }), { key: "Tab" });
    expect(screen.getByRole("tab", { name: "Study tools" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps tab-panel relationships and hidden panels inert", () => {
    render(<MoreConceptReview />);
    for (const section of MORE_SECTIONS) {
      const tab = screen.getByRole("tab", { name: section.title });
      fireEvent.click(tab);
      const panel = screen.getByRole("tabpanel", { name: section.title });
      expect(tab).toHaveAttribute("aria-controls", panel.id);
      expect(panel).toHaveAttribute("aria-labelledby", tab.id);
      expect(panel).not.toHaveAttribute("inert");
      expect(screen.getAllByRole("tab").filter(item => item.tabIndex === 0)).toEqual([tab]);
      for (const inactive of screen.getAllByRole("tabpanel", { hidden: true }).filter(item => item !== panel)) {
        expect(inactive).toHaveAttribute("hidden");
        expect(inactive).toHaveAttribute("inert");
      }
    }
  });

  it("preserves the search draft between category visits and clears with focus", () => {
    render(<MoreConceptReview />);
    const input = screen.getByRole("searchbox", { name: "Search" });
    fireEvent.change(input, { target: { value: "Biology & notes" } });
    fireEvent.click(screen.getByRole("tab", { name: "Record" }));
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Study tools" }));
    expect(input).toHaveValue("Biology & notes");
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("method", "get");
    expect(new FormData(form as HTMLFormElement).get("q")).toBe("Biology & notes");
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  it("connects the More tools to review destinations and groups preferences in Settings", () => {
    render(<MoreConceptReview />);
    for (const section of MORE_SECTIONS) {
      fireEvent.click(screen.getByRole("tab", { name: section.title }));
      const panel = within(screen.getByRole("tabpanel", { name: section.title }));
      expect(panel.getAllByRole("link")).toHaveLength(section.links.length);
      for (const link of section.links) expect(panel.getByRole("link", { name: link.label })).toHaveAttribute("href", link.href);
    }
    expect(screen.getByRole("link", { name: "Sharing" })).toHaveAttribute("href", "/landing-3d/remaining-concept-review/sharing");
    expect(within(screen.getByRole("tabpanel", { name: "Account" })).getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/landing-3d/settings-concept-review");
  });

  it("changes orientation on phone widths without losing selection or input", () => {
    render(<MoreConceptReview />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "History" } });
    fireEvent.click(screen.getByRole("tab", { name: "Wellness" }));
    act(() => { compact = true; resize?.(); });
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "horizontal");
    expect(screen.getByRole("tabpanel", { name: "Wellness" })).toBeVisible();
    act(() => { compact = false; resize?.(); });
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
    fireEvent.click(screen.getByRole("tab", { name: "Study tools" }));
    expect(screen.getByRole("searchbox")).toHaveValue("History");
  });

  it("defaults to Study tools on a fresh visit and marks only More current", () => {
    const { unmount } = render(<MoreConceptReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Account" }));
    unmount();
    render(<MoreConceptReview />);
    expect(screen.getByRole("tab", { name: "Study tools" })).toHaveAttribute("aria-selected", "true");
    const nav = within(screen.getByRole("navigation", { name: "Primary" }));
    expect(nav.getByRole("link", { name: "More" })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("link", { name: "Lobby" })).toHaveAttribute("href", "/landing-3d/today-now-assets?character=relit");
    expect(nav.getByRole("link", { name: "More" })).toHaveAttribute("href", "/landing-3d/more-concept-review");
  });
});
