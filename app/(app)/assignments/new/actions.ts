"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const KIND = z.enum([
  "essay","lab","problem_set","presentation","test_prep","reading","other",
]);

const Input = z.object({
  title: z.string().min(1).max(160),
  classId: z.string().uuid(),
  kind: KIND,
  dueAt: z.string().nullable(),
  estimate: z.number().int().min(1).max(600).nullable(),
  difficulty: z.number().int().min(1).max(5),
  readingLoad: z.number().int().min(0).max(5),
  writingLoad: z.number().int().min(0).max(5),
  description: z.string().max(2000).nullable(),
});

export async function createAssignment(input: z.infer<typeof Input>) {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      owner_id: user.id,
      class_id: parsed.data.classId,
      title: parsed.data.title,
      description: parsed.data.description,
      kind: parsed.data.kind,
      due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null,
      estimated_minutes: parsed.data.estimate,
      difficulty: parsed.data.difficulty,
      reading_load: parsed.data.readingLoad,
      writing_load: parsed.data.writingLoad,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/assignments");
  revalidatePath("/dashboard");
  return { id: data.id };
}
