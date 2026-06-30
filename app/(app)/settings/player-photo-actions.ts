"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Ceiling on the stored data URL (~1.2MB). The client downscales first; this is
// a server-side guard so a crafted request can't bloat the profile row.
const MAX_DATA_URL_LEN = 1_600_000;

type Result = { ok: true } | { ok: false; error: string };

// profiles.photo_url is added in migration 20260613000000_player_photo. The
// generated Supabase types may lag until `supabase gen types` is re-run, so the
// payload is cast to satisfy the typed client without touching generated types.
async function setPhoto(value: string | null): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ photo_url: value } as never)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}

export async function savePlayerPhoto(dataUrl: string): Promise<Result> {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return { ok: false, error: "That doesn't look like an image." };
  }
  if (dataUrl.length > MAX_DATA_URL_LEN) {
    return { ok: false, error: "Photo is too large. Try a smaller image." };
  }
  return setPhoto(dataUrl);
}

export async function clearPlayerPhoto(): Promise<Result> {
  return setPhoto(null);
}
