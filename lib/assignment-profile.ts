import {
  type AssignmentCapability,
  parseAssignmentCapabilities,
} from "@/lib/assignment-capabilities";
import {
  classifyWorkspaceMode,
  parseWorkspaceMode,
  type AssignmentWorkspaceMode,
  type WorkspaceClassification,
  type WorkspaceInput,
} from "@/lib/assignment-workspace";

export const SUBJECT_DOMAINS = [
  "mathematics",
  "english_language_arts",
  "science",
  "social_studies",
  "world_language",
  "computer_science",
  "visual_arts",
  "music",
  "theatre",
  "dance",
  "physical_education",
  "health",
  "accounting",
  "economics",
  "geography",
  "engineering",
  "trade_cte",
  "cad",
  "advanced_technical_labs",
  "interdisciplinary",
  "general",
] as const;

export type SubjectDomain = (typeof SUBJECT_DOMAINS)[number];

export const TASK_INTENTS = [
  "solve",
  "explain",
  "analyze_sources",
  "research",
  "write",
  "annotate",
  "model",
  "calculate",
  "record_data",
  "experiment",
  "design",
  "build",
  "map",
  "code",
  "perform",
  "practice",
  "reflect",
  "present",
  "submit",
] as const;

export type AssignmentTaskIntent = (typeof TASK_INTENTS)[number];

export const ARTIFACT_TYPES = [
  "problem_set",
  "worksheet_response",
  "essay",
  "research_paper",
  "dbq",
  "lab_report",
  "reading_response",
  "language_response",
  "source_code",
  "visual_art",
  "project_package",
  "accounting_workbook",
  "economic_analysis",
  "map",
  "engineering_design",
  "trade_evidence",
  "music_score",
  "performance_portfolio",
  "cad_package",
  "health_reflection",
  "pe_performance_log",
  "submission_note",
] as const;

export type AssignmentArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ASSIGNMENT_SAFETY_CLASSES = [
  "standard",
  "sensitive_health",
  "precise_location",
  "minor_media",
  "executable_code",
  "physical_activity",
  "workshop_hazard",
  "lab_hazard",
] as const;

export type AssignmentSafetyClass = (typeof ASSIGNMENT_SAFETY_CLASSES)[number];

export type StandardAlignmentRef = {
  frameworkId: string;
  itemId: string;
  uri?: string | null;
  statement?: string | null;
};

export type AssignmentWorkProfile = {
  schemaVersion: 1;
  subjectDomain: SubjectDomain;
  taskIntents: AssignmentTaskIntent[];
  artifactType: AssignmentArtifactType;
  capabilities: AssignmentCapability[];
  safetyClass: AssignmentSafetyClass;
  standardsAlignment: StandardAlignmentRef[];
  legacyMode: AssignmentWorkspaceMode;
  confidence: number;
  reasons: string[];
};

export type AssignmentProfileInput = WorkspaceInput & {
  profile?: unknown;
  standardsAlignment?: unknown;
};

type SubjectRule = {
  domain: SubjectDomain;
  pattern: RegExp;
  capabilities: readonly AssignmentCapability[];
  artifactType: AssignmentArtifactType;
  intents: readonly AssignmentTaskIntent[];
  safetyClass?: AssignmentSafetyClass;
  legacyMode?: AssignmentWorkspaceMode;
};

const SUBJECT_RULES: readonly SubjectRule[] = [
  { domain: "accounting", pattern: /\b(accounting|bookkeeping|journal entr(?:y|ies)|trial balance|t-accounts?|balance sheet|income statement)\b/iu, capabilities: ["accounting_ledger", "spreadsheet", "equation_editor", "rich_text"], artifactType: "accounting_workbook", intents: ["calculate", "explain"], legacyMode: "worksheet" },
  { domain: "economics", pattern: /\b(economics?|supply and demand|elasticity|gross domestic product|gdp|market equilibrium|opportunity cost|fiscal policy|monetary policy)\b/iu, capabilities: ["graphing", "spreadsheet", "rich_text"], artifactType: "economic_analysis", intents: ["model", "analyze_sources", "write"], legacyMode: "research" },
  { domain: "geography", pattern: /\b(geograph\w*|cartograph\w*|choropleth|topographic|map analysis|latitude|longitude|spatial pattern|gis)\b/iu, capabilities: ["map_workspace", "drawing_canvas", "spreadsheet", "graphing", "rich_text"], artifactType: "map", intents: ["map", "analyze_sources", "write"], safetyClass: "precise_location", legacyMode: "history" },
  { domain: "engineering", pattern: /\b(engineering|design process|prototype|bill of materials|bom|design constraints?|technical drawing)\b/iu, capabilities: ["design_notebook", "equation_editor", "graphing", "spreadsheet", "drawing_canvas", "cad_workspace", "rich_text"], artifactType: "engineering_design", intents: ["design", "build", "calculate", "reflect"], legacyMode: "project" },
  { domain: "trade_cte", pattern: /\b(welding|carpentry|construction trades?|automotive|electrical trades?|machining|manufacturing|hvac|culinary arts?|career and technical|cte|shop class)\b/iu, capabilities: ["procedure_checklist", "design_notebook", "data_lab", "drawing_canvas", "video_review", "rich_text"], artifactType: "trade_evidence", intents: ["build", "record_data", "reflect"], safetyClass: "workshop_hazard", legacyMode: "project" },
  { domain: "cad", pattern: /\b(cad|computer aided design|solidworks|autocad|fusion 360|dimensioned sketch|stl|step file|gltf|3d model)\b/iu, capabilities: ["cad_workspace", "drawing_canvas", "design_notebook", "rich_text"], artifactType: "cad_package", intents: ["design", "build", "reflect"], legacyMode: "project" },
  { domain: "advanced_technical_labs", pattern: /\b(advanced technical labs?|technical labs?|advanced laborator(?:y|ies)|instrumentation lab|materials testing lab)\b/iu, capabilities: ["procedure_checklist", "data_lab", "equation_editor", "graphing", "spreadsheet", "design_notebook", "rich_text"], artifactType: "lab_report", intents: ["experiment", "record_data", "calculate", "explain"], safetyClass: "lab_hazard", legacyMode: "lab" },
  { domain: "music", pattern: /\b(music theory|music notation|musicxml|composition|orchestra|band|choir|sight reading|musical score)\b/iu, capabilities: ["music_notation", "audio_review", "performance_log", "rich_text"], artifactType: "music_score", intents: ["perform", "practice", "reflect"], safetyClass: "minor_media", legacyMode: "art" },
  { domain: "theatre", pattern: /\b(theatre|theater|acting|monologue|scene study|stagecraft|dramaturg\w*|script performance)\b/iu, capabilities: ["rich_text", "design_notebook", "video_review", "audio_review", "performance_log"], artifactType: "performance_portfolio", intents: ["perform", "practice", "reflect"], safetyClass: "minor_media", legacyMode: "art" },
  { domain: "dance", pattern: /\b(dance|choreograph\w*|movement phrase|ballet|modern dance|jazz dance)\b/iu, capabilities: ["design_notebook", "video_review", "performance_log", "rich_text"], artifactType: "performance_portfolio", intents: ["perform", "practice", "reflect"], safetyClass: "physical_activity", legacyMode: "art" },
  { domain: "physical_education", pattern: /\b(physical education|pe class|fitness assessment|skill practice|movement log|exercise log)\b/iu, capabilities: ["performance_log", "video_review", "rich_text"], artifactType: "pe_performance_log", intents: ["practice", "reflect"], safetyClass: "physical_activity", legacyMode: "project" },
  { domain: "health", pattern: /\b(health education|health class|wellness|nutrition literacy|mental health literacy|public health|health behavior)\b/iu, capabilities: ["rich_text", "performance_log", "audio_review"], artifactType: "health_reflection", intents: ["analyze_sources", "reflect", "write"], safetyClass: "sensitive_health", legacyMode: "writing" },
  { domain: "computer_science", pattern: /\b(computer science|software engineering|programming|python|javascript|typescript|java|html|css|sql|algorithm|debug)\b/iu, capabilities: ["code_runner", "rich_text"], artifactType: "source_code", intents: ["code", "explain"], safetyClass: "executable_code", legacyMode: "coding" },
  { domain: "world_language", pattern: /\b(spanish|french|german|italian|mandarin|chinese|japanese|latin|world language|esol)\b/iu, capabilities: ["rich_text", "audio_review", "video_review"], artifactType: "language_response", intents: ["practice", "perform", "write"], safetyClass: "minor_media", legacyMode: "language" },
  { domain: "science", pattern: /\b(biology|chemistry|physics|earth science|environmental science|laboratory|experiment)\b/iu, capabilities: ["procedure_checklist", "data_lab", "equation_editor", "graphing", "spreadsheet", "rich_text"], artifactType: "lab_report", intents: ["experiment", "record_data", "calculate", "explain"], safetyClass: "lab_hazard", legacyMode: "lab" },
  { domain: "mathematics", pattern: /\b(math(?:ematics)?|algebra|geometry|calculus|trigonometry|statistics|equation|quadratic|polynomial)\b/iu, capabilities: ["equation_editor", "graphing", "rich_text"], artifactType: "problem_set", intents: ["solve", "explain"], legacyMode: "math" },
  { domain: "social_studies", pattern: /\b(history|historical|civics|government|social studies|dbq|document[- ]based)\b/iu, capabilities: ["rich_text"], artifactType: "dbq", intents: ["analyze_sources", "write"], legacyMode: "history" },
  { domain: "english_language_arts", pattern: /\b(english|language arts|literature|essay|rhetorical|novel|reading response)\b/iu, capabilities: ["rich_text"], artifactType: "essay", intents: ["write", "analyze_sources"], legacyMode: "writing" },
  { domain: "visual_arts", pattern: /\b(visual art|drawing|painting|sculpture|illustration|photography|artist statement)\b/iu, capabilities: ["drawing_canvas", "design_notebook", "rich_text"], artifactType: "visual_art", intents: ["design", "build", "reflect"], legacyMode: "art" },
];

const LEGACY_PROFILE_DEFAULTS: Record<AssignmentWorkspaceMode, Pick<AssignmentWorkProfile, "subjectDomain" | "taskIntents" | "artifactType" | "capabilities" | "safetyClass">> = {
  math: { subjectDomain: "mathematics", taskIntents: ["solve", "explain"], artifactType: "problem_set", capabilities: ["equation_editor", "graphing", "rich_text"], safetyClass: "standard" },
  worksheet: { subjectDomain: "general", taskIntents: ["solve", "write"], artifactType: "worksheet_response", capabilities: ["rich_text"], safetyClass: "standard" },
  writing: { subjectDomain: "english_language_arts", taskIntents: ["write"], artifactType: "essay", capabilities: ["rich_text"], safetyClass: "standard" },
  research: { subjectDomain: "interdisciplinary", taskIntents: ["research", "analyze_sources", "write"], artifactType: "research_paper", capabilities: ["rich_text"], safetyClass: "standard" },
  history: { subjectDomain: "social_studies", taskIntents: ["analyze_sources", "write"], artifactType: "dbq", capabilities: ["rich_text"], safetyClass: "standard" },
  lab: { subjectDomain: "science", taskIntents: ["experiment", "record_data", "explain"], artifactType: "lab_report", capabilities: ["procedure_checklist", "data_lab", "graphing", "rich_text"], safetyClass: "lab_hazard" },
  reading: { subjectDomain: "english_language_arts", taskIntents: ["annotate", "analyze_sources", "write"], artifactType: "reading_response", capabilities: ["rich_text"], safetyClass: "standard" },
  language: { subjectDomain: "world_language", taskIntents: ["practice", "write"], artifactType: "language_response", capabilities: ["rich_text", "audio_review"], safetyClass: "minor_media" },
  coding: { subjectDomain: "computer_science", taskIntents: ["code", "explain"], artifactType: "source_code", capabilities: ["code_runner", "rich_text"], safetyClass: "executable_code" },
  art: { subjectDomain: "visual_arts", taskIntents: ["design", "build", "reflect"], artifactType: "visual_art", capabilities: ["drawing_canvas", "design_notebook", "rich_text"], safetyClass: "standard" },
  project: { subjectDomain: "interdisciplinary", taskIntents: ["design", "build", "present"], artifactType: "project_package", capabilities: ["design_notebook", "rich_text"], safetyClass: "standard" },
  handoff: { subjectDomain: "general", taskIntents: ["submit"], artifactType: "submission_note", capabilities: ["rich_text"], safetyClass: "standard" },
};

function textForProfile(input: AssignmentProfileInput): string {
  return [
    input.className,
    input.title,
    input.description,
    input.rubric,
    input.sourceText,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0).join("\n");
}

function parseStandards(value: unknown): StandardAlignmentRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.frameworkId !== "string" || typeof candidate.itemId !== "string") return [];
    return [{
      frameworkId: candidate.frameworkId,
      itemId: candidate.itemId,
      uri: typeof candidate.uri === "string" ? candidate.uri : null,
      statement: typeof candidate.statement === "string" ? candidate.statement : null,
    }];
  });
}

function parsePersistedProfile(value: unknown): AssignmentWorkProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<AssignmentWorkProfile>;
  const legacyMode = parseWorkspaceMode(candidate.legacyMode);
  if (
    candidate.schemaVersion !== 1 ||
    !SUBJECT_DOMAINS.includes(candidate.subjectDomain as SubjectDomain) ||
    !ARTIFACT_TYPES.includes(candidate.artifactType as AssignmentArtifactType) ||
    !ASSIGNMENT_SAFETY_CLASSES.includes(candidate.safetyClass as AssignmentSafetyClass) ||
    !legacyMode
  ) return null;
  const capabilities = parseAssignmentCapabilities(candidate.capabilities);
  if (capabilities.length === 0) return null;
  return {
    schemaVersion: 1,
    subjectDomain: candidate.subjectDomain as SubjectDomain,
    taskIntents: Array.isArray(candidate.taskIntents)
      ? candidate.taskIntents.filter((intent): intent is AssignmentTaskIntent => TASK_INTENTS.includes(intent as AssignmentTaskIntent))
      : [],
    artifactType: candidate.artifactType as AssignmentArtifactType,
    capabilities,
    safetyClass: candidate.safetyClass as AssignmentSafetyClass,
    standardsAlignment: parseStandards(candidate.standardsAlignment),
    legacyMode,
    confidence: typeof candidate.confidence === "number" ? candidate.confidence : 1,
    reasons: Array.isArray(candidate.reasons) ? candidate.reasons.filter((reason): reason is string => typeof reason === "string") : ["Using the saved assignment profile."],
  };
}

export function resolveAssignmentProfile(input: AssignmentProfileInput): AssignmentWorkProfile {
  const persisted = parsePersistedProfile(input.profile);
  if (persisted) return persisted;

  const legacy = classifyWorkspaceMode(input);
  const text = textForProfile(input);
  const subjectRule = SUBJECT_RULES.find((rule) => rule.pattern.test(text));
  const defaults = subjectRule
    ? {
        subjectDomain: subjectRule.domain,
        taskIntents: [...subjectRule.intents],
        artifactType: subjectRule.artifactType,
        capabilities: [...subjectRule.capabilities],
        safetyClass: subjectRule.safetyClass ?? "standard",
        legacyMode: subjectRule.legacyMode ?? legacy.mode,
      }
    : {
        ...LEGACY_PROFILE_DEFAULTS[legacy.mode],
        taskIntents: [...LEGACY_PROFILE_DEFAULTS[legacy.mode].taskIntents],
        capabilities: [...LEGACY_PROFILE_DEFAULTS[legacy.mode].capabilities],
        legacyMode: legacy.mode,
      };

  return {
    schemaVersion: 1,
    ...defaults,
    standardsAlignment: parseStandards(input.standardsAlignment),
    confidence: subjectRule ? Math.max(0.9, legacy.confidence) : legacy.confidence,
    reasons: subjectRule
      ? [`Detected ${subjectRule.domain.replaceAll("_", " ")} subject context.`, ...legacy.reasons]
      : legacy.reasons,
  };
}

export function assignmentProfilePersistencePatch(profile: AssignmentWorkProfile): {
  assignment_profile: AssignmentWorkProfile;
  work_profile: AssignmentWorkspaceMode;
} {
  return {
    assignment_profile: profile,
    work_profile: profile.legacyMode,
  };
}

export function reconcileWorkspaceWithAssignmentProfile(
  classification: WorkspaceClassification,
  profile: AssignmentWorkProfile,
  studentSelected: boolean,
): WorkspaceClassification {
  if (
    studentSelected ||
    classification.mode === profile.legacyMode ||
    profile.confidence < 0.85
  ) {
    return classification;
  }

  return {
    mode: profile.legacyMode,
    confidence: profile.confidence,
    reasons: [
      `The ${profile.subjectDomain.replaceAll("_", " ")} profile selected this work format.`,
      ...profile.reasons,
    ],
    source: "weighted_context",
  };
}
