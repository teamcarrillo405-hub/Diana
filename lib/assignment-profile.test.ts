import { describe, expect, it } from "vitest";

import { ASSIGNMENT_CAPABILITY_REGISTRY } from "./assignment-capabilities";
import {
  assignmentProfilePersistencePatch,
  reconcileWorkspaceWithAssignmentProfile,
  resolveAssignmentProfile,
  SUBJECT_DOMAINS,
  type SubjectDomain,
} from "./assignment-profile";

const SUBJECT_CASES: Array<[SubjectDomain, string, string[]]> = [
  ["mathematics", "Algebra II: graph quadratic equations", ["equation_editor", "graphing"]],
  ["english_language_arts", "English rhetorical analysis essay", ["rich_text"]],
  ["science", "Advanced chemistry laboratory investigation", ["procedure_checklist", "data_lab", "graphing"]],
  ["social_studies", "AP US History document-based question", ["rich_text"]],
  ["world_language", "Spanish II oral response", ["audio_review"]],
  ["computer_science", "Computer Science Python debugging lab", ["code_runner"]],
  ["visual_arts", "Visual art drawing and artist statement", ["drawing_canvas"]],
  ["music", "Music theory composition in MusicXML", ["music_notation", "audio_review"]],
  ["theatre", "Theatre monologue scene study", ["video_review", "performance_log"]],
  ["dance", "Dance choreography movement phrase", ["video_review", "performance_log"]],
  ["physical_education", "Physical education skill practice and movement log", ["performance_log"]],
  ["health", "Health education source review and wellness reflection", ["rich_text"]],
  ["accounting", "Accounting journal entries and trial balance", ["accounting_ledger", "spreadsheet"]],
  ["economics", "Economics supply and demand market equilibrium", ["graphing", "spreadsheet"]],
  ["geography", "Geography choropleth map and spatial pattern analysis", ["map_workspace", "drawing_canvas"]],
  ["engineering", "Engineering prototype with bill of materials and design constraints", ["design_notebook", "cad_workspace", "spreadsheet"]],
  ["trade_cte", "CTE welding shop procedure and skill evidence", ["procedure_checklist", "video_review"]],
  ["cad", "CAD dimensioned sketch and STL model", ["cad_workspace", "drawing_canvas"]],
  ["advanced_technical_labs", "Advanced technical lab instrumentation and materials testing", ["procedure_checklist", "data_lab", "design_notebook"]],
];

describe("assignment profile resolver", () => {
  it("recognizes every specialized high-school subject family", () => {
    for (const [domain, title, capabilities] of SUBJECT_CASES) {
      const profile = resolveAssignmentProfile({ kind: "other", title });
      expect(profile.subjectDomain, title).toBe(domain);
      expect(profile.capabilities, title).toEqual(expect.arrayContaining(capabilities));
      expect(profile.confidence, title).toBeGreaterThanOrEqual(0.9);
    }
  });

  it("covers every declared subject domain through a rule or a fallback", () => {
    const resolved = new Set(SUBJECT_CASES.map(([domain]) => domain));
    resolved.add(resolveAssignmentProfile({ kind: "presentation", title: "Interdisciplinary capstone project" }).subjectDomain);
    resolved.add(resolveAssignmentProfile({ kind: "other", title: "Friday task" }).subjectDomain);

    expect([...resolved]).toEqual(expect.arrayContaining([...SUBJECT_DOMAINS]));
  });

  it("builds mixed-capability profiles without asking for one exclusive editor", () => {
    const accounting = resolveAssignmentProfile({
      kind: "other",
      className: "Accounting",
      title: "Post transactions, create a trial balance, and explain the result",
    });
    expect(accounting).toMatchObject({
      artifactType: "accounting_workbook",
      taskIntents: ["calculate", "explain"],
      legacyMode: "worksheet",
    });
    expect(accounting.capabilities).toEqual([
      "accounting_ledger",
      "spreadsheet",
      "equation_editor",
      "rich_text",
    ]);

    const engineering = resolveAssignmentProfile({
      kind: "presentation",
      className: "Engineering",
      title: "Prototype design review",
    });
    expect(engineering.capabilities.length).toBeGreaterThan(5);
    expect(engineering.capabilities).toEqual(expect.arrayContaining([
      "design_notebook",
      "equation_editor",
      "spreadsheet",
      "drawing_canvas",
      "cad_workspace",
    ]));
  });

  it("assigns restricted safety classes to sensitive tools", () => {
    expect(resolveAssignmentProfile({ kind: "other", title: "Welding shop procedure" }).safetyClass).toBe("workshop_hazard");
    expect(resolveAssignmentProfile({ kind: "lab", title: "Chemistry titration" }).safetyClass).toBe("lab_hazard");
    expect(resolveAssignmentProfile({ kind: "other", title: "PE fitness assessment" }).safetyClass).toBe("physical_activity");
    expect(resolveAssignmentProfile({ kind: "other", title: "Geography GIS field map" }).safetyClass).toBe("precise_location");
  });

  it("uses a valid persisted profile without silently reclassifying it", () => {
    const profile = resolveAssignmentProfile({
      kind: "essay",
      title: "English essay",
      profile: {
        schemaVersion: 1,
        subjectDomain: "economics",
        taskIntents: ["model"],
        artifactType: "economic_analysis",
        capabilities: ["graphing", "spreadsheet", "unknown"],
        safetyClass: "standard",
        standardsAlignment: [{ frameworkId: "case:test", itemId: "std-1" }],
        legacyMode: "research",
        confidence: 1,
        reasons: ["Teacher selected."],
      },
    });

    expect(profile.subjectDomain).toBe("economics");
    expect(profile.capabilities).toEqual(["graphing", "spreadsheet"]);
    expect(profile.standardsAlignment).toEqual([{ frameworkId: "case:test", itemId: "std-1", uri: null, statement: null }]);
  });

  it("has a complete runtime contract for every resolved capability", () => {
    for (const [, title] of SUBJECT_CASES) {
      const profile = resolveAssignmentProfile({ kind: "other", title });
      for (const capability of profile.capabilities) {
        const definition = ASSIGNMENT_CAPABILITY_REGISTRY[capability];
        expect(definition.id).toBe(capability);
        expect(definition.artifactBlockType).toBeTruthy();
        expect(definition.resourceLimits.maxBytes).toBeGreaterThan(0);
      }
    }
  });

  it("creates a database-ready compatibility patch", () => {
    const profile = resolveAssignmentProfile({ kind: "other", title: "Accounting trial balance" });
    expect(assignmentProfilePersistencePatch(profile)).toEqual({
      assignment_profile: profile,
      work_profile: "worksheet",
    });
  });

  it("replaces a stale automatic layout with the detected subject layout", () => {
    const profile = resolveAssignmentProfile({
      kind: "test_prep",
      className: "Algebra I",
      title: "Quiz: slope and intercepts",
    });
    const reconciled = reconcileWorkspaceWithAssignmentProfile({
      mode: "reading",
      confidence: 0.8,
      reasons: ["Saved automatic selection."],
      source: "weighted_context",
    }, profile, false);

    expect(reconciled.mode).toBe("math");
    expect(reconciled.source).toBe("weighted_context");
  });

  it("keeps a student-selected work format", () => {
    const profile = resolveAssignmentProfile({
      kind: "test_prep",
      className: "Algebra I",
      title: "Quiz: slope and intercepts",
    });
    const reconciled = reconcileWorkspaceWithAssignmentProfile({
      mode: "reading",
      confidence: 1,
      reasons: ["Student selected."],
      source: "student_selected",
    }, profile, true);

    expect(reconciled.mode).toBe("reading");
  });
});
