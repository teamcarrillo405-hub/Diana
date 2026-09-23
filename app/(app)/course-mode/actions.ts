"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  assignmentProfilePersistencePatch,
  resolveAssignmentProfile,
  SUBJECT_DOMAINS,
  type SubjectDomain,
} from "@/lib/assignment-profile";
import { qtiItemToStorage, type QtiAssessmentItem } from "@/lib/course-mode/assessment";
import { normalizeCasePackage } from "@/lib/course-mode/standards";
import { subjectPackForDomain } from "@/lib/course-mode/subject-packs";
import { getValidCanvasToken } from "@/lib/lms/canvas";
import { GradeSyncDeliveryError, syncConfirmedGrade } from "@/lib/lms/grades";
import { getValidGoogleToken, type GoogleClassroomConfig } from "@/lib/lms/google";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import {
  hydrateLmsConnectionCredentials,
  persistLmsTokenRefresh,
} from "@/lib/integrations/credential-vault";

const uuid = z.string().uuid();
type CourseModeStore = Awaited<ReturnType<typeof createClient>>;

const distributionResultSchema = z.object({
  inserted: z.number().int().nonnegative(),
}).passthrough();

const assessmentConfirmationSchema = z.object({
  confirmed: z.boolean(),
}).passthrough();

const courseGradeCalculationSchema = z.object({
  ready: z.boolean(),
  calculatedPercent: z.number().nullable(),
  scoredCount: z.number().int().nonnegative(),
  ruleCount: z.number().int().nonnegative(),
}).passthrough();

function statusRedirect(status: string): never {
  redirect(`/course-mode?status=${encodeURIComponent(status)}`);
}

async function authenticatedStore() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, store: supabase, user };
}

function chunk<T>(rows: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }
  return result;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function nullableRpcArg<T>(value: T | null): T {
  // PostgreSQL function parameters accept NULL, but generated RPC argument
  // metadata only reports the declared base type.
  return value as T;
}

export async function importCaseStandardsFramework(formData: FormData) {
  const parsed = z.object({
    organizationId: uuid,
    packageJson: z.string().min(2).max(10_000_000),
    statementStorageAuthorized: z.enum(["yes", "no"]),
    licenseUri: z.string().url().max(2000).optional(),
  }).safeParse({
    organizationId: formData.get("organizationId"),
    packageJson: formData.get("packageJson"),
    statementStorageAuthorized: formData.get("statementStorageAuthorized"),
    licenseUri: formData.get("licenseUri") || undefined,
  });
  if (!parsed.success) statusRedirect("standards-input");
  let normalized;
  try {
    normalized = normalizeCasePackage(JSON.parse(parsed.data.packageJson));
  } catch {
    statusRedirect("standards-package-not-valid");
  }
  const document = normalized.documents[0];
  if (!document) statusRedirect("standards-document-missing");
  const { store, user } = await authenticatedStore();
  const { data: authority } = await store.from("organization_memberships")
    .select("id")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", user.id)
    .eq("verification_status", "verified")
    .in("role", ["district_admin", "school_admin", "teacher"])
    .maybeSingle();
  if (!authority) statusRedirect("standards-not-authorized");
  const authorized = parsed.data.statementStorageAuthorized === "yes";
  const { data: framework, error: frameworkError } = await store.from("standards_frameworks").upsert({
    owner_id: user.id,
    case_identifier: document.identifier,
    uri: document.uri,
    title: document.title,
    creator: document.creator ?? null,
    version_label: document.lastChangeDateTime ?? null,
    language: document.language ?? null,
    adoption_status: document.adoptionStatus ?? null,
    license_uri: parsed.data.licenseUri ?? null,
    statement_storage_authorized: authorized,
    provenance: {
      format: "1EdTech CASE",
      importedAt: new Date().toISOString(),
      warnings: normalized.warnings,
    },
    status: "draft",
  }, { onConflict: "owner_id,case_identifier" }).select("id").single();
  if (frameworkError || !framework) statusRedirect("standards-framework-not-imported");
  try {
    for (const rows of chunk(normalized.items.map((item) => ({
      framework_id: framework.id,
      owner_id: user.id,
      case_identifier: item.identifier,
      uri: item.uri,
      human_coding_scheme: item.humanCodingScheme ?? null,
      statement: authorized ? item.fullStatement ?? null : null,
      education_levels: item.educationLevel ?? [],
      item_type: item.itemType ?? null,
      raw_metadata: toJson(item),
    })), 500)) {
      const { error } = await store.from("standard_items").upsert(rows, {
        onConflict: "framework_id,case_identifier",
      });
      if (error) throw error;
    }
    for (const rows of chunk(normalized.associations.map((association) => ({
      framework_id: framework.id,
      owner_id: user.id,
      case_identifier: association.identifier,
      uri: association.uri ?? null,
      association_type: association.associationType,
      origin_uri: association.originNodeURI.uri,
      destination_uri: association.destinationNodeURI.uri,
      raw_metadata: toJson(association),
    })), 500)) {
      const { error } = await store.from("standard_associations").upsert(rows, {
        onConflict: "framework_id,case_identifier",
      });
      if (error) throw error;
    }
  } catch {
    statusRedirect("standards-items-not-imported");
  }
  const { error: approvalError } = await store.from("teacher_approvals").insert({
    organization_id: parsed.data.organizationId,
    course_id: null,
    subject_type: "standards_framework",
    subject_id: framework.id,
    subject_version: 1,
    decision: "approved",
    notes: authorized
      ? "Teacher verified CASE source and authorization to store standard statements."
      : "Teacher verified CASE source; statement text was not stored.",
    decided_by: user.id,
  });
  if (approvalError) {
    statusRedirect("standards-approval-not-recorded");
  }
  const { error: approveFrameworkError } = await store.from("standards_frameworks")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", framework.id)
    .eq("status", "draft");
  if (approveFrameworkError) statusRedirect("standards-not-approved");
  revalidatePath("/course-mode");
  statusRedirect("standards-imported");
}

export async function createCourseModeCourse(formData: FormData) {
  const parsed = z.object({
    organizationId: uuid,
    title: z.string().trim().min(2).max(200),
    subjectDomain: z.enum(SUBJECT_DOMAINS),
    gradeBand: z.string().trim().min(1).max(80),
    courseLevel: z.string().trim().max(80).optional(),
    jurisdictionCode: z.string().trim().max(80).optional(),
    standardsFrameworkId: z.union([uuid, z.literal("")]).optional(),
  }).safeParse({
    organizationId: formData.get("organizationId"),
    title: formData.get("title"),
    subjectDomain: formData.get("subjectDomain"),
    gradeBand: formData.get("gradeBand"),
    courseLevel: formData.get("courseLevel") || undefined,
    jurisdictionCode: formData.get("jurisdictionCode") || undefined,
    standardsFrameworkId: formData.get("standardsFrameworkId") || "",
  });
  if (!parsed.success) statusRedirect("course-input");
  const { store, user } = await authenticatedStore();
  const { error } = await store.from("course_mode_courses").insert({
    organization_id: parsed.data.organizationId,
    title: parsed.data.title,
    subject_domain: parsed.data.subjectDomain,
    grade_band: parsed.data.gradeBand,
    course_level: parsed.data.courseLevel ?? null,
    jurisdiction_code: parsed.data.jurisdictionCode ?? null,
    standards_framework_id: parsed.data.standardsFrameworkId || null,
    created_by: user.id,
  });
  if (error?.code === "23505") statusRedirect("course-title-in-use");
  if (error) statusRedirect("course-not-created");
  revalidatePath("/course-mode");
  statusRedirect("course-created");
}

export async function createCourseModeUnit(formData: FormData) {
  const parsed = z.object({
    courseId: uuid,
    title: z.string().trim().min(2).max(200),
    summary: z.string().trim().max(4000).optional(),
  }).safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
  });
  if (!parsed.success) statusRedirect("unit-input");
  const { store, user } = await authenticatedStore();
  const { data: latest } = await store.from("course_mode_units").select("position").eq("course_id", parsed.data.courseId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await store.from("course_mode_units").insert({
    course_id: parsed.data.courseId,
    title: parsed.data.title,
    summary: parsed.data.summary ?? null,
    position: Number(latest?.position ?? -1) + 1,
    created_by: user.id,
  });
  if (error) statusRedirect("unit-not-created");
  revalidatePath("/course-mode");
  statusRedirect("unit-created");
}

export async function createCourseModeLesson(formData: FormData) {
  const parsed = z.object({
    unitId: uuid,
    title: z.string().trim().min(2).max(200),
    summary: z.string().trim().max(8000).optional(),
    estimatedMinutes: z.coerce.number().int().min(1).max(600).optional(),
  }).safeParse({
    unitId: formData.get("unitId"),
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
    estimatedMinutes: formData.get("estimatedMinutes") || undefined,
  });
  if (!parsed.success) statusRedirect("lesson-input");
  const { store, user } = await authenticatedStore();
  const { data: latest } = await store.from("course_mode_lessons").select("position").eq("unit_id", parsed.data.unitId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await store.from("course_mode_lessons").insert({
    unit_id: parsed.data.unitId,
    title: parsed.data.title,
    summary: parsed.data.summary ?? null,
    estimated_minutes: parsed.data.estimatedMinutes ?? null,
    position: Number(latest?.position ?? -1) + 1,
    created_by: user.id,
  });
  if (error) statusRedirect("lesson-not-created");
  revalidatePath("/course-mode");
  statusRedirect("lesson-created");
}

export async function createCourseModeLessonResource(formData: FormData) {
  const parsed = z.object({
    lessonId: uuid,
    resourceType: z.enum(["text", "file", "link", "video", "audio", "interactive"]),
    title: z.string().trim().min(2).max(200),
    sourceUri: z.string().url().max(2000).optional(),
    contentText: z.string().trim().max(50_000).optional(),
  }).refine((value) => value.sourceUri || value.contentText, {
    message: "A resource needs text or a source link.",
  }).safeParse({
    lessonId: formData.get("lessonId"),
    resourceType: formData.get("resourceType"),
    title: formData.get("title"),
    sourceUri: formData.get("sourceUri") || undefined,
    contentText: formData.get("contentText") || undefined,
  });
  if (!parsed.success) statusRedirect("resource-input");
  const { store } = await authenticatedStore();
  const { data: latest } = await store.from("course_mode_lesson_resources")
    .select("position")
    .eq("lesson_id", parsed.data.lessonId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await store.from("course_mode_lesson_resources").insert({
    lesson_id: parsed.data.lessonId,
    resource_type: parsed.data.resourceType,
    title: parsed.data.title,
    source_uri: parsed.data.sourceUri ?? null,
    content_text: parsed.data.contentText ?? null,
    provenance: parsed.data.sourceUri ? { sourceUri: parsed.data.sourceUri } : { sourceKind: "teacher-authored" },
    position: Number(latest?.position ?? -1) + 1,
  });
  if (error) statusRedirect("resource-not-created");
  revalidatePath("/course-mode");
  statusRedirect("resource-created");
}

export async function createCourseModeObjective(formData: FormData) {
  const parsed = z.object({
    courseId: uuid,
    title: z.string().trim().min(2).max(300),
    description: z.string().trim().max(4000).optional(),
  }).safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) statusRedirect("objective-input");
  const { store, user } = await authenticatedStore();
  const { error } = await store.from("learning_objectives").insert({
    owner_id: user.id,
    course_mode_course_id: parsed.data.courseId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: "draft",
  });
  if (error) statusRedirect("objective-not-created");
  revalidatePath("/course-mode");
  statusRedirect("objective-created");
}

export async function approveCourseModeObjective(formData: FormData) {
  const parsed = z.object({ objectiveId: uuid }).safeParse({
    objectiveId: formData.get("objectiveId"),
  });
  if (!parsed.success) statusRedirect("objective-approval-input");
  const { store, user } = await authenticatedStore();
  const { data: objective } = await store.from("learning_objectives")
    .select("id, course_mode_course_id, version, status")
    .eq("id", parsed.data.objectiveId)
    .maybeSingle();
  if (!objective?.course_mode_course_id || objective.status !== "draft") {
    statusRedirect("objective-approval-not-available");
  }
  const { data: course } = await store.from("course_mode_courses")
    .select("organization_id")
    .eq("id", objective.course_mode_course_id)
    .maybeSingle();
  if (!course) statusRedirect("objective-course-not-found");
  const { error: approvalError } = await store.from("teacher_approvals").insert({
    organization_id: course.organization_id,
    course_id: objective.course_mode_course_id,
    subject_type: "objective",
    subject_id: objective.id,
    subject_version: objective.version,
    decision: "approved",
    decided_by: user.id,
  });
  if (approvalError) statusRedirect("objective-approval-not-recorded");
  const { error } = await store.from("learning_objectives")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", objective.id)
    .eq("status", "draft");
  if (error) statusRedirect("objective-not-approved");
  revalidatePath("/course-mode");
  statusRedirect("objective-approved");
}

export async function createCourseObjectiveRevision(formData: FormData) {
  const parsed = z.object({ objectiveId: uuid }).safeParse({
    objectiveId: formData.get("objectiveId"),
  });
  if (!parsed.success) statusRedirect("objective-revision-input");
  const { store } = await authenticatedStore();
  const { data, error } = await store.rpc("create_course_objective_revision", {
    p_objective_id: parsed.data.objectiveId,
  });
  if (error || typeof data !== "string") statusRedirect("objective-revision-not-created");
  revalidatePath("/course-mode");
  statusRedirect("objective-revision-created");
}

export async function alignLessonObjective(formData: FormData) {
  const parsed = z.object({
    lessonId: uuid,
    objectiveId: uuid,
    alignmentType: z.enum(["introduces", "teaches", "practices", "assesses"]),
  }).safeParse({
    lessonId: formData.get("lessonId"),
    objectiveId: formData.get("objectiveId"),
    alignmentType: formData.get("alignmentType"),
  });
  if (!parsed.success) statusRedirect("lesson-objective-input");
  const { store } = await authenticatedStore();
  const { error } = await store.from("course_mode_lesson_objectives").upsert({
    lesson_id: parsed.data.lessonId,
    objective_id: parsed.data.objectiveId,
    alignment_type: parsed.data.alignmentType,
  }, { onConflict: "lesson_id,objective_id,alignment_type" });
  if (error) statusRedirect("lesson-objective-not-aligned");
  revalidatePath("/course-mode");
  statusRedirect("lesson-objective-aligned");
}

export async function alignObjectiveStandard(formData: FormData) {
  const parsed = z.object({
    objectiveId: uuid,
    standardItemId: uuid,
    alignmentType: z.enum(["introduces", "teaches", "practices", "assesses"]),
  }).safeParse({
    objectiveId: formData.get("objectiveId"),
    standardItemId: formData.get("standardItemId"),
    alignmentType: formData.get("alignmentType"),
  });
  if (!parsed.success) statusRedirect("standard-alignment-input");
  const { store, user } = await authenticatedStore();
  const { error } = await store.from("objective_alignments").upsert({
    owner_id: user.id,
    objective_id: parsed.data.objectiveId,
    standard_item_id: parsed.data.standardItemId,
    alignment_type: parsed.data.alignmentType,
  }, { onConflict: "objective_id,standard_item_id,alignment_type" });
  if (error) statusRedirect("standard-not-aligned");
  revalidatePath("/course-mode");
  statusRedirect("standard-aligned");
}

export async function addObjectivePrerequisite(formData: FormData) {
  const parsed = z.object({
    objectiveId: uuid,
    prerequisiteObjectiveId: uuid,
    minimumMastery: z.coerce.number().min(0).max(1),
  }).refine((value) => value.objectiveId !== value.prerequisiteObjectiveId, {
    message: "An objective cannot be its own prerequisite.",
  }).safeParse({
    objectiveId: formData.get("objectiveId"),
    prerequisiteObjectiveId: formData.get("prerequisiteObjectiveId"),
    minimumMastery: formData.get("minimumMastery") || 0.7,
  });
  if (!parsed.success) statusRedirect("prerequisite-input");
  const { store, user } = await authenticatedStore();
  const { error } = await store.from("prerequisite_edges").upsert({
    owner_id: user.id,
    prerequisite_objective_id: parsed.data.prerequisiteObjectiveId,
    objective_id: parsed.data.objectiveId,
    minimum_mastery: parsed.data.minimumMastery,
  }, { onConflict: "prerequisite_objective_id,objective_id" });
  if (error) statusRedirect("prerequisite-not-created");
  revalidatePath("/course-mode");
  statusRedirect("prerequisite-created");
}

export async function createCourseModeAssignment(formData: FormData) {
  const parsed = z.object({
    courseId: uuid,
    lessonId: z.union([uuid, z.literal("")]).optional(),
    title: z.string().trim().min(2).max(200),
    instructions: z.string().trim().min(2).max(50_000),
    rubricText: z.string().trim().max(20_000).optional(),
    dueAt: z.string().datetime().optional(),
    estimatedMinutes: z.coerce.number().int().min(1).max(1200).optional(),
  }).safeParse({
    courseId: formData.get("courseId"),
    lessonId: formData.get("lessonId") || "",
    title: formData.get("title"),
    instructions: formData.get("instructions"),
    rubricText: formData.get("rubricText") || undefined,
    dueAt: formData.get("dueAt") ? new Date(String(formData.get("dueAt"))).toISOString() : undefined,
    estimatedMinutes: formData.get("estimatedMinutes") || undefined,
  });
  if (!parsed.success) statusRedirect("assignment-input");
  const { store, user } = await authenticatedStore();
  const { data: course } = await store.from("course_mode_courses").select("title, subject_domain").eq("id", parsed.data.courseId).maybeSingle();
  if (!course) statusRedirect("course-not-found");
  const resolvedProfile = resolveAssignmentProfile({
    kind: "other",
    className: course.title,
    title: parsed.data.title,
    description: parsed.data.instructions,
    rubric: parsed.data.rubricText,
    profile: {
      ...assignmentProfilePersistencePatch(resolveAssignmentProfile({
        kind: "other",
        className: `${course.title} ${String(course.subject_domain).replaceAll("_", " ")}`,
        title: parsed.data.title,
        description: parsed.data.instructions,
        rubric: parsed.data.rubricText,
      })).assignment_profile,
    },
  });
  const subjectDomain = course.subject_domain as SubjectDomain;
  const subjectPack = subjectPackForDomain(subjectDomain);
  const profile = {
    ...resolvedProfile,
    subjectDomain,
    capabilities: [...new Set([
      ...resolvedProfile.capabilities,
      ...subjectPack.requiredCapabilities,
    ])],
    reasons: [
      ...resolvedProfile.reasons,
      `Course Mode subject pack: ${subjectPack.label}.`,
    ],
  };
  const { error } = await store.from("course_mode_assignments").insert({
    course_id: parsed.data.courseId,
    lesson_id: parsed.data.lessonId || null,
    title: parsed.data.title,
    instructions: parsed.data.instructions,
    rubric_text: parsed.data.rubricText ?? null,
    assignment_kind: profile.legacyMode === "math" ? "problem_set" : profile.legacyMode === "lab" ? "lab" : profile.legacyMode === "reading" ? "reading" : profile.legacyMode === "writing" ? "essay" : "other",
    assignment_profile: profile,
    artifact_contract: toJson({
      subjectPackId: subjectPack.id,
      artifactType: profile.artifactType,
      capabilities: profile.capabilities,
      methodology: subjectPack.methodology,
      artifactExpectations: subjectPack.artifactExpectations,
      reviewRules: subjectPack.reviewRules,
      safetyDignityConstraints: subjectPack.safetyDignityConstraints,
    }),
    due_at: parsed.data.dueAt ?? null,
    estimated_minutes: parsed.data.estimatedMinutes ?? null,
    created_by: user.id,
  });
  if (error) statusRedirect("assignment-not-created");
  revalidatePath("/course-mode");
  statusRedirect("assignment-created");
}

export async function createAssessmentBlueprint(formData: FormData) {
  const parsed = z.object({
    courseId: uuid,
    title: z.string().trim().min(2).max(200),
    purpose: z.enum(["formative", "summative"]),
    instructions: z.string().trim().max(10_000).optional(),
    maxAttempts: z.coerce.number().int().min(1).max(20),
    externalAssignmentId: z.string().trim().max(300).optional(),
  }).safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    purpose: formData.get("purpose"),
    instructions: formData.get("instructions") || undefined,
    maxAttempts: formData.get("maxAttempts") || 1,
    externalAssignmentId: formData.get("externalAssignmentId") || undefined,
  });
  if (!parsed.success) statusRedirect("assessment-input");
  const { store, user } = await authenticatedStore();
  const { error } = await store.from("assessment_blueprints").insert({
    course_id: parsed.data.courseId,
    title: parsed.data.title,
    purpose: parsed.data.purpose,
    instructions: parsed.data.instructions ?? null,
    max_attempts: parsed.data.maxAttempts,
    external_assignment_id: parsed.data.externalAssignmentId ?? null,
    created_by: user.id,
  });
  if (error) statusRedirect("assessment-not-created");
  revalidatePath("/course-mode");
  statusRedirect("assessment-created");
}

export async function addAssessmentChoiceItem(formData: FormData) {
  const parsed = z.object({
    blueprintId: uuid,
    identifier: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,79}$/u),
    title: z.string().trim().min(1).max(200),
    prompt: z.string().trim().min(1).max(10_000),
    choiceA: z.string().trim().min(1).max(1000),
    choiceB: z.string().trim().min(1).max(1000),
    correct: z.enum(["A", "B"]),
    points: z.coerce.number().positive().max(1000),
  }).safeParse({
    blueprintId: formData.get("blueprintId"),
    identifier: formData.get("identifier"),
    title: formData.get("title"),
    prompt: formData.get("prompt"),
    choiceA: formData.get("choiceA"),
    choiceB: formData.get("choiceB"),
    correct: formData.get("correct"),
    points: formData.get("points"),
  });
  if (!parsed.success) statusRedirect("item-input");
  const { store } = await authenticatedStore();
  const item: QtiAssessmentItem = {
    identifier: parsed.data.identifier,
    title: parsed.data.title,
    interactionType: "choice",
    prompt: parsed.data.prompt,
    choices: [
      { identifier: "A", label: parsed.data.choiceA },
      { identifier: "B", label: parsed.data.choiceB },
    ],
    correctResponse: [parsed.data.correct],
    caseSensitive: true,
    numericTolerance: null,
    points: parsed.data.points,
    objectiveIds: [],
  };
  const row = qtiItemToStorage(item);
  const { data: latest } = await store.from("assessment_items").select("position").eq("blueprint_id", parsed.data.blueprintId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await store.from("assessment_items").insert({
    blueprint_id: parsed.data.blueprintId,
    ...row,
    position: Number(latest?.position ?? -1) + 1,
  });
  if (error) statusRedirect("item-not-created");
  revalidatePath("/course-mode");
  statusRedirect("item-created");
}

export async function addAssessmentOpenItem(formData: FormData) {
  const parsed = z.object({
    blueprintId: uuid,
    identifier: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,79}$/u),
    title: z.string().trim().min(1).max(200),
    prompt: z.string().trim().min(1).max(10_000),
    interactionType: z.enum(["text_entry", "numeric_entry", "extended_text"]),
    correctResponse: z.string().trim().max(4000).optional(),
    numericTolerance: z.coerce.number().min(0).max(1_000_000).optional(),
    points: z.coerce.number().positive().max(1000),
  }).superRefine((value, context) => {
    if (value.interactionType !== "extended_text" && !value.correctResponse) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["correctResponse"], message: "Deterministic items need an approved response." });
    }
    if (value.interactionType === "numeric_entry" && !Number.isFinite(Number(value.correctResponse))) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["correctResponse"], message: "Numeric items need a numeric response." });
    }
  }).safeParse({
    blueprintId: formData.get("blueprintId"),
    identifier: formData.get("identifier"),
    title: formData.get("title"),
    prompt: formData.get("prompt"),
    interactionType: formData.get("interactionType"),
    correctResponse: formData.get("correctResponse") || undefined,
    numericTolerance: formData.get("numericTolerance") || undefined,
    points: formData.get("points"),
  });
  if (!parsed.success) statusRedirect("item-input");
  const { store } = await authenticatedStore();
  const item: QtiAssessmentItem = {
    identifier: parsed.data.identifier,
    title: parsed.data.title,
    interactionType: parsed.data.interactionType,
    prompt: parsed.data.prompt,
    choices: [],
    correctResponse: parsed.data.interactionType === "extended_text" ? [] : [parsed.data.correctResponse ?? ""],
    caseSensitive: false,
    numericTolerance: parsed.data.interactionType === "numeric_entry" ? parsed.data.numericTolerance ?? 0 : null,
    points: parsed.data.points,
    objectiveIds: [],
  };
  const row = qtiItemToStorage(item);
  const { data: latest } = await store.from("assessment_items")
    .select("position")
    .eq("blueprint_id", parsed.data.blueprintId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await store.from("assessment_items").insert({
    blueprint_id: parsed.data.blueprintId,
    ...row,
    position: Number(latest?.position ?? -1) + 1,
  });
  if (error) statusRedirect("item-not-created");
  revalidatePath("/course-mode");
  statusRedirect("item-created");
}

export async function alignAssessmentItemObjective(formData: FormData) {
  const parsed = z.object({
    itemId: uuid,
    objectiveId: uuid,
    evidenceWeight: z.coerce.number().positive().max(100),
  }).safeParse({
    itemId: formData.get("itemId"),
    objectiveId: formData.get("objectiveId"),
    evidenceWeight: formData.get("evidenceWeight") || 1,
  });
  if (!parsed.success) statusRedirect("item-objective-input");
  const { store } = await authenticatedStore();
  const { error } = await store.from("assessment_item_objectives").upsert({
    item_id: parsed.data.itemId,
    objective_id: parsed.data.objectiveId,
    evidence_weight: parsed.data.evidenceWeight,
  }, { onConflict: "item_id,objective_id" });
  if (error) statusRedirect("item-objective-not-aligned");
  revalidatePath("/course-mode");
  statusRedirect("item-objective-aligned");
}

export async function enrollCourseModeStudent(formData: FormData) {
  const parsed = z.object({
    courseId: uuid,
    membershipId: uuid,
  }).safeParse({
    courseId: formData.get("courseId"),
    membershipId: formData.get("membershipId"),
  });
  if (!parsed.success) statusRedirect("enrollment-input");
  const { store } = await authenticatedStore();
  const { error } = await store.from("course_mode_enrollments").upsert({
    course_id: parsed.data.courseId,
    membership_id: parsed.data.membershipId,
    enrollment_role: "student",
    status: "active",
  }, { onConflict: "course_id,membership_id" });
  if (error) statusRedirect("student-not-enrolled");
  revalidatePath("/course-mode");
  statusRedirect("student-enrolled");
}

function lines(value: string): string[] {
  return value.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}

export async function createSafetyProtocol(formData: FormData) {
  const parsed = z.object({
    courseId: uuid,
    organizationId: uuid,
    title: z.string().trim().min(2).max(200),
    safetyClass: z.enum(["physical_activity", "workshop_hazard", "lab_hazard"]),
    sourceKind: z.enum(["teacher", "district", "manufacturer", "government"]),
    sourceUri: z.string().url().max(2000),
    procedureSteps: z.string().trim().min(2).max(30_000),
    requiredPpe: z.string().trim().max(10_000).optional(),
    emergencySteps: z.string().trim().min(2).max(20_000),
    disposalSteps: z.string().trim().max(10_000).optional(),
    minimumAge: z.coerce.number().int().min(5).max(21).optional(),
  }).safeParse({
    courseId: formData.get("courseId"),
    organizationId: formData.get("organizationId"),
    title: formData.get("title"),
    safetyClass: formData.get("safetyClass"),
    sourceKind: formData.get("sourceKind"),
    sourceUri: formData.get("sourceUri"),
    procedureSteps: formData.get("procedureSteps"),
    requiredPpe: formData.get("requiredPpe") || undefined,
    emergencySteps: formData.get("emergencySteps"),
    disposalSteps: formData.get("disposalSteps") || undefined,
    minimumAge: formData.get("minimumAge") || undefined,
  });
  if (!parsed.success) statusRedirect("safety-input");
  const { store, user } = await authenticatedStore();
  const { error } = await store.from("safety_protocols").insert({
    organization_id: parsed.data.organizationId,
    course_id: parsed.data.courseId,
    title: parsed.data.title,
    safety_class: parsed.data.safetyClass,
    source_kind: parsed.data.sourceKind,
    source_uri: parsed.data.sourceUri,
    procedure_steps: lines(parsed.data.procedureSteps),
    required_ppe: lines(parsed.data.requiredPpe ?? ""),
    emergency_steps: lines(parsed.data.emergencySteps),
    disposal_steps: lines(parsed.data.disposalSteps ?? ""),
    supervision_required: true,
    minimum_age: parsed.data.minimumAge ?? null,
    created_by: user.id,
  });
  if (error) statusRedirect("safety-not-created");
  revalidatePath("/course-mode");
  statusRedirect("safety-created");
}

type PublishKind = "course" | "unit" | "lesson" | "course_assignment" | "assessment" | "safety_protocol";
type PublicationTable =
  | "course_mode_courses"
  | "course_mode_units"
  | "course_mode_lessons"
  | "course_mode_assignments"
  | "assessment_blueprints"
  | "safety_protocols";

type PublicationTarget = {
  table: PublicationTable;
  organizationId: string;
  courseId: string;
  version: number;
  status: string;
};

async function publicationTarget(
  store: CourseModeStore,
  kind: PublishKind,
  id: string,
): Promise<PublicationTarget | null> {
  if (kind === "course") {
    const { data } = await store.from("course_mode_courses").select("id, organization_id, id, version, status").eq("id", id).maybeSingle();
    return data ? { table: "course_mode_courses", organizationId: data.organization_id, courseId: data.id, version: data.version, status: data.status } : null;
  }
  if (kind === "unit") {
    const { data } = await store.from("course_mode_units").select("id, course_id, version, status").eq("id", id).maybeSingle();
    if (!data) return null;
    const { data: course } = await store.from("course_mode_courses").select("organization_id").eq("id", data.course_id).maybeSingle();
    return course ? { table: "course_mode_units", organizationId: course.organization_id, courseId: data.course_id, version: data.version, status: data.status } : null;
  }
  if (kind === "lesson") {
    const { data } = await store.from("course_mode_lessons").select("id, unit_id, version, status").eq("id", id).maybeSingle();
    if (!data) return null;
    const { data: unit } = await store.from("course_mode_units").select("course_id").eq("id", data.unit_id).maybeSingle();
    const { data: course } = unit ? await store.from("course_mode_courses").select("organization_id").eq("id", unit.course_id).maybeSingle() : { data: null };
    return unit && course ? { table: "course_mode_lessons", organizationId: course.organization_id, courseId: unit.course_id, version: data.version, status: data.status } : null;
  }
  if (kind === "safety_protocol") {
    const { data } = await store.from("safety_protocols")
      .select("id, organization_id, course_id, version, status")
      .eq("id", id)
      .maybeSingle();
    return data ? {
      table: "safety_protocols",
      organizationId: data.organization_id,
      courseId: data.course_id,
      version: data.version,
      status: data.status,
    } : null;
  }
  const table = kind === "course_assignment" ? "course_mode_assignments" : "assessment_blueprints";
  const { data } = await store.from(table).select("id, course_id, version, status").eq("id", id).maybeSingle();
  if (!data) return null;
  const { data: course } = await store.from("course_mode_courses").select("organization_id").eq("id", data.course_id).maybeSingle();
  return course ? { table, organizationId: course.organization_id, courseId: data.course_id, version: data.version, status: data.status } : null;
}

async function publishCourseContent(
  store: CourseModeStore,
  table: PublicationTable,
  id: string,
  publishedBy: string,
) {
  const update = {
    status: "published",
    published_at: new Date().toISOString(),
    published_by: publishedBy,
  };
  switch (table) {
    case "course_mode_courses":
      return (await store.from("course_mode_courses").update(update).eq("id", id)).error;
    case "course_mode_units":
      return (await store.from("course_mode_units").update(update).eq("id", id)).error;
    case "course_mode_lessons":
      return (await store.from("course_mode_lessons").update(update).eq("id", id)).error;
    case "course_mode_assignments":
      return (await store.from("course_mode_assignments").update(update).eq("id", id)).error;
    case "assessment_blueprints":
      return (await store.from("assessment_blueprints").update(update).eq("id", id)).error;
    case "safety_protocols":
      return (await store.from("safety_protocols").update(update).eq("id", id)).error;
  }
}

export async function approveAndPublishCourseContent(formData: FormData) {
  const parsed = z.object({
    kind: z.enum(["course", "unit", "lesson", "course_assignment", "assessment", "safety_protocol"]),
    id: uuid,
    notes: z.string().trim().max(4000).optional(),
  }).safeParse({
    kind: formData.get("kind"),
    id: formData.get("id"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) statusRedirect("publish-input");
  const { store, user } = await authenticatedStore();
  const target = await publicationTarget(store, parsed.data.kind, parsed.data.id);
  if (!target || target.status !== "draft") statusRedirect("publish-not-available");
  const { error: approvalError } = await store.from("teacher_approvals").insert({
    organization_id: target.organizationId,
    course_id: target.courseId,
    subject_type: parsed.data.kind,
    subject_id: parsed.data.id,
    subject_version: target.version,
    decision: "approved",
    notes: parsed.data.notes ?? null,
    decided_by: user.id,
  });
  if (approvalError) statusRedirect("approval-not-recorded");
  const publishError = await publishCourseContent(
    store,
    target.table,
    parsed.data.id,
    user.id,
  );
  if (publishError) statusRedirect("publish-not-complete");
  revalidatePath("/course-mode");
  statusRedirect("published");
}

export async function createCourseContentRevision(formData: FormData) {
  const parsed = z.object({
    kind: z.enum(["course", "unit", "lesson", "course_assignment", "assessment", "safety_protocol"]),
    id: uuid,
  }).safeParse({
    kind: formData.get("kind"),
    id: formData.get("id"),
  });
  if (!parsed.success) statusRedirect("revision-input");
  const { store } = await authenticatedStore();
  const { data, error } = parsed.data.kind === "course"
    ? await store.rpc("create_course_revision", { p_course_id: parsed.data.id })
    : await store.rpc("create_course_content_revision", {
        p_kind: parsed.data.kind,
        p_subject_id: parsed.data.id,
      });
  if (error || typeof data !== "string") statusRedirect("revision-not-created");
  revalidatePath("/course-mode");
  statusRedirect("revision-created");
}

export async function distributeCourseModeAssignment(formData: FormData) {
  const parsed = z.object({ assignmentId: uuid }).safeParse({ assignmentId: formData.get("assignmentId") });
  if (!parsed.success) statusRedirect("distribution-input");
  const { store } = await authenticatedStore();
  const { data, error } = await store.rpc("distribute_course_mode_assignment", {
    p_course_assignment_id: parsed.data.assignmentId,
  });
  const distribution = distributionResultSchema.safeParse(data);
  if (error || !distribution.success) statusRedirect("distribution-not-complete");
  revalidatePath("/course-mode");
  statusRedirect(`distributed-${distribution.data.inserted}`);
}

export async function linkCourseModeLms(formData: FormData) {
  const parsed = z.object({
    courseId: uuid,
    connectionId: uuid,
    provider: z.enum(["canvas", "google_classroom"]),
    externalCourseId: z.string().trim().min(1).max(300),
  }).safeParse({
    courseId: formData.get("courseId"),
    connectionId: formData.get("connectionId"),
    provider: formData.get("provider"),
    externalCourseId: formData.get("externalCourseId"),
  });
  if (!parsed.success) statusRedirect("lms-link-input");
  const { store, user } = await authenticatedStore();
  const { error } = await store.from("course_mode_lms_links").upsert({
    course_id: parsed.data.courseId,
    connection_id: parsed.data.connectionId,
    provider: parsed.data.provider,
    external_course_id: parsed.data.externalCourseId,
    created_by: user.id,
  }, { onConflict: "course_id,provider" });
  if (error) statusRedirect("lms-link-not-created");
  revalidatePath("/course-mode");
  statusRedirect("lms-linked");
}

export async function recordTeacherItemScore(formData: FormData) {
  const parsed = z.object({
    attemptId: uuid,
    itemId: uuid,
    score: z.coerce.number().min(0).max(10_000),
    feedback: z.string().trim().max(4000).optional(),
  }).safeParse({
    attemptId: formData.get("attemptId"),
    itemId: formData.get("itemId"),
    score: formData.get("score"),
    feedback: formData.get("feedback") || undefined,
  });
  if (!parsed.success) statusRedirect("teacher-score-input");
  const { store } = await authenticatedStore();
  const { data, error } = await store.rpc("record_assessment_teacher_score", {
    p_attempt_id: parsed.data.attemptId,
    p_item_id: parsed.data.itemId,
    p_score: parsed.data.score,
    p_feedback: parsed.data.feedback,
  });
  if (error || data !== true) statusRedirect("teacher-score-not-recorded");
  revalidatePath("/course-mode");
  statusRedirect("teacher-score-recorded");
}

export async function confirmAssessmentGrade(formData: FormData) {
  const parsed = z.object({
    attemptId: uuid,
    reason: z.string().trim().min(2).max(4000),
  }).safeParse({
    attemptId: formData.get("attemptId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) statusRedirect("grade-confirmation-input");
  const { store } = await authenticatedStore();
  const { data, error } = await store.rpc("confirm_assessment_grade", {
    p_attempt_id: parsed.data.attemptId,
    p_reason: parsed.data.reason,
  });
  const confirmation = assessmentConfirmationSchema.safeParse(data);
  if (error || !confirmation.success || !confirmation.data.confirmed) {
    statusRedirect("grade-not-confirmed");
  }
  revalidatePath("/course-mode");
  statusRedirect("grade-confirmed");
}

export async function createCourseGradingRule(formData: FormData) {
  const parsed = z.object({
    courseId: uuid,
    assessmentId: uuid,
    gradingPeriod: z.string().trim().min(1).max(100),
    weight: z.coerce.number().positive().max(10_000),
  }).safeParse({
    courseId: formData.get("courseId"),
    assessmentId: formData.get("assessmentId"),
    gradingPeriod: formData.get("gradingPeriod"),
    weight: formData.get("weight"),
  });
  if (!parsed.success) statusRedirect("grading-rule-input");
  const { store, user } = await authenticatedStore();
  const { error } = await store.from("course_grading_rules").insert({
    course_id: parsed.data.courseId,
    assessment_blueprint_id: parsed.data.assessmentId,
    grading_period: parsed.data.gradingPeriod,
    weight: parsed.data.weight,
    created_by: user.id,
  });
  if (error) statusRedirect("grading-rule-not-created");
  revalidatePath("/course-mode");
  statusRedirect("grading-rule-created");
}

export async function approveCourseGradingRule(formData: FormData) {
  const parsed = z.object({ ruleId: uuid }).safeParse({
    ruleId: formData.get("ruleId"),
  });
  if (!parsed.success) statusRedirect("grading-rule-approval-input");
  const { store, user } = await authenticatedStore();
  const { data: rule } = await store.from("course_grading_rules")
    .select("id, course_id, version, status")
    .eq("id", parsed.data.ruleId)
    .eq("status", "draft")
    .maybeSingle();
  if (!rule) statusRedirect("grading-rule-not-available");
  const { data: course } = await store.from("course_mode_courses")
    .select("organization_id")
    .eq("id", rule.course_id)
    .maybeSingle();
  if (!course) statusRedirect("grading-rule-course-not-found");
  const { error: approvalError } = await store.from("teacher_approvals").insert({
    organization_id: course.organization_id,
    course_id: rule.course_id,
    subject_type: "grading_rule",
    subject_id: rule.id,
    subject_version: rule.version,
    decision: "approved",
    decided_by: user.id,
  });
  if (approvalError) statusRedirect("grading-rule-approval-not-recorded");
  const { error } = await store.from("course_grading_rules").update({
    status: "approved",
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", rule.id).eq("status", "draft");
  if (error) statusRedirect("grading-rule-not-approved");
  revalidatePath("/course-mode");
  statusRedirect("grading-rule-approved");
}

export async function previewCourseFinalGrade(formData: FormData) {
  const parsed = z.object({
    courseId: uuid,
    studentId: uuid,
    gradingPeriod: z.string().trim().min(1).max(100),
  }).safeParse({
    courseId: formData.get("courseId"),
    studentId: formData.get("studentId"),
    gradingPeriod: formData.get("gradingPeriod"),
  });
  if (!parsed.success) statusRedirect("grade-preview-input");
  const { store } = await authenticatedStore();
  const { data, error } = await store.rpc("calculate_course_grade", {
    p_course_id: parsed.data.courseId,
    p_student_id: parsed.data.studentId,
    p_grading_period: parsed.data.gradingPeriod,
  });
  const calculation = courseGradeCalculationSchema.safeParse(data);
  if (error || !calculation.success) statusRedirect("grade-preview-not-available");
  const grade = calculation.data;
  const query = new URLSearchParams({
    previewCourseId: parsed.data.courseId,
    previewStudentId: parsed.data.studentId,
    previewPeriod: parsed.data.gradingPeriod,
    previewReady: grade.ready ? "1" : "0",
    previewPercent: grade.calculatedPercent === null
      ? ""
      : String(grade.calculatedPercent),
    previewScored: String(grade.scoredCount),
    previewRules: String(grade.ruleCount),
  });
  redirect(`/course-mode?${query.toString()}`);
}

export async function confirmCourseFinalGrade(formData: FormData) {
  const parsed = z.object({
    courseId: uuid,
    studentId: uuid,
    gradingPeriod: z.string().trim().min(1).max(100),
    finalPercent: z.coerce.number().min(0).max(100),
    letterGrade: z.string().trim().max(20).optional(),
    reason: z.string().trim().min(2).max(4000),
  }).safeParse({
    courseId: formData.get("courseId"),
    studentId: formData.get("studentId"),
    gradingPeriod: formData.get("gradingPeriod"),
    finalPercent: formData.get("finalPercent"),
    letterGrade: formData.get("letterGrade") || undefined,
    reason: formData.get("reason"),
  });
  if (!parsed.success) statusRedirect("final-grade-input");
  const { store } = await authenticatedStore();
  const { data, error } = await store.rpc("confirm_calculated_course_final_grade", {
    p_course_id: parsed.data.courseId,
    p_student_id: parsed.data.studentId,
    p_grading_period: parsed.data.gradingPeriod,
    p_final_percent: parsed.data.finalPercent,
    p_letter_grade: parsed.data.letterGrade ?? "",
    p_reason: parsed.data.reason,
  });
  if (error || typeof data !== "string") statusRedirect("final-grade-not-confirmed");
  revalidatePath("/course-mode");
  statusRedirect("final-grade-confirmed");
}

export async function syncConfirmedAssessmentGrade(formData: FormData) {
  const parsed = z.object({
    attemptId: uuid,
    externalStudentId: z.string().trim().min(1).max(300),
  }).safeParse({
    attemptId: formData.get("attemptId"),
    externalStudentId: formData.get("externalStudentId"),
  });
  if (!parsed.success) statusRedirect("grade-sync-input");
  const { store, user } = await authenticatedStore();
  const { data: attempt } = await store.from("assessment_attempts")
    .select("id, status, final_score, points_possible, confirmed_by, confirmed_at, blueprint_id")
    .eq("id", parsed.data.attemptId)
    .maybeSingle();
  if (!attempt || attempt.status !== "confirmed" || attempt.confirmed_by !== user.id || attempt.final_score === null) {
    statusRedirect("grade-not-confirmed");
  }
  const { data: blueprint } = await store.from("assessment_blueprints")
    .select("course_id, external_assignment_id")
    .eq("id", attempt.blueprint_id)
    .maybeSingle();
  if (!blueprint?.external_assignment_id) statusRedirect("grade-external-assignment-missing");
  const { data: link } = await store.from("course_mode_lms_links")
    .select("provider, external_course_id, connection_id")
    .eq("course_id", blueprint.course_id)
    .limit(1)
    .maybeSingle();
  if (!link) statusRedirect("grade-lms-link-missing");
  const { data: connection } = await store.from("lms_connections")
    .select("id, provider, config")
    .eq("id", link.connection_id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!connection || connection.provider !== link.provider) statusRedirect("grade-lms-connection-missing");

  if (link.provider !== "canvas" && link.provider !== "google_classroom") {
    statusRedirect("grade-lms-link-missing");
  }
  const confirmedAt = String(attempt.confirmed_at);
  const securedConnection = await hydrateLmsConnectionCredentials(user.id, connection).catch(() => null);
  if (!securedConnection) statusRedirect("grade-lms-connection-missing");
  const config = securedConnection.config;
  let token = "";
  let canvasInstitutionId: string | null = null;
  let canvasBaseUrl: string | null = null;
  try {
    if (link.provider === "canvas") {
      canvasInstitutionId = typeof config.institution_id === "string"
        ? config.institution_id.trim()
        : "";
      canvasBaseUrl = typeof config.base_url === "string" ? config.base_url.trim() : "";
      const storedToken = typeof config.token === "string" ? config.token : "";
      if (!canvasInstitutionId || !canvasBaseUrl || !storedToken) {
        throw new Error("Reconnect Canvas before syncing grades.");
      }
      const valid = await getValidCanvasToken({
        institution_id: canvasInstitutionId,
        base_url: canvasBaseUrl,
        token: storedToken,
        oauth: config.oauth === true,
        refresh_token: typeof config.refresh_token === "string" ? config.refresh_token : null,
        expires_at: typeof config.expires_at === "string" ? config.expires_at : null,
      });
      token = valid.token;
      if (valid.refreshed) {
        await persistLmsTokenRefresh(store, {
          ownerId: user.id,
          connection: securedConnection,
          accessToken: valid.refreshed.token,
          expiresAt: valid.refreshed.expires_at,
        });
      }
    } else {
      const valid = await getValidGoogleToken(config as GoogleClassroomConfig);
      if (!valid) throw new Error("Reconnect Google Classroom with teacher grade access.");
      token = valid.token;
      if (valid.refreshed) {
        await persistLmsTokenRefresh(store, {
          ownerId: user.id,
          connection: securedConnection,
          accessToken: valid.refreshed.access_token,
          expiresAt: valid.refreshed.expires_at,
        });
      }
    }
  } catch {
    statusRedirect("grade-sync-not-accepted");
  }

  const { data: claimData, error: claimError } = await store.rpc("claim_lms_grade_sync_receipt", {
    p_attempt_id: attempt.id,
    p_provider: link.provider,
    p_external_student_id: parsed.data.externalStudentId,
  });
  const receiptClaim = Array.isArray(claimData) ? claimData[0] : claimData;
  if (claimError || !receiptClaim?.receipt_id) statusRedirect("grade-receipt-not-created");
  if (receiptClaim.claimed !== true) {
    if (receiptClaim.receipt_status === "synced") statusRedirect("grade-already-synced");
    if (receiptClaim.receipt_status === "syncing" || receiptClaim.receipt_status === "confirmation_pending") {
      statusRedirect("grade-sync-confirmation-pending");
    }
    statusRedirect("grade-receipt-not-created");
  }

  let result: Awaited<ReturnType<typeof syncConfirmedGrade>>;
  try {
    result = await syncConfirmedGrade({
      provider: link.provider,
      token,
      canvasInstitutionId,
      canvasBaseUrl,
      externalCourseId: link.external_course_id,
      externalAssignmentId: blueprint.external_assignment_id,
      externalStudentId: parsed.data.externalStudentId,
      score: Number(attempt.final_score),
      pointsPossible: attempt.points_possible === null ? null : Number(attempt.points_possible),
      confirmedBy: user.id,
      confirmedAt,
    });
  } catch (error) {
    const receiptStatus = error instanceof GradeSyncDeliveryError
      ? error.receiptStatus
      : "not_accepted";
    const { data: completionData, error: completionError } = await store.rpc("complete_lms_grade_sync_receipt", {
      p_receipt_id: receiptClaim.receipt_id,
      p_final_status: receiptStatus,
      p_provider_receipt_id: nullableRpcArg<string>(null),
      p_provider_response: {},
      p_error_detail: error instanceof Error
        ? error.message.slice(0, 1000)
        : "Provider grade delivery could not be confirmed.",
    });
    const completion = Array.isArray(completionData) ? completionData[0] : completionData;
    if (
      completionError
      || completion?.completed !== true
      || completion.receipt_status !== receiptStatus
    ) {
      statusRedirect("grade-sync-confirmation-pending");
    }
    statusRedirect(
      receiptStatus === "confirmation_pending"
        ? "grade-sync-confirmation-pending"
        : "grade-sync-not-accepted",
    );
  }

  const { data: completionData, error: completionError } = await store.rpc(
    "complete_lms_grade_sync_receipt",
    {
      p_receipt_id: receiptClaim.receipt_id,
      p_final_status: "synced",
      p_provider_receipt_id: result.providerReceiptId,
      p_provider_response: result,
      p_error_detail: nullableRpcArg<string>(null),
    },
  );
  const completion = Array.isArray(completionData) ? completionData[0] : completionData;
  if (completionError || completion?.completed !== true || completion.receipt_status !== "synced") {
    statusRedirect("grade-sync-confirmation-pending");
  }
  revalidatePath("/course-mode");
  statusRedirect("grade-synced");
}
