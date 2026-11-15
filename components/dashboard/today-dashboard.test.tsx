// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TodayDashboard } from "./today-dashboard";
import { buildTodayView, type TodayTask } from "@/lib/dashboard/today-view";
import { createAchievementLedger } from "@/lib/dashboard/achievements";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./lobby/diana-idle-character", () => ({ DianaIdleCharacter: () => <div aria-hidden="true" /> }));
vi.mock("./lobby/diana-weekly-trophy", () => ({ DianaWeeklyTrophy: () => <div aria-hidden="true" /> }));
const task: TodayTask = { id: "a", title: "History report", subject: "History", color: "#9828ff", minutes: 25, due: "Tomorrow", date: "Sep 10", day: "10", month: "SEP", ready: false, href: "/assignments/a/workspace" };
const empty = () => buildTodayView({ now: new Date("2026-09-09T20:00:00Z"), timeZone: "America/Los_Angeles", ranked: [], assignments: [], weeklyAssignments: [], focusLogs: [], submittedAssignments: [] });

describe("connected Lobby", () => {
  afterEach(cleanup);
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  });
  it("opens the real workspace and keeps the approved three-category menu", () => {
    const { container } = render(<TodayDashboard data={{ ...empty(), plan: [task] }} profile={{}} checkIn={null} />);
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("href", "/assignments/a/workspace");
    expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual(["Now", "Progress", "Achievements"]);
    expect(container.querySelectorAll("#main-content")).toHaveLength(1);
    expect(screen.queryByText(/sample data|local preview/i)).toBeNull();
  });
  it("retains check-in input across dialog close and reopen", () => {
    render(<TodayDashboard data={empty()} profile={{}} checkIn={<input aria-label="Check-in note" defaultValue="Ready" />} />);
    fireEvent.click(screen.getByRole("button", { name: "Check-in" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Check-in note" }), { target: { value: "Focused" } });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Check-in" }));
    expect(screen.getByRole("textbox", { name: "Check-in note" })).toHaveValue("Focused");
  });
  it("keeps unavailable progress separate from a completed week", () => {
    render(<TodayDashboard data={{ ...empty(), assignmentsUnavailable: true, weeklyUnavailable: true, studyUnavailable: true }} profile={{}} checkIn={null} />);
    expect(screen.getByRole("heading", { name: "Your plan could not load" })).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "Progress" }));
    expect(screen.getByText("Completion unavailable")).toBeVisible();
    expect(screen.queryByRole("progressbar", { name: "Weekly assignments complete" })).toBeNull();
  });
  it("renders badges from account events and keeps focus with keyboard selection", () => {
    const ledger = createAchievementLedger([{ id: "real-assignment", kind: "work", occurredAt: "2026-09-09T18:00:00Z" }]);
    render(<TodayDashboard data={empty()} profile={{}} checkIn={null} achievementLedger={ledger} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Now" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "Achievements" })).toHaveFocus();
    expect(screen.getByRole("button", { name: /^First Finish\. Earned/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /^First Check-In\. 0 of 1/ })).toBeVisible();
  });
});
