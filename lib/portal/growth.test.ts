import { describe, it, expect } from "vitest";
import { growthStory, type GrowthInputs } from "./growth";

const NOW = new Date("2026-06-09T12:00:00Z");

function inputs(overrides: Partial<GrowthInputs> = {}): GrowthInputs {
  return {
    completedAt: [],
    studyDays: [],
    flashcardReviews: 0,
    submittedCount: 0,
    windowDays: 28,
    now: NOW,
    ...overrides,
  };
}

// Window midpoint is 14 days before NOW: 2026-05-26T12:00:00Z.
const RECENT = "2026-06-05T10:00:00Z";
const EARLIER = "2026-05-15T10:00:00Z";

describe("growthStory", () => {
  it("tells a getting-started story with no data, without shame", () => {
    const story = growthStory(inputs());
    expect(story.headline).toBe("Just getting started.");
    expect(story.facts).toHaveLength(1);
    const text = (story.headline + story.facts.join(" ")).toLowerCase();
    for (const banned of ["behind", "failed", "missed", "wrong"]) {
      expect(text).not.toContain(banned);
    }
  });

  it("reports building momentum when recent completions outpace earlier ones", () => {
    const story = growthStory(inputs({ completedAt: [RECENT, RECENT, EARLIER] }));
    expect(story.headline).toBe("Momentum is building.");
    expect(story.facts[0]).toContain("Finished 3 pieces of work");
  });

  it("describes a dip as a rhythm, not a problem", () => {
    const story = growthStory(inputs({ completedAt: [EARLIER, EARLIER, RECENT] }));
    expect(story.headline).toContain("quieter stretch");
    expect(story.headline.toLowerCase()).not.toContain("behind");
  });

  it("calls even split steady", () => {
    const story = growthStory(inputs({ completedAt: [EARLIER, RECENT] }));
    expect(story.headline).toBe("Steady, consistent work.");
  });

  it("includes only nonzero facts and pluralizes correctly", () => {
    const story = growthStory(
      inputs({ completedAt: [RECENT], studyDays: ["2026-06-05"], submittedCount: 2, flashcardReviews: 0 }),
    );
    expect(story.facts).toHaveLength(3);
    expect(story.facts[0]).toContain("1 piece of work");
    expect(story.facts[1]).toContain("1 different day");
    expect(story.facts[2]).toContain("2 assignments");
  });
});
