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

  return { imported: rows.length, skipped: preSkipped, source };
}
