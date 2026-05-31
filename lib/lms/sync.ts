// F15 — Shared upsert helper. Used by all three Route Handlers.
// Upserts on (owner_id, external_source, external_id) — safe to re-sync.
// Imported rows are attached to a per-provider "shadow class" so class_id NOT NULL holds.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LmsProvider, NormalizedAssignment, SyncResult } from "./types";

const SHADOW_CLASS_TITLE: Record<LmsProvider, string> = {
  canvas: "Canvas (imported)",
  google_classroom: "Google Classroom (imported)",
  ics: "Calendar (imported)",
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
    .eq("title", title)
    .is("archived_at", null)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("classes")
    .insert({ owner_id: ownerId, title })
    .select("id")
    .single();
  if (error) throw new Error(`could not create shadow class: ${error.message}`);
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

  const classId = await ensureShadowClass(supabase, ownerId, source);
  const now = new Date().toISOString();

  const rows = items.map((i) => ({
    owner_id: ownerId,
    class_id: classId,
    title: i.title,
    description: i.description,
    due_at: i.due_at,
    external_source: source,
    external_id: i.external_id,
    last_synced_at: now,
  }));

  const { error } = await supabase
    .from("assignments")
    .upsert(rows, { onConflict: "owner_id,external_source,external_id" });

  if (error) {
    throw new Error(`upsert assignments: ${error.message}`);
  }

  return { imported: rows.length, skipped: preSkipped, source };
}
