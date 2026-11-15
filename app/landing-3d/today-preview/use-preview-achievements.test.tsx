// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_ACHIEVEMENTS_KEY, usePreviewAchievements } from "./use-preview-achievements";
import type { PreviewScenario } from "./preview-data";

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Preview-only achievement storage", () => {
  it("earns First Check-In only on save and deduplicates same-day saves across reloads", () => {
    const first = renderHook(() => usePreviewAchievements("new"));
    expect(first.result.current.achievements.find(item => item.id === "first-check-in")?.earnedAt).toBeNull();
    act(() => { first.result.current.recordCheckIn(); first.result.current.recordCheckIn(); });
    const checkIn = first.result.current.achievements.find(item => item.id === "first-check-in");
    expect(checkIn?.progress).toBe(1);
    expect(checkIn?.earnedAt).toBeTruthy();
    expect(first.result.current.achievements.find(item => item.id === "ten-sessions")?.progress).toBe(0);
    expect(first.result.current.achievements.find(item => item.id === "first-finish")?.progress).toBe(0);
    first.unmount();
    const second = renderHook(() => usePreviewAchievements("new"));
    act(() => second.result.current.recordCheckIn());
    expect(second.result.current.achievements.find(item => item.id === "first-check-in")).toEqual(checkIn);
  });

  it("preserves a legacy focus ledger without converting focus into a check-in", () => {
    const occurredAt = "2026-09-01T18:00:00.000Z";
    localStorage.setItem(`${PREVIEW_ACHIEVEMENTS_KEY}.typical`, JSON.stringify({
      version: 1,
      events: [{ id: "previous-session", kind: "focus", occurredAt }],
      earned: [{ id: "first-focus", earnedAt: occurredAt }],
    }));
    const hook = renderHook(() => usePreviewAchievements("typical"));
    expect(hook.result.current.achievements.find(item => item.id === "ten-sessions")?.progress).toBe(1);
    expect(hook.result.current.achievements.find(item => item.id === "first-check-in")?.earnedAt).toBeNull();
    act(() => hook.result.current.recordCheckIn());
    expect(hook.result.current.achievements.find(item => item.id === "first-check-in")?.earnedAt).toBeTruthy();
    expect(hook.result.current.achievements.find(item => item.id === "ten-sessions")?.progress).toBe(1);
  });

  it("does not record check-ins when the preview ledger is disabled or unavailable", () => {
    const disabled = renderHook(() => usePreviewAchievements("new", false));
    act(() => disabled.result.current.recordCheckIn());
    expect(disabled.result.current.achievements.every(item => item.progress === 0)).toBe(true);
    const unavailable = renderHook(() => usePreviewAchievements("unavailable"));
    const before = localStorage.getItem(`${PREVIEW_ACHIEVEMENTS_KEY}.unavailable`);
    act(() => unavailable.result.current.recordCheckIn());
    expect(localStorage.getItem(`${PREVIEW_ACHIEVEMENTS_KEY}.unavailable`)).toBe(before);
    expect(unavailable.result.current.achievements.every(item => item.progress === null)).toBe(true);
  });

  it("counts finished sessions once and restores lifetime progress after remount", () => {
    const first = renderHook(() => usePreviewAchievements("typical"));
    act(() => { first.result.current.recordSession("session-one"); first.result.current.recordSession("session-one"); });
    expect(first.result.current.achievements.find(item => item.id === "ten-sessions")?.progress).toBe(7);
    first.unmount();
    const second = renderHook(() => usePreviewAchievements("typical"));
    expect(second.result.current.achievements.find(item => item.id === "ten-sessions")?.progress).toBe(7);
    expect(second.result.current.achievements.find(item => item.id === "five-submitted")?.progress).toBe(3);
  });

  it("preserves earned dates across new weeks and isolates sample scenarios", () => {
    const hook = renderHook(({ scenario }: { scenario: PreviewScenario }) => usePreviewAchievements(scenario), { initialProps: { scenario: "typical" as PreviewScenario } });
    act(() => { for (let i = 0; i < 4; i++) hook.result.current.recordSession(`session-${i}`); });
    const earnedAt = hook.result.current.achievements.find(item => item.id === "ten-sessions")?.earnedAt;
    expect(earnedAt).toBeTruthy();
    hook.rerender({ scenario: "new" });
    expect(hook.result.current.achievements.every(item => item.progress === 0)).toBe(true);
    hook.rerender({ scenario: "typical" });
    expect(hook.result.current.achievements.find(item => item.id === "ten-sessions")?.earnedAt).toBe(earnedAt);
  });

  it("uses safe sample data when saved storage is malformed and reports storage errors", () => {
    localStorage.setItem(`${PREVIEW_ACHIEVEMENTS_KEY}.typical`, "{bad-json");
    const hook = renderHook(() => usePreviewAchievements("typical"));
    expect(hook.result.current.achievements.find(item => item.id === "ten-sessions")?.progress).toBe(6);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    act(() => hook.result.current.recordSession("offline-local"));
    expect(hook.result.current.storageUnavailable).toBe(true);
    expect(hook.result.current.achievements.find(item => item.id === "ten-sessions")?.progress).toBe(7);
  });
});
