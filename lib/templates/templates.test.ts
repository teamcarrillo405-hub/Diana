import { describe, it, expect } from "vitest";
import {
  parseTemplateRow,
  templateToDescription,
  templateToChecklistItems,
  getTemplates,
  getTemplateById,
  type AssignmentTemplate,
} from "./templates";

const fixture: AssignmentTemplate = {
  id: "test-id",
  name: "5-Paragraph Essay",
  kind: "essay",
  checklistItems: [
    { label: "Intro paragraph ends with a thesis", required: true },
    { label: "Transitions connect paragraphs", required: false },
  ],
  rubricItems: [],
};

describe("parseTemplateRow", () => {
  it("coerces non-array jsonb fields to empty arrays", () => {
    const parsed = parseTemplateRow({
      id: "x", name: "n", kind: "essay",
      checklist_items: null,
      rubric_items: undefined,
    });
    expect(parsed.checklistItems).toEqual([]);
    expect(parsed.rubricItems).toEqual([]);
  });

  it("parses valid array jsonb fields", () => {
    const parsed = parseTemplateRow({
      id: "abc",
      name: "DBQ",
      kind: "essay",
      checklist_items: [{ label: "Write thesis", required: true }],
      rubric_items: [{ criterion: "Thesis", weight: 1 }],
    });
    expect(parsed.checklistItems).toHaveLength(1);
    expect(parsed.rubricItems).toHaveLength(1);
  });
});

describe("templateToChecklistItems", () => {
  it("maps to ChecklistItem shape with detail=null", () => {
    const items = templateToChecklistItems(fixture);
    expect(items).toEqual([
      { label: "Intro paragraph ends with a thesis", detail: null, required: true },
      { label: "Transitions connect paragraphs",     detail: null, required: false },
    ]);
  });

  it("returns empty array when template has no checklist items", () => {
    const items = templateToChecklistItems({ ...fixture, checklistItems: [] });
    expect(items).toEqual([]);
  });
});

describe("templateToDescription", () => {
  it("renders a header + bulleted body when items present", () => {
    const desc = templateToDescription(fixture);
    expect(desc).toContain("Template: 5-Paragraph Essay");
    expect(desc).toContain("- Intro paragraph ends with a thesis");
    expect(desc).toContain("- Transitions connect paragraphs");
  });
  it("renders only the header when items are empty", () => {
    const desc = templateToDescription({ ...fixture, checklistItems: [] });
    expect(desc).toBe("Template: 5-Paragraph Essay");
  });
});

describe("getTemplates", () => {
  it("returns the same array passed in", () => {
    const arr = [fixture];
    expect(getTemplates(arr)).toBe(arr);
  });
});

describe("getTemplateById", () => {
  it("finds a template by id", () => {
    expect(getTemplateById([fixture], "test-id")).toBe(fixture);
  });
  it("returns undefined when id not found", () => {
    expect(getTemplateById([fixture], "not-a-real-id")).toBeUndefined();
  });
});
