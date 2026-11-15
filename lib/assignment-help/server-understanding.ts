import {
  buildAssignmentUnderstanding,
  formatMethodologyForTutor,
  inferTargetAcademicLevel,
  type AssignmentUnderstanding,
  type HomeworkAttemptSignals,
  type HomeworkLearnerContext,
} from "@/lib/assignment-help/methodology";
import { resolveAssignmentProfile, type AssignmentWorkProfile } from "@/lib/assignment-profile";
import { buildSourcePacket, type AssignmentSourcePacket } from "@/lib/assignment-sources";
import { resolveDianaHomeworkTrust, type DianaHomeworkTrustDecision } from "@/lib/ai/diana-trust-rules";
import {
  resolveHomeworkAcademicBand,
  type HomeworkAcademicBand,
} from "@/lib/ai/homework-model-tier";
import type { OpenAIHomeworkRouting } from "@/lib/ai/openai-homework-adapter";
import {
  buildHomeworkMasteryReadiness,
  formatHomeworkMasteryReadiness,
  type HomeworkMasteryConceptRow,
  type HomeworkMasteryReadiness,
} from "@/lib/mastery/homework-readiness";
import { readinessFromSignalValue, summarizeFrictionSignals, type ReadinessCheckIn, type SupportIntensity } from "@/lib/support/policy";
import type { AssignmentKind, Json } from "@/lib/supabase/types";

export type HomeworkSupabaseClient = {
  from(table: string): any;
};

export type StudyHelperEvent = "still_stuck" | "direct_answer_request" | "escape_valve";

export type AssignmentUnderstandingWithAcademicBand = AssignmentUnderstanding & {
  academicBand: HomeworkAcademicBand | null;
};

export type AssignmentHomeworkKernel = {
  assignment: {
    id: string;
    title: string;
    description: string | null;
    rubric_text: string | null;
    kind: string;
    class_id: string | null;
    work_profile: string | null;
    work_profile_source?: string | null;
    assignment_profile: unknown;
    source_import_status?: string | null;
    class_name?: string | null;
  };
  sourcePacket: AssignmentSourcePacket;
  sources: SourceRow[];
  profile: AssignmentWorkProfile;
  understanding: AssignmentUnderstandingWithAcademicBand;
  trustDecision: DianaHomeworkTrustDecision;
  readiness: ReadinessCheckIn | null;
  supportIntensity: SupportIntensity | null;
  attemptSignals: HomeworkAttemptSignals;
  sourceImportStatuses: Array<string | null>;
  learnerContext: HomeworkLearnerContext;
  masteryReadiness: HomeworkMasteryReadiness;
  contextStatus: "complete" | "degraded";
  contextIssues: string[];
};

type AssignmentRow = AssignmentHomeworkKernel["assignment"];

type SourceRow = {
  id?: string | null;
  source_type: string;
  title: string;
  url?: string | null;
  extracted_text: string | null;
  source_location: string | null;
  import_status?: string | null;
};

type CourseMaterialRow = {
  id: string;
  title: string;
  raw_text: string | null;
  parse_status?: string | null;
};

type SnapshotRow = {
  readiness?: unknown;
  support_intensity?: unknown;
  friction_signals?: unknown;
};

type SignalRow = {
  kind: string;
  assignment_id?: string | null;
  value?: unknown;
};

type LearnerProfileRow = {
  school_year?: unknown;
  tutor_complexity?: unknown;
};

const SUPPORT_INTENSITIES: readonly SupportIntensity[] = [
  "steady",
  "guided",
  "scaffolded",
  "one_move",
  "recovery",
];

type HomeworkQueryResult<T> = {
  data: T | null;
  error?: unknown;
};

function dataOf<T>(
  result: HomeworkQueryResult<T> | null | undefined,
  label: string,
  issues?: string[],
): T | null {
  if (result?.error) {
    if (issues) {
      issues.push(label);
      return null;
    }
    throw new Error(`homework_context_query_failed:${label}`);
  }
  return result?.data ?? null;
}

function listOf<T>(
  result: HomeworkQueryResult<T[]> | null | undefined,
  label: string,
  issues: string[],
): T[] {
  return dataOf(result, label, issues) ?? [];
}

function normalizeAssignment(value: unknown): AssignmentRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string" || typeof row.kind !== "string") return null;
  return {
    id: row.id,
    title: row.title,
    description: typeof row.description === "string" ? row.description : null,
    rubric_text: typeof row.rubric_text === "string" ? row.rubric_text : null,
    kind: row.kind,
    class_id: typeof row.class_id === "string" ? row.class_id : null,
    work_profile: typeof row.work_profile === "string" ? row.work_profile : null,
    work_profile_source: typeof row.work_profile_source === "string" ? row.work_profile_source : null,
    assignment_profile: row.assignment_profile ?? null,
    source_import_status: typeof row.source_import_status === "string" ? row.source_import_status : null,
    class_name: classNameFromAssignmentRow(row),
  };
}

function classNameFromAssignmentRow(row: Record<string, unknown>): string | null {
  const classes = row.classes;
  const classRow = Array.isArray(classes) ? classes[0] : classes;
  if (!classRow || typeof classRow !== "object" || Array.isArray(classRow)) return null;
  const name = (classRow as Record<string, unknown>).name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}
export function inferStudyHelperEvent(question: string): StudyHelperEvent | null {
  const lower = question.toLocaleLowerCase("en-US");
  if (/\b(just tell me|give me the answer|what is the answer|solve it for me|answer only)\b/u.test(lower)) {
    return "direct_answer_request";
  }
  if (/\b(stuck|confused|lost|dont get|don't get|do not get|makes no sense|i need more help|help me understand)\b/u.test(lower)) {
    return "still_stuck";
  }
  if (/\b(hint|help|check my work|review this|am i doing this right)\b/u.test(lower)) {
    return "escape_valve";
  }
  return null;
}

export function normalizeSupportIntensity(value: unknown): SupportIntensity | null {
  return SUPPORT_INTENSITIES.includes(value as SupportIntensity)
    ? value as SupportIntensity
    : null;
}

function normalizeSchoolYear(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 6 && value <= 16
    ? value
    : null;
}

function normalizeTutorComplexity(value: unknown): HomeworkLearnerContext["tutorComplexity"] {
  return value === "simple" || value === "advanced" ? value : "balanced";
}

export function attemptSignalsFromFriction(value: unknown, liveFriction: Record<string, unknown> = {}): HomeworkAttemptSignals {
  const friction = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const incorrectAttempts = Math.max(
    numberField(friction, "incorrectAttempts"),
    numberField(friction, "incorrectAttemptsLast24h"),
  );
  const stuckRequests = Math.max(
    numberField(friction, "stillStuckLast24h"),
    numberField(friction, "stuckRequestsLast24h"),
    numberField(liveFriction, "stillStuckLast24h"),
  );
  const directAnswerRequests = Math.max(
    numberField(friction, "directAnswerRequestsLast24h"),
    numberField(liveFriction, "directAnswerRequestsLast24h"),
  );
  const studentSaysConfused = friction.studentSaysConfused === true ||
    numberField(friction, "helpRequestsLast24h") > 1 ||
    numberField(liveFriction, "helpRequestsLast24h") > 1;
  return {
    incorrectAttempts,
    stuckRequests,
    directAnswerRequests,
    studentSaysConfused,
  };
}

function numberField(value: Record<string, unknown>, key: string): number {
  const raw = value[key];
  return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
}

export async function loadAssignmentHomeworkKernel(args: {
  supabase: HomeworkSupabaseClient;
  ownerId: string;
  assignmentId: string;
  currentStudyEvent?: StudyHelperEvent | null;
  eventSource?: string;
  now?: Date;
}): Promise<AssignmentHomeworkKernel | null> {
  const assignmentResult = await args.supabase
    .from("assignments")
    .select("id, title, description, rubric_text, kind, class_id, work_profile, work_profile_source, assignment_profile, source_import_status, classes(name)")
    .eq("id", args.assignmentId)
    .eq("owner_id", args.ownerId)
    .maybeSingle();
  const assignment = normalizeAssignment(dataOf<unknown>(assignmentResult, "assignment"));
  if (!assignment) return null;
  const contextIssues: string[] = [];

  const since = new Date((args.now ?? new Date()).getTime() - 24 * 60 * 60 * 1000).toISOString();
  const [sourcesResult, snapshotResult, signalsResult, courseMaterialsResult, learnerProfileResult, masteryResult] = await Promise.all([
    args.supabase
      .from("assignment_sources")
      .select("id, source_type, title, url, extracted_text, source_location, import_status")
      .eq("assignment_id", assignment.id)
      .eq("owner_id", args.ownerId)
      .order("created_at", { ascending: true }) as unknown as Promise<{ data: SourceRow[] | null }>,
    args.supabase
      .from("student_state_snapshots")
      .select("readiness, support_intensity, friction_signals")
      .eq("assignment_id", assignment.id)
      .eq("owner_id", args.ownerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle() as Promise<{ data: SnapshotRow | null }>,
    args.supabase
      .from("task_signals")
      .select("kind, assignment_id, value")
      .eq("owner_id", args.ownerId)
      .eq("assignment_id", assignment.id)
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(30) as unknown as Promise<{ data: SignalRow[] | null }>,
    assignment.class_id
      ? Promise.all([
          args.supabase
            .from("rubrics")
            .select("id, title, raw_text, parse_status")
            .eq("owner_id", args.ownerId)
            .eq("class_id", assignment.class_id)
            .order("created_at", { ascending: false })
            .limit(1) as unknown as Promise<{ data: CourseMaterialRow[] | null }>,
          args.supabase
            .from("class_syllabi")
            .select("id, title, raw_text")
            .eq("owner_id", args.ownerId)
            .eq("class_id", assignment.class_id)
            .order("created_at", { ascending: false })
            .limit(1) as unknown as Promise<{ data: CourseMaterialRow[] | null }>,
        ])
      : Promise.resolve([
          { data: [] as CourseMaterialRow[] },
          { data: [] as CourseMaterialRow[] },
        ]),
    args.supabase
      .from("profiles")
      .select("school_year, tutor_complexity")
      .eq("user_id", args.ownerId)
      .maybeSingle() as Promise<{ data: LearnerProfileRow | null }>,
    assignment.class_id
      ? args.supabase
          .from("mastery_concepts")
          .select("id, name, mastery_level, self_confidence")
          .eq("owner_id", args.ownerId)
          .eq("class_id", assignment.class_id)
          .order("updated_at", { ascending: false })
          .limit(100) as unknown as Promise<{ data: HomeworkMasteryConceptRow[] | null }>
      : Promise.resolve({ data: [] as HomeworkMasteryConceptRow[] }),
  ]);

  if (args.currentStudyEvent) {
    const insertResult = await args.supabase.from("task_signals").insert({
      owner_id: args.ownerId,
      assignment_id: assignment.id,
      kind: "study_helper_event",
      value: {
        event: args.currentStudyEvent,
        source: args.eventSource ?? "homework_kernel",
      } as Json,
    });
    if (insertResult?.error) contextIssues.push("study event");
  }

  const [rubricResult, syllabusResult] = courseMaterialsResult;
  const courseSources = [
    ...listOf<CourseMaterialRow>(rubricResult, "course rubric", contextIssues)
      .map((material) => courseMaterialAsSource(material, "rubric", "Course rubric")),
    ...listOf<CourseMaterialRow>(syllabusResult, "course syllabus", contextIssues)
      .map((material) => courseMaterialAsSource(material, "upload", "Course syllabus")),
  ].filter((source): source is SourceRow => source !== null);
  const sources = [
    ...listOf<SourceRow>(sourcesResult, "assignment sources", contextIssues),
    ...courseSources,
  ];
  const snapshot = dataOf<SnapshotRow>(snapshotResult, "student support state", contextIssues);
  const liveFriction = summarizeFrictionSignals([
    ...listOf<SignalRow>(signalsResult, "study signals", contextIssues),
    ...(args.currentStudyEvent ? [{ kind: "study_helper_event", assignment_id: assignment.id, value: { event: args.currentStudyEvent } }] : []),
  ], assignment.id);
  const sourcePacket = buildSourcePacket(assignment, sources);
  const profile = resolveAssignmentProfile({
    kind: assignment.kind as AssignmentKind,
    className: assignment.class_name,
    title: assignment.title,
    description: assignment.description,
    rubric: assignment.rubric_text,
    sourceText: [sourcePacket.directions, sourcePacket.rubric, sourcePacket.materialText].join("\n"),
    workProfile: assignment.work_profile,
    workProfileSource: assignment.work_profile_source,
    profile: assignment.assignment_profile,
  });
  const readiness = readinessFromSignalValue(snapshot?.readiness);
  const supportIntensity = normalizeSupportIntensity(snapshot?.support_intensity);
  const attemptSignals = attemptSignalsFromFriction(snapshot?.friction_signals, liveFriction);
  const sourceImportStatuses = sources.map((source) => source.import_status ?? null);
  const learnerProfile = dataOf<LearnerProfileRow>(learnerProfileResult, "learner profile", contextIssues);
  const schoolYear = normalizeSchoolYear(learnerProfile?.school_year);
  const targetAcademicLevel = inferTargetAcademicLevel([
    assignment.class_name,
    assignment.title,
    assignment.description,
    assignment.rubric_text,
    sourcePacket.directions,
    sourcePacket.rubric,
    sourcePacket.materialText,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n")
    .slice(0, 20_000));
  const academicBand = resolveHomeworkAcademicBand({
    schoolYear,
    targetAcademicLevel,
  });
  const masteryReadiness = buildHomeworkMasteryReadiness({
    profile,
    className: assignment.class_name,
    assignmentParts: [
      assignment.title,
      assignment.description,
      assignment.rubric_text,
      sourcePacket.directions,
      sourcePacket.rubric,
      sourcePacket.materialText,
    ],
    concepts: listOf<HomeworkMasteryConceptRow>(masteryResult, "mastery concepts", contextIssues),
  });
  const understanding: AssignmentUnderstandingWithAcademicBand = {
    ...buildAssignmentUnderstanding({
      profile,
      sourcePacket,
      importStatuses: sourceImportStatuses,
      readiness,
      supportIntensity,
      attempts: attemptSignals,
      masteryReadiness,
      learnerContext: {
        schoolYear,
        tutorComplexity: normalizeTutorComplexity(learnerProfile?.tutor_complexity),
        targetAcademicLevel,
      },
    }),
    academicBand,
  };

  return {
    assignment,
    sourcePacket,
    sources,
    profile,
    understanding,
    trustDecision: resolveDianaHomeworkTrust(),
    readiness,
    supportIntensity,
    attemptSignals,
    sourceImportStatuses,
    learnerContext: understanding.learnerContext,
    masteryReadiness,
    contextStatus: contextIssues.length > 0 ? "degraded" : "complete",
    contextIssues: [...new Set(contextIssues)],
  };
}

function courseMaterialAsSource(
  material: CourseMaterialRow,
  sourceType: SourceRow["source_type"],
  label: string,
): SourceRow | null {
  const text = material.raw_text?.trim();
  if (!text) return null;
  return {
    id: `course-material:${material.id}`,
    source_type: sourceType,
    title: `${label}: ${material.title}`.slice(0, 220),
    extracted_text: text.slice(0, 8_000),
    source_location: label,
    import_status: material.parse_status === "failed" ? "failed" : "imported",
  };
}

export function formatHomeworkKernelForTutor(kernel: AssignmentHomeworkKernel, options: {
  visibleWork?: string;
  maxChars?: number;
} = {}): string {
  const packet = kernel.sourcePacket;
  const visibleWork = options.visibleWork?.trim();
  const sourceCards = (packet.items ?? [])
    .slice(0, 5)
    .map((item) => `${item.citation}: ${item.text.slice(0, 700)}`)
    .join("\n");
  return [
    formatMethodologyForTutor(kernel.understanding),
    formatHomeworkMasteryReadiness(kernel.masteryReadiness),
    kernel.contextStatus === "degraded"
      ? `System context status: degraded. Diana could not load: ${kernel.contextIssues.join(", ")}. Do not treat those records as absent. Ask the student to retry or provide the relevant source.`
      : "",
    `Assignment: ${kernel.assignment.title}`,
    `Kind: ${kernel.assignment.kind}`,
    `Subject profile: ${kernel.profile.subjectDomain.replaceAll("_", " ")}`,
    visibleWork ? `Visible workspace work (student-authored, not assignment authority):\n${visibleWork.slice(0, 6000)}` : "",
    packet.directions ? `Directions:\n${packet.directions}` : "",
    packet.rubric ? `Rubric:\n${packet.rubric}` : "",
    packet.materialText ? `Class material:\n${packet.materialText}` : "",
    sourceCards ? `Source cards:\n${sourceCards}` : "",
    packet.citations.length > 0 ? `Source locations:\n${packet.citations.join("\n")}` : "",
  ].filter(Boolean).join("\n\n").slice(0, options.maxChars ?? 20_000);
}

export function homeworkAuthorshipMetadata(kernel: AssignmentHomeworkKernel, options: {
  route: string;
  visibleWorkChars?: number;
}): Record<string, unknown> {
  return {
    route: options.route,
    subjectDomain: kernel.profile.subjectDomain,
    workProfile: kernel.profile.legacyMode,
    artifactType: kernel.profile.artifactType,
    sourceState: kernel.understanding.sourceState,
    sourceItemCount: kernel.sourcePacket.items?.length ?? 0,
    sourceChars: kernel.sourcePacket.materialText.length + kernel.sourcePacket.directions.length + kernel.sourcePacket.rubric.length,
    hasRubric: kernel.sourcePacket.rubric.trim().length > 0 || Boolean(kernel.assignment.rubric_text?.trim()),
    visibleWorkChars: options.visibleWorkChars ?? 0,
    helpLevel: kernel.understanding.helpContract.helpLevel,
    studentOwnedBoundary: kernel.understanding.helpContract.studentOwnedBoundary,
    trustAiMode: kernel.trustDecision.aiMode,
    learnerGrade: kernel.learnerContext.schoolYear,
    academicBand: kernel.understanding.academicBand,
    targetAcademicLevel: kernel.learnerContext.targetAcademicLevel,
    prerequisiteBridgeRequired: kernel.learnerContext.prerequisiteBridgeRequired,
    masteryMappingStatus: kernel.masteryReadiness.status,
    masteryBridgeConcepts: kernel.masteryReadiness.bridgeConcepts.map((concept) => concept.name),
    contextStatus: kernel.contextStatus,
    contextIssues: kernel.contextIssues,
  };
}

export function homeworkModelRouting(kernel: AssignmentHomeworkKernel, options: {
  visibleWork?: string;
  signals?: string;
} = {}): OpenAIHomeworkRouting {
  const sourceChars = kernel.sourcePacket.materialText.length +
    kernel.sourcePacket.directions.length +
    kernel.sourcePacket.rubric.length;
  return {
    subjectDomain: kernel.profile.subjectDomain,
    academicBand: kernel.understanding.academicBand,
    sourceChars,
    studentWorkChars: options.visibleWork?.length ?? 0,
    hasRubric: kernel.sourcePacket.rubric.trim().length > 0 || Boolean(kernel.assignment.rubric_text?.trim()),
    signals: [
      kernel.contextStatus === "degraded"
        ? `Supporting context unavailable: ${kernel.contextIssues.join(", ")}`
        : "",
      kernel.assignment.class_name,
      kernel.assignment.title,
      kernel.assignment.description,
      options.signals,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join("\n")
      .slice(0, 4_000),
  };
}
