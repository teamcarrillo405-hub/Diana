"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasOwnerStoragePrefix, ownerStorageKey, validateFileUpload } from "@/lib/security/upload-validation";
import { triggerClassification } from "../inbox/[id]/actions";

const Input = z.object({
  raw: z.string().trim().min(1).max(5000),
  captureMode: z.enum(["voice", "photo", "text"]),
  photoStorageKey: z.string().max(500).optional(),
}).superRefine((value, context) => {
  if (value.captureMode === "photo" && !value.photoStorageKey) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["photoStorageKey"],
      message: "Choose a photo first.",
    });
  }
  if (value.captureMode !== "photo" && value.photoStorageKey) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["photoStorageKey"],
      message: "Photo storage belongs only to photo captures.",
    });
  }
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

  if (
    parsed.data.photoStorageKey &&
    !hasOwnerStoragePrefix(user.id, parsed.data.photoStorageKey)
  ) {
    return { ok: false, error: "Choose a photo from this account." };
  }

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
  // a manual navigation (dashboard "captured today" and Work capture review).
  revalidatePath("/dashboard");
  revalidatePath("/assignments");

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
  const validation = await validateFileUpload("quickAddPhoto", file);
  if (!validation.ok) return { ok: false, error: validation.error };
  const storageKey = ownerStorageKey(user.id, "quick-add", `${crypto.randomUUID()}.${validation.value.extension}`);

  const { error } = await supabase.storage
    .from("inbox-photos")
    .upload(storageKey, file, { contentType: validation.value.mimeType });

  if (error) return { ok: false, error: error.message };
  return { ok: true, storageKey };
}
