// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TodayWeekReview } from "./today-progress-review";

afterEach(cleanup);

const planned = [45, 60, 60, 45, 60, 30, 0];
const studied = [45, 55, 35, 0, 0, 0, 0];

describe("Weekly game-menu performance", () => {
  it("keeps the assignment ratio and time totals distinct", () => {
    render(<TodayWeekReview completed={5} total={8} planned={planned} studied={studied} unavailable={false} />);
    expect(screen.getByRole("img", { name: "5 of 8 assignments complete, 63%" })).toBeTruthy();
    expect(screen.getByText("2h 15m")).toBeTruthy();
    expect(screen.getByText("/ 5h planned")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Weekly study activity" })).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(7);
    const sunday = screen.getByRole("button", { name: "Sun: 0 minutes planned, 0 minutes studied" });
    fireEvent.focus(sunday);
    expect(sunday.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector("[aria-live=polite]")?.textContent).toBe("Sun 0m planned / 0m studied");
  });

  it("does not paint stale completed study time when history is unavailable", () => {
    render(<TodayWeekReview completed={5} total={8} planned={planned} studied={studied} unavailable />);
    expect(screen.getByRole("img", { name: "Assignment history unavailable" }).querySelectorAll("circle")).toHaveLength(1);
    expect(screen.queryByText("2h 15m")).toBeNull();
    expect(screen.getByText("Study history temporarily unavailable.")).toBeTruthy();
    const monday = screen.getByRole("button", { name: "Mon: 45 minutes planned, study time unavailable" });
    expect((monday.querySelector("[data-runway-studied]") as HTMLElement).style.height).toBe("0%");
  });

  it("distinguishes an empty week from a completed week", () => {
    const { rerender } = render(<TodayWeekReview completed={0} total={0} planned={planned.map(() => 0)} studied={studied.map(() => 0)} unavailable={false} />);
    expect(screen.getByRole("img", { name: "No assignments planned this week" })).toBeTruthy();
    expect(screen.getByText("No assignments planned this week.")).toBeTruthy();
    rerender(<TodayWeekReview completed={8} total={8} planned={planned} studied={[90, 90, 120, 0, 0, 0, 0]} unavailable={false} />);
    expect(screen.getByRole("img", { name: "8 of 8 assignments complete, 100%" })).toBeTruthy();
    expect(screen.queryByText("No assignments planned this week.")).toBeNull();
  });
});
