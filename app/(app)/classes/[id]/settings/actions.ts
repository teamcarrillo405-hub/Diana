"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SaveAiMode = z.object({
  classId: z.string().uuid(),
  aiMode: z.enum(["green", "yellow", "red"]),
});

export async function saveClassAiMode(input: z.infer<typeof SaveAiMode>) {
  const parsed = SaveAiMode.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("classes")
    .update({ ai_mode: parsed.data.aiMode })
    .eq("id", parsed.data.classId)
    .eq("owner_id", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/classes/${parsed.data.classId}`);
  revalidatePath(`/classes/${parsed.data.classId}/settings`);
  // Assignments under this class display ai_mode via the join — revalidate broadly:
  revalidatePath(`/assignments`, "layout");
  return { ok: true };
}
