import type {
  AssignmentTaskIntent,
  AssignmentWorkProfile,
  SubjectDomain,
} from "@/lib/assignment-profile";
import type { AssignmentSourcePacket } from "@/lib/assignment-sources";
import type { HomeworkMasteryReadiness } from "@/lib/mastery/homework-readiness";
import {
  subjectPackForDomain,
  type StandardsFrameworkHint,
  type SubjectPackArtifactExpectation,
  type SubjectPackId,
  type SubjectPackReviewRule,
} from "@/lib/course-mode/subject-packs";
import type {
  ReadinessCheckIn,
  SupportIntensity,
} from "@/lib/support/policy";

export const HOMEWORK_HELP_LEVELS = [30, 45, 60, 75] as const;

export type HomeworkHelpLevel = (typeof HOMEWORK_HELP_LEVELS)[number];

export type HomeworkAttemptSignals = {
  incorrectAttempts?: number;
  stuckRequests?: number;
  directAnswerRequests?: number;
  studentSaysConfused?: boolean;
  lowConfidenceExtraction?: boolean;
};

export type HomeworkLearnerContext = {
  schoolYear: number | null;
  tutorComplexity: "simple" | "balanced" | "advanced";
  targetAcademicLevel: "unknown" | "grade_level" | "advanced_high_school" | "college_intro" | "college_advanced";
  prerequisiteBridgeRequired: boolean;
};

export type HomeworkHelpContract = {
  helpLevel: HomeworkHelpLevel;
  explanationShare: string;
  studentOwnedBoundary: string;
  presentationSupports: string[];
  escalationReason: string;
  stopBeforeAnswer: boolean;
};

export type SubjectMethodology = {
  domain: SubjectDomain;
  subjectPackId: SubjectPackId;
  subjectPackLabel: string;
  workUnitStrategy: string;
  studentOutput: string;
  reviewAction: string;
  visualSupports: string[];
  nativeTools: string[];
  helpByLevel: Record<HomeworkHelpLevel, string>;
  packMethodology: string[];
  evidenceExpectations: SubjectPackArtifactExpectation[];
  reviewRules: SubjectPackReviewRule[];
  standardsFrameworkHints: StandardsFrameworkHint[];
  safetyDignityConstraints: string[];
};

type BaseSubjectMethodology = Omit<
  SubjectMethodology,
  | "subjectPackId"
  | "subjectPackLabel"
  | "packMethodology"
  | "evidenceExpectations"
  | "reviewRules"
  | "standardsFrameworkHints"
  | "safetyDignityConstraints"
>;

export type AssignmentUnderstanding = {
  profile: AssignmentWorkProfile;
  sourceState: "no_source" | "metadata_only" | "source_ready" | "source_partial" | "source_failed";
  workUnits: string[];
  sourceSummary: string;
  needsStudentConfirmation: boolean;
  methodology: SubjectMethodology;
  helpContract: HomeworkHelpContract;
  learnerContext: HomeworkLearnerContext;
  masteryReadiness: HomeworkMasteryReadiness;
};

const HELP_BY_LEVEL: Record<HomeworkHelpLevel, string> = {
  30: "Ask one guiding question, give one cue, and require the student to make the next move.",
  45: "Add a visual or sentence frame, show the setup, and stop before the key transformation.",
  60: "Complete the first transformation or first structural move, explain why, then ask the student to continue.",
  75: "Give most of the structure and worked setup, but leave the final answer, final wording, or final choice student-owned.",
};

const BASE_METHOD_BY_DOMAIN: Record<SubjectDomain, BaseSubjectMethodology> = {
  mathematics: {
    domain: "mathematics",
    workUnitStrategy: "Split into one problem at a time, preserving problem number, prompt, student work, and the next mathematical operation.",
    studentOutput: "Equation steps, graph/table work, and a final checked answer written by the student.",
    reviewAction: "Check the current line, identify the next valid operation, and use a visual layout when symbols are hard to hold in working memory.",
    visualSupports: ["vertical equation steps", "balance model", "number line", "coordinate plane", "table"],
    nativeTools: ["equation editor", "graphing", "scratch work"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Show the equation setup or visual model and ask the student to do the operation.",
      60: "Do the first inverse operation, then ask the student to simplify the next line.",
      75: "Set up every operation except the final simplification or answer check.",
    },
  },
  english_language_arts: {
    domain: "english_language_arts",
    workUnitStrategy: "Split into claim, evidence, explanation, organization, and revision passes.",
    studentOutput: "Student-authored claim, paragraph, essay, or reading response with source references.",
    reviewAction: "Check whether the student's claim, evidence, and explanation match the prompt and rubric.",
    visualSupports: ["claim evidence reasoning frame", "paragraph map", "quote sandwich", "revision checklist"],
    nativeTools: ["rich text editor", "source cards"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Give a sentence frame or paragraph map, but leave the actual claim or wording to the student.",
      60: "Model one example connection between evidence and reasoning, then ask the student to write the next sentence.",
      75: "Provide a detailed outline and sentence starters without writing the final paragraph for the student.",
    },
  },
  science: {
    domain: "science",
    workUnitStrategy: "Split into purpose, hypothesis, variables, procedure, data, claim, evidence, and reasoning.",
    studentOutput: "Lab table, observation notes, calculation work, graph, and student-written conclusion.",
    reviewAction: "Check variable control, data use, units, and whether the conclusion follows the evidence.",
    visualSupports: ["variables table", "CER organizer", "data table", "process diagram", "graph"],
    nativeTools: ["data table", "graphing", "procedure checklist"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Give the lab organizer and ask the student to fill the next variable or observation.",
      60: "Place one data point or variable correctly, then ask the student to continue the pattern.",
      75: "Build the lab structure and evidence map, leaving the final claim or interpretation student-owned.",
    },
  },
  social_studies: {
    domain: "social_studies",
    workUnitStrategy: "Split into source read, context, author purpose, evidence, claim, and synthesis.",
    studentOutput: "Source notes, evidence table, claim, and DBQ or history response in the student's words.",
    reviewAction: "Check source grounding, historical context, evidence selection, and claim clarity.",
    visualSupports: ["source analysis grid", "timeline", "claim evidence context map"],
    nativeTools: ["source cards", "rich text editor"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Give a source-analysis frame and ask the student to choose the relevant evidence.",
      60: "Model one source-to-claim connection, then ask the student to apply it to the next source.",
      75: "Build the evidence structure and context prompts, leaving the final thesis and wording student-owned.",
    },
  },
  world_language: {
    domain: "world_language",
    workUnitStrategy: "Split into prompt meaning, vocabulary, grammar pattern, student attempt, and correction.",
    studentOutput: "Student-written or spoken response, vocabulary notes, and corrected practice attempt.",
    reviewAction: "Check meaning, grammar pattern, word order, and pronunciation or listening notes when available.",
    visualSupports: ["conjugation table", "sentence pattern", "vocabulary card", "pronunciation notes"],
    nativeTools: ["rich text editor", "audio review"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Show the grammar pattern and ask the student to fill the missing word or ending.",
      60: "Correct one phrase or conjugation, explain the pattern, then ask for the next attempt.",
      75: "Give the structure and vocabulary options, but leave the final sentence or spoken response to the student.",
    },
  },
  computer_science: {
    domain: "computer_science",
    workUnitStrategy: "Split into requirements, input/output, pseudocode, tests, implementation, and debugging.",
    studentOutput: "Student-authored code, tests, explanation, and debugging notes.",
    reviewAction: "Check the failing behavior, isolate the smallest test, and explain the concept before showing code changes.",
    visualSupports: ["input/output table", "flowchart", "trace table", "error map"],
    nativeTools: ["code runner", "rich text editor"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Give pseudocode or a failing test, but do not write the implementation.",
      60: "Fix or trace one small line conceptually, then ask the student to apply the pattern.",
      75: "Provide a near-complete algorithm outline and tests, leaving final code edits student-owned.",
    },
  },
  visual_arts: {
    domain: "visual_arts",
    workUnitStrategy: "Split into prompt, constraints, reference, thumbnail, draft, critique, and artist statement.",
    studentOutput: "Sketches, design notes, final artwork evidence, and student reflection.",
    reviewAction: "Check composition, rubric alignment, process evidence, and whether the student can explain choices.",
    visualSupports: ["composition grid", "thumbnail sequence", "rubric checklist", "critique frame"],
    nativeTools: ["drawing canvas", "design notebook"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Offer a composition frame or critique question, leaving the creative choice to the student.",
      60: "Model one revision option and ask the student to choose or adapt it.",
      75: "Map the full process and rubric needs, leaving the final creative decision student-owned.",
    },
  },
  music: {
    domain: "music",
    workUnitStrategy: "Split into rhythm, pitch, notation, practice recording, feedback, and revision.",
    studentOutput: "Notation, practice log, audio evidence, and student reflection.",
    reviewAction: "Check notation requirements, timing, phrasing, and practice evidence without replacing performance.",
    visualSupports: ["measure map", "rhythm count", "notation checklist", "practice log"],
    nativeTools: ["music notation", "audio review", "performance log"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Show the count or notation pattern and ask the student to fill the next measure.",
      60: "Correct one measure or rhythm pattern, then ask the student to apply it.",
      75: "Set up the full notation plan, leaving final notes or performance choices student-owned.",
    },
  },
  theatre: {
    domain: "theatre",
    workUnitStrategy: "Split into script understanding, beats, blocking, rehearsal evidence, critique, and reflection.",
    studentOutput: "Annotated script, rehearsal notes, performance evidence, and reflection.",
    reviewAction: "Check objective, pacing, text evidence, and performance reflection.",
    visualSupports: ["beat map", "blocking sketch", "performance checklist"],
    nativeTools: ["video review", "audio review", "performance log"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Give a beat map or rehearsal prompt, leaving acting choices to the student.",
      60: "Model one beat or reflection connection, then ask the student to apply it.",
      75: "Structure the performance analysis, leaving final choices and reflection student-owned.",
    },
  },
  dance: {
    domain: "dance",
    workUnitStrategy: "Split into movement phrase, counts, rehearsal evidence, feedback, and reflection.",
    studentOutput: "Choreography notes, rehearsal log, video evidence when allowed, and reflection.",
    reviewAction: "Check counts, intent, movement quality, safety, and reflection against the assignment.",
    visualSupports: ["count map", "movement phrase notes", "performance checklist"],
    nativeTools: ["video review", "performance log"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Give a count map or reflection prompt, leaving the movement choice to the student.",
      60: "Model one revision cue, then ask the student to apply it safely.",
      75: "Structure the choreography reflection and practice plan, leaving performance choices student-owned.",
    },
  },
  physical_education: {
    domain: "physical_education",
    workUnitStrategy: "Split into skill goal, safe practice plan, evidence, reflection, and next adjustment.",
    studentOutput: "Movement log, skill evidence, and student reflection without body-size metrics.",
    reviewAction: "Check skill practice, safety, consistency, and reflection against the PE prompt.",
    visualSupports: ["practice log", "skill checklist", "safe progression ladder"],
    nativeTools: ["performance log", "video review"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Give a safe practice checklist and ask the student to choose the next skill action.",
      60: "Fill one practice-log example, then ask the student to record their actual evidence.",
      75: "Create the full reflection frame, leaving personal evidence and final reflection student-owned.",
    },
  },
  health: {
    domain: "health",
    workUnitStrategy: "Split into classroom question, factual concept, trusted source, reflection boundary, and answer.",
    studentOutput: "Class-based answer or reflection using factual, non-medical language.",
    reviewAction: "Keep support educational, avoid medical advice, and check that personal details are not overshared.",
    visualSupports: ["fact reflection boundary", "decision tree", "trusted adult cue"],
    nativeTools: ["rich text editor", "audio review"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Give a factual answer frame and ask the student to fill the class term or source detail.",
      60: "Model one factual explanation, then ask the student to write their own reflection sentence.",
      75: "Structure the whole response while keeping personal health choices and final wording student-owned.",
    },
  },
  accounting: {
    domain: "accounting",
    workUnitStrategy: "Split into transaction, accounts affected, debit/credit, journal entry, ledger, and explanation.",
    studentOutput: "Ledger, spreadsheet, calculations, and written explanation.",
    reviewAction: "Check account classification, debit/credit balance, math, and explanation.",
    visualSupports: ["T-account", "journal-entry table", "trial balance", "spreadsheet"],
    nativeTools: ["accounting ledger", "spreadsheet", "equation editor"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Show the account table and ask the student to choose debit or credit.",
      60: "Classify one side of the transaction, then ask the student to complete the entry.",
      75: "Set up the ledger and trial-balance checks, leaving final postings student-owned.",
    },
  },
  economics: {
    domain: "economics",
    workUnitStrategy: "Split into concept, data/source, graph or model, explanation, and policy/effect claim.",
    studentOutput: "Graph, table, short analysis, and source-grounded explanation.",
    reviewAction: "Check model choice, graph labels, cause/effect reasoning, and evidence.",
    visualSupports: ["supply-demand graph", "cause/effect table", "data chart"],
    nativeTools: ["graphing", "spreadsheet", "rich text editor"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Show the graph frame or model labels, then ask the student to place the first curve or point.",
      60: "Place one model element and explain it, then ask the student to finish the effect.",
      75: "Structure the graph and analysis, leaving the final interpretation student-owned.",
    },
  },
  geography: {
    domain: "geography",
    workUnitStrategy: "Split into map prompt, place/data, spatial pattern, evidence, and explanation.",
    studentOutput: "Map annotations, spatial analysis, and source-grounded response.",
    reviewAction: "Check map evidence, scale, legend, spatial pattern, and privacy around exact location data.",
    visualSupports: ["map annotation", "legend checklist", "spatial pattern grid"],
    nativeTools: ["map workspace", "drawing canvas", "spreadsheet"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Give the map-reading frame and ask the student to identify one visible pattern.",
      60: "Model one pattern-to-evidence statement, then ask the student to find the next one.",
      75: "Structure the map analysis, leaving final pattern claim student-owned.",
    },
  },
  engineering: {
    domain: "engineering",
    workUnitStrategy: "Split into problem, constraints, criteria, sketch, calculations, prototype, test, and iteration.",
    studentOutput: "Design notebook, calculations, prototype evidence, and reflection.",
    reviewAction: "Check constraints, calculations, test evidence, and iteration logic.",
    visualSupports: ["design process loop", "constraint matrix", "prototype sketch", "test table"],
    nativeTools: ["design notebook", "CAD workspace", "spreadsheet", "drawing canvas"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Give a constraint matrix and ask the student to fill the first requirement.",
      60: "Model one design-test connection, then ask the student to choose the next iteration.",
      75: "Set up the full design notebook, leaving final design decisions student-owned.",
    },
  },
  trade_cte: {
    domain: "trade_cte",
    workUnitStrategy: "Split into task, safety checks, materials/tools, procedure, evidence, and reflection.",
    studentOutput: "Procedure checklist, evidence log, and student reflection.",
    reviewAction: "Check safety language, procedure order, tool/material accuracy, and evidence.",
    visualSupports: ["procedure checklist", "materials table", "safety stop card"],
    nativeTools: ["procedure checklist", "design notebook", "video review"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Give the safety/procedure checklist and ask the student to complete the next safe step.",
      60: "Fill one procedure row as a model, then ask the student to continue.",
      75: "Structure the full evidence log, leaving actual evidence and reflection student-owned.",
    },
  },
  cad: {
    domain: "cad",
    workUnitStrategy: "Split into requirements, dimensions, sketch, model steps, file export, and reflection.",
    studentOutput: "Dimensioned sketch, CAD notes, exported file evidence, and reflection.",
    reviewAction: "Check dimensions, constraints, file requirements, and design reasoning.",
    visualSupports: ["dimension checklist", "modeling step list", "orthographic sketch"],
    nativeTools: ["CAD workspace", "drawing canvas", "design notebook"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Give the dimension checklist and ask the student to mark the first required measurement.",
      60: "Model one CAD operation plan, then ask the student to apply it.",
      75: "Build the modeling checklist, leaving final geometry and file choices student-owned.",
    },
  },
  advanced_technical_labs: {
    domain: "advanced_technical_labs",
    workUnitStrategy: "Split into objective, safety, setup, data capture, analysis, error check, and conclusion.",
    studentOutput: "Procedure checklist, data table, calculations, graph, and conclusion.",
    reviewAction: "Check safety, instrument setup, units, data quality, and conclusion.",
    visualSupports: ["instrument setup checklist", "data table", "error analysis chart", "CER organizer"],
    nativeTools: ["procedure checklist", "data lab", "spreadsheet", "graphing"],
    helpByLevel: {
      ...HELP_BY_LEVEL,
      45: "Give the setup/data table and ask the student to enter the first observed value or unit.",
      60: "Model one data-quality or calculation check, then ask the student to continue.",
      75: "Structure the full lab analysis, leaving final interpretation student-owned.",
    },
  },
  interdisciplinary: {
    domain: "interdisciplinary",
    workUnitStrategy: "Split into deliverable, sources, work products, milestones, review, and hand-in.",
    studentOutput: "Project package with student-created components and reflection.",
    reviewAction: "Check deliverables against the rubric and identify the next smallest product move.",
    visualSupports: ["project board", "rubric checklist", "milestone map"],
    nativeTools: ["design notebook", "rich text editor"],
    helpByLevel: HELP_BY_LEVEL,
  },
  general: {
    domain: "general",
    workUnitStrategy: "Split into exact directions, required output, first response, review, and hand-in.",
    studentOutput: "Student-authored response or upload-ready note.",
    reviewAction: "Check the response against the exact directions and required hand-in format.",
    visualSupports: ["directions checklist", "response frame"],
    nativeTools: ["rich text editor"],
    helpByLevel: HELP_BY_LEVEL,
  },
};

export function resolveHomeworkHelpContract(input: {
  supportIntensity?: SupportIntensity | null;
  readiness?: ReadinessCheckIn | null;
  attempts?: HomeworkAttemptSignals | null;
}): HomeworkHelpContract {
  const attempts = input.attempts ?? {};
  const helpLevel = helpLevelForAttempts(attempts);
  return {
    helpLevel,
    explanationShare: HELP_BY_LEVEL[helpLevel],
    studentOwnedBoundary: boundaryForLevel(helpLevel),
    presentationSupports: presentationSupportsFor(input.supportIntensity, input.readiness, attempts),
    escalationReason: escalationReasonFor(helpLevel, input.supportIntensity, input.readiness, attempts),
    stopBeforeAnswer: helpLevel < 75,
  };
}

export function methodologyForProfile(profile: AssignmentWorkProfile): SubjectMethodology {
  const base = BASE_METHOD_BY_DOMAIN[profile.subjectDomain] ?? BASE_METHOD_BY_DOMAIN.general;
  const pack = subjectPackForDomain(profile.subjectDomain);
  return {
    ...base,
    subjectPackId: pack.id,
    subjectPackLabel: pack.label,
    packMethodology: [...pack.methodology],
    evidenceExpectations: pack.artifactExpectations.map((expectation) => ({
      artifactType: expectation.artifactType,
      requiredEvidence: [...expectation.requiredEvidence],
    })),
    reviewRules: pack.reviewRules.map((rule) => ({ ...rule })),
    standardsFrameworkHints: pack.standardsFrameworkHints.map((hint) => ({ ...hint })),
    safetyDignityConstraints: [...pack.safetyDignityConstraints],
  };
}

export function buildAssignmentUnderstanding(input: {
  profile: AssignmentWorkProfile;
  sourcePacket: AssignmentSourcePacket;
  importStatuses?: Array<string | null | undefined>;
  supportIntensity?: SupportIntensity | null;
  readiness?: ReadinessCheckIn | null;
  attempts?: HomeworkAttemptSignals | null;
  learnerContext?: Partial<HomeworkLearnerContext> | null;
  masteryReadiness?: HomeworkMasteryReadiness | null;
}): AssignmentUnderstanding {
  const methodology = methodologyForProfile(input.profile);
  const sourceSummary = sourceSummaryFor(input.sourcePacket);
  const sourceState = sourceStateFor(input.sourcePacket, input.importStatuses ?? []);
  const helpContract = resolveHomeworkHelpContract({
    supportIntensity: input.supportIntensity,
    readiness: input.readiness,
    attempts: {
      ...input.attempts,
      lowConfidenceExtraction: input.attempts?.lowConfidenceExtraction || sourceState === "source_partial",
    },
  });
  const schoolYear = normalizeSchoolYear(input.learnerContext?.schoolYear);
  const targetAcademicLevel = input.learnerContext?.targetAcademicLevel ?? "unknown";
  const masteryReadiness = input.masteryReadiness ?? {
    status: "unmapped" as const,
    candidateConcepts: [],
    matchedConcepts: [],
    bridgeConcepts: [],
    steadyConcepts: [],
    requiresBridge: false,
  };
  return {
    profile: input.profile,
    sourceState,
    workUnits: workUnitsFor(input.profile.taskIntents, methodology),
    sourceSummary,
    needsStudentConfirmation: sourceState === "source_partial" || Boolean(input.attempts?.lowConfidenceExtraction),
    methodology,
    helpContract,
    masteryReadiness,
    learnerContext: {
      schoolYear,
      tutorComplexity: normalizeLearnerComplexity(input.learnerContext?.tutorComplexity),
      targetAcademicLevel,
      prerequisiteBridgeRequired: Boolean(input.learnerContext?.prerequisiteBridgeRequired) ||
        masteryReadiness.requiresBridge ||
        shouldBridgePrerequisites(schoolYear, targetAcademicLevel),
    },
  };
}

export function formatMethodologyForTutor(understanding: AssignmentUnderstanding): string {
  return [
    "Diana universal homework method:",
    `Subject: ${understanding.profile.subjectDomain.replaceAll("_", " ")}`,
    `Work unit strategy: ${understanding.methodology.workUnitStrategy}`,
    `Expected student output: ${understanding.methodology.studentOutput}`,
    `Review action: ${understanding.methodology.reviewAction}`,
    `Native subject pack: ${understanding.methodology.subjectPackLabel} (${understanding.methodology.subjectPackId})`,
    understanding.methodology.packMethodology.length > 0
      ? `Subject methodology: ${understanding.methodology.packMethodology.slice(0, 4).join(" | ")}`
      : "",
    understanding.methodology.evidenceExpectations.length > 0
      ? `Evidence required: ${understanding.methodology.evidenceExpectations.slice(0, 4).map((item) => `${item.artifactType}: ${item.requiredEvidence.join(", ")}`).join(" | ")}`
      : "",
    understanding.methodology.reviewRules.length > 0
      ? `Review authority: ${understanding.methodology.reviewRules.slice(0, 5).map((rule) => `${rule.authority}: ${rule.requirement}`).join(" | ")}`
      : "",
    understanding.methodology.standardsFrameworkHints.length > 0
      ? `Standards hints: ${understanding.methodology.standardsFrameworkHints.slice(0, 3).map((hint) => `${hint.framework}: ${hint.selectionHint}`).join(" | ")}`
      : "",
    understanding.methodology.safetyDignityConstraints.length > 0
      ? `Safety and dignity: ${understanding.methodology.safetyDignityConstraints.slice(0, 5).join(" | ")}`
      : "",
    `Help level: ${understanding.helpContract.helpLevel}%`,
    `Help rule: ${understanding.helpContract.explanationShare}`,
    `Student-owned boundary: ${understanding.helpContract.studentOwnedBoundary}`,
    `Presentation supports: ${understanding.helpContract.presentationSupports.join("; ")}`,
    understanding.learnerContext.schoolYear
      ? `Learner grade: ${understanding.learnerContext.schoolYear}`
      : "Learner grade: not provided. Do not assume age or prior knowledge; ask one short level question only when it changes the next explanation.",
    `Tutor complexity preference: ${understanding.learnerContext.tutorComplexity}`,
    `Assignment target level: ${understanding.learnerContext.targetAcademicLevel.replaceAll("_", " ")}`,
    understanding.learnerContext.prerequisiteBridgeRequired
      ? "Prerequisite bridge required: preserve the assignment's rigor, identify the smallest missing prerequisite, teach that bridge with a concrete example, check understanding, then return to the assigned problem."
      : "Match explanation language to the learner while preserving the assignment's actual academic rigor.",
    `Useful visuals/tools: ${[
      ...understanding.methodology.visualSupports,
      ...understanding.methodology.nativeTools,
    ].slice(0, 8).join("; ")}`,
    `Source state: ${understanding.sourceState}`,
    understanding.needsStudentConfirmation
      ? "If extracted homework questions look uncertain, ask the student to confirm the queue before using it."
      : "",
  ].filter(Boolean).join("\n");
}

export function inferTargetAcademicLevel(text: string): HomeworkLearnerContext["targetAcademicLevel"] {
  const normalized = text.toLocaleLowerCase("en-US");
  if (/\b(400[- ]level|4\d\d[- ]level|upper[- ]division|senior seminar|graduate[- ]level|masters? level|doctoral|phd)\b/u.test(normalized)) {
    return "college_advanced";
  }
  if (/\b(college|university|undergraduate|100[- ]level|200[- ]level|300[- ]level)\b/u.test(normalized)) {
    return "college_intro";
  }
  if (/\b(advanced placement|ap\s+[a-z][a-z0-9]*|international baccalaureate|ib\s+[a-z][a-z0-9]*|honors|dual enrollment)\b/u.test(normalized)) {
    return "advanced_high_school";
  }
  return normalized.trim() ? "grade_level" : "unknown";
}

function helpLevelForAttempts(attempts: HomeworkAttemptSignals): HomeworkHelpLevel {
  const misses = Math.max(0, attempts.incorrectAttempts ?? 0);
  const stuck = Math.max(0, attempts.stuckRequests ?? 0);
  const direct = Math.max(0, attempts.directAnswerRequests ?? 0);
  if (misses >= 3 || stuck >= 3 || (misses >= 2 && attempts.studentSaysConfused)) return 75;
  if (misses >= 2 || stuck >= 2 || direct >= 2) return 60;
  if (misses >= 1 || stuck >= 1 || direct >= 1 || attempts.studentSaysConfused) return 45;
  return 30;
}

function normalizeSchoolYear(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 6 && value <= 16
    ? value
    : null;
}

function normalizeLearnerComplexity(value: unknown): HomeworkLearnerContext["tutorComplexity"] {
  return value === "simple" || value === "advanced" ? value : "balanced";
}

function shouldBridgePrerequisites(
  schoolYear: number | null,
  target: HomeworkLearnerContext["targetAcademicLevel"],
): boolean {
  if (!schoolYear) return target === "college_intro" || target === "college_advanced";
  if (target === "college_advanced") return schoolYear <= 15;
  if (target === "college_intro") return schoolYear <= 12;
  if (target === "advanced_high_school") return schoolYear <= 8;
  return false;
}

function boundaryForLevel(level: HomeworkHelpLevel): string {
  if (level === 75) return "Diana may show most of the setup, but the final answer, final sentence, or final submission choice must come from the student.";
  if (level === 60) return "Diana may complete the first transformation or model one move, then the student must continue.";
  if (level === 45) return "Diana may show the structure or visual setup, then the student must fill the next academic move.";
  return "Diana gives a cue or question only. The student makes the next move.";
}

function presentationSupportsFor(
  intensity: SupportIntensity | null | undefined,
  readiness: ReadinessCheckIn | null | undefined,
  attempts: HomeworkAttemptSignals,
): string[] {
  const supports = new Set<string>();
  if (readiness?.body === "low") supports.add("keep wording short and reduce visible choices");
  if (readiness?.focus === "scattered") supports.add("show one step at a time");
  if (readiness?.focus === "locked" && readiness.body === "low") supports.add("use low-effort setup before heavy work");
  if (intensity === "guided") supports.add("use a visual frame before asking for the next move");
  if (intensity === "scaffolded") supports.add("show a concrete setup and ask for one continuation");
  if (intensity === "one_move" || intensity === "recovery") supports.add("only one academic action should be visible");
  if (attempts.lowConfidenceExtraction) supports.add("confirm extracted questions before starting");
  if (supports.size === 0) supports.add("use calm concise guidance");
  return [...supports].slice(0, 5);
}

function escalationReasonFor(
  helpLevel: HomeworkHelpLevel,
  intensity: SupportIntensity | null | undefined,
  readiness: ReadinessCheckIn | null | undefined,
  attempts: HomeworkAttemptSignals,
): string {
  if (helpLevel >= 60) return "Repeated attempts or stuck signals require more structure while preserving student ownership.";
  if (helpLevel === 45) return "The student needs a clearer setup or visual before the next move.";
  if (readiness?.body === "low" || readiness?.focus === "scattered" || intensity) {
    return "Check-in and support signals affect presentation, while answer content stays at the lightest useful level.";
  }
  if (attempts.lowConfidenceExtraction) return "Imported source confidence needs student confirmation before Diana relies on it.";
  return "Start with the lowest useful amount of help.";
}

function sourceSummaryFor(packet: AssignmentSourcePacket): string {
  const parts = [
    packet.directions ? "directions" : "",
    packet.rubric ? "rubric" : "",
    packet.materialText ? "source material" : "",
  ].filter(Boolean);
  return parts.length > 0 ? `Diana has ${parts.join(", ")}.` : "Diana only has the assignment title or manually typed context.";
}

function sourceStateFor(packet: AssignmentSourcePacket, statuses: Array<string | null | undefined>): AssignmentUnderstanding["sourceState"] {
  if (statuses.some((status) => status === "failed")) return "source_failed";
  if (statuses.some((status) => status === "partial" || status === "extracting")) return "source_partial";
  if (packet.materialText.trim() || packet.rubric.trim() || packet.directions.trim()) {
    return statuses.length > 0 ? "source_ready" : "metadata_only";
  }
  return "no_source";
}

function workUnitsFor(intents: readonly AssignmentTaskIntent[], methodology: SubjectMethodology): string[] {
  const units = new Set<string>();
  for (const intent of intents) {
    if (intent === "solve" || intent === "calculate") units.add("problem");
    if (intent === "write") units.add("claim or paragraph");
    if (intent === "analyze_sources") units.add("source");
    if (intent === "research") units.add("source note");
    if (intent === "experiment" || intent === "record_data") units.add("data row");
    if (intent === "code") units.add("test or function");
    if (intent === "map") units.add("map feature");
    if (intent === "perform" || intent === "practice") units.add("practice rep");
    if (intent === "design" || intent === "build" || intent === "model") units.add("design move");
    if (intent === "reflect") units.add("reflection note");
    if (intent === "present") units.add("presentation section");
    if (intent === "submit") units.add("delivery check");
  }
  if (units.size === 0) units.add(methodology.studentOutput);
  return [...units].slice(0, 6);
}
