"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  applySubjectVerbosity,
  buildDataInventory,
  buildPrivacyExportPdf,
  categoryLabel,
  deletionRequestPatch,
  PRIVACY_DELETE_CATEGORIES,
  type NotificationPreferences,
  type PrivacyDeleteCategory,
} from "@/lib/privacy/export";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const NotificationPrefsInput = z.object({
  assignment_reminders: z.boolean(),
  ai_budget: z.boolean(),
  weekly_reflection: z.boolean(),
  parent_summary: z.boolean(),
  quiet_hours: z.boolean(),
});

const VerbosityInput = z.object({
  classId: z.string().uuid(),
  verbosity: z.enum(["minimal", "balanced", "detailed"]),
});

const BackupImportInput = z.object({
  profile: z.object({
    ai_verbosity_by_subject: z.record(z.enum(["minimal", "balanced", "detailed"])).optional(),
    notification_preferences: NotificationPrefsInput.optional(),
    privacy_preferences: z.record(z.unknown()).optional(),
    tts_enabled: z.boolean().optional(),
    dyslexia_font: z.boolean().optional(),
    high_contrast: z.boolean().optional(),
    reduced_motion: z.boolean().optional(),
  }),
});

const DeleteCategoryInput = z.object({
  category: z.enum(PRIVACY_DELETE_CATEGORIES),
});

export async function saveNotificationPreferences(
  input: NotificationPreferences,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = NotificationPrefsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check notification settings." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to save settings." };

  const { error } = await supabase
    .from("profiles")
    .update({ notification_preferences: parsed.data as Json })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/export");
  return { ok: true };
}

export async function saveSubjectVerbosity(
  input: z.infer<typeof VerbosityInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = VerbosityInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check AI style settings." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to save settings." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_verbosity_by_subject")
    .eq("user_id", user.id)
    .single();
  const next = applySubjectVerbosity(
    profile?.ai_verbosity_by_subject,
    parsed.data.classId,
    parsed.data.verbosity,
  );
  const { error } = await supabase
    .from("profiles")
    .update({ ai_verbosity_by_subject: next as Json })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/export");
  return { ok: true };
}

export async function exportUserDataJson(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "{}";

  const [
    profile,
    classes,
    assignments,
    notes,
    flashcards,
    studyArtifacts,
    aiInteractions,
    masteryConcepts,
    shareLinks,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("classes").select("*").eq("owner_id", user.id),
    supabase.from("assignments").select("*").eq("owner_id", user.id),
    supabase.from("notes").select("*").eq("owner_id", user.id),
    supabase.from("flashcards").select("*").eq("owner_id", user.id),
    supabase.from("study_artifacts").select("*").eq("owner_id", user.id),
    supabase.from("ai_interactions").select("*").eq("owner_id", user.id),
    supabase.from("mastery_concepts").select("*").eq("owner_id", user.id),
    supabase.from("share_links").select("*").eq("owner_id", user.id),
  ]);

  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    ownerId: user.id,
    profile: profile.data,
    classes: classes.data ?? [],
    assignments: assignments.data ?? [],
    notes: notes.data ?? [],
    flashcards: flashcards.data ?? [],
    studyArtifacts: studyArtifacts.data ?? [],
    aiInteractions: aiInteractions.data ?? [],
    masteryConcepts: masteryConcepts.data ?? [],
    shareLinks: shareLinks.data ?? [],
  }, null, 2);
}

export async function exportUserDataPdf(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "";
  const inventory = await inventoryForUser(user.id);
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const pdf = buildPrivacyExportPdf({
    displayName: profile?.display_name ?? "Student",
    inventory,
  });
  return Buffer.from(pdf).toString("base64");
}

export async function exportProfileBackup(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "{}";
  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_verbosity_by_subject, notification_preferences, privacy_preferences, tts_enabled, dyslexia_font, high_contrast, reduced_motion")
    .eq("user_id", user.id)
    .single();
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), profile }, null, 2);
}

export async function importProfileBackup(
  input: { profile: unknown },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = BackupImportInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check backup file." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to import settings." };

  const profile = parsed.data.profile;
  const { error } = await supabase.from("profiles").update({
    ...(profile.ai_verbosity_by_subject && { ai_verbosity_by_subject: profile.ai_verbosity_by_subject as Json }),
    ...(profile.notification_preferences && { notification_preferences: profile.notification_preferences as Json }),
    ...(profile.privacy_preferences && { privacy_preferences: profile.privacy_preferences as Json }),
    ...(typeof profile.tts_enabled === "boolean" && { tts_enabled: profile.tts_enabled }),
    ...(typeof profile.dyslexia_font === "boolean" && { dyslexia_font: profile.dyslexia_font }),
    ...(typeof profile.high_contrast === "boolean" && { high_contrast: profile.high_contrast }),
    ...(typeof profile.reduced_motion === "boolean" && { reduced_motion: profile.reduced_motion }),
  }).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  revalidatePath("/export");
  return { ok: true };
}

export async function requestAccountDeletion(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to request deletion." };
  const now = new Date().toISOString();
  const patch = deletionRequestPatch(now);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      consent_ai: patch.consent_ai,
      daily_token_budget: patch.daily_token_budget,
      tokens_used_today: patch.tokens_used_today,
      privacy_preferences: patch.privacy_preferences as Json,
    })
    .eq("user_id", user.id);
  if (profileError) return { ok: false, error: profileError.message };

  await Promise.all([
    supabase.from("classes").update({ ai_mode: "red" }).eq("owner_id", user.id),
    supabase.from("assignments").update({ ai_mode_override: "red" }).eq("owner_id", user.id),
    supabase.from("data_deletion_requests").insert({
      owner_id: user.id,
      ai_disabled_at: now,
      notes: "AI disabled immediately; export offered before account purge.",
    }),
  ]);

  revalidatePath("/", "layout");
  revalidatePath("/export");
  return { ok: true };
}

export async function deleteDataCategory(
  input: { category: PrivacyDeleteCategory },
): Promise<{ ok: true; label: string } | { ok: false; error: string }> {
  const parsed = DeleteCategoryInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a data category." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to clear data." };

  const category = parsed.data.category;
  const result = await deleteCategoryRows(supabase, user.id, category);
  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/export");
  if (category === "notes") revalidatePath("/notes");
  if (category === "flashcards") revalidatePath("/flashcards");
  if (category === "study_artifacts") {
    revalidatePath("/notes");
    revalidatePath("/assignments");
    revalidatePath("/flashcards");
  }
  if (category === "mastery_concepts") revalidatePath("/classes");
  return { ok: true, label: categoryLabel(category) };
}

export async function inventoryForUser(ownerId: string) {
  const supabase = await createClient();
  const [
    classes,
    assignments,
    notes,
    flashcards,
    studyArtifacts,
    aiInteractions,
    masteryConcepts,
    shareLinks,
  ] = await Promise.all([
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
    supabase.from("assignments").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
    supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
    supabase.from("study_artifacts").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
    supabase.from("ai_interactions").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
    supabase.from("mastery_concepts").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
    supabase.from("share_links").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
  ]);
  return buildDataInventory({
    classes: classes.count ?? 0,
    assignments: assignments.count ?? 0,
    notes: notes.count ?? 0,
    flashcards: flashcards.count ?? 0,
    studyArtifacts: studyArtifacts.count ?? 0,
    aiInteractions: aiInteractions.count ?? 0,
    masteryConcepts: masteryConcepts.count ?? 0,
    shareLinks: shareLinks.count ?? 0,
  });
}

async function deleteCategoryRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  category: PrivacyDeleteCategory,
) {
  switch (category) {
    case "notes":
      return supabase.from("notes").delete().eq("owner_id", ownerId);
    case "flashcards":
      return supabase.from("flashcards").delete().eq("owner_id", ownerId);
    case "study_artifacts":
      return supabase.from("study_artifacts").delete().eq("owner_id", ownerId);
    case "ai_interactions":
      return supabase.from("ai_interactions").delete().eq("owner_id", ownerId);
    case "mastery_concepts":
      return supabase.from("mastery_concepts").delete().eq("owner_id", ownerId);
    case "share_links":
      return supabase.from("share_links").delete().eq("owner_id", ownerId);
    case "session_handoff":
      return supabase.from("session_handoffs").delete().eq("owner_id", ownerId);
  }
}
