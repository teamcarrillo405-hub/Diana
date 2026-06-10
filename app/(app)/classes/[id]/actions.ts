"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseRubricText } from "@/lib/rubric/rubric";

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

  // Structured criteria stored alongside the raw text so downstream surfaces
  // (self-check, checklists) never re-parse. Falls back to manual when the
  // text yields no criteria.
  const criteria = parseRubricText(parsed.data.rawText);
  const { error } = await supabase.from("rubrics").insert({
    owner_id: user.id,
    class_id: parsed.data.classId,
    title: parsed.data.title,
    source_kind: "paste",
    raw_text: parsed.data.rawText,
    parsed: criteria.length > 0 ? { criteria } : null,
    parse_status: criteria.length > 0 ? "parsed" : "manual",
  });
  if (error) return { error: error.message };

  revalidatePath(`/classes/${parsed.data.classId}`);
  return { ok: true };
}
