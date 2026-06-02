"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseIepText } from "@/lib/iep/import";
import type { Json } from "@/lib/supabase/types";

export async function connectCanvas(formData: FormData) {
  const baseUrl = String(formData.get("base_url") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  if (!baseUrl || !token) return { ok: false, message: "Both Canvas URL and token are needed" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to continue" };

  const { error } = await supabase
    .from("lms_connections")
    .insert({ owner_id: user.id, provider: "canvas", config: { base_url: baseUrl, token } });
  if (error) return { ok: false, message: "Could not save the connection — try again in a moment" };

  revalidatePath("/settings");
  return { ok: true, message: "Canvas connected" };
}

export async function connectIcs(formData: FormData) {
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { ok: false, message: "Paste a calendar URL to continue" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to continue" };

  const { error } = await supabase
    .from("lms_connections")
    .insert({ owner_id: user.id, provider: "ics", config: { url } });
  if (error) return { ok: false, message: "Could not save the connection — try again in a moment" };

  revalidatePath("/settings");
  return { ok: true, message: "Calendar connected" };
}

export async function connectClassroom() {
  // A Classroom "connection" is just a marker row — the actual OAuth lives on session.provider_token.
  // Student must already be signed in via Google with Classroom scopes (see user_setup in plan frontmatter).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to continue" };

  const { data: existing } = await supabase
    .from("lms_connections")
    .select("id")
    .eq("owner_id", user.id)
    .eq("provider", "google_classroom")
    .maybeSingle();
  if (existing?.id) return { ok: true, message: "Google Classroom already connected" };

  const { error } = await supabase
    .from("lms_connections")
    .insert({ owner_id: user.id, provider: "google_classroom", config: {} });
  if (error) return { ok: false, message: "Could not save the connection — try again in a moment" };

  revalidatePath("/settings");
  return { ok: true, message: "Google Classroom connected" };
}

export async function connectClever(formData: FormData) {
  const district = String(formData.get("district") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to continue" };

  const { data: existing } = await supabase
    .from("lms_connections")
    .select("id")
    .eq("owner_id", user.id)
    .eq("provider", "clever")
    .maybeSingle();
  if (existing?.id) return { ok: true, message: "Clever marker already exists" };

  const { error } = await supabase
    .from("lms_connections")
    .insert({ owner_id: user.id, provider: "clever", config: { district, note, provisioned: false } });
  if (error) return { ok: false, message: "Could not save the Clever marker" };

  revalidatePath("/settings");
  return { ok: true, message: "Clever marker saved" };
}

export async function importIepText(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  const sourceName = String(formData.get("source_name") ?? "").trim() || null;
  if (text.length < 20) return { ok: false, message: "Paste the IEP or 504 text first" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to continue" };

  const summary = parseIepText(text);
  const { data: profile } = await supabase
    .from("profiles")
    .select("accommodations")
    .eq("user_id", user.id)
    .single();
  const accommodations = new Set<string>([
    ...((profile?.accommodations ?? []) as string[]),
    ...summary.accommodations,
  ]);

  const patch = {
    accommodations: [...accommodations],
    ...(summary.extraTimePct !== null && { extra_time_pct: summary.extraTimePct }),
    ...(summary.ttsEnabled && { tts_enabled: true }),
    ...(summary.dyslexiaFont && { dyslexia_font: true }),
    ...(summary.fontSize === "large" && { font_size: "large" as const }),
    ...(summary.lineSpacing === "loose" && { line_spacing: "loose" as const }),
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .update(patch)
    .eq("user_id", user.id);
  if (profileError) return { ok: false, message: "Could not apply the imported accommodations" };

  await supabase.from("iep_imports").insert({
    owner_id: user.id,
    source_name: sourceName,
    extracted_summary: summary as unknown as Json,
  });

  revalidatePath("/settings");
  return { ok: true, message: "Accommodations applied", summary };
}

export async function disconnectLms(connectionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to continue" };

  const { error } = await supabase
    .from("lms_connections")
    .delete()
    .eq("id", connectionId)
    .eq("owner_id", user.id);
  if (error) return { ok: false, message: "Could not remove the connection — try again in a moment" };

  revalidatePath("/settings");
  return { ok: true, message: "Connection removed" };
}
