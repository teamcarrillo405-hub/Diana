"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ShareLink, ShareType } from "./types";
import { createShareToken, digestShareToken } from "./token";
import type { TablesInsert } from "@/lib/supabase/types";

export async function createShareLink(
  shareType: ShareType,
): Promise<{ id: string; token: string; expiresAt: string } | { error: string }> {
  if (shareType !== "parent_summary" && shareType !== "teacher_snapshot") {
    return { error: "Invalid share type." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const token = createShareToken();
  const tokenDigest = digestShareToken(token);

  let { data, error } = await supabase
    .from("share_links")
    .insert({
      owner_id: user.id,
      share_type: shareType,
      token,
      token_digest: tokenDigest,
    })
    .select("id, expires_at")
    .single();

  if (isMissingTokenDigestColumn(error)) {
    ({ data, error } = await supabase
      .from("share_links")
      .insert({
        owner_id: user.id,
        share_type: shareType,
        token,
      } as unknown as TablesInsert<"share_links">)
      .select("id, expires_at")
      .single());
  }

  if (error || !data) return { error: "Could not create the link right now." };
  revalidatePath("/settings");
  return { id: data.id, token, expiresAt: data.expires_at };
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
    .select("id, owner_id, share_type, expires_at, revoked_at, created_at")
    .eq("owner_id", user.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return (data ?? []) as ShareLink[];
}

function isMissingTokenDigestColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703"
    || error.code === "PGRST204"
    || /token_digest.*(?:does not exist|schema cache|could not find)/iu.test(error.message ?? "");
}
