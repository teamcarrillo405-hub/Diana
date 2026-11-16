// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(screen.queryByRole("progressbar", { name: "Assignments due this week marked done" })).toBeNull();
  });
  it("shows factual work and keeps focus with keyboard selection", () => {
    render(<TodayDashboard data={{ ...empty(), finished: 2, submitted: 1, studied: [0, 15, 20, 0, 0, 0, 0] }} profile={{}} checkIn={null} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Now" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "My Work" })).toHaveFocus();
    expect(within(screen.getByRole("tabpanel", { name: "My Work" })).getByText("Due this week marked done").closest("div")).toHaveTextContent("2");
    expect(screen.getByText("Submitted this week").closest("div")).toHaveTextContent("1");
    expect(screen.getByText("Based on submission date, regardless of due date")).toBeVisible();
    expect(screen.getByText("Marking work done and submitting it are separate steps.")).toBeVisible();
    expect(screen.getByRole("link", { name: /View completed work/ })).toHaveAttribute("href", "/proof");
    expect(screen.queryByText(/badge|trophy|earned/i)).toBeNull();
  });
  it("does not present missing activity as zero", () => {
    render(<TodayDashboard data={{ ...empty(), weeklyUnavailable: true, submissionsUnavailable: true, studyUnavailable: true }} profile={{}} checkIn={null} />);
    fireEvent.click(screen.getByRole("tab", { name: "My Work" }));
    expect(screen.getAllByText("Unavailable")).toHaveLength(2);
  });
  it("keeps due-week and submission availability independent", () => {
    render(<TodayDashboard data={{ ...empty(), finished: 2, submissionsUnavailable: true }} profile={{}} checkIn={null} />);
    fireEvent.click(screen.getByRole("tab", { name: "My Work" }));
    const panel = within(screen.getByRole("tabpanel", { name: "My Work" }));
    expect(panel.getByText("Due this week marked done").closest("div")).toHaveTextContent("2");
    expect(panel.getByText("Submitted this week").closest("div")).toHaveTextContent("Unavailable");
  });
  it("keeps focus data available when due-week data cannot load", () => {
    render(<TodayDashboard data={{ ...empty(), weeklyUnavailable: true, studied: [0, 15, 20, 0, 0, 0, 0] }} profile={{}} checkIn={null} />);
    fireEvent.click(screen.getByRole("tab", { name: "Progress" }));
    expect(screen.getByText("Completion unavailable")).toBeVisible();
    expect(screen.getByText("Completed focus time").closest("div")).toHaveTextContent("35m");
  });
  it("shows completed focus time in Progress and describes session targets accurately", () => {
    render(<TodayDashboard data={{ ...empty(), studied: [0, 15, 20, 0, 0, 0, 0], planned: [0, 20, 30, 0, 0, 0, 0] }} profile={{}} checkIn={null} />);
    fireEvent.click(screen.getByRole("tab", { name: "Progress" }));
    expect(screen.getByText("Completed focus time").closest("div")).toHaveTextContent("35m");
    expect(screen.getByText(/Recorded session target:/)).toHaveTextContent("50m");
    expect(screen.getAllByText(/No assignments due this week/).length).toBeGreaterThan(0);
  });
  it("does not announce an invented focus-session target when history is unavailable", () => {
    render(<TodayDashboard data={{ ...empty(), studyUnavailable: true }} profile={{}} checkIn={null} />);
    fireEvent.click(screen.getByRole("tab", { name: "Progress" }));
    expect(screen.getByText("Focus history unavailable")).toBeVisible();
    expect(screen.getByRole("button", { name: "Mon: focus-session history unavailable" })).toBeVisible();
    expect(screen.queryByText(/0m session target/)).toBeNull();
  });
  it("applies the student's school colors and logo to the Lobby", () => {
    const { container } = render(<TodayDashboard data={empty()} profile={{}} checkIn={null} schoolBranding={{ primaryColor: "#8c1d40", secondaryColor: "#ffc627", logoUrl: "data:image/webp;base64,YWJj" }} />);
    const lobby = container.querySelector<HTMLElement>("[data-today-dashboard]");
    expect(lobby?.style.getPropertyValue("--school-primary")).toBe("#8C1D40");
    expect(lobby?.style.getPropertyValue("--school-primary-text")).toBe("#FFFFFF");
    expect(lobby?.style.getPropertyValue("--school-secondary")).toBe("#FFC627");
    expect(lobby?.style.getPropertyValue("--school-secondary-text")).toBe("#000000");
    expect(screen.getAllByAltText("School logo")).toHaveLength(2);
    expect(container.querySelector("[data-school-scene] img")).toHaveAttribute("src", "data:image/webp;base64,YWJj");
    expect(container.querySelectorAll('img[src="/assets/today-now/campus-building-mark.svg"]')).toHaveLength(0);
    expect(screen.getAllByText(/DIANA\s*CAMPUS/i).length).toBeGreaterThan(0);
  });
  it("shows the campus building in both identity areas when no school logo is provided", () => {
    const { container } = render(<TodayDashboard data={empty()} profile={{}} checkIn={null} />);
    expect(container.querySelectorAll('img[src="/assets/today-now/campus-building-mark.svg"]')).toHaveLength(2);
    expect(container.querySelector("[data-school-scene]")).toBeNull();
  });
  it("chooses readable identity text for dark secondary and light primary colors", () => {
    const { container } = render(<TodayDashboard data={empty()} profile={{}} checkIn={null} schoolBranding={{ primaryColor: "#ffffff", secondaryColor: "#000000" }} />);
    const lobby = container.querySelector<HTMLElement>("[data-today-dashboard]");
    expect(lobby?.style.getPropertyValue("--school-primary-text")).toBe("#000000");
    expect(lobby?.style.getPropertyValue("--school-secondary-text")).toBe("#FFFFFF");
  });
  it("ignores invalid colors while allowing an optional secondary color", () => {
    const { container } = render(<TodayDashboard data={empty()} profile={{}} checkIn={null} schoolBranding={{ primaryColor: "red", secondaryColor: "#121212" }} />);
    const lobby = container.querySelector<HTMLElement>("[data-today-dashboard]");
    expect(lobby).not.toHaveAttribute("data-school-primary");
    expect(lobby?.style.getPropertyValue("--school-primary")).toBe("");
    expect(lobby?.style.getPropertyValue("--school-secondary-text")).toBe("#FFFFFF");
  });
});
