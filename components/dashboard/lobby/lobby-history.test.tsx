// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { buildTodayView } from "@/lib/dashboard/today-view";
import { LobbyHistory } from "./lobby-history";

afterEach(cleanup);

it("keeps the sample record read-only while showing its data", () => {
  const data = buildTodayView({ now: new Date("2026-09-09T20:00:00Z"), timeZone: "America/Los_Angeles", ranked: [], assignments: [], weeklyAssignments: [], focusLogs: [], submittedAssignments: [] });
  render(<LobbyHistory data={{ ...data, finished: 2, submitted: 1 }} sample />);
  expect(screen.getByText("Due this week marked done").closest("div")).toHaveTextContent("2");
  expect(screen.getByText("Submitted this week").closest("div")).toHaveTextContent("1");
  expect(screen.getByText("View completed work").closest("a")).toBeNull();
  expect(screen.queryByRole("link", { name: /view completed work/i })).toBeNull();
});
