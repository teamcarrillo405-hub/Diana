"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fileExtension, hasOwnerStoragePrefix, ownerStorageKey, validateFileUpload } from "@/lib/security/upload-validation";
import { retryAssignmentSourceExtraction } from "@/app/(app)/assignments/[id]/workspace/source-actions";

const ConfirmInput = z.object({
  classId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  kind: z.enum(["essay", "lab", "problem_set", "presentation", "test_prep", "reading", "other"]),
  dueAt: z.iso.datetime().nullable(),
});

const InboxItemId = z.string().uuid();
const CaptureOutcome = z.object({
  status: z.enum(["unavailable", "converted", "dismissed", "details", "class", "photo"]),
  assignmentId: z.string().uuid().nullable().optional(),
  photoSourceId: z.string().uuid().nullable().optional(),
});
const outcomeMessages = {
  unavailable: "This capture is no longer available.",
  converted: "The assignment from this capture is no longer available.",
  dismissed: "This capture was set aside.",
  details: "Check the assignment name and work type.",
  class: "Choose one of your current classes.",
  photo: "The captured photo couldn’t be attached. Try again.",
} as const;

function refreshCapture(id: string) {
  revalidatePath("/assignments");
  revalidatePath("/assignments/captures");
  revalidatePath(`/assignments/captures/${id}`);
  revalidatePath("/dashboard");
}

async function stageCapturePhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  captureId: string,
  originalPath: string | null,
) {
  if (!originalPath || !hasOwnerStoragePrefix(ownerId, originalPath)) return null;
  const extension = fileExtension(originalPath);
  const { data: blob } = await supabase.storage.from("inbox-photos").download(originalPath);
  if (!blob) return null;
  const photo = new File([blob], `capture.${extension}`, { type: blob.type });
  const validated = await validateFileUpload("quickAddPhoto", photo);
  if (!validated.ok) return null;
  const { mimeType } = validated.value;
  const path = ownerStorageKey(ownerId, "assignments", captureId, `captured-photo.${extension === "jpeg" ? "jpg" : extension}`);
  const bucket = supabase.storage.from("note-docs");
  const { error } = await bucket.upload(path, photo, { contentType: mimeType });
  return !error || (await bucket.exists(path)).data ? { mimeType, path } : null;
}

export async function confirmInboxItem(
  inboxItemId: string,
  input: z.infer<typeof ConfirmInput>,
): Promise<{ ok: true; assignmentId: string } | { ok: false; error: string }> {
  const parsed = ConfirmInput.safeParse(input);
  const id = InboxItemId.safeParse(inboxItemId);
  if (!id.success || !parsed.success) return { ok: false, error: "Check the assignment name, class, and due date." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: item, error: fetchError } = await supabase
    .from("inbox_items")
    .select("id, capture_mode, photo_storage_key, status, assignment_id")
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (fetchError) return { ok: false, error: "This capture couldn’t be opened. Try again." };
  if (!item) return { ok: false, error: outcomeMessages.unavailable };
  if (item.status === "converted" && item.assignment_id) return { ok: true, assignmentId: item.assignment_id };
  if (item.status === "converted" || item.status === "dismissed") return { ok: false, error: outcomeMessages[item.status] };

  const photo = item.capture_mode === "photo"
    ? await stageCapturePhoto(supabase, user.id, item.id, item.photo_storage_key)
    : null;
  if (item.capture_mode === "photo" && !photo) return { ok: false, error: outcomeMessages.photo };

  const { data } = await supabase.rpc("confirm_work_capture", {
    p_capture_id: item.id,
    p_class_id: parsed.data.classId,
    p_title: parsed.data.title,
    p_kind: parsed.data.kind,
    p_due_at: parsed.data.dueAt,
    p_photo_mime: photo?.mimeType,
  });
  const outcome = CaptureOutcome.safeParse(data);
  if (!outcome.success) return { ok: false, error: "Diana couldn’t confirm that the capture was added. Try again." };
  refreshCapture(item.id);
  const { status, assignmentId, photoSourceId } = outcome.data;
  if (status === "converted" && assignmentId) {
    if (photoSourceId) {
      after(async () => {
        try {
          await retryAssignmentSourceExtraction({ assignmentId, sourceId: photoSourceId });
        } catch {
          // The original photo is already attached and can be read again in Work.
        }
      });
    }
    return { ok: true, assignmentId };
  }
  if (status === "dismissed" && photo) {
    // A confirmation cannot use the staged copy after the terminal outcome.
    await supabase.storage.from("note-docs").remove([photo.path]);
  }
  return { ok: false, error: outcomeMessages[status] };
}

export async function dismissInboxItem(
  inboxItemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = InboxItemId.safeParse(inboxItemId);
  if (!id.success) return { ok: false, error: outcomeMessages.unavailable };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data } = await supabase.rpc("dismiss_work_capture", { p_capture_id: id.data });
  const outcome = CaptureOutcome.safeParse(data);
  if (!outcome.success) return { ok: false, error: "Diana couldn’t confirm that the capture was set aside. Try again." };
  refreshCapture(id.data);
  if (outcome.data.status === "converted") return { ok: false, error: "This capture is already in Work." };
  if (outcome.data.status !== "dismissed") return { ok: false, error: outcomeMessages.unavailable };
  return { ok: true };
}

/** Starts a classification request without delaying capture. */
export async function triggerClassification(
  inboxItemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  supabase.functions.invoke("classify-inbox", { body: { inboxItemId } }).catch(() => {
    // Classification can be skipped because the student can fill in the details.
  });
  return { ok: true };
}
