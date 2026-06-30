"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { triggerClassification } from "../inbox/[id]/actions";

const Input = z.object({
  raw: z.string().min(1).max(5000),
  captureMode: z.enum(["voice", "photo", "text"]),
  photoStorageKey: z.string().optional(),
});

export async function saveInboxItem(
  input: z.infer<typeof Input>
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("inbox_items")
    .insert({
      owner_id: user.id,
      raw: parsed.data.raw,
      capture_mode: parsed.data.captureMode,
      photo_storage_key: parsed.data.photoStorageKey ?? null,
      status: "unclassified",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Kick off async AI classification (vision for photos, text otherwise) so the
  // "Diana read" suggestions populate. Fire-and-forget — never blocks capture.
  void triggerClassification(data.id);

  // Refresh the surfaces that show capture counts so a new item appears without
  // a manual navigation (dashboard "captured today", Work inbox callout, inbox).
  revalidatePath("/dashboard");
  revalidatePath("/assignments");
  revalidatePath("/inbox");

  return { ok: true, id: data.id };
}

export async function uploadInboxPhoto(
  formData: FormData
): Promise<{ ok: true; storageKey: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("photo") as File | null;
  if (!file) return { ok: false, error: "No photo provided." };

  const ext = file.name.split(".").pop() ?? "jpg";
  const storageKey = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("inbox-photos")
    .upload(storageKey, file, { contentType: file.type });

  if (error) return { ok: false, error: error.message };
  return { ok: true, storageKey };
}
