// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SAMPLE_SOURCE, WorkCaptureReview } from "./work-capture-review";

const network = vi.fn();
beforeEach(() => { network.mockReset(); vi.stubGlobal("fetch", network); Element.prototype.scrollIntoView = vi.fn(); vi.spyOn(Storage.prototype, "setItem"); });
afterEach(() => { expect(network).not.toHaveBeenCalled(); expect(Storage.prototype.setItem).not.toHaveBeenCalled(); cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const choose = () => { click("Use sample PDF"); click("Review source"); };

describe("Isolated assignment capture", () => {
  it("starts empty and validates the source without network calls", () => {
    render(<WorkCaptureReview />);
    click("Review source");
    expect(screen.getByRole("alert").textContent).toContain("Choose the sample document");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Use sample PDF" }));
  });
  it("supports the sample source and explicit confirmation without creating an assignment", () => {
    render(<WorkCaptureReview />); choose();
    expect(screen.getByRole("heading", { name: "Make it yours" })).toBeTruthy();
    click("Add to Work");
    expect(screen.getByRole("alert").textContent).toContain("Confirm the details");
    fireEvent.click(screen.getByRole("checkbox")); click("Add to Work");
    expect(screen.getByText("Added to this preview")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open sample workspace" }).getAttribute("href")).toBe("/landing-3d/workspace-concept-review");
    expect(screen.getByText(/No assignment was created/)).toBeTruthy();
    click("Start another preview");
    expect(screen.getByRole("button", { name: "Use sample PDF" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Assignment name optional" }).getAttribute("value")).toBe("");
  });
  it("keeps pasted drafts and selected files across input modes with roving keyboard focus", () => {
    render(<WorkCaptureReview />); click("Use sample PDF");
    const fileTab = screen.getByRole("tab", { name: "Upload file" });
    fireEvent.keyDown(fileTab, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Paste instructions" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Assignment instructions" }), { target: { value: "Write a paragraph about identity." } });
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(screen.getByText("linear-equations.pdf")).toBeTruthy();
    fireEvent.keyDown(fileTab, { key: "ArrowRight" });
    expect((screen.getByRole("textbox", { name: "Assignment instructions" }) as HTMLTextAreaElement).value).toContain("identity");
    expect(document.querySelectorAll('[role="tab"][tabindex="0"]').length).toBe(1);
    expect(document.querySelector('[role="tabpanel"][hidden]')?.hasAttribute("inert")).toBe(true);
  });
  it("preserves raw pasted source and metadata when editing the review", () => {
    render(<WorkCaptureReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Paste instructions" }));
    click("Use sample instructions"); click("Review source");
    fireEvent.change(screen.getByRole("textbox", { name: "Assignment name" }), { target: { value: "Algebra practice" } });
    click("Edit source");
    expect((screen.getByRole("textbox", { name: "Assignment instructions" }) as HTMLTextAreaElement).value).toBe(SAMPLE_SOURCE);
    expect((screen.getByRole("textbox", { name: "Assignment name optional" }) as HTMLInputElement).value).toBe("Algebra practice");
  });
  it("moves focus between the original source and review details without losing inputs", () => {
    render(<WorkCaptureReview />); choose();
    click("View original directions");
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Sample document" }));
    click("Back to details");
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Make it yours" }));
    expect((screen.getByRole("textbox", { name: "Assignment name" }) as HTMLInputElement).value).toBe("Linear Equations");
  });
  it("requires nonempty pasted instructions and title", () => {
    render(<WorkCaptureReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Paste instructions" })); click("Review source");
    expect(screen.getByRole("alert").textContent).toContain("Add the assignment instructions");
    click("Use sample instructions"); click("Review source");
    fireEvent.change(screen.getByRole("textbox", { name: "Assignment name" }), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("checkbox")); click("Add to Work");
    expect(screen.getByRole("alert").textContent).toContain("Add an assignment name");
  });
  it("provides retry recovery and retains source without pretending to extract it", () => {
    render(<WorkCaptureReview />);
    fireEvent.change(screen.getByRole("combobox", { name: "Example state" }), { target: { value: "unavailable" } });
    click("Use sample PDF"); click("Review source");
    expect(screen.getByRole("alert").textContent).toContain("could not be read");
    click("Try again"); click("Review source");
    expect(screen.getByRole("heading", { name: "Make it yours" })).toBeTruthy();
  });
  it("can use pasted input when the file example is unreadable", () => {
    render(<WorkCaptureReview />);
    fireEvent.change(screen.getByRole("combobox", { name: "Example state" }), { target: { value: "unavailable" } });
    fireEvent.click(screen.getByRole("tab", { name: "Paste instructions" })); click("Use sample instructions"); click("Review source");
    expect(screen.getByRole("heading", { name: "Make it yours" })).toBeTruthy();
  });
  it("blocks the no-class case and links only to a classes preview", () => {
    render(<WorkCaptureReview />);
    fireEvent.change(screen.getByRole("combobox", { name: "Example state" }), { target: { value: "no-classes" } });
    click("Use sample PDF"); click("Review source");
    expect(screen.getByRole("alert").textContent).toContain("Choose a class");
    expect(screen.getByRole("link", { name: "Review Classes" }).getAttribute("href")).toBe("/landing-3d/classes-concept-review");
  });
  it("keeps uncertain source visible and set-aside inputs intact", () => {
    render(<WorkCaptureReview />);
    fireEvent.change(screen.getByRole("combobox", { name: "Example state" }), { target: { value: "uncertain" } });
    choose(); expect(screen.getByRole("status").textContent).toContain("closer look");
    click("Set aside for now");
    expect(screen.getByRole("status").textContent).toContain("inputs are still here");
    expect(screen.getByText("linear-equations.pdf")).toBeTruthy();
  });
  it("removes the selected sample file without deleting the title draft", () => {
    render(<WorkCaptureReview />); click("Use sample PDF"); click("Remove sample document");
    expect(screen.queryByText("linear-equations.pdf")).toBeNull();
    expect((screen.getByRole("textbox", { name: "Assignment name optional" }) as HTMLInputElement).value).toBe("Linear Equations");
  });
});
