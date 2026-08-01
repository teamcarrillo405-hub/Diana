import { describe, expect, it } from "vitest";

import { cadExtension, validateDimensionedSketch } from "./cad";

describe("CAD foundation", () => {
  it("accepts only the initial safe viewer formats", () => {
    expect(cadExtension("prototype.STL")).toBe("stl");
    expect(cadExtension("assembly.glb")).toBe("glb");
    expect(cadExtension("machine.exe")).toBeNull();
    expect(cadExtension("part.step")).toBeNull();
  });

  it("requires dimensions and design constraints", () => {
    expect(validateDimensionedSketch({
      units: "mm",
      width: 0,
      height: 20,
      depth: -1,
      constraints: [],
    })).toEqual([
      "Add a positive width.",
      "Depth must be positive when used.",
      "Record at least one design constraint.",
    ]);
  });
});
