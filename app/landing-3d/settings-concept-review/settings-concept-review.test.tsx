// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { SettingsConceptReview } from "./settings-concept-review";
import { SECTIONS, resolveSection } from "./fixtures";

let resize: (() => void) | undefined;
let compact = false;
let detailBelow = false;
const network = vi.fn();
beforeEach(() => {
  compact = false;
  detailBelow = false;
  network.mockReset();
  window.history.replaceState(null, "", "/landing-3d/settings-concept-review");
  vi.stubGlobal("fetch", network);
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    get matches() { return query.includes("1240") ? detailBelow : compact; },
    addEventListener: (_: string, callback: () => void) => { resize = callback; },
    removeEventListener: vi.fn(),
  })));
  vi.spyOn(Storage.prototype, "setItem");
});
afterEach(() => {
  expect(network).not.toHaveBeenCalled();
  expect(Storage.prototype.setItem).not.toHaveBeenCalled();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const open = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));
const apply = () => fireEvent.click(screen.getByRole("button", { name: "Apply changes" }));
const undo = () => fireEvent.click(screen.getByRole("button", { name: "Undo last draft change" }));
const reset = () => fireEvent.click(screen.getByRole("button", { name: "Reset draft to applied settings" }));

describe("Settings options preview", () => {
  it("has ten visible sections, a sample banner, and mounted hidden/inert panels", () => {
    render(<SettingsConceptReview />);
    expect(screen.getByText("DESIGN PREVIEW / SAMPLE SETTINGS")).toBeVisible();
    expect(screen.getAllByRole("tab")).toHaveLength(10);
    expect(screen.queryByRole("tab", { name: "Learning loop" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Privacy" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tabpanel", { hidden: true })).toHaveLength(10);
    for (const section of SECTIONS) {
      open(section.label);
      const tab = screen.getByRole("tab", { name: section.label });
      const panel = screen.getByRole("tabpanel", { name: section.label });
      expect(tab).toHaveAttribute("aria-controls", panel.id);
      expect(panel).toHaveAttribute("aria-labelledby", tab.id);
      expect(panel).not.toHaveAttribute("inert");
      expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
      expect(screen.getAllByRole("tab").filter(item => item.tabIndex === 0)).toEqual([tab]);
      for (const hidden of screen.getAllByRole("tabpanel", { hidden: true }).filter(item => item !== panel)) {
        expect(hidden).toHaveAttribute("hidden");
        expect(hidden).toHaveAttribute("inert");
      }
    }
  });

  it("moves selection and focus together with arrows, Home and End", () => {
    render(<SettingsConceptReview />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Profile" }), { key: "ArrowUp" });
    expect(screen.getByRole("tab", { name: "Sign out" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Appearance" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(screen.getByRole("tabpanel", { name: "Sign out" })).toBeVisible();
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveFocus();
    expect(window.location.search).toBe("?section=profile");
  });

  it("retains profile drafts across sections and viewport orientation changes", () => {
    render(<SettingsConceptReview />);
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Taylor Morgan" } });
    open("Connections & IEP");
    fireEvent.change(screen.getByLabelText("Document name"), { target: { value: "Sample draft" } });
    act(() => { compact = true; resize?.(); });
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "horizontal");
    expect(screen.getByRole("tabpanel", { name: "Connections & IEP" })).toBeVisible();
    open("Profile");
    expect(screen.getByLabelText("Display name")).toHaveValue("Taylor Morgan");
    act(() => { compact = false; resize?.(); });
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
    open("Connections & IEP");
    expect(screen.getByLabelText("Document name")).toHaveValue("Sample draft");
  });

  it("applies only locally and resets to the applied snapshot with undoable reset", () => {
    render(<SettingsConceptReview />);
    const name = screen.getByLabelText("Display name");
    expect(screen.getByRole("button", { name: "Apply changes" })).toBeDisabled();
    fireEvent.change(name, { target: { value: "Applied name" } });
    apply();
    expect(screen.getByText("Applied to preview")).toBeVisible();
    expect(screen.getByRole("button", { name: "Apply changes" })).toBeDisabled();
    fireEvent.change(name, { target: { value: "Draft one" } });
    fireEvent.change(name, { target: { value: "Draft two" } });
    undo();
    expect(name).toHaveValue("Draft one");
    reset();
    expect(name).toHaveValue("Applied name");
    undo();
    expect(name).toHaveValue("Draft one");
    expect(screen.getByText("1 unapplied change")).toBeVisible();
  });

  it("returns invalid profile drafts to the visible field without claiming success", () => {
    render(<SettingsConceptReview />);
    fireEvent.change(screen.getByLabelText("Timezone"), { target: { value: "not-a-timezone" } });
    open("Appearance");
    apply();
    expect(screen.getByLabelText("Timezone")).toHaveFocus();
    expect(screen.getByLabelText("Timezone")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Use a timezone");
    expect(screen.queryByText("Applied to preview")).not.toBeInTheDocument();
  });

  it("keeps accessibility values and the provider-specific voice contracts", () => {
    render(<SettingsConceptReview initialSection="accessibility" />);
    expect(screen.queryByLabelText("Voice provider")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Text to speech"));
    fireEvent.change(screen.getByLabelText("Voice provider"), { target: { value: "openai" } });
    expect(screen.getByLabelText("Voice")).toHaveValue("nova");
    fireEvent.change(screen.getByLabelText("Voice provider"), { target: { value: "elevenlabs" } });
    expect(screen.getByLabelText("ElevenLabs voice")).toHaveValue("EXAVITQu4vr4xnSDxMaL");
    fireEvent.change(screen.getByLabelText("Custom voice ID"), { target: { value: "sample-voice-id" } });
    fireEvent.change(screen.getByLabelText("Reading speed"), { target: { value: "1.15" } });
    open("Profile");
    open("Accessibility");
    expect(screen.getByLabelText("Custom voice ID")).toHaveValue("sample-voice-id");
    expect(screen.getByLabelText("Reading speed")).toHaveValue("1.15");
    fireEvent.change(screen.getByLabelText("Voice provider"), { target: { value: "browser" } });
    expect(screen.queryByLabelText("Custom voice ID")).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("Voice pitch")).getAllByRole("option").map(option => (option as HTMLOptionElement).value)).toEqual(["0.85", "1", "1.15"]);
  });

  it("applies theme, contrast and motion inside the preview root only", () => {
    const documentTheme = document.documentElement.getAttribute("data-theme");
    const { container } = render(<SettingsConceptReview initialSection="appearance" />);
    const root = container.querySelector("[data-settings-preview]")!;
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "light" } });
    expect(root).toHaveAttribute("data-theme", "dark");
    open("Accessibility");
    fireEvent.click(screen.getByLabelText("Reduced motion"));
    fireEvent.click(screen.getByLabelText("High contrast"));
    fireEvent.change(screen.getByLabelText("Font size"), { target: { value: "xlarge" } });
    apply();
    expect(root).toHaveAttribute("data-theme", "light");
    expect(root).toHaveAttribute("data-high-contrast", "true");
    expect(root).toHaveAttribute("data-reduced-motion", "true");
    expect(screen.getByText("Applied reading sample").parentElement).toHaveStyle({ fontSize: "21px" });
    expect(document.documentElement.getAttribute("data-theme")).toBe(documentTheme);
  });

  it("confines accent color to a functional applied swatch", () => {
    render(<SettingsConceptReview initialSection="appearance" />);
    const radio = screen.getByRole("radio", { name: "Diana pink" });
    fireEvent.focus(radio);
    fireEvent.click(radio);
    expect(screen.getByLabelText("Applied accent")).toHaveTextContent("Diana purple");
    apply();
    expect(screen.getByLabelText("Applied accent")).toHaveTextContent("Diana pink");
    open("Profile");
    expect(screen.queryByLabelText("Applied accent")).not.toBeInTheDocument();
    expect(screen.getByText("Applied reading sample").parentElement?.style.getPropertyValue("--sample-accent")).toBe("");
  });

  it("shares one learning draft across both query entry keys without a duplicate tab", () => {
    render(<SettingsConceptReview initialSection={resolveSection("learning-loop")} />);
    expect(screen.getByRole("tabpanel", { name: "Do the work" })).toBeVisible();
    fireEvent.click(screen.getByLabelText("Pause personalization"));
    open("Profile");
    act(() => {
      window.history.replaceState(null, "", "?section=learning-loop");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("tab", { name: "Do the work" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Pause personalization")).toBeChecked();
    expect(screen.getAllByRole("tab")).toHaveLength(10);
  });

  it("covers the reading alias and existing AI export and school-material hash targets", () => {
    render(<SettingsConceptReview initialSection={resolveSection("reading")} />);
    expect(screen.getByRole("tabpanel", { name: "Accessibility" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Export & privacy" }));
    expect(window.location.search).toBe("?section=ai");
    expect(window.location.hash).toBe("#ai-history-export");
    expect(document.getElementById("ai-history-export")).toBeVisible();
    act(() => {
      window.history.replaceState(null, "", "?section=connections#school-materials");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("tabpanel", { name: "Connections & IEP" })).toBeVisible();
    expect(document.getElementById("school-materials")).toBeVisible();
  });

  it("stages goals using only the three real categories and supports undo", () => {
    render(<SettingsConceptReview initialSection="goals" />);
    expect(within(screen.getByLabelText("Category")).getAllByRole("option").map(option => (option as HTMLOptionElement).value)).toEqual(["skill", "consistency", "recovery"]);
    fireEvent.change(screen.getByLabelText("Goal title"), { target: { value: "Sample goal" } });
    open("Profile");
    open("Goals");
    expect(screen.getByLabelText("Goal title")).toHaveValue("Sample goal");
    fireEvent.change(screen.getByLabelText("What progress looks like"), { target: { value: "One paragraph" } });
    fireEvent.change(screen.getByLabelText("Next step"), { target: { value: "Open notes" } });
    fireEvent.click(screen.getByRole("button", { name: "Add sample goal" }));
    expect(screen.getByRole("heading", { name: "Sample goal" })).toBeVisible();
    undo();
    expect(screen.queryByRole("heading", { name: "Sample goal" })).not.toBeInTheDocument();
  });

  it("reviews clearly sample connection scopes and illustrative IEP results without uploading", () => {
    const { container } = render(<SettingsConceptReview initialSection="connections" />);
    fireEvent.click(screen.getByRole("button", { name: "Review scopes for Canvas LMS" }));
    expect(screen.getByRole("list", { name: "Sample access scopes" })).toHaveTextContent("Assignments");
    expect(screen.getByRole("complementary", { name: "Selected option detail" })).toHaveTextContent("Sample school connection");
    fireEvent.change(screen.getByLabelText("Sample connection state"), { target: { value: "empty" } });
    expect(screen.getByText("No school platforms in this sample.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Review sample import" }));
    expect(screen.getByText("Illustrative result, not parsed")).toBeVisible();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /^Connect$/ })).not.toBeInTheDocument();
  });

  it.each([
    ["profile", "Review Profile photo"],
    ["connections", "Review scopes for Canvas LMS"],
    ["connections", "Review sample import"],
  ] as const)("moves compact %s review to detail on click and restores the exact trigger", (section, name) => {
    detailBelow = true;
    render(<SettingsConceptReview initialSection={section} />);
    const detail = screen.getByRole("complementary", { name: "Selected option detail" });
    const trigger = screen.getByRole("button", { name });
    detail.scrollIntoView = vi.fn();
    trigger.scrollIntoView = vi.fn();
    fireEvent.focus(trigger);
    expect(detail.scrollIntoView).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    expect(detail).toHaveFocus();
    expect(detail.scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
    fireEvent.click(screen.getByRole("button", { name: "Back to selected option" }));
    expect(trigger).toHaveFocus();
    expect(trigger.scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "auto" });
    expect(screen.queryByRole("button", { name: "Back to selected option" })).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(detail).toHaveFocus();
  });

  it("never scrolls detail for hover or field focus, and desktop Review leaves focus in place", () => {
    detailBelow = true;
    render(<SettingsConceptReview />);
    const detail = screen.getByRole("complementary", { name: "Selected option detail" });
    detail.scrollIntoView = vi.fn();
    const name = screen.getByLabelText("Display name");
    act(() => name.focus());
    fireEvent.mouseEnter(name.closest("div[data-focused]")!);
    expect(name).toHaveFocus();
    expect(detail.scrollIntoView).not.toHaveBeenCalled();
    detailBelow = false;
    const review = screen.getByRole("button", { name: "Review Profile photo" });
    act(() => review.focus());
    fireEvent.click(review);
    expect(review).toHaveFocus();
    expect(detail.scrollIntoView).not.toHaveBeenCalled();
  });

  it("keeps export and sign out sandboxed, and Study as the existing link only", () => {
    render(<SettingsConceptReview initialSection="ai" />);
    fireEvent.click(screen.getByRole("button", { name: "Review email export" }));
    expect(screen.getByText("Preview only. No export requested and no email sent.")).toBeVisible();
    open("Sign out");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByText("Preview only. Your real session is unchanged.")).toBeVisible();
    open("Study");
    const panel = within(screen.getByRole("tabpanel", { name: "Study" }));
    expect(panel.getByRole("link", { name: "Open Study" })).toHaveAttribute("href", "/landing-3d/remaining-concept-review/study");
    expect(panel.getByText("Quiz")).toBeVisible();
    expect(panel.queryByText("Saved review decks and spaced practice")).not.toBeInTheDocument();
    expect(panel.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(panel.queryByRole("combobox")).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/landing-3d/settings-concept-review");
  });
});
