// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CheckInWeek } from "@/lib/wellness/check-in-week";
import { LobbyCheckInWeek } from "./lobby-check-in-week";

const week: CheckInWeek = {
  days: Array.from({ length: 7 }, (_, index) => ({
    date: `2026-11-${10 + index}`,
    energy: index === 6 ? "low" : null,
    sleepHours: index === 6 ? 0 : null,
    activityMinutes: index === 5 ? 75 : null,
  })),
};

afterEach(cleanup);

describe("Lobby Check-in history", () => {
  it("keeps history collapsed until opened and makes all seven days readable", () => {
    render(<LobbyCheckInWeek week={week} />);
    const summary = screen.getByText("7-day history");
    const disclosure = summary.closest("details");
    expect(disclosure).not.toHaveAttribute("open");
    fireEvent.click(summary);
    expect(disclosure).toHaveAttribute("open");
    const table = within(screen.getByRole("table", { name: "Energy, sleep, and activity for the past seven days" }));
    const columns = table.getAllByRole("columnheader");
    expect(columns).toHaveLength(8);
    expect(columns.at(1)).toHaveAccessibleName("Tuesday, November 10");
    expect(columns.at(-1)).toHaveAccessibleName("Monday, November 16");
    expect(table.getByRole("cell", { name: "Low" })).toBeVisible();
    expect(table.getByRole("cell", { name: "75 minutes" })).toBeVisible();
    expect(table.getByRole("cell", { name: "0 hours" }).querySelector("[data-zero]")).toBeInTheDocument();
    expect(table.getAllByRole("cell", { name: "Not shared" })).toHaveLength(18);
  });

  it("preserves readings when some history is unavailable", () => {
    render(<LobbyCheckInWeek week={{ ...week, unavailable: true }} />);
    fireEvent.click(screen.getByText("7-day history"));
    expect(screen.getByText("Some records couldn’t load.")).toBeVisible();
    expect(screen.getByRole("cell", { name: "75 minutes" })).toBeVisible();
    expect(screen.getAllByRole("cell", { name: "No value available" })).toHaveLength(18);
  });
});
