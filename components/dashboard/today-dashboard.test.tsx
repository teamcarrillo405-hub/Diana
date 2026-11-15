// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TodayDashboard } from "./today-dashboard";
import { buildTodayView, type TodayTask } from "@/lib/dashboard/today-view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const task: TodayTask = { id: "a", title: "History report", subject: "History", color: "#9828ff", minutes: 25, due: "Tomorrow", date: "Sep 10", day: "10", month: "SEP", ready: false, href: "/assignments/a?focus=next-step" };
const empty = () => buildTodayView({ now: new Date("2026-09-09T20:00:00Z"), timeZone: "America/Los_Angeles", ranked: [], assignments: [], weeklyAssignments: [], focusLogs: [], submittedAssignments: [] });

describe("approved live Today dashboard", () => {
  afterEach(cleanup);
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
  });

  it("keeps the approved reading order and uses real assignment and submission links", () => {
    const data = { ...empty(), plan: [task], deadlines: [{ ...task, id: "b", ready: true, href: "/assignments/b/submit", due: "Ready to submit" }] };
    const { container } = render(<TodayDashboard data={data} profile={{ displayName: "Student" }} checkIn={<div>Saved check-in controls</div>} />);
    expect([...container.querySelectorAll('[data-today-dashboard] section[aria-label]')].map(n => n.getAttribute("aria-label"))).toEqual(["Today's Plan", "Study Progress", "Upcoming due dates", "Check-In", "Subject Overview", "Achievements"]);
    expect(screen.getByRole("link", { name: "Start" }).getAttribute("href")).toBe("/assignments/a?focus=next-step");
    expect(within(screen.getByRole("region", { name: "Upcoming due dates" })).getByRole("link", { name: /Ready to submit/ }).getAttribute("href")).toBe("/assignments/b/submit");
    expect(screen.queryByText("Design preview")).toBeNull();
    expect(screen.queryByText("Sample data")).toBeNull();
    expect(container.querySelectorAll('img[src*="today-milestones"]')).toHaveLength(3);
  });

  it("opens all upcoming work without truncating the accessible list", () => {
    const data = { ...empty(), deadlines: Array.from({ length: 6 }, (_, i) => ({ ...task, id: String(i), title: `Assignment ${i}` })) };
    render(<TodayDashboard data={data} profile={{}} checkIn={null} />);
    fireEvent.click(screen.getByRole("button", { name: "View all upcoming work" }));
    expect(within(screen.getByRole("dialog")).getAllByRole("link")).toHaveLength(6);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not disguise missing data as a completed or empty week", () => {
    const data = { ...empty(), assignmentsUnavailable: true, weeklyUnavailable: true, studyUnavailable: true, submissionsUnavailable: true };
    render(<TodayDashboard data={data} profile={{}} checkIn={null} />);
    expect(screen.getByText("Your plan could not load")).toBeTruthy();
    expect(screen.getByText("Your due dates could not load")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Assignment history unavailable" })).toBeTruthy();
    expect(screen.queryByText("Room in your week")).toBeNull();
  });

  it("uses a keyboard-operable stage rail without resetting check-in input", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    });
    const data = { ...empty(), plan: [task] };
    render(<TodayDashboard data={data} profile={{}} checkIn={<input aria-label="Check-in note" defaultValue="Ready" />} />);
    const now = screen.getByRole("tab", { name: "Now" });
    const checkIn = screen.getByRole("tab", { name: "Check-In" });
    expect(now).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(now, { key: "End" });
    expect(screen.getByRole("tab", { name: "Milestones" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Milestones" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(checkIn);
    const input = screen.getByRole("textbox", { name: "Check-in note" });
    fireEvent.change(input, { target: { value: "Focused" } });
    fireEvent.click(screen.getByRole("tab", { name: "Subjects" }));
    fireEvent.click(checkIn);
    expect(screen.getByRole("textbox", { name: "Check-in note" })).toHaveValue("Focused");
  });
});
