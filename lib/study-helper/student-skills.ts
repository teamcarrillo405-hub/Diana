import type { AssignmentWorkProfile } from "@/lib/assignment-profile";
import type { AssignmentKind } from "@/lib/supabase/types";
import type { SupportIntensity } from "@/lib/support/policy";

export const STUDENT_STUDY_SKILL_IDS = [
  "guided_help",
  "visual_breakdown",
  "practice_test",
  "flashcards",
  "study_guide",
  "check_work",
  "subject_tools",
] as const;

export type StudentStudySkillId = (typeof STUDENT_STUDY_SKILL_IDS)[number];
export type StudentStudyAiMode = "red" | "yellow" | "green";

type CoachDestination = {
  kind: "coach";
  mode: "guide" | "hint" | "quiz";
};

type ArtifactDestination = {
  kind: "artifact";
  artifactType: "study_guide" | "practice_test" | "flashcard_set";
  studyMode: "guided_steps" | "visual_breakdown" | "retrieval_quiz" | "flashcard_builder";
};

type WorkspaceDestination = {
  kind: "workspace";
  anchor: "assignment-work" | "ask-diana" | "subject-tools";
};

export type StudentStudyDestination = CoachDestination | ArtifactDestination | WorkspaceDestination;

export type StudentStudySkill = {
  id: StudentStudySkillId;
  label: string;
  description: string;
  allowedAiModes: readonly StudentStudyAiMode[];
  requiresSource: boolean;
  destination: StudentStudyDestination;
};

function defineStudentStudySkill(skill: StudentStudySkill): StudentStudySkill {
  return Object.freeze(skill);
}

export const STUDENT_STUDY_SKILLS = Object.freeze({
  guided_help: defineStudentStudySkill({
    id: "guided_help",
    label: "Guided help",
    description: "Work through one grounded step at a time.",
    allowedAiModes: ["green"],
    requiresSource: false,
    destination: { kind: "coach", mode: "guide" },
  }),
  visual_breakdown: defineStudentStudySkill({
    id: "visual_breakdown",
    label: "Visual breakdown",
    description: "Turn the source into a structured visual study guide.",
    allowedAiModes: ["green"],
    requiresSource: true,
    destination: { kind: "artifact", artifactType: "study_guide", studyMode: "visual_breakdown" },
  }),
  practice_test: defineStudentStudySkill({
    id: "practice_test",
    label: "Practice test",
    description: "Practice retrieval using the assignment source material.",
    allowedAiModes: ["green"],
    requiresSource: true,
    destination: { kind: "artifact", artifactType: "practice_test", studyMode: "retrieval_quiz" },
  }),
  flashcards: defineStudentStudySkill({
    id: "flashcards",
    label: "Flashcards",
    description: "Build source-anchored cards for terms and facts.",
    allowedAiModes: ["green"],
    requiresSource: true,
    destination: { kind: "artifact", artifactType: "flashcard_set", studyMode: "flashcard_builder" },
  }),
  study_guide: defineStudentStudySkill({
    id: "study_guide",
    label: "Study guide",
    description: "Organize the source into a focused review guide.",
    allowedAiModes: ["green"],
    requiresSource: true,
    destination: { kind: "artifact", artifactType: "study_guide", studyMode: "guided_steps" },
  }),
  check_work: defineStudentStudySkill({
    id: "check_work",
    label: "Check my work",
    description: "Review student-authored work against the assignment source.",
    allowedAiModes: ["yellow", "green"],
    requiresSource: false,
    destination: { kind: "workspace", anchor: "ask-diana" },
  }),
  subject_tools: defineStudentStudySkill({
    id: "subject_tools",
    label: "Subject tools",
    description: "Use the assignment's native workspace tools.",
    allowedAiModes: ["red", "yellow", "green"],
    requiresSource: false,
    destination: { kind: "workspace", anchor: "subject-tools" },
  }),
} satisfies Record<StudentStudySkillId, StudentStudySkill>);

export type StudentStudySelectionInput = {
  assignmentKind: AssignmentKind;
  profile: AssignmentWorkProfile;
  aiMode: StudentStudyAiMode;
  hasSourceMaterial: boolean;
  hasStudentWork: boolean;
  supportIntensity?: SupportIntensity | null;
  requestedSkill?: string | null;
};

export type StudentStudySelection = {
  skill: StudentStudySkill;
  reason: string;
  requestedSkillHonored: boolean;
  policyFallback: boolean;
};

export function parseStudentStudySkillId(value: string | null | undefined): StudentStudySkillId | null {
  return STUDENT_STUDY_SKILL_IDS.includes(value as StudentStudySkillId)
    ? value as StudentStudySkillId
    : null;
}

export function selectStudentStudySkill(input: StudentStudySelectionInput): StudentStudySelection {
  const requestedId = parseStudentStudySkillId(input.requestedSkill);
  if (requestedId) {
    const requested = STUDENT_STUDY_SKILLS[requestedId];
    if (isEligible(requested, input)) {
      return selection(requested, "You chose this study action.", true, false);
    }
  }

  if (input.aiMode === "red") {
    return selection(
      STUDENT_STUDY_SKILLS.subject_tools,
      "Diana opened the assignment's student-controlled tools for this workspace.",
      false,
      Boolean(requestedId),
    );
  }

  if (input.aiMode === "green" && (input.supportIntensity === "one_move" || input.supportIntensity === "recovery")) {
    return selection(
      STUDENT_STUDY_SKILLS.guided_help,
      "Diana is keeping one clear move visible before adding more choices.",
      false,
      Boolean(requestedId),
    );
  }

  if (input.hasStudentWork) {
    if (input.profile.subjectDomain === "mathematics") {
      return selection(
        STUDENT_STUDY_SKILLS.subject_tools,
        "Your math work is already in progress, so Diana opened the problem tools and embedded review.",
        false,
        Boolean(requestedId),
      );
    }
    return selection(
      STUDENT_STUDY_SKILLS.check_work,
      "You already have work in progress, so the next useful move is a grounded review.",
      false,
      Boolean(requestedId),
    );
  }

  if (input.hasSourceMaterial && input.aiMode === "green") {
    if (input.assignmentKind === "test_prep") {
      return selection(STUDENT_STUDY_SKILLS.practice_test, "This is test preparation, so active recall is the strongest next move.", false, Boolean(requestedId));
    }
    if (["social_studies", "world_language"].includes(input.profile.subjectDomain) || input.assignmentKind === "reading") {
      return selection(STUDENT_STUDY_SKILLS.flashcards, "This assignment contains material that benefits from repeated recall.", false, Boolean(requestedId));
    }
    if (["science", "visual_arts", "music", "theatre", "dance", "engineering", "trade_cte", "cad", "advanced_technical_labs"].includes(input.profile.subjectDomain) || ["lab", "presentation"].includes(input.assignmentKind)) {
      return selection(STUDENT_STUDY_SKILLS.visual_breakdown, "This assignment is easier to understand when its parts are organized visually.", false, Boolean(requestedId));
    }
  }

  if (hasNativeSubjectTools(input.profile)) {
    return selection(
      STUDENT_STUDY_SKILLS.subject_tools,
      "This assignment has a purpose-built subject workspace ready to use.",
      false,
      Boolean(requestedId),
    );
  }

  if (input.hasSourceMaterial && input.aiMode === "green") {
    return selection(STUDENT_STUDY_SKILLS.study_guide, "Diana found enough source material to build a grounded study guide.", false, Boolean(requestedId));
  }

  if (input.aiMode === "yellow") {
    return selection(
      STUDENT_STUDY_SKILLS.subject_tools,
      "Diana kept the student-controlled workspace open for structured support.",
      false,
      Boolean(requestedId),
    );
  }
  return selection(
    STUDENT_STUDY_SKILLS.guided_help,
    "Guided help is the safest useful starting point for this assignment.",
    false,
    Boolean(requestedId),
  );
}

function isEligible(skill: StudentStudySkill, input: StudentStudySelectionInput): boolean {
  if (!skill.allowedAiModes.includes(input.aiMode)) return false;
  if (skill.requiresSource && !input.hasSourceMaterial) return false;
  if (skill.id === "check_work" && !input.hasStudentWork) return false;
  if (skill.id === "check_work" && input.profile.subjectDomain === "mathematics") return false;
  return true;
}

function hasNativeSubjectTools(profile: AssignmentWorkProfile): boolean {
  return profile.capabilities.some((capability) => capability !== "rich_text");
}

function selection(
  skill: StudentStudySkill,
  reason: string,
  requestedSkillHonored: boolean,
  policyFallback: boolean,
): StudentStudySelection {
  return { skill, reason, requestedSkillHonored, policyFallback };
}
