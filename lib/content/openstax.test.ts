import { describe, it, expect } from "vitest";
import { openStaxForClassName } from "./openstax";

describe("openStaxForClassName", () => {
  it("matches a science class to its book", () => {
    const books = openStaxForClassName("AP Biology");
    expect(books[0]?.title).toContain("Biology");
  });

  it("prefers the more specific keyword match", () => {
    const books = openStaxForClassName("Algebra 2 Honors");
    expect(books[0]?.title).toBe("Intermediate Algebra 2e");
  });

  it("matches history naming variants", () => {
    expect(openStaxForClassName("APUSH")[0]?.title).toBe("U.S. History");
    expect(openStaxForClassName("World History I")[0]?.title).toContain("World History");
  });

  it("caps at two suggestions", () => {
    expect(openStaxForClassName("Econ: macro and micro").length).toBeLessThanOrEqual(2);
  });

  it("returns empty for unmatched or empty names", () => {
    expect(openStaxForClassName("Woodshop")).toEqual([]);
    expect(openStaxForClassName(null)).toEqual([]);
  });
});
