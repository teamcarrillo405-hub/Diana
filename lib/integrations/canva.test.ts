import { describe, it, expect } from "vitest";
import {
  briefToClipboardText,
  buildCanvaAuthUrl,
  buildDesignBrief,
  looksLikeVisualProject,
  normalizeCanvaDesign,
} from "./canva";

describe("looksLikeVisualProject", () => {
  it("matches presentation kind and visual title words", () => {
    expect(looksLikeVisualProject("anything", "presentation")).toBe(true);
    expect(looksLikeVisualProject("Water cycle poster", "other")).toBe(true);
    expect(looksLikeVisualProject("Book report slides", null)).toBe(true);
    expect(looksLikeVisualProject("Cell division infographic", "other")).toBe(true);
  });

  it("does not match ordinary work", () => {
    expect(looksLikeVisualProject("Read chapter 5", "reading")).toBe(false);
    expect(looksLikeVisualProject("Algebra problem set", "problem_set")).toBe(false);
    expect(looksLikeVisualProject(null, null)).toBe(false);
  });
});

describe("buildDesignBrief", () => {
  it("uses rubric criteria as sections: the teacher's definition of done", () => {
    const brief = buildDesignBrief({
      assignmentTitle: "Ecosystem poster",
      rubricCriteria: ["Food web diagram", "Three biotic factors", "Human impact"],
    });
    expect(brief.designType).toBe("poster");
    expect(brief.sections.map((s) => s.heading)).toEqual([
      "Headline",
      "Food web diagram",
      "Three biotic factors",
      "Human impact",
      "Sources corner",
    ]);
  });

  it("falls back to note titles, then a generic three-part structure", () => {
    const fromNotes = buildDesignBrief({
      assignmentTitle: "History presentation",
      noteTitles: ["Causes of WWI", "Trench warfare"],
    });
    expect(fromNotes.designType).toBe("presentation");
    expect(fromNotes.sections.map((s) => s.heading)).toContain("Causes of WWI");

    const generic = buildDesignBrief({ assignmentTitle: "Science slides" });
    expect(generic.sections.map((s) => s.heading)).toEqual([
      "Title slide",
      "Main idea",
      "Evidence",
      "Why it matters",
      "Sources slide",
    ]);
  });

  it("keeps student authorship: every point is a fill-in, nothing pre-written", () => {
    const brief = buildDesignBrief({
      assignmentTitle: "Poster on photosynthesis",
      rubricCriteria: ["Light reactions"],
    });
    const text = briefToClipboardText(brief);
    expect(text).toContain("## Light reactions");
    expect(text).toContain("Your evidence or example here");
  });
});

describe("buildCanvaAuthUrl", () => {
  it("builds a PKCE authorize URL", () => {
    const url = new URL(
      buildCanvaAuthUrl({
        clientId: "client-1",
        redirectUri: "https://app.example/api/canva/callback",
        state: "state-1",
        codeChallenge: "challenge-1",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://www.canva.com/api/oauth/authorize");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("client_id")).toBe("client-1");
    expect(url.searchParams.get("state")).toBe("state-1");
  });
});

describe("normalizeCanvaDesign", () => {
  it("maps the Connect API design shape", () => {
    const design = normalizeCanvaDesign({
      id: "DAF123",
      title: "Ecosystem poster",
      urls: { edit_url: "https://canva.com/edit/1", view_url: "https://canva.com/view/1" },
      thumbnail: { url: "https://canva.com/thumb/1.png" },
      updated_at: 1_750_000_000,
    });
    expect(design).toMatchObject({ id: "DAF123", title: "Ecosystem poster" });
    expect(design?.editUrl).toContain("/edit/");
    expect(design?.updatedAt).toContain("2025");
  });

  it("returns null without an id and defaults a missing title", () => {
    expect(normalizeCanvaDesign({ title: "x" })).toBeNull();
    expect(normalizeCanvaDesign({ id: "D1" })?.title).toBe("Untitled design");
  });
});
