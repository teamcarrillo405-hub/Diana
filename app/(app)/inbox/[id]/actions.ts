"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAssignment } from "@/app/(app)/assignments/new/actions";

const KIND = z.enum([
  "essay",
  "lab",
  "problem_set",
  "presentation",
  "test_prep",
  "reading",
  "other",
]);

const ConfirmInput = z.object({
  classId: z.string().uuid(),
  kind: KIND,
  dueAt: z.string().nullable(),
});

export async function confirmInboxItem(
  inboxItemId: string,
  input: z.infer<typeof ConfirmInput>
): Promise<{ ok: true; assignmentId: string } | { ok: false; error: string }> {
  const parsed = ConfirmInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Fetch the inbox item to get the raw text
  const { data: item, error: fetchError } = await supabase
    .from("inbox_items")
    .select("id, raw, owner_id")
    .eq("id", inboxItemId)
    .eq("owner_id", user.id)
    .single();

  if (fetchError || !item) return { ok: false, error: "Item not found." };

  // Create the assignment using the capture raw text as the title
  const assignmentResult = await createAssignment({
    title: item.raw.slice(0, 160),
    classId: parsed.data.classId,
    kind: parsed.data.kind,
    dueAt: parsed.data.dueAt ?? null,
    estimate: null,
    difficulty: 3,
    readingLoad: 1,
    writingLoad: 1,
    description: null,
  });

  if (assignmentResult.error) return { ok: false, error: assignmentResult.error };

  // Update inbox item to converted
  const { error: updateError } = await supabase
    .from("inbox_items")
    .update({
      status: "converted",
      assignment_id: assignmentResult.id,
    })
    .eq("id", inboxItemId)
    .eq("owner_id", user.id);

  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/inbox");
  return { ok: true, assignmentId: assignmentResult.id! };
}

export async function dismissInboxItem(
  inboxItemId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("inbox_items")
    .update({ status: "dismissed" })
    .eq("id", inboxItemId)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/inbox");
  return { ok: true };
}

/**
 * Fire-and-forget: triggers AI classification for an inbox item.
 * Does NOT await the Edge Function result — classification is async.
 */
export async function triggerClassification(
  inboxItemId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Fire and forget — do not await the classification result
  supabase.functions
    .invoke("classify-inbox", { body: { inboxItemId } })
    .catch(() => {
      // Silent — classification failure does not block the user
    });

  return { ok: true };
}
