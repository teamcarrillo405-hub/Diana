// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TodayDesignPreview } from "./today-design-preview";

vi.mock("./diana-idle-character", () => ({ DianaIdleCharacter: () => <span data-character /> }));
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T12:00:00Z"));
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16));
  vi.stubGlobal("cancelAnimationFrame", (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } },
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });

describe("Game lobby review boundaries", () => {
  it("keeps the Now composition opt-in and preserves the other five stages", () => {
    const { container, rerender } = render(<TodayDesignPreview motionReview compositionReview />);
    expect(container.querySelector("[data-now-composition]")).toBeTruthy();
    expect(container.querySelector("[data-now-action]")).toBeTruthy();
    expect(container.querySelectorAll("[data-today-stage-deck] > section")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Diana motion off" }).hasAttribute("disabled")).toBe(true);
    rerender(<TodayDesignPreview motionReview />);
    expect(container.querySelector("[data-now-composition]")).toBeNull();
    expect(container.querySelector("[data-now-launch]")).toBeTruthy();
  });
  it("keeps each subject's color consistent between the queue and subject chart", () => {
    const { container } = render(<TodayDesignPreview motionReview />);
    const emblem = container.querySelector<HTMLElement>('[data-now-queue-subject] [data-subject-emblem]')!;
    const algebraColor = container.querySelectorAll('[data-review-study-mix] circle')[2].getAttribute("stroke");
    expect(emblem.style.getPropertyValue("--subject-color")).toBe(algebraColor);
  });
  it("keeps the performance and emblem redesign exclusive to the motion review", () => {
    const { container, rerender } = render(<TodayDesignPreview motionReview />);
    expect(container.querySelector("[data-week-performance]")).toBeTruthy();
    expect(container.querySelectorAll("[data-emblem]")).toHaveLength(6);
    expect(container.querySelectorAll("[data-review-secondary]")).toHaveLength(0);
    expect(container.querySelector("[data-review-study-mix]")).toBeTruthy();
    expect(container.querySelector("[data-review-check-in]")).toBeTruthy();
    expect(container.querySelector("[data-review-upcoming]")).toBeTruthy();
    expect(container.querySelector("[data-review-dialog]")).toBeTruthy();
    rerender(<TodayDesignPreview />);
    expect(container.querySelector("[data-week-performance]")).toBeNull();
    expect(container.querySelector("[data-achievements-review]")).toBeNull();
    expect(container.querySelector("[data-review-secondary]")).toBeNull();
    expect(container.querySelector("[data-review-study-mix]")).toBeNull();
    expect(container.querySelector("[data-review-check-in]")).toBeNull();
    expect(container.querySelector("[data-review-upcoming]")).toBeNull();
    expect(container.querySelector("[data-review-dialog]")).toBeNull();
    expect(container.querySelectorAll('img[src*="today-milestones"]')).toHaveLength(3);
  });

  it("selects lifetime achievements without changing completion or submission counts", () => {
    render(<TodayDesignPreview motionReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Achievements" }));
    const badge = screen.getByRole("button", { name: /Five Submitted\. 3 of 5 complete/ });
    badge.focus();
    fireEvent.click(badge);
    expect(screen.getByRole("dialog", { name: "Five Submitted" }).textContent).toContain("Confirm 5 assignment submissions.");
    expect(screen.getByRole("region", { name: "This week's award" }).textContent).toContain("The Diana Award");
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    act(() => vi.advanceTimersByTime(20));
    expect(document.activeElement).toBe(badge);
    expect(screen.getByRole("button", { name: /Five Finished\. Earned/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ten Sessions\. 6 of 10 complete/ })).toBeTruthy();
  });

  it("returns from badge details with Escape and keeps the weekly award in place", () => {
    render(<TodayDesignPreview motionReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Achievements" }));
    const badge = screen.getByRole("button", { name: /First Finish\. Earned/ });
    badge.focus();
    fireEvent.click(badge);
    const dialog = screen.getByRole("dialog", { name: "First Finish" });
    expect(within(dialog).getByRole("heading", { name: "First Finish" })).toBe(document.activeElement);
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    act(() => vi.advanceTimersByTime(20));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(badge);
    expect(screen.getAllByText("First Finish")).toHaveLength(1);
    expect(screen.getByRole("progressbar", { name: "Weekly award progress" }).getAttribute("value")).toBe("5");
  });

  it("uses the existing light wordmark only with the review header", () => {
    const { rerender } = render(<TodayDesignPreview motionReview />);
    const wordmark = () => screen.getByRole("link", { name: "Diana Lobby" }).querySelector("img")!;
    expect(wordmark().getAttribute("src")).toContain("diana-logo-tight-no-shadow.png");
    rerender(<TodayDesignPreview />);
    expect(wordmark().getAttribute("src")).toContain("diana-logo-tight-no-shadow.png");
  });

  it("keeps the default preview on its original details flow", () => {
    render(<TodayDesignPreview />);
    expect(screen.queryByRole("button", { name: "Review controls" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByRole("button", { name: "Finish sample session" })).toBeTruthy();
    expect(screen.queryByRole("timer")).toBeNull();
  });

  it("hides review tools initially and closes their tray with Escape", () => {
    render(<TodayDesignPreview motionReview />);
    expect(screen.queryByRole("combobox", { name: "Preview scenario" })).toBeNull();
    expect(screen.getByRole("button", { name: "Loading Diana motion" }).hasAttribute("disabled")).toBe(true);
    const toggle = screen.getByRole("button", { name: "Review controls" });
    fireEvent.click(toggle);
    expect(screen.getByRole("combobox", { name: "Preview scenario" })).toBeTruthy();
    fireEvent.keyDown(toggle, { key: "Escape" });
    expect(screen.queryByRole("combobox", { name: "Preview scenario" })).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it("opens deadline details without starting a session or submission", () => {
    render(<TodayDesignPreview motionReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    fireEvent.click(screen.getByRole("button", { name: /President Nixon: Three-Page Report.*History/ }));
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.getByRole("button", { name: "Start session" })).toBeTruthy();
    expect(screen.queryByText("Choose three sources for your argument.")).toBeNull();
    expect(screen.queryByText("Next step")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    fireEvent.click(screen.getByRole("button", { name: /Paragraph evidence check.*English/ }));
    expect(screen.getByRole("button", { name: "Review submission" })).toBeTruthy();
    expect(screen.queryByRole("timer")).toBeNull();
  });

  it("preserves notes, elapsed session time, and unfinished Check-In", () => {
    render(<TodayDesignPreview motionReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Check-In" }));
    fireEvent.change(screen.getByRole("slider", { name: "Sleep" }), { target: { value: "8.5" } });
    fireEvent.click(screen.getByRole("tab", { name: "Now" }));
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Session notes" }), { target: { value: "Source one" } });
    act(() => vi.advanceTimersByTime(10000));
    fireEvent.click(screen.getByRole("button", { name: "Back to Today" }));
    act(() => vi.advanceTimersByTime(20000));
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByRole("timer").textContent).toBe("24:50");
    expect((screen.getByRole("textbox", { name: "Session notes" }) as HTMLTextAreaElement).value).toBe("Source one");
    fireEvent.click(screen.getByRole("button", { name: "Back to Today" }));
    fireEvent.click(screen.getByRole("tab", { name: "Check-In" }));
    expect((screen.getByRole("slider", { name: "Sleep" }) as HTMLInputElement).value).toBe("8.5");
  });

  it("returns focus to the original deadline after the details-to-session handoff", () => {
    render(<TodayDesignPreview motionReview />);
    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    const deadline = screen.getByRole("button", { name: /President Nixon: Three-Page Report.*History/ });
    deadline.focus();
    fireEvent.click(deadline);
    const start = screen.getByRole("button", { name: "Start session" });
    start.focus();
    fireEvent.click(start);
    fireEvent.click(screen.getByRole("button", { name: "Back to Today" }));
    expect(document.activeElement).toBe(deadline);
  });

  it("aggregates two sessions on the same assignment before rounding study minutes", async () => {
    render(<TodayDesignPreview motionReview />);
    for (let index = 0; index < 2; index++) {
      fireEvent.click(screen.getByRole("button", { name: "Start" }));
      act(() => vi.advanceTimersByTime(59000));
      fireEvent.click(screen.getByRole("button", { name: "Finish session" }));
      await act(async () => { await Promise.resolve(); });
      const buttons = within(screen.getByRole("dialog", { name: "Time well spent." })).getAllByRole("button", { name: "Back to Today" });
      fireEvent.click(buttons[buttons.length - 1]);
    }
    fireEvent.click(screen.getByRole("tab", { name: "This Week" }));
    expect(screen.getByText("2h 16m")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Achievements" }));
    expect(screen.getByRole("button", { name: /Ten Sessions\. 8 of 10 complete/ })).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Weekly award progress" }).getAttribute("value")).toBe("5");
  });
});
