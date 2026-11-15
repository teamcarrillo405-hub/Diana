import { describe, expect, it } from "vitest";
import { formatMinutes, getPreviewData } from "./preview-data";

describe("Today preview fixtures", () => {
  it("keeps assignment progress and recorded study time separate", () => {
    const data = getPreviewData("typical");
    expect([data.finished, data.total]).toEqual([5, 8]);
    expect(data.studied.reduce((sum, value) => sum + value, 0)).toBe(135);
    expect(data.planned.reduce((sum, value) => sum + value, 0)).toBe(300);
    expect(data.sessions).toBe(6);
    expect(data.submitted).toBe(3);
  });

  it("includes all six subjects in a busy week", () => {
    const data = getPreviewData("busy");
    expect(data.subjects).toHaveLength(6);
    expect(data.subjects.reduce((sum, subject) => sum + subject.minutes, 0)).toBe(390);
    expect(data.plan[0].title).toBe(data.deadlines[0].title);
  });

  it("keeps earlier work separate from the seven-day deadline horizon", () => {
    const data = getPreviewData("busy");
    expect(data.earlierWork[0].date).toBe("Sep 8");
    expect(data.deadlines.every(task => Number(task.day) >= 9 && Number(task.day) <= 15)).toBe(true);
    expect(new Set(data.deadlines.map(task => task.id)).size).toBe(data.deadlines.length);
    expect(data.deadlines.some(task => task.ready)).toBe(true);
  });

  it("does not fill empty states with invented work", () => {
    const data = getPreviewData("new");
    expect(data.total).toBe(0);
    expect(data.subjects).toEqual([]);
    expect(data.plan).toEqual([]);
    expect(data.deadlines).toEqual([]);
    expect(data.studied.every(minutes => minutes === 0)).toBe(true);
    expect(data.planned.every(minutes => minutes === 0)).toBe(true);
    expect(data.unavailable).toBe(false);
  });

  it("distinguishes unavailable history from a fresh start", () => {
    const data = getPreviewData("unavailable");
    expect(data.unavailable).toBe(true);
    expect(data.total).toBe(8);
    expect(data.plan).not.toHaveLength(0);
  });

  it("allows study time to exceed a daily target without inventing future activity", () => {
    const data = getPreviewData("complete");
    expect(data.finished).toBe(data.total);
    expect(data.studied[2]).toBeGreaterThan(data.planned[2]);
    expect(data.studied.slice(3)).toEqual([0, 0, 0, 0]);
    expect(data.studied.reduce((sum, value) => sum + value, 0)).toBe(300);
  });

  it("formats times consistently", () => {
    expect([0, 25, 60, 135, 390].map(formatMinutes)).toEqual(["0m", "25m", "1h", "2h 15m", "6h 30m"]);
  });
});
