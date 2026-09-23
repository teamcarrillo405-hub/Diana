import { describe, expect, it } from "vitest";

import {
  buildSupportSearchResult,
  normalizeSupportSearchQuery,
  notificationDueLabel,
  parseSupportSearchKind,
  wellnessRecoveryCopy,
} from "./support-screens";

describe("ScreenDesign support screen contracts", () => {
  it("normalizes a bounded search term and escapes PostgREST wildcard input", () => {
    expect(normalizeSupportSearchQuery("  100% _notes\\  ")).toEqual({
      query: "100% _notes\\",
      pattern: "%100\\% \\_notes\\\\%",
    });
    expect(normalizeSupportSearchQuery("   ")).toEqual({
      query: "",
      pattern: null,
    });
    expect(normalizeSupportSearchQuery("a".repeat(120)).query).toHaveLength(80);
  });

  it("accepts only the supported search filters", () => {
    expect(parseSupportSearchKind("concepts")).toBe("concepts");
    expect(parseSupportSearchKind("artifacts")).toBe("artifacts");
    expect(parseSupportSearchKind("everything")).toBe("all");
    expect(parseSupportSearchKind(["notes", "classes"])).toBe("notes");
  });

  it("maps every supported owner-scoped entity to its real route", () => {
    expect(
      buildSupportSearchResult({
        type: "assignment",
        id: "assignment-1",
        title: "Evidence paragraph",
        detail: "Drafting",
      }).href,
    ).toBe("/assignments/assignment-1");
    expect(
      buildSupportSearchResult({
        type: "note",
        id: "note-1",
        title: "Reading notes",
        detail: "Quote and explanation",
      }).href,
    ).toBe("/notes/note-1");
    expect(
      buildSupportSearchResult({
        type: "class",
        id: "class-1",
        title: "English 9",
        detail: "Ms. Rivera",
      }).href,
    ).toBe("/classes/class-1");
    expect(
      buildSupportSearchResult({
        type: "concept",
        id: "concept-1",
        title: "Claim evidence reasoning",
        detail: "Practice evidence",
      }).href,
    ).toBe("/concepts/concept-1");
    expect(
      buildSupportSearchResult({
        type: "artifact",
        id: "artifact-1",
        title: "Identity study guide",
        detail: "Study guide",
      }).href,
    ).toBe("/study-artifacts/artifact-1");
  });

  it("uses factual calm due labels without streak or pressure language", () => {
    const now = new Date("2026-09-14T16:30:00.000Z");
    expect(notificationDueLabel("2026-09-14T15:30:00.000Z", now)).toEqual({
      label: "Due earlier",
      tone: "amber",
    });
    expect(notificationDueLabel("2026-09-15T16:30:00.000Z", now)).toEqual({
      label: "Due within 24 hours",
      tone: "pink",
    });
    expect(notificationDueLabel("2026-09-20T16:30:00.000Z", now)).toEqual({
      label: "On deck",
      tone: "blue",
    });
  });

  it("derives supportive wellness guidance without medical or performance claims", () => {
    expect(wellnessRecoveryCopy("rough", "rough")).toEqual({
      title: "Smaller first move",
      body: "Your check-in supports one shorter task and a clear stopping point.",
    });
    expect(wellnessRecoveryCopy("good", "rested")).toEqual({
      title: "Steady focus window",
      body: "Your check-in supports the usual task mix. You can adjust it at any time.",
    });
  });
});
