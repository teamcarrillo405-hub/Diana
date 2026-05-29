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
  templateId: z.string().uuid().nullable(),
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

  // T2-01: if a template was selected, seed the assignment's checklist from template items.
  if (parsed.data.templateId) {
    const { data: tmpl } = await supabase
      .from("assignment_templates")
      .select("checklist_items")
      .eq("id", parsed.data.templateId)
      .maybeSingle();

    if (tmpl && Array.isArray(tmpl.checklist_items) && tmpl.checklist_items.length > 0) {
      // Shape into ChecklistItem rows (label/detail/required).
      const items = (tmpl.checklist_items as Array<{ label: string; required?: boolean }>).map(
        (it) => ({ label: it.label, detail: null, required: it.required ?? false }),
      );
      await supabase.from("assignment_checklists").insert({
        assignment_id: data.id,
        owner_id: user.id,
        items,
      });
      // Best-effort — if this fails the assignment still exists with default checklist.
    }
  }

  revalidatePath("/assignments");
  revalidatePath("/dashboard");
  return { id: data.id };
}
