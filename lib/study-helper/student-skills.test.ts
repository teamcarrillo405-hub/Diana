import { describe, expect, it } from "vitest";

import { resolveAssignmentProfile } from "@/lib/assignment-profile";
import { selectStudentStudySkill } from "@/lib/study-helper/student-skills";

function profile(className: string, title: string, kind: "other" | "problem_set" | "test_prep" | "reading" | "lab" = "other") {
  return resolveAssignmentProfile({ kind, className, title });
}

describe("selectStudentStudySkill", () => {
  it("routes test preparation with source material to active recall", () => {
    const result = selectStudentStudySkill({
      assignmentKind: "test_prep",
      profile: profile("Biology", "Unit test", "test_prep"),
      aiMode: "green",
      hasSourceMaterial: true,
      hasStudentWork: false,
    });

    expect(result.skill.id).toBe("practice_test");
    expect(result.skill.destination).toMatchObject({ kind: "artifact", artifactType: "practice_test" });
  });

  it("routes existing writing to grounded review", () => {
    const result = selectStudentStudySkill({
      assignmentKind: "essay",
      profile: profile("English 9", "Rhetorical analysis"),
      aiMode: "yellow",
      hasSourceMaterial: true,
      hasStudentWork: true,
    });

    expect(result.skill.id).toBe("check_work");
  });

  it("keeps math work in its native subject tools", () => {
    const result = selectStudentStudySkill({
      assignmentKind: "problem_set",
      profile: profile("Algebra I", "Linear equations", "problem_set"),
      aiMode: "green",
      hasSourceMaterial: true,
      hasStudentWork: true,
    });

    expect(result.skill.id).toBe("subject_tools");
  });

  it("uses one-move guided support before generating more choices", () => {
    const result = selectStudentStudySkill({
      assignmentKind: "reading",
      profile: profile("English 9", "Chapter review", "reading"),
      aiMode: "green",
      hasSourceMaterial: true,
      hasStudentWork: false,
      supportIntensity: "recovery",
    });

    expect(result.skill.id).toBe("guided_help");
  });

  it("honors an eligible explicit request", () => {
    const result = selectStudentStudySkill({
      assignmentKind: "reading",
      profile: profile("World History", "Primary sources", "reading"),
      aiMode: "green",
      hasSourceMaterial: true,
      hasStudentWork: false,
      requestedSkill: "study_guide",
    });

    expect(result.skill.id).toBe("study_guide");
    expect(result.requestedSkillHonored).toBe(true);
  });

  it("falls back to student-controlled tools when artifact generation is not available", () => {
    const result = selectStudentStudySkill({
      assignmentKind: "test_prep",
      profile: profile("Geometry", "Final review", "test_prep"),
      aiMode: "red",
      hasSourceMaterial: true,
      hasStudentWork: false,
      requestedSkill: "practice_test",
    });

    expect(result.skill.id).toBe("subject_tools");
    expect(result.policyFallback).toBe(true);
  });

  it("does not create a source artifact when no source exists", () => {
    const result = selectStudentStudySkill({
      assignmentKind: "other",
      profile: profile("Advisory", "Reflection"),
      aiMode: "green",
      hasSourceMaterial: false,
      hasStudentWork: false,
      requestedSkill: "flashcards",
    });

    expect(result.skill.id).toBe("guided_help");
    expect(result.requestedSkillHonored).toBe(false);
  });

  it("routes technical subjects to their native tools", () => {
    const result = selectStudentStudySkill({
      assignmentKind: "other",
      profile: profile("Computer Science", "Debug a Python loop"),
      aiMode: "yellow",
      hasSourceMaterial: true,
      hasStudentWork: false,
    });

    expect(result.skill.id).toBe("subject_tools");
  });
});
