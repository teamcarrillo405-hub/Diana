import { describe, expect, it } from "vitest";
import { classCompletionAnalytics, effectiveAiMode, parentSafeProgressNotes } from "./teacher";

describe("teacher portal helpers", () => {
  it("uses assignment AI override when present", () => {
    expect(effectiveAiMode("green", "red")).toBe("red");
    expect(effectiveAiMode("yellow", null)).toBe("yellow");
  });

  it("computes class completion rates without student names", () => {
    const [math] = classCompletionAnalytics(["math"], [
      { class_id: "math", status: "done" },
      { class_id: "math", status: "submitted" },
      { class_id: "math", status: "todo" },
    ]);
    expect(math).toEqual({ classId: "math", total: 3, completed: 2, completionRate: 67 });
  });

  it("filters parent-visible progress notes", () => {
    const notes = parentSafeProgressNotes([
      { visible_to_parent: true, note: "visible" },
      { visible_to_parent: false, note: "private" },
    ]);
    expect(notes).toEqual([{ visible_to_parent: true, note: "visible" }]);
  });
});
