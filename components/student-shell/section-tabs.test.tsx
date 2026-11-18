// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SectionTabs } from "./section-tabs";

const sections = [
  { id: "review", label: "Review", content: <input aria-label="Draft" defaultValue="Saved work" />, continueAction: { label: "Continue to hand in", className: "continue" } },
  { id: "hand-in", label: "Hand in", content: <p>Confirm your hand-in separately.</p> },
];
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

describe("SectionTabs URL continuity", () => {
  it("restores a valid step from the live URL even with an earlier server initial value", () => {
    window.history.replaceState(null, "", "/assignments/a/submit?step=hand-in&calendarReturn=%2Fcalendar");
    render(<SectionTabs id="submission" label="Submission" sections={sections} initial="review" queryKey="step" />);
    expect(screen.getByRole("tab", { name: "Hand in" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Hand in" })).toHaveTextContent("Confirm your hand-in separately.");
  });
  it("persists keyboard and continue navigation, retaining drafts and unrelated return values", () => {
    window.history.replaceState({ __NA: true, marker: "retained" }, "", "/assignments/a/submit?calendarReturn=%2Fcalendar#work");
    render(<SectionTabs id="submission" label="Submission" sections={sections} queryKey="step" />);
    fireEvent.change(screen.getByLabelText("Draft"), { target: { value: "My draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to hand in" }));
    expect(screen.getByRole("tab", { name: "Hand in" })).toHaveFocus();
    expect(new URL(window.location.href).searchParams.get("step")).toBe("hand-in");
    expect(new URL(window.location.href).searchParams.get("calendarReturn")).toBe("/calendar");
    expect(window.location.hash).toBe("#work");
    expect(window.history.state).toEqual({ marker: "retained" });
    fireEvent.keyDown(screen.getByRole("tab", { name: "Hand in" }), { key: "Home" });
    expect(screen.getByLabelText("Draft")).toHaveValue("My draft");
    expect(new URL(window.location.href).searchParams.get("step")).toBe("review");
  });
  it("removes legacy class selection flags without removing the owned assignment return", () => {
    window.history.replaceState(null, "", "/classes/physics?materials=1&rubric=scan&work=lab");
    render(<SectionTabs id="course" label="Course" sections={sections} queryKey="section" clearQueryKeys={["materials", "rubric"]} />);
    fireEvent.click(screen.getByRole("tab", { name: "Hand in" }));
    const query = new URLSearchParams(window.location.search);
    expect(query.get("section")).toBe("hand-in");
    expect(query.get("work")).toBe("lab");
    expect(query.has("materials")).toBe(false);
    expect(query.has("rubric")).toBe(false);
  });
  it("ignores unknown URL selections and follows browser history changes", () => {
    window.history.replaceState(null, "", "/study?step=unknown");
    render(<SectionTabs id="submission" label="Submission" sections={sections} queryKey="step" />);
    expect(screen.getByRole("tab", { name: "Review" })).toHaveAttribute("aria-selected", "true");
    window.history.replaceState(null, "", "/study?step=hand-in");
    fireEvent.popState(window);
    expect(screen.getByRole("tab", { name: "Hand in" })).toHaveAttribute("aria-selected", "true");
  });
  it("leaves the URL alone unless persistence was requested", () => {
    window.history.replaceState(null, "", "/study?step=hand-in");
    render(<SectionTabs id="local" label="Local" sections={sections} />);
    expect(screen.getByRole("tab", { name: "Review" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Hand in" }));
    expect(window.location.search).toBe("?step=hand-in");
  });
});
