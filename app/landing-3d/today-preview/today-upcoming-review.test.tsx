// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPreviewData } from "./preview-data";
import { TodayUpcomingReview } from "./today-upcoming-review";

afterEach(cleanup);

describe("Upcoming schedule review", () => {
  it("separates ready work from deadlines and keeps every busy-week assignment reachable", () => {
    const data = getPreviewData("busy");
    const onTask = vi.fn();
    const onViewAll = vi.fn();
    render(<TodayUpcomingReview {...data} onTask={onTask} onViewAll={onViewAll} />);
    const deadlines = screen.getByRole("list", { name: "Deadlines in the next seven days" });
    expect(within(deadlines).getAllByRole("button")).toHaveLength(3);
    expect(within(deadlines).queryByRole("button", { name: /Paragraph evidence/ })).toBeNull();
    const biology = within(deadlines).getByRole("button", { name: /Cell structure/ });
    fireEvent.click(biology);
    expect(onTask).toHaveBeenLastCalledWith(data.deadlines[3], biology);
    const ready = within(screen.getByRole("region", { name: "Ready to submit" })).getByRole("button", { name: /Paragraph evidence check.*Due Sep 10/ });
    expect(ready.getAttribute("aria-haspopup")).toBe("dialog");
    fireEvent.click(ready);
    expect(onTask).toHaveBeenLastCalledWith(data.deadlines[1], ready);
    expect(within(screen.getByRole("region", { name: "Earlier work" })).getByRole("button", { name: /Graphing review/ })).toBeTruthy();
    const all = screen.getByRole("button", { name: "View all upcoming work" });
    fireEvent.click(all);
    expect(onViewAll).toHaveBeenCalledWith(all);
  });

  it("does not expose stale assignments or completion claims when unavailable", () => {
    render(<TodayUpcomingReview {...getPreviewData("unavailable")} onTask={vi.fn()} onViewAll={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toContain("Your schedule is unavailable");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("region", { name: "Ready to submit" })).toBeNull();
    expect(screen.queryByText("Room in your week")).toBeNull();
  });

  it("retains submission review when there are no unfinished deadlines", () => {
    const ready = getPreviewData("typical").deadlines.filter(task => task.ready);
    render(<TodayUpcomingReview deadlines={ready} earlierWork={[]} unavailable={false} onTask={vi.fn()} onViewAll={vi.fn()} />);
    expect(screen.getByText("Room in your week")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Paragraph evidence check/ })).toBeTruthy();
    expect(screen.queryByText(/submitted/i)).toBeNull();
  });
});
