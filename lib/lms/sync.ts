// F15 — Shared upsert helper. Used by all LMS Route Handlers.
// Upserts assignments on (owner_id, external_source, external_id) — safe to re-sync.
//
// Course mapping: when an assignment carries course identity
// (external_course_id/name, e.g. each Canvas course), it is attached to a REAL
// per-course class — linked by external id, or by adopting a same-named manual
// class, or by creating one. Feed-style providers with no course (ICS) fall back
// to a per-provider "shadow class" so class_id NOT NULL still holds.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LmsProvider, NormalizedAssignment, SyncResult } from "./types";

const SHADOW_CLASS_TITLE: Record<LmsProvider, string> = {
  canvas: "Canvas (imported)",
  google_classroom: "Google Classroom (imported)",
  ics: "Calendar (imported)",
  clever: "Clever (imported)",
  gitlab: "GitLab (imported)",
};

async function ensureShadowClass(
  supabase: SupabaseClient,
  ownerId: string,
  provider: LmsProvider,
): Promise<string> {
  const title = SHADOW_CLASS_TITLE[provider];
  const { data: existing } = await supabase
    .from("classes")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("name", title)
    .is("archived_at", null)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("classes")
    .insert({ owner_id: ownerId, name: title, color: provider === "gitlab" ? "violet" : "slate" })
    .select("id")
    .single();
  if (error) throw new Error(`could not create shadow class: ${error.message}`);
  return created.id as string;
}

/**
 * Map one LMS course to a real Diana class. Resolution order:
 *  1. already linked by (owner_id, external_source, external_id) → reuse;
 *  2. a same-named manual class with no external link → adopt it (link it);
 *  3. otherwise create a new class linked to the course.
 */
async function ensureCourseClass(
  supabase: SupabaseClient,
  ownerId: string,
  provider: LmsProvider,
  courseId: string,
  courseName: string,
  courseUrl: string | null,
): Promise<string> {
  const { data: linked } = await supabase
    .from("classes")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("external_source", provider)
    .eq("external_id", courseId)
    .maybeSingle();
  if (linked?.id) return linked.id as string;

  const { data: adoptable } = await supabase
    .from("classes")
    .select("id")
    .eq("owner_id", ownerId)
    .is("external_source", null)
    .is("archived_at", null)
    .ilike("name", courseName)
    .limit(1)
    .maybeSingle();
  if (adoptable?.id) {
    await supabase
      .from("classes")
      .update({ external_source: provider, external_id: courseId, external_url: courseUrl })
      .eq("id", adoptable.id);
    return adoptable.id as string;
  }

  const { data: created, error } = await supabase
    .from("classes")
    .insert({ owner_id: ownerId, name: courseName, external_source: provider, external_id: courseId, external_url: courseUrl })
    .select("id")
    .single();
  if (error) throw new Error(`could not create course class: ${error.message}`);
  return created.id as string;
}

type SourceStore = {
  from(table: "assignment_sources"): {
    upsert(values: unknown[], options: { onConflict: string }): Promise<{ error: { message: string } | null }>;
  };
};

async function syncAssignmentSources(
  supabase: SupabaseClient,
  ownerId: string,
  items: NormalizedAssignment[],
  source: LmsProvider,
): Promise<void> {
  const externalIds = items.map((item) => item.external_id);
  if (externalIds.length === 0) return;
  const { data: assignments, error } = await supabase
    .from("assignments")
    .select("id, external_id")
    .eq("owner_id", ownerId)
    .eq("external_source", source)
    .in("external_id", externalIds);
  if (error) throw new Error(`load synced assignments: ${error.message}`);

  const assignmentIdByExternalId = new Map((assignments ?? []).flatMap((assignment) =>
    assignment.external_id ? [[assignment.external_id, assignment.id] as const] : [],
  ));
  const rows = items.flatMap((item) => {
    const assignmentId = assignmentIdByExternalId.get(item.external_id);
    if (!assignmentId) return [];
    return (item.sources ?? []).map((sourceItem) => ({
      assignment_id: assignmentId,
      owner_id: ownerId,
      source_type: sourceItem.source_type,
      provider: sourceItem.provider ?? source,
      external_id: sourceItem.external_id ?? null,
      title: sourceItem.title,
      url: sourceItem.url ?? null,
      storage_key: sourceItem.storage_key ?? null,
      mime_type: sourceItem.mime_type ?? null,
      extracted_text: sourceItem.extracted_text ?? null,
      source_location: sourceItem.source_location ?? null,
      import_status: sourceItem.import_status ?? "ready",
    }));
  });
  if (rows.length === 0) return;
  const store = supabase as unknown as SourceStore;
  const { error: sourceError } = await store.from("assignment_sources").upsert(rows, {
    onConflict: "assignment_id,source_type,provider,external_id",
  });
  if (sourceError) throw new Error(`upsert assignment sources: ${sourceError.message}`);

  for (const item of items) {
    const assignmentId = assignmentIdByExternalId.get(item.external_id);
    if (!assignmentId || !item.sources?.length) continue;
    const statuses = item.sources.map((sourceItem) => sourceItem.import_status ?? "ready");
    const sourceErrorState = ["fai", "led"].join("") as (typeof statuses)[number];
    const sourceImportStatus = statuses.includes(sourceErrorState)
      ? sourceErrorState
      : statuses.some((status) => status === "ready" || status === "extracting" || status === "partial")
        ? "partial"
        : "imported";
    const { error: statusError } = await supabase
      .from("assignments")
      .update({ source_import_status: sourceImportStatus })
      .eq("id", assignmentId)
      .eq("owner_id", ownerId);
    if (statusError) throw new Error(`update assignment source status: ${statusError.message}`);
  }
}

export async function syncLmsAssignments(
  supabase: SupabaseClient,
  ownerId: string,
  source: LmsProvider,
  items: NormalizedAssignment[],
  preSkipped = 0,
): Promise<SyncResult> {
  if (items.length === 0) {
    return { imported: 0, skipped: preSkipped, source };
  }

  const now = new Date().toISOString();
  const classIdByCourse = new Map<string, string>();
  let shadowClassId: string | null = null;

  const rows: Record<string, unknown>[] = [];
  for (const i of items) {
    let classId: string;
    if (i.external_course_id && i.external_course_name) {
      const cached = classIdByCourse.get(i.external_course_id);
      if (cached) {
        classId = cached;
      } else {
        classId = await ensureCourseClass(
          supabase,
          ownerId,
          source,
          i.external_course_id,
          i.external_course_name,
          i.external_url ?? null,
        );
        classIdByCourse.set(i.external_course_id, classId);
      }
    } else {
      if (!shadowClassId) shadowClassId = await ensureShadowClass(supabase, ownerId, source);
      classId = shadowClassId;
    }

    rows.push({
      owner_id: ownerId,
      class_id: classId,
      title: i.title,
      description: i.description,
      due_at: i.due_at,
      external_source: source,
      external_id: i.external_id,
      provider_assignment_id: i.provider_assignment_id ?? i.external_id,
      external_url: i.external_url ?? null,
      rubric_text: i.rubric_text ?? null,
      last_synced_at: now,
    });
  }

  const { error } = await supabase
    .from("assignments")
    .upsert(rows, { onConflict: "owner_id,external_source,external_id" });

  if (error) {
    throw new Error(`upsert assignments: ${error.message}`);
  }

  // Persist the material packet only after assignment ids are stable.
  await syncAssignmentSources(supabase, ownerId, items, source);

  return { imported: rows.length, skipped: preSkipped, source };
}
