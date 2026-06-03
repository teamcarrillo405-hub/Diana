import type { createClient } from "@/lib/supabase/server";
import type { AssignmentStatus, Json } from "@/lib/supabase/types";
import { effectiveAiMode, type AiMode } from "@/lib/portal/teacher";
import {
  buildStudentStateModel,
  sourceAnchorsFromAssignment,
  type MasterySummary,
  type StudentStateAssignment,
  type StudentStateSignal,
} from "./model";
import { energyFromBody, readinessFromSignalValue } from "@/lib/support/policy";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function recordStudentStateSnapshot({
  supabase,
  ownerId,
  assignmentId,
  trigger,
}: {
  supabase: SupabaseServerClient;
  ownerId: string;
  assignmentId: string | null;
  trigger: string;
}) {
  if (!assignmentId) return null;

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, owner_id, title, description, status, kind, reading_load, writing_load, difficulty, estimated_minutes, class_id, rubric_text, ai_mode_override, classes(ai_mode)")
    .eq("id", assignmentId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!assignment) return null;

  const now = new Date();
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [{ data: signals }, { data: noteRows }, mastery] = await Promise.all([
    supabase
      .from("task_signals")
      .select("assignment_id, kind, value, occurred_at")
      .eq("owner_id", ownerId)
      .gte("occurred_at", sevenDaysAgoIso)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("notes")
      .select("title")
      .eq("owner_id", ownerId)
      .eq("assignment_id", assignmentId)
      .order("updated_at", { ascending: false })
      .limit(3),
    loadMasterySummary(supabase, ownerId, assignment.class_id),
  ]);

  const latestReadiness = (signals ?? [])
    .filter((signal) => signal.kind === "mood_checkin" && new Date(signal.occurred_at).getTime() >= todayStart.getTime())
    .map((signal) => readinessFromSignalValue(signal.value))
    .find(Boolean) ?? null;

  const classMode: AiMode = classAiMode(assignment.classes);
  const override = isAiMode(assignment.ai_mode_override) ? assignment.ai_mode_override : null;
  const aiPolicy = effectiveAiMode(classMode, override);
  const model = buildStudentStateModel({
    assignment: {
      id: assignment.id,
      title: assignment.title,
      kind: assignment.kind,
      status: assignment.status as AssignmentStatus,
      reading_load: assignment.reading_load,
      writing_load: assignment.writing_load,
      difficulty: assignment.difficulty,
      effective_minutes: assignment.estimated_minutes ?? 20,
      class_id: assignment.class_id,
    } satisfies StudentStateAssignment,
    aiPolicy,
    readiness: latestReadiness,
    energy: energyFromBody(latestReadiness?.body) ?? "medium",
    signals: (signals ?? []) as StudentStateSignal[],
    mastery,
    sourceAnchors: sourceAnchorsFromAssignment({
      title: assignment.title,
      description: assignment.description,
      rubricText: assignment.rubric_text,
      noteTitles: (noteRows ?? []).map((note) => note.title),
    }),
  });

  const { data, error } = await supabase
    .from("student_state_snapshots")
    .insert({
      owner_id: ownerId,
      assignment_id: assignmentId,
      class_id: assignment.class_id,
      trigger,
      assignment_kind: assignment.kind,
      ai_policy: model.aiPolicy,
      readiness: (model.readiness ?? {}) as Json,
      friction_signals: model.friction as Json,
      recall_signals: model.recall as unknown as Json,
      mastery_signals: model.mastery as unknown as Json,
      support_intensity: model.supportPlan.intensity,
      struggle_state: model.supportPlan.struggle,
      next_step: model.supportPlan.nextStep,
      ownership_meter: model.ownershipMeter as unknown as Json,
      source_anchors: model.sourceAnchors as unknown as Json,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("[student-state] snapshot skipped", error.message);
    return null;
  }
  return data?.id ?? null;
}

async function loadMasterySummary(
  supabase: SupabaseServerClient,
  ownerId: string,
  classId: string | null,
): Promise<MasterySummary> {
  if (!classId) return { linkedConcepts: 0, averageMastery: null, weakestConcept: null };
  const { data } = await supabase
    .from("mastery_concepts")
    .select("name, mastery_level")
    .eq("owner_id", ownerId)
    .eq("class_id", classId)
    .order("mastery_level", { ascending: true })
    .limit(20);
  const rows = data ?? [];
  if (rows.length === 0) return { linkedConcepts: 0, averageMastery: null, weakestConcept: null };
  const total = rows.reduce((sum, row) => sum + Number(row.mastery_level ?? 0), 0);
  return {
    linkedConcepts: rows.length,
    averageMastery: Math.round((total / rows.length) * 10) / 10,
    weakestConcept: rows[0]?.name ?? null,
  };
}

function classAiMode(classes: unknown): AiMode {
  const cls = Array.isArray(classes) ? classes[0] : classes;
  if (cls && typeof cls === "object" && "ai_mode" in cls && isAiMode((cls as { ai_mode?: unknown }).ai_mode)) {
    return (cls as { ai_mode: AiMode }).ai_mode;
  }
  return "green";
}

function isAiMode(value: unknown): value is AiMode {
  return value === "red" || value === "yellow" || value === "green";
}
