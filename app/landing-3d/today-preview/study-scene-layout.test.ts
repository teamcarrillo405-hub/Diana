import { describe, expect, it } from "vitest";
import { getStudySceneLayout } from "./study-scene-layout";

describe("study scene framing", () => {
  it.each([3, 5, 8, 12, 18])("keeps the desktop folio clear of the briefing at world width %s", width => {
    const { x, scale } = getStudySceneLayout(width, false);
    expect(x - 1.6 * scale).toBeGreaterThan(0);
    expect(x + 1.6 * scale).toBeLessThan(width / 2);
    expect(scale).toBeLessThanOrEqual(1);
  });
  it.each([2, 4, 8])("centers and contains the phone workstation at world width %s", width => {
    const { x, scale, surfaceY } = getStudySceneLayout(width, true);
    expect(x).toBe(0);
    expect(scale * 1.6).toBeLessThan(width / 2);
    expect(surfaceY).toBe(-1.7);
  });
});
