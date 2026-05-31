"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
