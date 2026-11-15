import { describe, expect, it } from "vitest";
import { buildTodayView, todayWeek, type TodayAssignment, type TodayFocusLog } from "./today-view";
import type { ScoredAssignment } from "@/lib/scoring/next-five-minutes";

const now = new Date("2026-09-09T20:00:00Z");
const assignment = (id: string, patch: Partial<TodayAssignment> = {}): TodayAssignment => ({ id, title: `Homework ${id}`, status: "todo", due_at: "2026-09-10T19:00:00Z", estimated_minutes: 45, classes: { name: "History" }, ...patch });
const focus = (patch: Partial<TodayFocusLog> = {}): TodayFocusLog => ({ id: 1, started_at: "2026-09-09T18:00:00Z", target_ends_at: "2026-09-09T18:25:00Z", ended_at: "2026-09-09T18:20:00Z", elapsed_minutes: 20, focus_state: "completed", ...patch });
const input = { now, timeZone: "America/Los_Angeles", ranked: [], assignments: [], weeklyAssignments: [], submittedAssignments: [], focusLogs: [] };

describe("live Today data", () => {
  it("uses local Monday boundaries including DST", () => {
    const spring = todayWeek(new Date("2026-03-08T16:00:00Z"), "America/Los_Angeles");
    expect(spring.start).toBe("2026-03-02T08:00:00.000Z");
    expect(spring.end).toBe("2026-03-09T07:00:00.000Z");
    expect((Date.parse(spring.end) - Date.parse(spring.start)) / 3_600_000).toBe(167);
    const autumn = todayWeek(new Date("2026-11-01T16:00:00Z"), "America/Los_Angeles");
    expect((Date.parse(autumn.end) - Date.parse(autumn.start)) / 3_600_000).toBe(169);
  });

  it("uses UTC for an invalid timezone", () => {
    expect(todayWeek(now, "invalid").zone).toBe("UTC");
  });

  it("keeps priority first and only adds other assignments due today", () => {
    const ranked = [assignment("priority"), assignment("later", { due_at: "2026-09-12T19:00:00Z" }), assignment("today", { due_at: "2026-09-09T09:00:00Z" })].map(a => ({ ...a, effective_minutes: 25 })) as ScoredAssignment[];
    const data = buildTodayView({ ...input, ranked });
    expect(data.plan.map(a => a.id)).toEqual(["priority", "today"]);
    expect(data.plan[0].href).toBe("/assignments/priority?focus=next-step");
    expect(data.plan[0].minutes).toBe(25);
  });

  it("includes all of today through six more dates and keeps earlier and other ready work separate", () => {
    const assignments = [assignment("earlier", { due_at: "2026-09-09T06:59:00Z" }), assignment("morning", { due_at: "2026-09-09T07:01:00Z" }), assignment("last", { due_at: "2026-09-16T06:59:00Z" }), assignment("next", { due_at: "2026-09-16T07:00:00Z" }), assignment("ready", { status: "exporting", due_at: null }), assignment("sent", { status: "submitted" })];
    const data = buildTodayView({ ...input, assignments });
    expect(data.deadlines.map(a => a.id)).toEqual(["morning", "last"]);
    expect(data.earlierWork.map(a => a.id)).toEqual(["earlier"]);
    expect(data.otherReady[0].href).toBe("/assignments/ready/submit");
  });

  it("deduplicates the due-week goal and does not substitute estimates for studied time", () => {
    const done = assignment("done", { status: "exporting", estimated_minutes: 120 });
    const data = buildTodayView({ ...input, weeklyAssignments: [done, done, assignment("open")], focusLogs: [focus()] });
    expect([data.finished, data.total]).toEqual([1, 2]);
    expect(data.planned[2]).toBe(25);
    expect(data.studied[2]).toBe(20);
    expect(data.sessions).toBe(1);
  });

  it("splits session time across local midnight", () => {
    const data = buildTodayView({ ...input, focusLogs: [focus({ started_at: "2026-09-09T06:50:00Z", target_ends_at: "2026-09-09T07:10:00Z", ended_at: "2026-09-09T07:10:00Z" })] });
    expect(data.studied.slice(1, 3)).toEqual([10, 10]);
    expect(data.planned.slice(1, 3)).toEqual([10, 10]);
  });

  it("excludes the portion outside the local week", () => {
    const data = buildTodayView({ ...input, focusLogs: [focus({ started_at: "2026-09-07T06:50:00Z", target_ends_at: "2026-09-07T07:10:00Z", ended_at: "2026-09-07T07:10:00Z" })] });
    expect(data.studied[0]).toBe(10);
    expect(data.sessions).toBe(1);
  });

  it("ignores legacy generic timers, duplicate rows, and unfinished or future sessions", () => {
    const data = buildTodayView({ ...input, focusLogs: [focus(), focus(), focus({ id: 2, target_ends_at: null }), focus({ id: 3, ended_at: null, elapsed_minutes: null, focus_state: "running" }), focus({ id: 4, started_at: "2026-09-10T18:00:00Z", target_ends_at: "2026-09-10T18:25:00Z", ended_at: "2026-09-10T18:20:00Z" })] });
    expect(data.sessions).toBe(1);
    expect(data.studied.reduce((a, b) => a + b, 0)).toBe(20);
    expect(data.planned[2]).toBe(50);
    expect(data.planned[3]).toBe(0);
  });

  it("keeps actual time above a target", () => {
    const data = buildTodayView({ ...input, focusLogs: [focus({ ended_at: "2026-09-09T18:40:00Z", elapsed_minutes: 40 })] });
    expect(data.studied[2]).toBe(40);
    expect(data.planned[2]).toBe(25);
  });

  it("counts explicit submissions by submission date, not deadline or readiness", () => {
    const submitted = assignment("submitted", { status: "submitted", due_at: "2026-10-01T20:00:00Z", submitted_at: "2026-09-09T19:00:00Z" });
    const data = buildTodayView({ ...input, submittedAssignments: [submitted, submitted, assignment("ready", { status: "exporting" }), assignment("old", { status: "submitted", submitted_at: "2026-09-06T20:00:00Z" })] });
    expect(data.submitted).toBe(1);
  });

  it("includes every subject with its real share", () => {
    const data = buildTodayView({ ...input, weeklyAssignments: Array.from({ length: 7 }, (_, i) => assignment(String(i), { classes: { name: `Subject ${i}` }, estimated_minutes: 10 })) });
    expect(data.subjects).toHaveLength(7);
    expect(data.subjects.reduce((sum, subject) => sum + subject.minutes, 0)).toBe(70);
  });

  it("distinguishes unavailable sources from a new account", () => {
    const fresh = buildTodayView(input);
    const unavailable = buildTodayView({ ...input, assignments: null, weeklyAssignments: null, focusLogs: null, submittedAssignments: null });
    expect(fresh.studyUnavailable).toBe(false);
    expect(unavailable.studyUnavailable).toBe(true);
    expect(unavailable.assignmentsUnavailable).toBe(true);
    expect(unavailable.weeklyUnavailable).toBe(true);
    expect(unavailable.submissionsUnavailable).toBe(true);
  });
});
