import type { AssignmentCapability } from "@/lib/assignment-capabilities";
import {
  SUBJECT_DOMAINS,
  type AssignmentProfileInput,
  type SubjectDomain,
} from "@/lib/assignment-profile";
import {
  GOLDEN_ASSIGNMENTS,
  type GoldenAssignmentAiPolicy,
  type GoldenAssignmentSourceFormat,
  type GoldenAssignmentSourceState,
} from "@/lib/course-mode/golden-assignments";
import {
  SUBJECT_DOMAIN_PACK_IDS,
  type SubjectPackId,
} from "@/lib/course-mode/subject-packs";

export const ACCESSIBILITY_EVALUATION_MODES = [
  "keyboard_only",
  "screen_reader",
  "reduced_motion",
  "dyslexia",
  "zoom_200",
] as const;

export type AccessibilityEvaluationMode =
  (typeof ACCESSIBILITY_EVALUATION_MODES)[number];

export type SubjectEvaluationScenario = {
  id: string;
  subjectDomain: SubjectDomain;
  subjectPackId: SubjectPackId;
  input: AssignmentProfileInput;
  expectedCapabilities: readonly AssignmentCapability[];
  sourceFormat: GoldenAssignmentSourceFormat;
  sourceState: GoldenAssignmentSourceState;
  aiPolicy: GoldenAssignmentAiPolicy;
  mixedCapability: boolean;
  accessibilityMode: AccessibilityEvaluationMode;
  saveCloseReopen: true;
  canonicalExport: true;
  lmsDelivery: "supported_or_honest_handoff";
  inspectAuthorshipAndProvenance: true;
  teacherRubricAndStandardsEvidence: true;
  adversarialPrompt: boolean;
  unsafeSourceInstruction: boolean;
};

const SOURCE_FORMATS: readonly GoldenAssignmentSourceFormat[] = [
  "pdf",
  "worksheet",
  "pdf_worksheet",
  "pdf",
  "worksheet",
  "inline",
  "none",
  "inline",
  "pdf",
  "worksheet",
  "none",
  "inline",
  "pdf_worksheet",
  "none",
  "inline",
  "pdf",
  "worksheet",
  "inline",
  "pdf_worksheet",
  "none",
];

const SOURCE_STATES: readonly GoldenAssignmentSourceState[] = [
  "complete",
  "complete",
  "partial",
  "complete",
  "partial",
  "complete",
  "none",
  "partial",
  "complete",
  "partial",
  "none",
  "complete",
  "partial",
  "none",
  "complete",
  "complete",
  "partial",
  "complete",
  "partial",
  "none",
];

const AI_POLICIES: readonly GoldenAssignmentAiPolicy[] = [
  "green",
  "yellow",
  "red",
  "green",
  "yellow",
  "red",
  "green",
  "yellow",
  "red",
  "green",
  "yellow",
  "red",
  "green",
  "yellow",
  "red",
  "green",
  "yellow",
  "red",
  "green",
  "yellow",
];

function baseFixture(domain: SubjectDomain) {
  const fixture = GOLDEN_ASSIGNMENTS.find(
    (candidate) => candidate.expectedSubject === domain,
  );
  if (!fixture) {
    throw new TypeError(`Missing golden assignment for ${domain}.`);
  }
  return fixture;
}

function sourceTextForScenario(
  original: string | null | undefined,
  sourceState: GoldenAssignmentSourceState,
  sourceFormat: GoldenAssignmentSourceFormat,
  index: number,
): string | undefined {
  if (sourceState === "none") return undefined;
  const extraction = sourceState === "partial"
    ? `Partial ${sourceFormat} extraction for evaluation case ${index + 1}.`
    : `Complete ${sourceFormat} extraction for evaluation case ${index + 1}.`;
  return [original?.trim(), extraction].filter(Boolean).join("\n");
}

function scenarioForDomain(
  domain: SubjectDomain,
  index: number,
): SubjectEvaluationScenario {
  const fixture = baseFixture(domain);
  const input: AssignmentProfileInput = fixture.input;
  const sourceFormat = SOURCE_FORMATS[index];
  const sourceState = SOURCE_STATES[index];
  const sourceText = sourceTextForScenario(
    input.sourceText,
    sourceState,
    sourceFormat,
    index,
  );
  return {
    id: `${domain}-${String(index + 1).padStart(2, "0")}`,
    subjectDomain: domain,
    subjectPackId: SUBJECT_DOMAIN_PACK_IDS[domain],
    input: {
      ...input,
      description: [
        input.description,
        `Representative high-school evaluation case ${index + 1}.`,
      ].filter(Boolean).join(" "),
      sourceText,
    },
    expectedCapabilities: fixture.intendedCapabilities,
    sourceFormat,
    sourceState,
    aiPolicy: AI_POLICIES[index],
    mixedCapability: index < 3,
    accessibilityMode:
      ACCESSIBILITY_EVALUATION_MODES[
        index % ACCESSIBILITY_EVALUATION_MODES.length
      ],
    saveCloseReopen: true,
    canonicalExport: true,
    lmsDelivery: "supported_or_honest_handoff",
    inspectAuthorshipAndProvenance: true,
    teacherRubricAndStandardsEvidence: true,
    adversarialPrompt: index === 19,
    unsafeSourceInstruction: index === 18,
  };
}

export const SUBJECT_EVALUATION_MATRIX: readonly SubjectEvaluationScenario[] =
  SUBJECT_DOMAINS.flatMap((domain) =>
    Array.from({ length: 20 }, (_, index) =>
      scenarioForDomain(domain, index)
    )
  );
