import { describe, it, expect } from "vitest";
import { parseRubricText, resolveRubric, rubricSelfCheck, rubricToChecklist } from "./rubric";

const CANVAS_TEXT = [
  "Thesis statement - Clear, arguable claim in the intro - 20 pts",
  "Evidence - Two quotes with citations - 15 pts",
  "Organization - Paragraphs follow the outline - 10 pts",
  "Conventions - 5 pts",
].join("\n");

const TEACHER_BULLETS = [
  "Rubric:",
  "- Cite at least two primary sources",
  "* Explain cause and effect",
  "1. Use the HAPP structure",
  "2) Write a one-paragraph conclusion",
].join("\n");

describe("parseRubricText", () => {
  it("parses Canvas-format lines with title, detail, and points", () => {
    const criteria = parseRubricText(CANVAS_TEXT);
    expect(criteria).toHaveLength(4);
    expect(criteria[0]).toMatchObject({
      title: "Thesis statement",
      detail: "Clear, arguable claim in the intro",
      points: 20,
    });
    expect(criteria[3]).toMatchObject({ title: "Conventions", points: 5, detail: null });
  });

  it("parses bulleted and numbered teacher text, dropping the header line", () => {
    const criteria = parseRubricText(TEACHER_BULLETS);
    expect(criteria.map((c) => c.title)).toEqual([
      "Cite at least two primary sources",
      "Explain cause and effect",
      "Use the HAPP structure",
      "Write a one-paragraph conclusion",
    ]);
    expect(criteria.every((c) => c.points === null)).toBe(true);
  });

  it("returns empty for null, empty, and header-only text", () => {
    expect(parseRubricText(null)).toEqual([]);
    expect(parseRubricText("")).toEqual([]);
    expect(parseRubricText("Rubric:\n\nCriteria")).toEqual([]);
  });

  it("assigns stable sequential ids", () => {
    const criteria = parseRubricText(CANVAS_TEXT);
    expect(criteria.map((c) => c.id)).toEqual(["rc-1", "rc-2", "rc-3", "rc-4"]);
  });
});

describe("resolveRubric", () => {
  it("prefers the assignment rubric over the class default", () => {
    const rubric = resolveRubric("Class criterion - 10 pts", CANVAS_TEXT);
    expect(rubric?.source).toBe("assignment");
    expect(rubric?.criteria).toHaveLength(4);
    expect(rubric?.totalPoints).toBe(50);
  });

  it("falls back to the class rubric when the assignment has none", () => {
    const rubric = resolveRubric("Class criterion - 10 pts", null);
    expect(rubric?.source).toBe("class");
    expect(rubric?.criteria[0].title).toBe("Class criterion");
  });

  it("returns null when neither side parses", () => {
    expect(resolveRubric(null, null)).toBeNull();
    expect(resolveRubric("", "Rubric:")).toBeNull();
  });

  it("totalPoints is null when any criterion is unweighted", () => {
    const rubric = resolveRubric(null, "First - 10 pts\nSecond criterion");
    expect(rubric?.totalPoints).toBeNull();
  });
});

describe("rubricSelfCheck", () => {
  const rubric = resolveRubric(null, CANVAS_TEXT)!;

  it("weights coverage by points when all criteria carry points", () => {
    // 20 of 50 points checked = 40%
    const check = rubricSelfCheck(rubric, ["rc-1"]);
    expect(check.done).toBe(1);
    expect(check.total).toBe(4);
    expect(check.coveragePct).toBe(40);
  });

  it("recommends the highest-point unchecked criterion next", () => {
    const check = rubricSelfCheck(rubric, ["rc-1"]);
    expect(check.next?.title).toBe("Evidence");
  });

  it("next is null when everything is checked", () => {
    const check = rubricSelfCheck(rubric, ["rc-1", "rc-2", "rc-3", "rc-4"]);
    expect(check.next).toBeNull();
    expect(check.coveragePct).toBe(100);
  });

  it("falls back to plain counts for unweighted rubrics", () => {
    const unweighted = resolveRubric(null, "First\nSecond\nThird\nFourth")!;
    const check = rubricSelfCheck(unweighted, ["rc-1"]);
    expect(check.coveragePct).toBe(25);
    // Order preserved when no points distinguish criteria.
    expect(check.next?.title).toBe("Second");
  });
});

describe("rubricToChecklist", () => {
  it("renders one line per criterion with points when present", () => {
    const rubric = resolveRubric(null, CANVAS_TEXT)!;
    const lines = rubricToChecklist(rubric);
    expect(lines[0]).toBe("Thesis statement (20 pts)");
    expect(lines).toHaveLength(4);
  });
});
