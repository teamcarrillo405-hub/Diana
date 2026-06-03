import { describe, expect, it } from "vitest";
import { DIANA_SEED_CONTENT_PACKS, seedContentReadiness } from "./seed-packs";

describe("Diana seed content packs", () => {
  it("covers the core high school and AP launch subjects", () => {
    const readiness = seedContentReadiness();
    expect(readiness.ready).toBe(true);
    expect(readiness.missingSubjects).toEqual([]);
    expect(readiness.packCount).toBe(7);
  });

  it("keeps every study artifact source-linked", () => {
    for (const pack of DIANA_SEED_CONTENT_PACKS) {
      const anchors = new Set(pack.sourceAnchors.map((anchor) => anchor.id));
      expect(pack.flashcards.length).toBeGreaterThanOrEqual(2);
      expect(pack.practiceItems.length).toBeGreaterThanOrEqual(1);
      expect(pack.flashcards.every((card) => anchors.has(card.sourceAnchorId))).toBe(true);
      expect(pack.practiceItems.every((item) => anchors.has(item.sourceAnchorId))).toBe(true);
    }
  });
});
