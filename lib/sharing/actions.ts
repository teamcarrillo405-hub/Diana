"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ShareLink, ShareType } from "./types";

export async function createShareLink(
  shareType: ShareType,
): Promise<{ token: string; expiresAt: string } | { error: string }> {
  if (shareType !== "parent_summary" && shareType !== "teacher_snapshot") {
    return { error: "Invalid share type." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("share_links")
    .insert({ owner_id: user.id, share_type: shareType })
    .select("token, expires_at")
    .single();

  if (error || !data) return { error: "Could not create the link right now." };
  revalidatePath("/settings");
  return { token: data.token, expiresAt: data.expires_at };
}

export async function revokeShareLink(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: "Could not revoke the link right now." };
  revalidatePath("/settings");
  return { ok: true };
}

export async function listActiveShareLinks(): Promise<ShareLink[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("share_links")
    .select("id, token, owner_id, share_type, expires_at, revoked_at, created_at")
    .eq("owner_id", user.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return (data ?? []) as ShareLink[];
}
