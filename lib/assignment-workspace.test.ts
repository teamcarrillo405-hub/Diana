import { describe, expect, it } from "vitest";
import {
  classifyAssignmentWorkProfile,
  classifyWorkspaceMode,
  firstMoveForWorkspace,
  parseWorkspaceMode,
  resolveWorkspaceMode,
  selectedWorkspaceProfile,
  WORKSPACE_MODE_LABEL,
  WORKSPACE_MODE_REGISTRY,
  WORKSPACE_MODES,
  workProfilePersistencePatch,
} from "./assignment-workspace";

describe("assignment workspace registry", () => {
  it("defines metadata and signals for every supported mode", () => {
    expect(Object.keys(WORKSPACE_MODE_REGISTRY)).toEqual([...WORKSPACE_MODES]);

    for (const mode of WORKSPACE_MODES) {
      expect(WORKSPACE_MODE_REGISTRY[mode].mode).toBe(mode);
      expect(WORKSPACE_MODE_LABEL[mode]).toBe(WORKSPACE_MODE_REGISTRY[mode].label);
      expect(firstMoveForWorkspace(mode)).toBe(WORKSPACE_MODE_REGISTRY[mode].firstMove);
      expect(WORKSPACE_MODE_REGISTRY[mode].signals.length).toBeGreaterThan(0);
    }
  });
});

describe("assignment workspace classification", () => {
  it("uses specific assignment kinds before weak conflicting text heuristics", () => {
    const cases = [
      [{ kind: "problem_set", className: "English", title: "Essay practice" }, "math"],
      [{ kind: "lab", className: "Math", title: "Equation experiment" }, "lab"],
      [{ kind: "essay", className: "Biology", title: "Lab reflection" }, "writing"],
      [{ kind: "reading", className: "Computer Science", title: "Python article" }, "reading"],
    ] as const;

    for (const [input, mode] of cases) {
      const result = classifyWorkspaceMode(input);
      expect(result).toMatchObject({
        mode,
        confidence: 0.98,
        source: "assignment_kind",
      });
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(resolveWorkspaceMode(input)).toBe(mode);
    }
  });

  it("lets strong subject evidence override a generic assignment kind", () => {
    expect(classifyWorkspaceMode({
      kind: "presentation",
      className: "AP US History",
      title: "Civil Rights DBQ",
      description: "Use the primary-source documents to build a historical argument.",
    })).toMatchObject({ mode: "history", source: "weighted_context" });

    expect(classifyWorkspaceMode({
      kind: "essay",
      className: "English",
      title: "Annotated bibliography",
      description: "Research and cite four credible sources before drafting.",
    })).toMatchObject({ mode: "research", source: "weighted_context" });
  });

  it.each([
    ["math", { kind: "other", className: "Algebra I", title: "Quadratic review" }],
    ["worksheet", { kind: "other", title: "Practice worksheet", description: "Answer questions 1 through 20." }],
    ["writing", { kind: "other", title: "Argumentative essay", rubric: "Include a clear thesis." }],
    ["research", { kind: "other", title: "Annotated bibliography", description: "Cite three credible sources." }],
    ["history", { kind: "other", className: "AP US History", title: "DBQ source analysis" }],
    ["lab", { kind: "other", className: "Earth Science", title: "Field investigation", description: "Record observations and data." }],
    ["reading", { kind: "other", className: "English", title: "Annotate the article" }],
    ["language", { kind: "other", className: "Spanish II", title: "Oral vocabulary practice" }],
    ["coding", { kind: "other", className: "Computer Science", title: "Debug the Python program" }],
    ["art", { kind: "other", className: "Art", title: "Portfolio critique and artist statement" }],
    ["project", { kind: "other", className: "STEM", title: "Build a model project", rubric: "List each deliverable." }],
    ["handoff", { kind: "other", className: "Advisory", title: "Bring permission slip to class" }],
  ] as const)("uses weighted context to classify %s work", (mode, input) => {
    const result = classifyWorkspaceMode(input);
    expect(result.mode).toBe(mode);
    expect(result.source).toBe("weighted_context");
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.confidence).toBeLessThanOrEqual(0.97);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("aggregates evidence instead of accepting the first regex match", () => {
    const result = classifyWorkspaceMode({
      kind: "other",
      className: "English",
      title: "Read the research article",
      description: "Create an annotated bibliography and cite four credible sources.",
      rubric: "The bibliography needs complete citations.",
    });

    expect(result.mode).toBe("research");
    expect(result.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining("research deliverable"),
      expect.stringContaining("research process"),
    ]));
  });

  it("falls back with low confidence when no useful signal exists", () => {
    expect(classifyAssignmentWorkProfile({
      kind: "other",
      className: "Advisory",
      title: "Friday task",
    })).toEqual({
      mode: "handoff",
      confidence: 0.25,
      reasons: ["No supported work-profile signals were found; use the general assignment response."],
      source: "fallback",
    });
  });

  it("keeps a valid persisted profile stable and ignores an invalid one", () => {
    expect(classifyWorkspaceMode(
      { kind: "essay", title: "Essay" },
      { mode: "coding", source: "student_selected" },
    )).toMatchObject({
      mode: "coding",
      confidence: 1,
      source: "student_selected",
    });

    expect(classifyWorkspaceMode({
      kind: "other",
      title: "Python debugging",
      workProfile: "not-a-mode",
      workProfileSource: "student_selected",
    }).mode).toBe("coding");
  });

  it("builds database-ready persistence patches for classified and selected profiles", () => {
    const selected = selectedWorkspaceProfile("history");
    expect(selected).toEqual({
      mode: "history",
      confidence: 1,
      reasons: ["The student selected History and DBQ."],
      source: "student_selected",
    });
    expect(workProfilePersistencePatch(selected)).toEqual({
      work_profile: "history",
      work_profile_source: "student_selected",
    });
  });

  it("only accepts known student-selected workspace modes", () => {
    expect(parseWorkspaceMode("writing")).toBe("writing");
    expect(parseWorkspaceMode("Writing")).toBeNull();
    expect(parseWorkspaceMode("unknown")).toBeNull();
    expect(parseWorkspaceMode(null)).toBeNull();
  });
});