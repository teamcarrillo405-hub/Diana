import { describe, it, expect } from "vitest";
import {
  createTimer,
  startTimer,
  pauseTimer,
  resumeTimer,
  tickTimer,
  resetTimer,
  type TimerStatus,
} from "./timer";

const T0 = 0;
const MIN = 60_000;

describe("createTimer", () => {
  it("returns idle state with zero remainingMs and null reward", () => {
    const s = createTimer();
    expect(s.status).toBe("idle");
    expect(s.remainingMs).toBe(0);
    expect(s.premackReward).toBeNull();
    expect(s.phase).toBeNull();
  });
});

describe("startTimer", () => {
  it("transitions idle to running with work phase, 25 min, reward stored", () => {
    const s = startTimer(createTimer(), {
      workMin: 25, breakMin: 5, premackReward: "play guitar", now: T0,
    });
    expect(s.status).toBe("running");
    expect(s.phase).toBe("work");
    expect(s.workMin).toBe(25);
    expect(s.breakMin).toBe(5);
    expect(s.endsAt).toBe(25 * MIN);
    expect(s.remainingMs).toBe(25 * MIN);
    expect(s.premackReward).toBe("play guitar");
  });

  it("clamps workMin to 5-60 and breakMin to 1-30", () => {
    const a = startTimer(createTimer(), { workMin: 2,  breakMin: 0,  premackReward: null, now: T0 });
    expect(a.workMin).toBe(5);
    expect(a.breakMin).toBe(1);
    const b = startTimer(createTimer(), { workMin: 99, breakMin: 99, premackReward: null, now: T0 });
    expect(b.workMin).toBe(60);
    expect(b.breakMin).toBe(30);
  });
});

describe("pauseTimer + resumeTimer", () => {
  it("preserves remainingMs across pause/resume", () => {
    const running = startTimer(createTimer(), {
      workMin: 25, breakMin: 5, premackReward: null, now: T0,
    });
    // After 10 minutes
    const paused = pauseTimer(running, { now: 10 * MIN });
    expect(paused.status).toBe("paused");
    expect(paused.remainingMs).toBe(15 * MIN);
    expect(paused.endsAt).toBeNull();

    // Resume 5 minutes later (real elapsed during pause shouldn't count)
    const resumed = resumeTimer(paused, { now: 15 * MIN });
    expect(resumed.status).toBe("running");
    expect(resumed.remainingMs).toBe(15 * MIN);
    expect(resumed.endsAt).toBe(15 * MIN + 15 * MIN);
  });
});

describe("tickTimer", () => {
  it("transitions work -> break at end of work interval (NOT to done)", () => {
    const running = startTimer(createTimer(), {
      workMin: 25, breakMin: 5, premackReward: "play guitar", now: T0,
    });
    const ticked = tickTimer(running, { now: 25 * MIN });
    expect(ticked.status).toBe("running"); // NOT 'done'
    expect(ticked.phase).toBe("break");
    expect(ticked.remainingMs).toBe(5 * MIN);
    expect(ticked.premackReward).toBe("play guitar"); // preserved
  });

  it("transitions break -> done at end of break interval", () => {
    const running = startTimer(createTimer(), {
      workMin: 25, breakMin: 5, premackReward: "play guitar", now: T0,
    });
    const onBreak = tickTimer(running, { now: 25 * MIN });
    const done = tickTimer(onBreak, { now: 30 * MIN });
    expect(done.status).toBe("done");
    expect(done.phase).toBeNull();
    expect(done.remainingMs).toBe(0);
    expect(done.premackReward).toBe("play guitar");
  });

  it("recomputes remainingMs without transitioning when time left", () => {
    const running = startTimer(createTimer(), {
      workMin: 25, breakMin: 5, premackReward: null, now: T0,
    });
    const mid = tickTimer(running, { now: 10 * MIN });
    expect(mid.status).toBe("running");
    expect(mid.phase).toBe("work");
    expect(mid.remainingMs).toBe(15 * MIN);
  });
});

describe("calm-language invariant", () => {
  it("never returns a forbidden status", () => {
    const forbidden = ["failed", "missed", "incorrect"];
    const lifecycle: TimerStatus[] = [];
    let s = createTimer();
    lifecycle.push(s.status);
    s = startTimer(s, { workMin: 25, breakMin: 5, premackReward: null, now: T0 });
    lifecycle.push(s.status);
    s = pauseTimer(s, { now: 5 * MIN });
    lifecycle.push(s.status);
    s = resumeTimer(s, { now: 5 * MIN });
    lifecycle.push(s.status);
    s = tickTimer(s, { now: 25 * MIN });
    lifecycle.push(s.status);
    s = tickTimer(s, { now: 30 * MIN });
    lifecycle.push(s.status);
    for (const st of lifecycle) {
      expect(forbidden).not.toContain(st);
    }
  });
});

describe("resetTimer", () => {
  it("returns to idle but keeps configured intervals", () => {
    const done = { status: "done" as TimerStatus, phase: null, workMin: 25, breakMin: 5, endsAt: null, remainingMs: 0, premackReward: "x" };
    const r = resetTimer(done);
    expect(r.status).toBe("idle");
    expect(r.workMin).toBe(25);
    expect(r.breakMin).toBe(5);
    expect(r.premackReward).toBeNull();
  });
});
