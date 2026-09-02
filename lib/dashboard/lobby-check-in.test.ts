import { describe, expect, it } from "vitest";

import {
  lobbyCheckInDayKey,
  lobbyCheckInFromSignalValue,
} from "./lobby-check-in";

describe("lobbyCheckInFromSignalValue", () => {
  it("restores a complete saved lobby check-in", () => {
    expect(
      lobbyCheckInFromSignalValue({
        energy: "okay",
        sleepHours: 8,
        movementType: "walk",
        movementMinutes: 30,
        body: "okay",
        focus: "steady",
      }),
    ).toEqual({
      energy: "okay",
      sleepHours: 8,
      movementType: "walk",
      movementMinutes: 30,
    });
  });

  it("does not restore incomplete or unsupported values", () => {
    expect(
      lobbyCheckInFromSignalValue({ energy: "okay", sleepHours: 8 }),
    ).toBeNull();
    expect(
      lobbyCheckInFromSignalValue({
        energy: "great",
        sleepHours: 8,
        movementType: "walk",
        movementMinutes: 30,
      }),
    ).toBeNull();
  });
});

describe("lobbyCheckInDayKey", () => {
  it("moves to the new student-local day at 12:01 a.m.", () => {
    expect(
      lobbyCheckInDayKey("2026-08-18T07:00:59.000Z", "America/Los_Angeles"),
    ).toBe("2026-08-17");
    expect(
      lobbyCheckInDayKey("2026-08-18T07:01:00.000Z", "America/Los_Angeles"),
    ).toBe("2026-08-18");
  });
});
