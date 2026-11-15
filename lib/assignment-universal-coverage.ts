import {
  ASSIGNMENT_CAPABILITIES,
  ASSIGNMENT_CAPABILITY_REGISTRY,
  ASSIGNMENT_INPUT_CHANNELS,
  type AssignmentCapability,
} from "@/lib/assignment-capabilities";
import {
  resolveAssignmentProfile,
  SUBJECT_DOMAINS,
  type AssignmentWorkProfile,
  type SubjectDomain,
} from "@/lib/assignment-profile";
import { subjectPresentationFor } from "@/lib/assignment-subject-presentation";

export type UniversalSubjectCoverage = {
  domain: SubjectDomain;
  profile: AssignmentWorkProfile;
  unitCount: number;
  primaryCapability: AssignmentCapability | null;
  specialistReadiness: "universal" | "ready" | "limited";
  inputChannels: Array<keyof typeof ASSIGNMENT_INPUT_CHANNELS>;
  ready: boolean;
};

const SUBJECT_EXAMPLES: Record<SubjectDomain, { className: string; title: string }> = {
  mathematics: { className: "Algebra 1", title: "Solve linear equations" },
  english_language_arts: { className: "English 9", title: "Rhetorical analysis essay" },
  science: { className: "Chemistry", title: "Reaction-rate laboratory" },
  social_studies: { className: "US History", title: "Nixon document-based question" },
  world_language: { className: "Spanish 2", title: "Recorded conversation and written response" },
  computer_science: { className: "Computer Science", title: "Python functions and tests" },
  visual_arts: { className: "Visual Art", title: "Composition study and artist statement" },
  music: { className: "Music Theory", title: "Music notation and performance reflection" },
  theatre: { className: "Theatre", title: "Monologue rehearsal evidence" },
  dance: { className: "Dance", title: "Choreography practice reflection" },
  physical_education: { className: "Physical Education", title: "Skill practice log" },
  health: { className: "Health Education", title: "Nutrition literacy response" },
  accounting: { className: "Accounting", title: "Journal entries and trial balance" },
  economics: { className: "Economics", title: "Supply and demand analysis" },
  geography: { className: "Geography", title: "Latitude and longitude map analysis" },
  engineering: { className: "Engineering", title: "Prototype design constraints" },
  trade_cte: { className: "Construction Trades", title: "Teacher-approved shop procedure evidence" },
  cad: { className: "CAD", title: "Dimensioned 3D model package" },
  advanced_technical_labs: { className: "Advanced Technical Lab", title: "Instrumentation lab data analysis" },
  interdisciplinary: { className: "Interdisciplinary Studies", title: "Research project package" },
  general: { className: "Advisory", title: "Complete the attached worksheet" },
};

export function auditUniversalSubjectCoverage(): UniversalSubjectCoverage[] {
  return SUBJECT_DOMAINS.map((domain) => {
    const example = SUBJECT_EXAMPLES[domain];
    const profile = profileForDomain(domain, example);
    const presentation = subjectPresentationFor(profile, {});
    const primaryCapability = presentation.primaryCapability;
    const specialistReadiness = primaryCapability
      ? ASSIGNMENT_CAPABILITY_REGISTRY[primaryCapability].implementation
      : "universal";
    const inputChannels = Object.keys(ASSIGNMENT_INPUT_CHANNELS) as Array<keyof typeof ASSIGNMENT_INPUT_CHANNELS>;
    return {
      domain,
      profile,
      unitCount: presentation.units.length,
      primaryCapability,
      specialistReadiness,
      inputChannels,
      ready: presentation.units.length > 0 &&
        profile.capabilities.every((capability) => ASSIGNMENT_CAPABILITIES.includes(capability)) &&
        inputChannels.length === 5,
    };
  });
}

function profileForDomain(
  domain: SubjectDomain,
  example: { className: string; title: string },
): AssignmentWorkProfile {
  if (domain === "interdisciplinary" || domain === "general") {
    return resolveAssignmentProfile({
      kind: "other",
      className: example.className,
      title: example.title,
      workProfile: domain === "interdisciplinary" ? "project" : "worksheet",
    });
  }
  return resolveAssignmentProfile({
    kind: "other",
    className: example.className,
    title: example.title,
  });
}
