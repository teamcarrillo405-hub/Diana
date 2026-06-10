import { describe, it, expect } from "vitest";
import { firstWeekJourney, type JourneyInputs } from "./first-week";

const NOW = new Date("2026-06-09T12:00:00Z");

function inputs(overrides: Partial<JourneyInputs> = {}): JourneyInputs {
  return {
    hasClassOrConnection: false,
    assignmentCount: 0,
    hasStartedAnything: false,
    hasFocusSession: false,
    onboardedAt: "2026-06-08T00:00:00Z",
    now: NOW,
    ...overrides,
  };
}

describe("firstWeekJourney", () => {
  it("starts with all four steps open and spotlights the first", () => {
    const journey = firstWeekJourney(inputs());
    expect(journey.steps).toHaveLength(4);
    expect(journey.doneCount).toBe(0);
    expect(journey.active?.key).toBe("home");
    expect(journey.show).toBe(true);
  });

  it("advances the spotlight as steps complete", () => {
    const journey = firstWeekJourney(
      inputs({ hasClassOrConnection: true, assignmentCount: 3 }),
    );
    expect(journey.doneCount).toBe(2);
    expect(journey.active?.key).toBe("first-move");
  });

  it("disappears when complete", () => {
    const journey = firstWeekJourney(
      inputs({
        hasClassOrConnection: true,
        assignmentCount: 3,
        hasStartedAnything: true,
        hasFocusSession: true,
      }),
    );
    expect(journey.complete).toBe(true);
    expect(journey.show).toBe(false);
    expect(journey.active).toBeNull();
  });

  it("hides for established students past the window with work in flight", () => {
    const journey = firstWeekJourney(
      inputs({
        onboardedAt: "2026-04-01T00:00:00Z",
        hasClassOrConnection: true,
        assignmentCount: 5,
        hasStartedAnything: false,
      }),
    );
    expect(journey.show).toBe(false);
  });

  it("still shows past the window when the dashboard is empty", () => {
    const journey = firstWeekJourney(
      inputs({ onboardedAt: "2026-04-01T00:00:00Z", assignmentCount: 0 }),
    );
    expect(journey.show).toBe(true);
  });

  it("handles a missing onboarded date by relying on the empty-dashboard rule", () => {
    expect(firstWeekJourney(inputs({ onboardedAt: null })).show).toBe(true);
    expect(
      firstWeekJourney(inputs({ onboardedAt: null, assignmentCount: 2 })).show,
    ).toBe(false);
  });
});
