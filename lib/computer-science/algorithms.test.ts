import { describe, expect, it } from "vitest";
import {
  binarySearchSteps,
  bubbleSortSteps,
  linkedListTraversalSteps,
  parseNumberList,
} from "./algorithms";

describe("algorithm visualizer steps", () => {
  it("builds bubble sort compare and sorted steps", () => {
    const steps = bubbleSortSteps([3, 1, 2]);
    expect(steps.some((step) => step.label.startsWith("Compare"))).toBe(true);
    expect(steps.at(-1)?.values).toEqual([1, 2, 3]);
  });

  it("builds binary search middle checks", () => {
    const steps = binarySearchSteps([8, 2, 4, 6], 6);
    expect(steps[0]?.values).toEqual([2, 4, 6, 8]);
    expect(steps.some((step) => step.label === "Found")).toBe(true);
  });

  it("builds linked list traversal steps", () => {
    const steps = linkedListTraversalSteps([10, 20, 30]);
    expect(steps.map((step) => step.activeIndices[0])).toEqual([0, 1, 2]);
    expect(steps.at(-1)?.note).toContain("next is null");
  });

  it("parses numeric input safely", () => {
    expect(parseNumberList("5, 1 nope 3")).toEqual([5, 1, 3]);
  });
});
