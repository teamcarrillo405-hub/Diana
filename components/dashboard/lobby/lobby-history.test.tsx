// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { buildTodayView } from "@/lib/dashboard/today-view";
import { LobbyHistory } from "./lobby-history";

afterEach(cleanup);

it("keeps the sample record read-only while showing its data", () => {
  const data = buildTodayView({ now: new Date("2026-09-09T20:00:00Z"), timeZone: "America/Los_Angeles", ranked: [], assignments: [], weeklyAssignments: [], focusLogs: [], submittedAssignments: [] });
  const { container } = render(<LobbyHistory data={{ ...data, finished: 2, submitted: 1, weekRecords: [{ id: "sample", title: "Sample essay", subject: "English", status: "Marked done", timing: "Due Thu, Sep 10", href: "/assignments/sample" }] }} sample logoUrl="/sample-school-mark.png" />);
  expect(screen.getByText("Due this week marked done").closest("div")).toHaveTextContent("2");
  expect(screen.getByText("Submitted this week").closest("div")).toHaveTextContent("1");
  expect(screen.getByText("View completed work").closest("a")).toBeNull();
  expect(screen.queryByRole("link", { name: /view completed work/i })).toBeNull();
  expect(screen.getByText("Sample essay").closest("a")).toBeNull();
  expect(container.querySelector('img[src="/sample-school-mark.png"]')?.parentElement).toHaveAttribute("aria-hidden", "true");
});

it("renders the student's assignment link and clearly distinguishes partially unavailable records", () => {
  const data = buildTodayView({ now: new Date("2026-09-09T20:00:00Z"), timeZone: "America/Los_Angeles", ranked: [], assignments: [], weeklyAssignments: [{ id: "my-work", title: "History notes", status: "done", due_at: "2026-09-10T19:00:00Z", estimated_minutes: 20, classes: { name: "History" } }], focusLogs: [], submittedAssignments: null });
  render(<LobbyHistory data={data} />);
  expect(screen.getByRole("link", { name: /History notes/ })).toHaveAttribute("href", "/assignments/my-work");
  expect(screen.getByText("Marked done")).toBeVisible();
  expect(screen.getByText(/Some assignment records are unavailable/)).toBeVisible();
  expect(screen.queryByText(/No assignments due or submitted/)).toBeNull();
});
