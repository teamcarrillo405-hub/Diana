import { describe, expect, it } from "vitest";
import {
  applySubjectVerbosity,
  buildDataInventory,
  buildPrivacyExportPdf,
  categoryLabel,
  deletionRequestPatch,
  normalizeNotificationPrefs,
} from "./export";

describe("privacy export helpers", () => {
  it("builds a stable data inventory", () => {
    expect(buildDataInventory({
      classes: 2,
      assignments: 5,
      notes: 7,
      flashcards: 11,
      studyArtifacts: 4,
      aiInteractions: 13,
      masteryConcepts: 3,
      shareLinks: 1,
    })).toEqual([
      { label: "Classes", count: 2 },
      { label: "Assignments", count: 5 },
      { label: "Notes", count: 7 },
      { label: "Flashcards", count: 11 },
      { label: "Study artifacts", count: 4 },
      { label: "AI interactions", count: 13 },
      { label: "Mastery concepts", count: 3 },
      { label: "Share links", count: 1 },
    ]);
  });

  it("normalizes notification preferences with defaults", () => {
    expect(normalizeNotificationPrefs({ assignment_reminders: false, ai_budget: "yes" })).toMatchObject({
      assignment_reminders: false,
      ai_budget: true,
      weekly_reflection: true,
    });
  });

  it("applies per-subject verbosity safely", () => {
    expect(applySubjectVerbosity({ old: "loud" }, "class-1", "minimal")).toEqual({
      old: "balanced",
      "class-1": "minimal",
    });
  });

  it("builds an AI-disabling deletion patch", () => {
    expect(deletionRequestPatch("2026-06-01T00:00:00Z")).toMatchObject({
      consent_ai: false,
      daily_token_budget: 0,
      tokens_used_today: 0,
    });
  });

  it("creates a PDF byte array", () => {
    const pdf = buildPrivacyExportPdf({
      displayName: "Maya",
      inventory: [{ label: "Notes", count: 4 }],
    });
    expect(new TextDecoder().decode(pdf).startsWith("%PDF-1.4")).toBe(true);
  });

  it("labels privacy delete categories", () => {
    expect(categoryLabel("ai_interactions")).toBe("AI history");
    expect(categoryLabel("study_artifacts")).toBe("Study artifacts");
    expect(categoryLabel("session_handoff")).toBe("Device handoff");
  });
});
