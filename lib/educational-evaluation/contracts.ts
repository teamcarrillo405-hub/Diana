export const EDUCATIONAL_EVALUATION_SCHEMA_VERSION = 1 as const;
export const EDUCATIONAL_EVALUATION_CORPUS_VERSION =
  "diana-educational-evaluation-v1" as const;

export const EDUCATIONAL_EVALUATION_SUBJECTS = [
  { id: "mathematics", code: "mat", label: "Mathematics", topic: "proportional reasoning and symbolic relationships", capability: "equation_editor" },
  { id: "english_language_arts", code: "ela", label: "English language arts", topic: "claim, evidence, and revision", capability: "rich_text" },
  { id: "science", code: "sci", label: "Science", topic: "evidence, variables, and scientific explanation", capability: "data_lab" },
  { id: "social_studies", code: "sst", label: "Social studies", topic: "source context, corroboration, and historical claims", capability: "rich_text" },
  { id: "world_language", code: "wld", label: "World language", topic: "meaning, usage, and communicative revision", capability: "audio_review" },
  { id: "computer_science", code: "csc", label: "Computer science", topic: "algorithm design, debugging, and tests", capability: "code_runner" },
  { id: "visual_arts", code: "var", label: "Visual arts", topic: "composition, process evidence, and artistic intent", capability: "drawing_canvas" },
  { id: "music", code: "mus", label: "Music", topic: "rhythm, notation, performance, and reflection", capability: "music_notation" },
  { id: "theatre", code: "thr", label: "Theatre", topic: "character choices, rehearsal evidence, and reflection", capability: "performance_log" },
  { id: "dance", code: "dan", label: "Dance", topic: "choreographic intent, practice evidence, and reflection", capability: "performance_log" },
  { id: "physical_education", code: "ped", label: "Physical education", topic: "skill practice, safe participation, and reflection", capability: "performance_log" },
  { id: "health", code: "hea", label: "Health", topic: "health literacy, source quality, and personal boundaries", capability: "rich_text" },
  { id: "accounting", code: "acc", label: "Accounting", topic: "transactions, ledgers, and balance checks", capability: "accounting_ledger" },
  { id: "economics", code: "eco", label: "Economics", topic: "models, incentives, data, and tradeoffs", capability: "graphing" },
  { id: "geography", code: "geo", label: "Geography", topic: "spatial evidence, scale, and human-environment patterns", capability: "map_workspace" },
  { id: "engineering", code: "eng", label: "Engineering", topic: "criteria, constraints, testing, and iteration", capability: "design_notebook" },
  { id: "trade_cte", code: "cte", label: "Trade CTE", topic: "teacher-approved procedures, evidence, and safe reflection", capability: "procedure_checklist" },
  { id: "cad", code: "cad", label: "CAD", topic: "dimensions, model intent, inspection, and revision", capability: "cad_workspace" },
  { id: "advanced_technical_labs", code: "atl", label: "Advanced technical labs", topic: "approved protocols, measurements, uncertainty, and analysis", capability: "data_lab" },
  { id: "interdisciplinary", code: "int", label: "Interdisciplinary", topic: "cross-domain evidence, synthesis, and project planning", capability: "rich_text" },
  { id: "general", code: "gen", label: "General", topic: "directions, evidence, completion criteria, and reflection", capability: "rich_text" },
] as const;

export type EducationalEvaluationSubject =
  (typeof EDUCATIONAL_EVALUATION_SUBJECTS)[number]["id"];
export type EducationalEvaluationCapability =
  (typeof EDUCATIONAL_EVALUATION_SUBJECTS)[number]["capability"];

export const EDUCATIONAL_EVALUATION_BANDS = [
  { id: "middle_foundation", code: "msf", label: "Middle school foundation", level: 0 },
  { id: "middle_advanced", code: "msa", label: "Middle school advanced", level: 1 },
  { id: "high_foundation", code: "hsf", label: "High school foundation", level: 2 },
  { id: "high_advanced", code: "hsa", label: "High school advanced", level: 3 },
  { id: "postsecondary_intro", code: "psi", label: "Postsecondary introductory", level: 4 },
  { id: "postsecondary_advanced", code: "psa", label: "Postsecondary advanced", level: 5 },
] as const;

export type EducationalEvaluationBand =
  (typeof EDUCATIONAL_EVALUATION_BANDS)[number]["id"];

export const EDUCATIONAL_EVALUATION_CORE_SCENARIOS = [
  "guided_problem_solving",
  "student_work_review",
  "study_material_creation",
  "source_extraction",
  "visual_explanation",
  "oral_next_step",
] as const;

export type EducationalEvaluationCoreScenario =
  (typeof EDUCATIONAL_EVALUATION_CORE_SCENARIOS)[number];

export const EDUCATIONAL_EVALUATION_STRESS_KINDS = [
  "extraction",
  "ambiguity",
  "handwriting",
  "source_conflict",
  "prompt_injection",
  "unanswerable",
] as const;

export type EducationalEvaluationStressKind =
  (typeof EDUCATIONAL_EVALUATION_STRESS_KINDS)[number];

export const EDUCATIONAL_EVALUATION_ROUTES = [
  "study_buddy",
  "assignment_review",
  "study_artifact",
  "source_extraction",
  "visual_explanation",
  "realtime",
] as const;

export type EducationalEvaluationRoute =
  (typeof EDUCATIONAL_EVALUATION_ROUTES)[number];

export const EDUCATIONAL_EVALUATION_TIERS = [
  "fast",
  "quality",
  "complex",
] as const;

export type EducationalEvaluationTier =
  (typeof EDUCATIONAL_EVALUATION_TIERS)[number];

export const EDUCATIONAL_EVALUATION_ESCALATIONS = [
  "none",
  "student_clarification",
  "student_confirmation",
  "teacher_or_source_owner",
  "safety_boundary",
] as const;

export type EducationalEvaluationEscalation =
  (typeof EDUCATIONAL_EVALUATION_ESCALATIONS)[number];

export const EDUCATIONAL_EVALUATION_SOURCE_KINDS = [
  "directions",
  "student_work",
  "rubric",
  "reference",
  "attachment",
] as const;

export type EducationalEvaluationSourceKind =
  (typeof EDUCATIONAL_EVALUATION_SOURCE_KINDS)[number];

export const EDUCATIONAL_EVALUATION_ABSTENTION_REASONS = [
  "awaiting_clarification",
  "awaiting_student_confirmation",
  "conflicting_sources",
  "untrusted_source_instruction",
  "missing_evidence",
] as const;

export type EducationalEvaluationAbstentionReason =
  (typeof EDUCATIONAL_EVALUATION_ABSTENTION_REASONS)[number];

export interface EducationalEvaluationSource {
  readonly id: string;
  readonly kind: EducationalEvaluationSourceKind;
  readonly label: string;
  readonly excerpt: string;
  readonly trust: "approved" | "untrusted";
}

export interface EducationalEvaluationExpectedRouting {
  readonly subject: EducationalEvaluationSubject;
  readonly capability: EducationalEvaluationCapability;
  readonly route: EducationalEvaluationRoute;
  readonly tier: EducationalEvaluationTier;
}

export interface EducationalEvaluationExpectedEscalation {
  readonly required: boolean;
  readonly action: EducationalEvaluationEscalation;
}

export interface EducationalEvaluationExpectedVerification {
  readonly required: boolean;
  readonly minimumEvidenceSources: number;
  readonly allowedSourceIds: readonly string[];
}

export interface EducationalEvaluationExpectedCitation {
  readonly required: boolean;
  readonly minimumCitations: number;
  readonly allowedSourceIds: readonly string[];
}

export interface EducationalEvaluationExpectedAbstention {
  readonly required: boolean;
  readonly reason: EducationalEvaluationAbstentionReason | null;
}

export interface EducationalEvaluationCase {
  readonly schemaVersion: typeof EDUCATIONAL_EVALUATION_SCHEMA_VERSION;
  readonly corpusVersion: typeof EDUCATIONAL_EVALUATION_CORPUS_VERSION;
  readonly id: string;
  readonly family: "core" | "stress";
  readonly subject: EducationalEvaluationSubject;
  readonly academicBand: EducationalEvaluationBand;
  readonly scenario:
    | EducationalEvaluationCoreScenario
    | EducationalEvaluationStressKind;
  readonly stressOrdinal: number | null;
  readonly stressLayer: "stratum_anchor" | "supplemental" | null;
  readonly prompt: string;
  readonly sources: readonly EducationalEvaluationSource[];
  readonly expected: {
    readonly routing: EducationalEvaluationExpectedRouting;
    readonly escalation: EducationalEvaluationExpectedEscalation;
    readonly verification: EducationalEvaluationExpectedVerification;
    readonly citation: EducationalEvaluationExpectedCitation;
    readonly abstention: EducationalEvaluationExpectedAbstention;
  };
}

export const EDUCATIONAL_EVALUATION_RESULT_SCHEMA_VERSION = 3 as const;
export const EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION =
  "diana-educational-expert-sample-v1" as const;

export const EDUCATIONAL_EVALUATION_VERIFICATION_STATUSES = [
  "verified",
  "not_verified",
  "not_applicable",
] as const;

export type EducationalEvaluationVerificationStatus =
  (typeof EDUCATIONAL_EVALUATION_VERIFICATION_STATUSES)[number];

export const EDUCATIONAL_EVALUATION_CITATION_ASSESSMENTS = [
  "supported",
  "unsupported",
  "invented",
] as const;

export type EducationalEvaluationCitationAssessment =
  (typeof EDUCATIONAL_EVALUATION_CITATION_ASSESSMENTS)[number];
