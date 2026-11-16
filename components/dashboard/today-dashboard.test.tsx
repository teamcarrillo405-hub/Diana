// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TodayDashboard } from "./today-dashboard";
import { buildTodayView, type TodayTask } from "@/lib/dashboard/today-view";
import { useLobbyCheckInCompletion } from "./lobby/lobby-check-in-completion";
import type { LobbyRecommendation } from "@/lib/dashboard/lobby-recommendation";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
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
    expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual(["Now", "Check-in", "This Week"]);
    expect(container.querySelectorAll("#main-content")).toHaveLength(1);
    expect(container.querySelectorAll("[data-campus-art]")).toHaveLength(1);
    expect(container.querySelector("[data-today-stage-image] img, [data-today-stage-image] video")).toBeNull();
    expect(screen.queryByText(/sample data|local preview/i)).toBeNull();
  });
  it("keeps check-in in its own optional tab and retains a draft when the student leaves", () => {
    render(<TodayDashboard data={{ ...empty(), plan: [task] }} profile={{}} checkIn={<input aria-label="Check-in note" defaultValue="Ready" />} />);
    const now = within(screen.getByRole("tabpanel", { name: "Now" }));
    expect(now.queryByRole("button", { name: "Check-in" })).toBeNull();
    expect(now.getByRole("link", { name: "Start" })).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "Check-in" }));
    const checkIn = within(screen.getByRole("tabpanel", { name: "Check-in" }));
    expect(checkIn.getByText("Optional")).toBeVisible();
    fireEvent.change(checkIn.getByRole("textbox", { name: "Check-in note" }), { target: { value: "Focused" } });
    fireEvent.click(screen.getByRole("tab", { name: "Now" }));
    fireEvent.click(screen.getByRole("tab", { name: "Check-in" }));
    expect(screen.getByRole("textbox", { name: "Check-in note" })).toHaveValue("Focused");
  });

  it("shows the merged weekly summary and keeps focus with keyboard selection", () => {
    render(<TodayDashboard data={{ ...empty(), total: 3, finished: 2, submitted: 1, studied: [0, 15, 20, 0, 0, 0, 0] }} profile={{}} checkIn={null} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Now" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "This Week" })).toHaveFocus();
    const week = within(screen.getByRole("tabpanel", { name: "This Week" }));
    expect(week.getByText("Due this week marked done").closest("div")).toHaveTextContent("2 / 3");
    expect(week.getByText("Submitted this week").closest("div")).toHaveTextContent("1");
    expect(week.getByText("Completed focus time").closest("div")).toHaveTextContent("35m");
    expect(week.getAllByRole("link", { name: "View completed work" })).toHaveLength(1);
  });

  it("returns to Now after saving and explains only a confirmed recommendation change", () => {
    const shortened = { ...task, id: "b", title: "Short reading", minutes: 10 };
    const before: LobbyRecommendation = { energy: "medium", signalId: null, topByEnergy: { low: "b", medium: "a", high: "a" } };
    const after: LobbyRecommendation = { ...before, energy: "low", signalId: "27" };
    function SavedCheckInButton() {
      const complete = useLobbyCheckInCompletion();
      return <button onClick={() => complete?.("low", "27")}>Simulate save</button>;
    }
    const checkIn = <SavedCheckInButton />;
    const { rerender } = render(<TodayDashboard data={{ ...empty(), plan: [task] }} profile={{}} checkIn={checkIn} recommendation={before} />);
    fireEvent.click(screen.getByRole("tab", { name: "Check-in" }));
    fireEvent.click(screen.getByRole("button", { name: "Simulate save" }));
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.getByRole("tabpanel", { name: "Now" })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Check-in saved.");
    rerender(<TodayDashboard data={{ ...empty(), plan: [shortened] }} profile={{}} checkIn={checkIn} recommendation={after} />);
    expect(screen.getByRole("heading", { name: "Short reading" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Diana moved this shorter assignment up because you reported low energy.");
    // The same energy and task from a different save must not receive credit.
    rerender(<TodayDashboard data={{ ...empty(), plan: [shortened] }} profile={{}} checkIn={checkIn} recommendation={{ ...after, signalId: "28" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Check-in saved.");
  });
  it("applies the student's school colors and logo to the Lobby", () => {
    const { container } = render(<TodayDashboard data={empty()} profile={{}} checkIn={null} schoolBranding={{ name: "Tigard High School", primaryColor: "#8c1d40", secondaryColor: "#ffc627", logoUrl: "data:image/webp;base64,YWJj" }} />);
    const lobby = container.querySelector<HTMLElement>("[data-today-dashboard]");
    expect(lobby?.style.getPropertyValue("--school-primary")).toBe("#8C1D40");
    expect(lobby?.style.getPropertyValue("--school-primary-text")).toBe("#FFFFFF");
    expect(lobby?.style.getPropertyValue("--school-secondary")).toBe("#FFC627");
    expect(lobby?.style.getPropertyValue("--school-secondary-text")).toBe("#000000");
    const schoolLogos = [...container.querySelectorAll('img[src="data:image/webp;base64,YWJj"]')];
    expect(schoolLogos).toHaveLength(2);
    expect(schoolLogos.every(logo => Boolean(logo.closest("[data-school-scene]")))).toBe(true);
    expect(container.querySelector("[data-today-stage-rail] img")).toBeNull();
    expect(screen.queryByText(/your personalized/i)).toBeNull();
    expect(screen.getAllByText("Tigard Campus")).toHaveLength(2);
  });
  it("keeps the campus name when no school logo is provided", () => {
    const { container } = render(<TodayDashboard data={empty()} profile={{}} checkIn={null} />);
    expect(screen.getAllByText("Diana Campus")).toHaveLength(2);
    expect(container.querySelector("[data-today-stage-rail] img")).toBeNull();
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
