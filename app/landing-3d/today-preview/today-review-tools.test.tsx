// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TodayReviewTools } from "./today-review-tools";

afterEach(cleanup);

const motion = { enabled: true, paused: false, status: "playing" as const, onMode: vi.fn(), onPause: vi.fn(), onRestart: vi.fn() };

describe("Motion review controls", () => {
  it("offers a direct recovery action when motion is unavailable", () => {
    const onRestart = vi.fn();
    render(<TodayReviewTools {...motion} status="unavailable" onRestart={onRestart}>Scenario</TodayReviewTools>);
    fireEvent.click(screen.getByRole("button", { name: "Retry Diana motion" }));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it("offers the same recovery action after an adaptive performance still", () => {
    const onRestart = vi.fn();
    render(<TodayReviewTools {...motion} status="performance-still" onRestart={onRestart}>Scenario</TodayReviewTools>);
    fireEvent.click(screen.getByRole("button", { name: "Retry Diana motion" }));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it("does not offer playback against reduced-motion preference", () => {
    render(<TodayReviewTools {...motion} status="reduced-motion">Scenario</TodayReviewTools>);
    expect((screen.getByRole("button", { name: "Diana motion off for reduced motion" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("labels the primary control as off when still mode is selected", () => {
    render(<TodayReviewTools {...motion} enabled={false} status="still">Scenario</TodayReviewTools>);
    expect((screen.getByRole("button", { name: "Diana motion off" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Pause Diana motion" })).toBeNull();
    expect(screen.getAllByRole("status", { hidden: true })).toHaveLength(1);
  });

  it.each([
    ["unavailable", "Motion unavailable. Diana's still image is displayed."],
    ["performance-still", "Diana's still image is displayed to keep this device smooth."],
    ["reduced-motion", "Diana's still image is displayed for reduced motion."],
  ] as const)("announces %s with the tray closed and retains one status region when opened", (status, message) => {
    const { rerender } = render(<TodayReviewTools {...motion}>Scenario</TodayReviewTools>);
    const announcement = screen.getByRole("status");
    expect(announcement.textContent).toBe("");
    rerender(<TodayReviewTools {...motion} status={status}>Scenario</TodayReviewTools>);
    expect(screen.getByRole("status")).toBe(announcement);
    expect(announcement.textContent).toBe(message);
    expect(announcement.closest("[hidden]")).toBeNull();
    expect(announcement.getAttribute("aria-live")).toBe("polite");
    expect(announcement.getAttribute("aria-atomic")).toBe("true");
    const toggle = screen.getByRole("button", { name: "Review controls" });
    fireEvent.click(toggle);
    expect(screen.getAllByRole("status", { hidden: true })).toEqual([announcement]);
    fireEvent.keyDown(toggle, { key: "Escape" });
    expect(screen.getByRole("status")).toBe(announcement);
    expect(document.activeElement).toBe(toggle);
    rerender(<TodayReviewTools {...motion}>Scenario</TodayReviewTools>);
    expect(announcement.textContent).toBe("");
  });

  it("keeps ordinary loading and playback pauses quiet", () => {
    const { rerender } = render(<TodayReviewTools {...motion}>Scenario</TodayReviewTools>);
    const announcement = screen.getByRole("status");
    for (const status of ["loading", "paused", "still", "playing"] as const) {
      rerender(<TodayReviewTools {...motion} status={status}>Scenario</TodayReviewTools>);
      expect(announcement.textContent).toBe("");
    }
  });

  it("labels loading truthfully and enables the playback control once ready", () => {
    const onPause = vi.fn();
    const { rerender } = render(<TodayReviewTools {...motion} status="loading" onPause={onPause}>Scenario</TodayReviewTools>);
    const control = screen.getByRole("button", { name: "Loading Diana motion" }) as HTMLButtonElement;
    expect(control.disabled).toBe(true);
    fireEvent.click(control);
    expect(onPause).not.toHaveBeenCalled();
    rerender(<TodayReviewTools {...motion} onPause={onPause}>Scenario</TodayReviewTools>);
    expect(screen.getByRole("button", { name: "Pause Diana motion" })).toBe(control);
    expect(control.disabled).toBe(false);
    fireEvent.click(control);
    expect(onPause).toHaveBeenCalledOnce();
  });

  it("exposes opt-in sound in the tray and keeps it separate from motion", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<TodayReviewTools {...motion} sound={{ enabled: false, available: true, onToggle }}>Scenario</TodayReviewTools>);
    expect(screen.queryByRole("button", { name: "Menu sound" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Review controls" }));
    const sound = screen.getByRole("button", { name: "Menu sound" });
    expect(sound.getAttribute("aria-pressed")).toBe("false");
    fireEvent.mouseEnter(sound);
    fireEvent.focus(sound);
    expect(onToggle).not.toHaveBeenCalled();
    fireEvent.click(sound);
    expect(onToggle).toHaveBeenCalledOnce();
    rerender(<TodayReviewTools {...motion} sound={{ enabled: true, available: true, onToggle }}>Scenario</TodayReviewTools>);
    expect(sound.getAttribute("aria-pressed")).toBe("true");
    rerender(<TodayReviewTools {...motion} sound={{ enabled: false, available: false, onToggle }}>Scenario</TodayReviewTools>);
    expect((sound as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Unavailable")).toBeTruthy();
  });
});
