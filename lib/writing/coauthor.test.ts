import { describe, expect, it } from "vitest";
import { authorshipPercent, parseWritingCoauthorResponse } from "./coauthor";

describe("parseWritingCoauthorResponse", () => {
  it("parses structured suggestions", () => {
    const result = parseWritingCoauthorResponse(
      '{"title":"Transition","suggestions":[{"label":"Bridge","text":"Connect the two ideas.","rationale":"Shows relationship.","action":"Write your version."}],"authorshipNote":"student-led"}',
      "transition",
    );
    expect(result.suggestions[0]?.label).toBe("Bridge");
    expect(result.authorshipNote).toBe("student-led");
  });

  it("falls back when content is not JSON", () => {
    const result = parseWritingCoauthorResponse("try a shorter sentence", "readability");
    expect(result.title).toBe("Readability tune");
    expect(result.suggestions.length).toBe(1);
  });
});

describe("authorshipPercent", () => {
  it("reports the student share of accepted text", () => {
    expect(authorshipPercent(80, 20)).toBe(80);
    expect(authorshipPercent(0, 0)).toBe(100);
  });
});
