import { describe, expect, it } from "vitest";

import { ASSIGNMENT_CAPABILITY_REGISTRY } from "./assignment-capabilities";
import {
  assignmentProfilePersistencePatch,
  reconcileWorkspaceWithAssignmentProfile,
  resolveAssignmentProfile,
  setupSubjectForAssignmentProfile,
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

  it("recognizes advanced biometrics as quantitative science instead of a generic workspace", () => {
    const profile = resolveAssignmentProfile({
      kind: "other",
      className: "Biometrics 410",
      title: "Evaluate false acceptance and false rejection rates",
      description: "Plot an ROC curve and defend the classifier threshold.",
    });

    expect(profile.subjectDomain).toBe("science");
    expect(profile.capabilities).toEqual(expect.arrayContaining([
      "data_lab",
      "equation_editor",
      "graphing",
      "spreadsheet",
    ]));
    expect(profile.confidence).toBeGreaterThanOrEqual(0.9);
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

  it.each([
    { className: "Algebra II", title: "Graphing worksheet", description: "Graph the two equations.", subjectDomain: "mathematics", deliverable: "worksheet", legacyMode: "math", artifactType: "problem_set" },
    { className: "English 9", title: "Comparison report", description: "Compare two assigned articles about chemistry.", subjectDomain: "english_language_arts", deliverable: "report", legacyMode: "research", artifactType: "research_paper" },
    { className: "U.S. History", title: "Research paper", description: "Use historical GDP and monetary policy as evidence.", subjectDomain: "social_studies", deliverable: "report", legacyMode: "research", artifactType: "research_paper" },
    { className: "Biology", title: "Data analysis", description: "Write a lab report from the provided observations.", subjectDomain: "science", deliverable: "lab_report", legacyMode: "lab", artifactType: "lab_report" },
    { className: "Biology", title: "Cell discovery report", description: "Write a report using the assigned articles on laboratory history.", subjectDomain: "science", deliverable: "report", legacyMode: "research", artifactType: "research_paper" },
    { className: "Economics", title: "Demand model", description: "Graph supply and demand. Use the company balance sheet for context.", subjectDomain: "economics", deliverable: "graph_analysis", legacyMode: "research", artifactType: "economic_analysis" },
    { className: "Economics", title: "Distribution report", description: "Use the company balance sheet as background for market equilibrium.", subjectDomain: "economics", deliverable: "report", legacyMode: "research", artifactType: "research_paper" },
    { className: "Introduction to Law", title: "Case brief", description: "Brief the assigned case on a bank's trial balance.", subjectDomain: "general", deliverable: "legal_case_brief", legacyMode: "research", artifactType: "research_paper" },
    { className: "Legal writing", title: "Case memo", description: "Apply the assigned case to the hypothetical facts.", subjectDomain: "general", deliverable: "legal_memo", legacyMode: "research", artifactType: "research_paper" },
    { className: "Seminar", title: "Module A", description: "Complete the task that we discussed.", subjectDomain: "general", deliverable: "general_response", legacyMode: "handoff", artifactType: "submission_note" },
  ])("routes $className / $title by subject and deliverable", ({ className, title, description, ...expected }) => {
    const profile = resolveAssignmentProfile({ kind: "other", className, title, description });
    expect(profile).toMatchObject(expected);
  });

  it("treats an assigned reading as source material and uses directions for the deliverable", () => {
    expect(resolveAssignmentProfile({
      kind: "other",
      className: "Seminar",
      title: "Week 3",
      description: "Read the report and answer the following questions.",
      sourceText: "Annual report with equations and gross domestic product calculations",
    })).toMatchObject({ subjectDomain: "general", deliverable: "worksheet" });
  });

  it("refreshes a recognized automatic legacy profile without replacing a course-mode profile", () => {
    const profile = {
      ...resolveAssignmentProfile({ kind: "other", title: "Accounting trial balance" }),
      routingSource: undefined,
    };
    const assignment = { kind: "other" as const, className: "Economics", title: "Market equilibrium model", profile };
    expect(resolveAssignmentProfile({ ...assignment, workProfileSource: "weighted_context" })).toMatchObject({
      subjectDomain: "economics",
      deliverable: "graph_analysis",
      routingSource: "inferred",
    });
    expect(resolveAssignmentProfile({ ...assignment, workProfileSource: "course_mode" })).toMatchObject({
      subjectDomain: "accounting",
      artifactType: "accounting_workbook",
    });
  });

  it("round-trips a selected deliverable without replacing subject tools", () => {
    const assignment = { kind: "other" as const, className: "Economics", title: "Demand model" };
    const original = resolveAssignmentProfile(assignment);
    const selected = resolveAssignmentProfile({ ...assignment, profile: original, deliverableOverride: "report" });
    expect(selected).toMatchObject({ subjectDomain: "economics", capabilities: original.capabilities, deliverable: "report", routingSource: "student_selected" });
    expect(resolveAssignmentProfile({ ...assignment, profile: selected })).toEqual(selected);
    expect(resolveAssignmentProfile({ ...assignment, profile: selected, subjectOverride: "social_studies" })).toMatchObject({
      subjectDomain: "social_studies",
      deliverable: "report",
      capabilities: ["rich_text"],
    });
  });

  it("identifies a law class separately from the deliverable and preserves the general tool contract", () => {
    const legalReport = resolveAssignmentProfile({ kind: "other", className: "Introduction to Law", title: "Research report" });
    const historyBrief = resolveAssignmentProfile({ kind: "other", className: "U.S. History", title: "Case brief" });
    expect(setupSubjectForAssignmentProfile(legalReport)).toBe("legal_studies");
    expect(legalReport).toMatchObject({ subjectDomain: "general", deliverable: "report", capabilities: ["rich_text"] });
    expect(setupSubjectForAssignmentProfile(historyBrief)).toBe("social_studies");
    expect(historyBrief.deliverable).toBe("legal_case_brief");
  });

  it("round-trips Legal studies and a subsequent General selection independently of format", () => {
    const assignment = { kind: "other" as const, className: "Introduction to Law", title: "Case brief" };
    const selected = resolveAssignmentProfile({ ...assignment, subjectOverride: "legal_studies" });
    expect(selected.legalCoursework).toBe(true);
    expect(resolveAssignmentProfile({ ...assignment, profile: selected })).toEqual(selected);
    const general = resolveAssignmentProfile({ ...assignment, profile: selected, subjectOverride: "general" });
    const restored = resolveAssignmentProfile({ ...assignment, profile: general });
    expect(setupSubjectForAssignmentProfile(restored)).toBe("general");
    expect(restored.deliverable).toBe("legal_case_brief");
  });
});
