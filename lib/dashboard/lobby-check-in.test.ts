import { describe, expect, it } from "vitest";

import { lobbyCheckInFromSignalValue } from "./lobby-check-in";

describe("lobbyCheckInFromSignalValue", () => {
  it("restores a complete saved lobby check-in", () => {
    expect(
      lobbyCheckInFromSignalValue({
        energy: "okay",
        sleep: "seven_to_nine",
        meals: "meal",
        body: "okay",
        focus: "steady",
      }),
    ).toEqual({
      energy: "okay",
      sleep: "seven_to_nine",
      meals: "meal",
    });
  });

  it("does not restore incomplete or unsupported values", () => {
    expect(
      lobbyCheckInFromSignalValue({ energy: "okay", sleep: "seven_to_nine" }),
    ).toBeNull();
    expect(
      lobbyCheckInFromSignalValue({
        energy: "great",
        sleep: "seven_to_nine",
        meals: "meal",
      }),
    ).toBeNull();
  });
});
