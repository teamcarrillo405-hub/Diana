// @vitest-environment jsdom
import { StrictMode, type PropsWithChildren } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as previewData from "./preview-data";
import type { PreviewScenario } from "./preview-data";
import {
  getPreviewWeeklyAward,
  PREVIEW_WEEKLY_AWARDS_KEY,
  usePreviewWeeklyAward,
} from "./use-preview-weekly-award";

const WEEK_ID = "2026-09-07";
const EARNED_AT = "2026-09-09T00:00:00.000Z";
const SAMPLE_RECORD = { goal: 8, completed: 8, earnedAt: EARNED_AT };
const OLD_RECORD = { goal: 3, completed: 4, earnedAt: "2026-09-02T16:00:00.000Z" };
const SAVED_RECORD = { goal: 6, completed: 7, earnedAt: "2026-09-08T16:00:00.000Z" };
const key = (scenario: PreviewScenario) => `${PREVIEW_WEEKLY_AWARDS_KEY}.${scenario}`;
const stored = (scenario: PreviewScenario) => JSON.parse(localStorage.getItem(key(scenario))!);
const records = (weeks: Record<string, unknown> = {}) => ({ version: 1, weeks });

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("getPreviewWeeklyAward", () => {
  it.each([
    ["typical", 5, 8, "in-progress"],
    ["busy", 5, 12, "in-progress"],
    ["new", 0, 0, "no-goal"],
    ["complete", 8, 8, "earned"],
    ["unavailable", 0, 8, "unavailable"],
  ] as const)("derives the %s award from weekly work", (scenario, completed, target, state) => {
    expect(getPreviewWeeklyAward(scenario)).toEqual({
      weekLabel: "Sep 7 - Sep 13, 2026", completed, target, state,
      earnedAt: state === "earned" ? EARNED_AT : null,
    });
  });

  it("uses the fixed fixture date without accessing storage or mutating the fixture", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T00:00:00.000Z"));
    const read = vi.spyOn(Storage.prototype, "getItem");
    const write = vi.spyOn(Storage.prototype, "setItem");
    const before = previewData.getPreviewData("complete");
    expect(getPreviewWeeklyAward("complete").earnedAt).toBe(EARNED_AT);
    expect(previewData.getPreviewData("complete")).toEqual(before);
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("awards work above the target without requiring submitted work or sessions", () => {
    const fixture = previewData.getPreviewData("complete");
    vi.spyOn(previewData, "getPreviewData").mockReturnValue({ ...fixture, finished: 9, submitted: 0, sessions: 0 });
    expect(getPreviewWeeklyAward("complete")).toMatchObject({ completed: 9, target: 8, state: "earned" });
  });

  it("does not turn session or submission counts into completed weekly work", () => {
    const fixture = previewData.getPreviewData("typical");
    vi.spyOn(previewData, "getPreviewData").mockReturnValue({ ...fixture, sessions: 100, submitted: 100 });
    expect(getPreviewWeeklyAward("typical")).toMatchObject({ completed: 5, state: "in-progress", earnedAt: null });
  });

  it("does not award unavailable data even when its counts meet the target", () => {
    const fixture = previewData.getPreviewData("complete");
    vi.spyOn(previewData, "getPreviewData").mockReturnValue({ ...fixture, unavailable: true });
    expect(getPreviewWeeklyAward("unavailable")).toMatchObject({ state: "unavailable", earnedAt: null });
  });
});

describe("preview-only weekly award persistence", () => {
  it("persists an earned snapshot and restores it on remount without rewriting it", () => {
    const first = renderHook(() => usePreviewWeeklyAward("complete"));
    expect(first.result.current.award).toEqual(getPreviewWeeklyAward("complete"));
    expect(stored("complete")).toEqual(records({ [WEEK_ID]: SAMPLE_RECORD }));
    first.unmount();
    const write = vi.spyOn(Storage.prototype, "setItem");
    const second = renderHook(() => usePreviewWeeklyAward("complete"));
    expect(second.result.current.award.earnedAt).toBe(EARNED_AT);
    expect(second.result.current.storageUnavailable).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it("retains old weeks while appending the sample week's earned record", () => {
    localStorage.setItem(key("complete"), JSON.stringify(records({ "2026-08-31": OLD_RECORD })));
    renderHook(() => usePreviewWeeklyAward("complete"));
    expect(stored("complete")).toEqual(records({ "2026-08-31": OLD_RECORD, [WEEK_ID]: SAMPLE_RECORD }));
  });

  it("restores immutable saved goals, counts, and earned dates instead of replacing them with current fixtures", () => {
    const history = records({ "2026-08-31": OLD_RECORD, [WEEK_ID]: SAVED_RECORD });
    localStorage.setItem(key("complete"), JSON.stringify(history));
    const write = vi.spyOn(Storage.prototype, "setItem");
    const hook = renderHook(() => usePreviewWeeklyAward("complete"));
    expect(hook.result.current.award).toMatchObject({ state: "earned", target: 6, completed: 7, earnedAt: SAVED_RECORD.earnedAt });
    expect(stored("complete")).toEqual(history);
    expect(write).not.toHaveBeenCalled();
  });

  it.each(["typical", "busy", "new", "unavailable"] as const)("never creates an award for %s", (scenario) => {
    const hook = renderHook(() => usePreviewWeeklyAward(scenario));
    expect(hook.result.current.award).toEqual(getPreviewWeeklyAward(scenario));
    expect(hook.result.current.award.earnedAt).toBeNull();
    expect(stored(scenario)).toEqual(records());
  });

  it.each(["typical", "busy", "new", "unavailable"] as const)("saved data cannot make the %s fixture eligible", (scenario) => {
    const history = records({ "2026-08-31": OLD_RECORD, [WEEK_ID]: SAMPLE_RECORD });
    localStorage.setItem(key(scenario), JSON.stringify(history));
    const hook = renderHook(() => usePreviewWeeklyAward(scenario));
    expect(hook.result.current.award).toEqual(getPreviewWeeklyAward(scenario));
    expect(stored(scenario)).toEqual(history);
  });

  it("isolates scenarios through switches and leaves the lifetime ledger untouched", () => {
    const lifetimeKey = "diana.design-preview.achievements.v1.complete";
    const lifetime = JSON.stringify({ version: 1, events: [{ kind: "focus" }], earned: [] });
    localStorage.setItem(lifetimeKey, lifetime);
    const read = vi.spyOn(Storage.prototype, "getItem");
    const write = vi.spyOn(Storage.prototype, "setItem");
    const hook = renderHook(({ scenario }: { scenario: PreviewScenario }) => usePreviewWeeklyAward(scenario), {
      initialProps: { scenario: "complete" as PreviewScenario },
    });
    for (const scenario of ["new", "busy", "unavailable", "typical", "complete"] as const) {
      hook.rerender({ scenario });
      expect(hook.result.current.award).toEqual(getPreviewWeeklyAward(scenario));
    }
    act(() => hook.result.current.reset());
    expect(read.mock.calls.every(([storageKey]) => storageKey.startsWith(`${PREVIEW_WEEKLY_AWARDS_KEY}.`))).toBe(true);
    expect(write.mock.calls.every(([storageKey]) => storageKey.startsWith(`${PREVIEW_WEEKLY_AWARDS_KEY}.`))).toBe(true);
    expect(localStorage.getItem(lifetimeKey)).toBe(lifetime);
    expect(hook.result.current).not.toHaveProperty("recordSession");
    expect(hook.result.current).not.toHaveProperty("recordSubmission");
  });

  it("reseeds only the sample week on default reset and preserves older records", () => {
    localStorage.setItem(key("complete"), JSON.stringify(records({ "2026-08-31": OLD_RECORD, [WEEK_ID]: SAVED_RECORD })));
    const hook = renderHook(() => usePreviewWeeklyAward("complete"));
    act(() => hook.result.current.reset());
    expect(hook.result.current.award).toEqual(getPreviewWeeklyAward("complete"));
    expect(stored("complete")).toEqual(records({ "2026-08-31": OLD_RECORD, [WEEK_ID]: SAMPLE_RECORD }));
  });

  it("resets another scenario without changing the active scenario's award or saved history", () => {
    localStorage.setItem(key("complete"), JSON.stringify(records({ [WEEK_ID]: SAVED_RECORD })));
    localStorage.setItem(key("new"), JSON.stringify(records({ "2026-08-31": OLD_RECORD, [WEEK_ID]: SAMPLE_RECORD })));
    const hook = renderHook(() => usePreviewWeeklyAward("complete"));
    const activeAward = hook.result.current.award;
    act(() => hook.result.current.reset("new"));
    expect(hook.result.current.award).toEqual(activeAward);
    expect(stored("complete")).toEqual(records({ [WEEK_ID]: SAVED_RECORD }));
    expect(stored("new")).toEqual(records({ "2026-08-31": OLD_RECORD }));
  });

  it("does not read or write storage while disabled, including reset and scenario changes", () => {
    const read = vi.spyOn(Storage.prototype, "getItem");
    const write = vi.spyOn(Storage.prototype, "setItem");
    const hook = renderHook(({ scenario, enabled }: { scenario: PreviewScenario; enabled: boolean }) => usePreviewWeeklyAward(scenario, enabled), {
      initialProps: { scenario: "typical" as PreviewScenario, enabled: false },
    });
    act(() => { hook.result.current.reset(); hook.result.current.reset("complete"); });
    hook.rerender({ scenario: "complete", enabled: false });
    expect(hook.result.current.award).toEqual(getPreviewWeeklyAward("complete"));
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    hook.rerender({ scenario: "complete", enabled: true });
    expect(stored("complete")).toEqual(records({ [WEEK_ID]: SAMPLE_RECORD }));
  });

  it("is idempotent under StrictMode effect replay", () => {
    const write = vi.spyOn(Storage.prototype, "setItem");
    renderHook(() => usePreviewWeeklyAward("complete"), {
      wrapper: ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>,
    });
    expect(stored("complete")).toEqual(records({ [WEEK_ID]: SAMPLE_RECORD }));
    expect(write).toHaveBeenCalledTimes(1);
  });
});

describe("weekly award storage validation and failures", () => {
  it.each([
    ["malformed JSON", "{bad-json"],
    ["null", "null"],
    ["array", "[]"],
    ["unsupported version", JSON.stringify({ version: 2, weeks: {} })],
    ["missing weeks", JSON.stringify({ version: 1 })],
    ["array of weeks", JSON.stringify({ version: 1, weeks: [] })],
    ["extra envelope fields", JSON.stringify({ ...records(), submitted: 8 })],
    ["non-date week", JSON.stringify(records({ unknown: SAMPLE_RECORD }))],
    ["impossible week", JSON.stringify(records({ "2026-02-30": SAMPLE_RECORD }))],
    ["non-Monday week", JSON.stringify(records({ "2026-09-08": SAMPLE_RECORD }))],
    ...[
      ["null record", null], ["array record", []],
      ["zero goal", { ...SAMPLE_RECORD, goal: 0 }],
      ["negative goal", { ...SAMPLE_RECORD, goal: -1 }],
      ["fractional goal", { ...SAMPLE_RECORD, goal: 1.5 }],
      ["string goal", { ...SAMPLE_RECORD, goal: "8" }],
      ["unfinished work", { ...SAMPLE_RECORD, completed: 7 }],
      ["negative completion", { ...SAMPLE_RECORD, completed: -1 }],
      ["fractional completion", { ...SAMPLE_RECORD, completed: 8.5 }],
      ["unsafe completion", { ...SAMPLE_RECORD, completed: Number.MAX_SAFE_INTEGER + 1 }],
      ["string completion", { ...SAMPLE_RECORD, completed: "8" }],
      ["missing timestamp", { goal: 8, completed: 8 }],
      ["null timestamp", { ...SAMPLE_RECORD, earnedAt: null }],
      ["invalid timestamp", { ...SAMPLE_RECORD, earnedAt: "not-a-date" }],
      ["ambiguous timestamp", { ...SAMPLE_RECORD, earnedAt: "09/09/2026" }],
      ["impossible timestamp", { ...SAMPLE_RECORD, earnedAt: "2026-09-31T00:00:00.000Z" }],
      ["timestamp before week", { ...SAMPLE_RECORD, earnedAt: "2026-09-06T23:59:59.000Z" }],
      ["timestamp after week", { ...SAMPLE_RECORD, earnedAt: "2026-09-14T00:00:00.000Z" }],
      ["timestamp after fixture today", { ...SAMPLE_RECORD, earnedAt: "2026-09-10T00:00:00.000Z" }],
      ["extra record fields", { ...SAMPLE_RECORD, submitted: 8 }],
    ].map(([label, value]) => [label, JSON.stringify(records({ [WEEK_ID]: value }))]),
  ])("falls back from %s without a false award", (_label, raw) => {
    localStorage.setItem(key("typical"), raw as string);
    localStorage.setItem(key("complete"), raw as string);
    const typical = renderHook(() => usePreviewWeeklyAward("typical"));
    const complete = renderHook(() => usePreviewWeeklyAward("complete"));
    expect(typical.result.current.award).toEqual(getPreviewWeeklyAward("typical"));
    expect(complete.result.current.award).toEqual(getPreviewWeeklyAward("complete"));
    expect(typical.result.current.storageUnavailable).toBe(false);
    expect(stored("typical")).toEqual(records());
    expect(stored("complete")).toEqual(records({ [WEEK_ID]: SAMPLE_RECORD }));
  });

  it("reports read errors, keeps fixture state, and never overwrites unread history", () => {
    const history = JSON.stringify(records({ "2026-08-31": OLD_RECORD }));
    localStorage.setItem(key("complete"), history);
    const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
    const write = vi.spyOn(Storage.prototype, "setItem");
    const hook = renderHook(() => usePreviewWeeklyAward("complete"));
    expect(hook.result.current.award).toEqual(getPreviewWeeklyAward("complete"));
    expect(hook.result.current.storageUnavailable).toBe(true);
    act(() => hook.result.current.reset());
    expect(write).not.toHaveBeenCalled();
    read.mockRestore();
    expect(localStorage.getItem(key("complete"))).toBe(history);
    act(() => hook.result.current.reset());
    expect(hook.result.current.storageUnavailable).toBe(false);
    expect(stored("complete")).toEqual(records({ "2026-08-31": OLD_RECORD, [WEEK_ID]: SAMPLE_RECORD }));
  });

  it("keeps an earned award in memory when writes fail and recovers on reset", () => {
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    const hook = renderHook(() => usePreviewWeeklyAward("complete"));
    expect(hook.result.current.award).toEqual(getPreviewWeeklyAward("complete"));
    expect(hook.result.current.storageUnavailable).toBe(true);
    act(() => hook.result.current.reset("new"));
    expect(hook.result.current.storageUnavailable).toBe(true);
    expect(hook.result.current.award.state).toBe("earned");
    write.mockRestore();
    act(() => hook.result.current.reset("new"));
    expect(hook.result.current.storageUnavailable).toBe(false);
    expect(hook.result.current.award.state).toBe("earned");
  });

  it("handles access to localStorage itself being denied", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new Error("SecurityError"); });
    const hook = renderHook(() => usePreviewWeeklyAward("new"));
    expect(hook.result.current.storageUnavailable).toBe(true);
    expect(hook.result.current.award).toEqual(getPreviewWeeklyAward("new"));
  });
});
