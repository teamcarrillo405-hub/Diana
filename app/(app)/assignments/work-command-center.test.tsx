// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WorkCommandCenter, type WorkCommandItem } from "./work-command-center";

const item = (id: string, patch: Partial<WorkCommandItem> = {}): WorkCommandItem => ({ id, title: `Assignment ${id}`, className: "History", classColor: "#8b96bd", dueAt: "2026-09-24T21:00:00Z", minutes: 25, kind: "essay", status: "todo", reasons: [], ...patch });
const renderWork = (assignments: WorkCommandItem[], props: { studentId?: string; restoreContext?: boolean } = {}) => render(<WorkCommandCenter assignments={assignments} nowIso="2026-09-24T12:00:00Z" timeZone="America/Los_Angeles" {...props} />);
afterEach(() => { cleanup(); sessionStorage.clear(); });

describe("connected Work collection", () => {
  it("opens the selected assignment's saved workspace", () => {
    renderWork([item("a"), item("b", { status: "drafting", title: "Cell notes", className: "Biology" })]);
    expect(screen.getByRole("link", { name: "Start Assignment a" })).toHaveAttribute("href", "/assignments/a/workspace");
    fireEvent.click(screen.getByRole("tab", { name: /Cell notes/ }));
    expect(screen.getByRole("link", { name: "Resume Cell notes" })).toHaveAttribute("href", "/assignments/b/workspace");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("keeps review, handoff, and submitted records distinct", () => {
    renderWork([item("a", { status: "checking" }), item("b", { status: "exporting" }), item("c", { status: "submitted" })]);
    fireEvent.click(screen.getByRole("button", { name: /^Review 1/ }));
    expect(screen.getByRole("link", { name: "Review work Assignment a" })).toHaveAttribute("href", "/assignments/a/workspace");
    fireEvent.click(screen.getByRole("button", { name: /^Ready to submit 1/ }));
    expect(screen.getByRole("link", { name: "Review submission Assignment b" })).toHaveAttribute("href", "/assignments/b/submit");
    fireEvent.click(screen.getByRole("button", { name: /^Submitted 1/ }));
    expect(screen.getByRole("link", { name: "View submission Assignment c" })).toHaveAttribute("href", "/assignments/c/submit");
  });
  it("makes undated assignments and filtered subjects reachable", () => {
    renderWork([item("a"), item("b", { dueAt: null, title: "Cell notes", className: "Biology" })]);
    fireEvent.click(screen.getByRole("button", { name: "No due date" }));
    expect(screen.getByRole("link", { name: "Start Cell notes" })).toHaveAttribute("href", "/assignments/b/workspace");
    expect(screen.queryByRole("tab", { name: /Assignment a/ })).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "Find assignment" }), { target: { value: "Assignment a" } });
    expect(screen.getByRole("link", { name: "Start Assignment a" })).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "Subject" }), { target: { value: "Biology" } });
    expect(screen.getByRole("heading", { name: "No matching assignments" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(within(screen.getByRole("tablist", { name: "Choose assignment" })).getAllByRole("tab")).toHaveLength(2);
  });
  it("moves focus with keyboard selection and provides a capture path when empty", () => {
    const { unmount } = renderWork([item("a"), item("b")]);
    fireEvent.keyDown(screen.getByRole("tab", { name: /Assignment a/ }), { key: "End" });
    expect(screen.getByRole("tab", { name: /Assignment b/ })).toHaveFocus();
    expect(screen.getByRole("link", { name: "Start Assignment b" })).toHaveAttribute("href", "/assignments/b/workspace");
    unmount(); renderWork([]);
    expect(screen.getByRole("heading", { name: "No assignments yet" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Add assignment" }).every(link => link.getAttribute("href") === "/quick-add")).toBe(true);
  });
  it("clears a hidden date selection when browsing another week and omits unknown estimates", () => {
    renderWork([item("a", { minutes: null }), item("b", { dueAt: null })]);
    fireEvent.click(screen.getByText("Any due date"));
    fireEvent.click(screen.getByRole("button", { name: /Thursday, September 24/ }));
    expect(screen.queryByRole("tab", { name: /Assignment b/ })).toBeNull();
    expect(screen.queryByText("Estimated work")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("tab", { name: /Assignment b/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "All dates" })).toHaveAttribute("aria-pressed", "true");
  });
  it("restores the student's saved Work status, search and choice only on return", () => {
    const assignments = [item("a"), item("b", { status: "checking", title: "Notes to review" })];
    const { unmount } = renderWork(assignments, { studentId: "student-a" });
    fireEvent.click(screen.getByRole("button", { name: "Review 1" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Find assignment" }), { target: { value: "Notes" } });
    fireEvent.click(screen.getByRole("link", { name: "Review work Notes to review" }));
    unmount();
    const returned = renderWork(assignments, { studentId: "student-a", restoreContext: true });
    expect(screen.getByRole("textbox", { name: "Find assignment" })).toHaveValue("Notes");
    expect(screen.getByRole("link", { name: "Review work Notes to review" })).toBeVisible();
    returned.unmount();
    renderWork(assignments, { studentId: "student-b", restoreContext: true });
    expect(screen.getByRole("textbox", { name: "Find assignment" })).toHaveValue("");
    expect(screen.getByRole("link", { name: "Start Assignment a" })).toBeVisible();
  });
});
