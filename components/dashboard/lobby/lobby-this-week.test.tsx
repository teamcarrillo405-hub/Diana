// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildTodayView } from "@/lib/dashboard/today-view";
import { LobbyThisWeek } from "./lobby-this-week";

const fixture = () => buildTodayView({
  now: new Date("2026-09-09T20:00:00Z"), timeZone: "America/Los_Angeles",
  ranked: [], assignments: [], weeklyAssignments: [], focusLogs: [], submittedAssignments: [],
});
afterEach(cleanup);

describe("This Week", () => {
  it("shows each factual summary once and keeps the student's record and completed-work links", () => {
    render(<LobbyThisWeek data={{
      ...fixture(), finished: 2, total: 3, submitted: 1,
      studied: [15, 0, 0, 0, 0, 0, 0], planned: [20, 0, 0, 0, 0, 0, 0],
      weekRecords: [{ id: "one", title: "History notes", subject: "History", status: "Marked done", timing: "Due Thu, Sep 10", href: "/assignments/one" }],
    }} />);
    expect(screen.getAllByText("Due this week marked done")).toHaveLength(1);
    expect(screen.getAllByText("Submitted this week")).toHaveLength(1);
    expect(screen.getByText("Due this week marked done").closest("div")).toHaveTextContent("2 / 3");
    expect(screen.getByText("Submitted this week").closest("div")).toHaveTextContent("1");
    expect(screen.getByText("Completed focus time").closest("div")).toHaveTextContent("15m");
    expect(screen.getByRole("link", { name: /History notes/ })).toHaveAttribute("href", "/assignments/one");
    expect(screen.getAllByRole("link", { name: "View completed work" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "View completed work" })).toHaveAttribute("href", "/proof");
    expect(screen.getByText(/marking done and submitting are separate steps/i)).toBeVisible();
  });

  it("reveals interactive study activity only on request", () => {
    render(<LobbyThisWeek data={{ ...fixture(), planned: [20, 0, 0, 0, 0, 0, 0], studied: [15, 0, 0, 0, 0, 0, 0] }} />);
    const disclosure = screen.getByText("Study details").closest("details");
    expect(disclosure).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Study details"));
    expect(disclosure).toHaveAttribute("open");
    fireEvent.click(screen.getByRole("button", { name: "Mon: 20 minutes session target, 15 minutes completed" }));
    expect(screen.getByText(/Mon.*session target/)).toHaveTextContent("20m session target / 15m completed");
  });

  it("keeps sample records and completed-work action noninteractive", () => {
    render(<LobbyThisWeek sample data={{ ...fixture(), weekRecords: [{ id: "sample", title: "Sample essay", subject: "English", status: "Marked done", timing: "Due Thursday", href: "/assignments/sample" }] }} />);
    expect(screen.getByText("Sample essay").closest("a")).toBeNull();
    expect(screen.queryByRole("link", { name: /view completed work/i })).toBeNull();
  });

  it("separates empty data from unavailable records", () => {
    const { rerender } = render(<LobbyThisWeek data={fixture()} />);
    expect(screen.getByText("No assignments due or submitted this week.")).toBeVisible();
    rerender(<LobbyThisWeek data={{ ...fixture(), weeklyUnavailable: true, submissionsUnavailable: true, studyUnavailable: true }} />);
    expect(screen.queryByText("No assignments due or submitted this week.")).toBeNull();
    expect(screen.getByText("Some assignment records are unavailable right now.")).toBeVisible();
    expect(screen.getAllByText("Unavailable")).toHaveLength(3);
  });
});
