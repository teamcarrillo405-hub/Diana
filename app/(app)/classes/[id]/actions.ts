"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const AddRubric = z.object({
  classId: z.string().uuid(),
  title: z.string().min(1).max(120),
  rawText: z.string().min(1).max(20_000),
});

export async function addRubric(input: z.infer<typeof AddRubric>) {
  const parsed = AddRubric.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("rubrics").insert({
    owner_id: user.id,
    class_id: parsed.data.classId,
    title: parsed.data.title,
    source_kind: "paste",
    raw_text: parsed.data.rawText,
    parse_status: "manual",
  });
  if (error) return { error: error.message };

  revalidatePath(`/classes/${parsed.data.classId}`);
  return { ok: true };
}
