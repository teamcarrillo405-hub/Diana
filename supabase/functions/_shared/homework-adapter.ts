import {
  callSafeStudentTextModel,
  type LogParams,
} from "./safety.ts";
import type {
  StudentModelPart,
  StudentModelQuality,
  StudentModelResult,
} from "./student-model.ts";
import {
  selectHomeworkModelTier,
  type HomeworkModelRouting,
} from "./homework-model-tier.ts";

export type HomeworkAdapterTask =
  | "math_step"
  | "writing_aid"
  | "writing_cowrite"
  | "assignment_review"
  | "study_buddy"
  | "study_artifacts"
  | "task_breakdown"
  | "source_extraction"
  | "visual_explanation"
  | "citation_gen"
  | "reading_scaffold"
  | "reading_level"
  | "science_scaffold"
  | "history_scaffold"
  | "cs_scaffold"
  | "language_scaffold"
  | "math_example"
  | "math_scaffold"
  | "visual_tool"
  | "vocab_hover"
  | "note_synthesis"
  | "note_tags"
  | "arts_scaffold"
  | "health_scaffold"
  | "ap_scaffold";

type SupabaseLike = Parameters<typeof callSafeStudentTextModel>[0]["supabase"];

export type HomeworkAdapterRoutingInput = HomeworkModelRouting & {
  template?: string | null;
};

export function directToStudentAiMode(value: unknown): "green" | "yellow" | "red" {
  if (Deno.env.get("DIANA_HOMEWORK_PRODUCT_TIER") !== "school_tier") return "green";
  return value === "red" || value === "yellow" || value === "green" ? value : "green";
}

export function homeworkFeatureForTask(task: HomeworkAdapterTask): LogParams["feature"] {
  switch (task) {
    case "source_extraction":
      return "doc_extract";
    case "visual_explanation":
      return "visual_tool";
    default:
      return task;
  }
}

export function homeworkQualityForTask(
  task: HomeworkAdapterTask,
  input: HomeworkAdapterRoutingInput = {},
): StudentModelQuality {
  if (task === "math_step" || task === "task_breakdown" || task === "source_extraction" || task === "citation_gen" || task === "reading_level" || task === "note_tags" || task === "vocab_hover") return "fast";
  if (task === "study_buddy") {
    return selectHomeworkModelTier({ task: "study_buddy", ...input });
  }
  if (isComplexHomework(input)) return "complex";
  return "quality";
}

const COMPLEX_TEMPLATES = new Set(["research", "history", "lab", "coding", "project"]);
const COMPLEX_DOMAINS = new Set([
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
const ADVANCED_HOMEWORK_PATTERN =
  /\b(calculus|derivative|integral|limit|trigonometry|matrix|vectors?|proof|theorem|statistical inference|regression|probability distribution|biometrics?|biostatistics?|bioinformatics?|computational biology|epidemiology|stoichiometry|thermodynamics|kinematics|electromagnetism|organic chemistry|dbq|research synthesis|algorithm|data structure|recursion|cad|engineering)\b/iu;

function isComplexHomework(input: HomeworkAdapterRoutingInput): boolean {
  if (input.template && COMPLEX_TEMPLATES.has(input.template)) return true;
  if (input.subjectDomain && COMPLEX_DOMAINS.has(input.subjectDomain)) return true;
  if ((input.sourceChars ?? 0) >= 10_000 || (input.studentWorkChars ?? 0) >= 6_000) return true;
  if ((input.hasRubric ?? false) && (input.sourceChars ?? 0) >= 3_000 && (input.studentWorkChars ?? 0) >= 1_200) return true;
  return ADVANCED_HOMEWORK_PATTERN.test(input.signals ?? "");
}

export async function runOpenAIHomeworkAdapter({
  ownerId,
  supabase,
  task,
  system,
  user,
  maxTokens,
  json = false,
  parts,
  fallbackContent,
  timeoutMs,
  quality,
  routing,
  reservationUnits,
}: {
  ownerId: string;
  supabase: SupabaseLike;
  task: HomeworkAdapterTask;
  system: string;
  user: string;
  maxTokens: number;
  json?: boolean;
  parts?: StudentModelPart[];
  fallbackContent?: string;
  timeoutMs?: number;
  quality?: StudentModelQuality;
  routing?: Parameters<typeof homeworkQualityForTask>[1];
  reservationUnits?: number;
}): Promise<StudentModelResult> {
  return callSafeStudentTextModel({
    ownerId,
    supabase,
    system,
    user,
    maxTokens,
    quality: quality ?? homeworkQualityForTask(task, routing),
    json,
    parts,
    fallbackContent,
    timeoutMs,
    reservationUnits,
  });
}
