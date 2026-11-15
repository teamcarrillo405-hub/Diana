export const HOMEWORK_MODEL_TIERS = ["fast", "quality", "complex"] as const;

export type HomeworkModelTier = (typeof HOMEWORK_MODEL_TIERS)[number];

export const HOMEWORK_ACADEMIC_BANDS = [
  "middle_foundation",
  "middle_advanced",
  "high_foundation",
  "high_advanced",
  "postsecondary_intro",
  "postsecondary_advanced",
] as const;

export type HomeworkAcademicBand = (typeof HOMEWORK_ACADEMIC_BANDS)[number];

export function normalizeHomeworkAcademicBand(value: unknown): HomeworkAcademicBand | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLocaleLowerCase("en-US").replace(/[\s-]+/gu, "_");
  return (HOMEWORK_ACADEMIC_BANDS as readonly string[]).includes(normalized)
    ? normalized as HomeworkAcademicBand
    : null;
}

export type HomeworkTargetAcademicLevel =
  | "unknown"
  | "grade_level"
  | "advanced_high_school"
  | "college_intro"
  | "college_advanced";

export type HomeworkModelTask =
  | "study_buddy"
  | "assignment_review"
  | "study_artifact"
  | "source_extraction"
  | "visual_explanation"
  | "realtime"
  | "break_down";

export type HomeworkModelRouting = {
  subjectDomain?: string | null;
  academicBand?: HomeworkAcademicBand | null;
  sourceChars?: number;
  studentWorkChars?: number;
  hasRubric?: boolean;
  signals?: string;
};

export type HomeworkModelTierInput = HomeworkModelRouting & {
  task: HomeworkModelTask;
  tierOverride?: HomeworkModelTier;
};

const BAND_SENSITIVE_COMPLEX_DOMAINS = new Set([
  "mathematics",
  "science",
  "social_studies",
  "computer_science",
  "accounting",
  "economics",
  "engineering",
  "trade_cte",
  "cad",
  "advanced_technical_labs",
  "interdisciplinary",
]);

// Preserve conservative production routing when no learner or assignment band is known.
const UNKNOWN_BAND_COMPLEX_DOMAINS = new Set([
  "computer_science",
  "accounting",
  "economics",
  "engineering",
  "trade_cte",
  "cad",
  "advanced_technical_labs",
  "social_studies",
  "science",
]);

const COMPLEX_ACADEMIC_BANDS = new Set<HomeworkAcademicBand>([
  "high_advanced",
  "postsecondary_intro",
  "postsecondary_advanced",
]);

const ADVANCED_HOMEWORK_PATTERN =
  /\b(calculus|derivatives?|integrals?|limits?|trigonometry|matri(?:x|ces)|vectors?|proof|theorem|statistical inference|regression|probability distribution|biometrics?|biostatistics?|bioinformatics?|computational biology|epidemiology|stoichiometry|thermodynamics|kinematics|electromagnetism|organic chemistry|dbq|document[- ]based question|research(?: paper| project| question| methods?| synthesis)?|literature review|algorithm|data structures?|recursion|programming|coding|debugging|source code|python|javascript|typescript|c\+\+|sql|cad|engineering|unfamiliar technical|technical (?:procedure|specification|documentation|workflow|lab|drawing))\b/iu;

export function selectHomeworkModelTier(input: HomeworkModelTierInput): HomeworkModelTier {
  if (input.tierOverride) return input.tierOverride;
  if (input.task === "source_extraction") return "fast";
  if (requiresComplexHomeworkModel(input)) return "complex";
  if (input.task === "realtime") return "fast";
  if (input.task === "assignment_review") return "quality";
  if (input.task === "study_buddy" || input.task === "break_down") return "fast";
  return "quality";
}

export function resolveHomeworkAcademicBand(input: {
  schoolYear?: number | null;
  targetAcademicLevel?: HomeworkTargetAcademicLevel | null;
}): HomeworkAcademicBand | null {
  switch (input.targetAcademicLevel) {
    case "college_advanced":
      return "postsecondary_advanced";
    case "college_intro":
      return "postsecondary_intro";
    case "advanced_high_school":
      return "high_advanced";
    default:
      break;
  }

  const schoolYear = input.schoolYear;
  if (typeof schoolYear !== "number" || !Number.isInteger(schoolYear)) return null;
  if (schoolYear >= 6 && schoolYear <= 8) return "middle_foundation";
  if (schoolYear >= 9 && schoolYear <= 12) return "high_foundation";
  if (schoolYear >= 13 && schoolYear <= 16) return "postsecondary_intro";
  return null;
}

function requiresComplexHomeworkModel(input: HomeworkModelRouting): boolean {
  if (atLeast(input.sourceChars, 10_000) || atLeast(input.studentWorkChars, 6_000)) {
    return true;
  }
  if (input.hasRubric && atLeast(input.sourceChars, 3_000)) return true;
  if (ADVANCED_HOMEWORK_PATTERN.test(input.signals ?? "")) return true;

  const subjectDomain = normalizeSubjectDomain(input.subjectDomain);
  if (!subjectDomain) return false;
  const academicBand = normalizeHomeworkAcademicBand(input.academicBand);
  if (academicBand) {
    return COMPLEX_ACADEMIC_BANDS.has(academicBand) &&
      BAND_SENSITIVE_COMPLEX_DOMAINS.has(subjectDomain);
  }
  return UNKNOWN_BAND_COMPLEX_DOMAINS.has(subjectDomain);
}

function normalizeSubjectDomain(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLocaleLowerCase("en-US").replace(/[\s-]+/gu, "_");
  return normalized || null;
}

function atLeast(value: number | undefined, threshold: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= threshold;
}
