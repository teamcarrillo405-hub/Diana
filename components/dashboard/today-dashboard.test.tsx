// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TodayDashboard } from "./today-dashboard";
import { buildTodayView, type TodayTask } from "@/lib/dashboard/today-view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./lobby/diana-idle-character", () => ({ DianaIdleCharacter: () => <div aria-hidden="true" /> }));
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
    expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual(["Now", "Progress", "My Work"]);
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
  it("shows factual work and keeps focus with keyboard selection", () => {
    render(<TodayDashboard data={{ ...empty(), finished: 2, submitted: 1, studied: [0, 15, 20, 0, 0, 0, 0] }} profile={{}} checkIn={null} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Now" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "My Work" })).toHaveFocus();
    expect(screen.getByText("Work marked done").closest("div")).toHaveTextContent("2");
    expect(screen.getByText("Submitted").closest("div")).toHaveTextContent("1");
    expect(screen.getByText("Study time").closest("div")).toHaveTextContent("35m");
    expect(screen.getByText("Marking work done and submitting it are separate steps.")).toBeVisible();
    expect(screen.getByRole("link", { name: /View completed work/ })).toHaveAttribute("href", "/proof");
    expect(screen.queryByText(/badge|trophy|earned/i)).toBeNull();
  });
  it("does not present missing activity as zero", () => {
    render(<TodayDashboard data={{ ...empty(), weeklyUnavailable: true, submissionsUnavailable: true, studyUnavailable: true }} profile={{}} checkIn={null} />);
    fireEvent.click(screen.getByRole("tab", { name: "My Work" }));
    expect(screen.getAllByText("Unavailable")).toHaveLength(3);
  });
});
