import { describe, expect, it, vi } from "vitest";
import { buildLanguageToolBody, checkLanguageToolText, normalizeLanguageToolMatches } from "./client";

describe("LanguageTool client", () => {
  it("builds a LanguageTool-compatible request body", () => {
    const body = buildLanguageToolBody("I has a draft.", "en-US");
    expect(body.get("text")).toBe("I has a draft.");
    expect(body.get("language")).toBe("en-US");
  });

  it("normalizes matches into student-owned suggestions", () => {
    const suggestions = normalizeLanguageToolMatches("I has a draft.", {
      matches: [
        {
          message: "Possible agreement issue.",
          shortMessage: "Agreement",
          offset: 2,
          length: 3,
          replacements: [{ value: "have" }],
        },
      ],
    });
    expect(suggestions[0]).toMatchObject({
      message: "Agreement",
      excerpt: "has",
      replacements: ["have"],
      studentAction: "Review the suggestion and choose whether it fits your sentence.",
    });
    expect(suggestions[0].sourceAnchor).toContain("Student draft");
  });

  it("calls a configured LanguageTool endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ matches: [] }),
    });
    const result = await checkLanguageToolText({
      text: "A clear sentence.",
      endpoint: "http://localhost:8010/v2/check",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:8010/v2/check",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
