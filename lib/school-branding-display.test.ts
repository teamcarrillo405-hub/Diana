import { describe, expect, it } from "vitest";
import { schoolColor, schoolColorText, schoolLogo } from "./school-branding-display";

describe("school branding display", () => {
  it("accepts only full hexadecimal school colors", () => {
    expect(schoolColor("#8c1d40")).toBe("#8C1D40");
    expect(schoolColor("red; background: url(https://example.com)")).toBeNull();
    expect(schoolColor("#fff")).toBeNull();
  });

  it("selects high contrast text for light and dark colors", () => {
    expect(schoolColorText("#8C1D40")).toBe("#FFFFFF");
    expect(schoolColorText("#FFC627")).toBe("#000000");
  });

  it("only displays canonical stored logo data", () => {
    expect(schoolLogo("data:image/webp;base64,YWJj")).toBe("data:image/webp;base64,YWJj");
    expect(schoolLogo("https://example.com/logo.svg")).toBeNull();
    expect(schoolLogo("data:image/svg+xml;base64,YWJj")).toBeNull();
  });
});
