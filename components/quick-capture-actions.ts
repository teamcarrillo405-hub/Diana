"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const QuickCaptureInput = z.object({
  raw: z.string().trim().min(1).max(1000),
});

export async function saveQuickCapture(
  input: z.infer<typeof QuickCaptureInput>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = QuickCaptureInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Write a quick note first." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("inbox_items")
    .insert({
      owner_id: user.id,
      raw: parsed.data.raw,
      capture_mode: "text",
      status: "unclassified",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}
