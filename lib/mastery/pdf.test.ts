import { describe, expect, it } from "vitest";
import { buildMasteryReportPdf } from "./pdf";

describe("buildMasteryReportPdf", () => {
  it("returns a PDF byte stream", () => {
    const pdf = buildMasteryReportPdf({
      className: "Biology",
      concepts: [{ name: "cells", masteryLevel: 2, selfConfidence: 3 }],
      assignments: [{ title: "Lab", status: "done" }],
    });
    const text = new TextDecoder().decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Diana mastery report");
  });
});
