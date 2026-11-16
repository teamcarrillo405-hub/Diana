// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildTodayView, TODAY_WEEK_RECORD_LIMIT } from "@/lib/dashboard/today-view";
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
    const assignment = screen.getByRole("link", { name: /History notes/ });
    expect(assignment).toHaveAttribute("href", "/assignments/one");
    expect(assignment.compareDocumentPosition(screen.getByLabelText("Weekly summary")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "View completed work" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "View completed work" })).toHaveAttribute("href", "/proof");
    expect(screen.queryByRole("link", { name: "View all work" })).toBeNull();
    expect(screen.getByText(/marking done and submitting are separate steps/i)).not.toBeVisible();
  });

  it("reveals interactive study activity only on request", () => {
    render(<LobbyThisWeek data={{ ...fixture(), planned: [20, 0, 0, 0, 0, 0, 0], studied: [15, 0, 0, 0, 0, 0, 0] }} />);
    const disclosure = screen.getByText("Study details").closest("details");
    expect(disclosure).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Study details"));
    expect(disclosure).toHaveAttribute("open");
    expect(screen.getByText(/marking done and submitting are separate steps/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Mon: 20 minutes session target, 15 minutes completed" }));
    expect(screen.getByText(/Mon.*session target/)).toHaveTextContent("20m session target / 15m completed");
  });

  it("links to all work at the list limit and keeps the sample links noninteractive", () => {
    const data = { ...fixture(), weekRecords: Array.from({ length: TODAY_WEEK_RECORD_LIMIT }, (_, index) => ({
      id: `sample-${index}`, title: `Sample essay ${index + 1}`, subject: "English", status: "Marked done",
      timing: "Due Thursday", href: `/assignments/sample-${index}`,
    })) };
    const { rerender } = render(<LobbyThisWeek data={data} />);
    expect(screen.getByRole("link", { name: "View all work" })).toHaveAttribute("href", "/assignments");
    rerender(<LobbyThisWeek sample data={data} />);
    expect(screen.getByText("Sample essay 1").closest("a")).toBeNull();
    expect(screen.queryByRole("link", { name: /view all work/i })).toBeNull();
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
