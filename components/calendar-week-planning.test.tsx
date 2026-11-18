// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarWeekPlanning } from "@/app/(app)/calendar/calendar-week-planning";

vi.mock("@/app/(app)/calendar/planning-actions", () => ({ saveCalendarWeekPlan: vi.fn() }));
afterEach(cleanup);

describe("weekly capacity comparisons", () => {
  it("does not claim spare capacity when assignments have no estimate", () => {
    render(<CalendarWeekPlanning weekStart="2026-11-16" estimatedMinutes={0} plannedMinutes={30} initialAvailableMinutes={330} unknownEstimateCount={2} />);
    expect(screen.getByText("Time estimates are still needed for 2 assignments.")).toBeTruthy();
    expect(screen.queryByText(/available beyond the estimated work/)).toBeNull();
    expect(screen.getByText("Not set")).toBeTruthy();
  });
  it("compares known work to the student's entered time", () => {
    render(<CalendarWeekPlanning weekStart="2026-11-16" estimatedMinutes={90} plannedMinutes={30} initialAvailableMinutes={60} />);
    expect(screen.getByText(/30m more work estimated than the time you entered/)).toBeTruthy();
  });
  it("does not give a capacity conclusion from an unavailable feed", () => {
    render(<CalendarWeekPlanning weekStart="2026-11-16" estimatedMinutes={0} plannedMinutes={0} initialAvailableMinutes={330} unavailable />);
    expect(screen.getByRole("status").textContent).toContain("totals may be incomplete");
    expect(screen.queryByText(/available beyond the estimated work/)).toBeNull();
  });
});
