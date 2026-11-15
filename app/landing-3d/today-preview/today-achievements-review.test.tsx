// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAchievements } from "@/lib/dashboard/achievements";
import { seedPreviewAchievements } from "./use-preview-achievements";
import { getPreviewWeeklyAward } from "./use-preview-weekly-award";
import { AchievementDetails, TodayAchievementsReview } from "./today-achievements-review";

vi.mock("./diana-weekly-trophy", () => ({ DianaWeeklyTrophy: ({ earned }: { earned: boolean }) => <div data-trophy data-earned={earned} aria-hidden="true" /> }));
afterEach(cleanup);
const typical = () => ({ achievements: getAchievements(seedPreviewAchievements("typical")), weeklyAward: getPreviewWeeklyAward("typical"), onInspect: vi.fn() });

describe("Achievement collection", () => {
  it("features a unique weekly award and shows each lifetime badge once", () => {
    const { container } = render(<TodayAchievementsReview {...typical()} />);
    expect(screen.getByRole("heading", { name: "Achievements" })).toBeTruthy();
    const buttons = within(screen.getByRole("group", { name: "Achievement collection" })).getAllByRole("button");
    expect(buttons).toHaveLength(6);
    expect(buttons.filter(button => button.dataset.earned === "true")).toHaveLength(4);
    expect(buttons.filter(button => button.dataset.earned === "false")).toHaveLength(2);
    expect(new Set(buttons.map(button => button.dataset.awardColor)).size).toBe(6);
    expect(container.querySelectorAll("svg[data-emblem]")).toHaveLength(6);
    expect(screen.getAllByText("First Finish")).toHaveLength(1);
    const feature = screen.getByRole("region", { name: "This week's award" });
    expect(within(feature).getByRole("heading", { name: "The Diana Award" })).toBeTruthy();
    expect(within(feature).queryByText("First Finish")).toBeNull();
    expect(within(feature).getByRole("progressbar").getAttribute("value")).toBe("5");
    expect(within(feature).getByRole("progressbar").getAttribute("max")).toBe("8");
    const ids = Array.from(container.querySelectorAll("[id]"), element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("opens badge details only on activation and never replaces the weekly feature", () => {
    const props = typical();
    render(<TodayAchievementsReview {...props} />);
    const badge = screen.getByRole("button", { name: /Five Submitted\. 3 of 5 complete/ });
    expect(badge.getAttribute("aria-haspopup")).toBe("dialog");
    fireEvent.focus(badge);
    expect(props.onInspect).not.toHaveBeenCalled();
    fireEvent.click(badge);
    expect(props.onInspect).toHaveBeenCalledWith(expect.objectContaining({ id: "five-submitted" }), badge);
    expect(screen.getByRole("heading", { name: "The Diana Award" })).toBeTruthy();
  });

  it("distinguishes no planned goal from unavailable data without granting a trophy", () => {
    const { container, rerender } = render(<TodayAchievementsReview {...typical()} achievements={getAchievements(seedPreviewAchievements("new"))} weeklyAward={getPreviewWeeklyAward("new")} />);
    expect(container.querySelectorAll('[data-earned="true"]')).toHaveLength(0);
    expect(screen.getAllByRole("button", { name: /0 of/ })).toHaveLength(6);
    expect(screen.getByText("No assignments planned this week")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
    rerender(<TodayAchievementsReview {...typical()} achievements={getAchievements(null)} weeklyAward={getPreviewWeeklyAward("unavailable")} />);
    expect(screen.getAllByRole("button", { name: /Progress unavailable/ })).toHaveLength(6);
    expect(screen.getByRole("status").textContent).toContain("history is temporarily unavailable");
    expect(screen.getByText("Weekly progress unavailable")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText(/Award earned/)).toBeNull();
  });

  it("shows the earned weekly trophy independently of all six lifetime badges", () => {
    const { container } = render(<TodayAchievementsReview {...typical()} achievements={getAchievements(seedPreviewAchievements("complete"))} weeklyAward={getPreviewWeeklyAward("complete")} />);
    expect(container.querySelectorAll('button[data-earned="true"]')).toHaveLength(6);
    expect(container.querySelector('[data-weekly-award="earned"]')).toBeTruthy();
    expect(screen.getByText("Award earned")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("discloses unavailable local preview storage", () => {
    render(<TodayAchievementsReview {...typical()} storageUnavailable />);
    expect(screen.getByRole("status").textContent).toContain("Changes last until this page closes");
  });
});

describe("Achievement details", () => {
  it("shows the original earned date or the exact remaining requirement", () => {
    const items = typical().achievements;
    const { container, rerender } = render(<AchievementDetails achievement={items[0]} />);
    expect(container.querySelector("time")?.dateTime).toBe(items[0].earnedAt);
    expect(screen.getByText("Complete 1 assignment.")).toBeTruthy();
    rerender(<AchievementDetails achievement={items[5]} />);
    expect(screen.getByRole("progressbar").getAttribute("value")).toBe("3");
    expect(screen.getByRole("progressbar").getAttribute("max")).toBe("5");
    rerender(<AchievementDetails achievement={getAchievements(null)[5]} />);
    expect(screen.getByText("Progress unavailable")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
