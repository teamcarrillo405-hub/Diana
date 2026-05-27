"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateClass = z.object({
  name: z.string().min(1).max(80),
  teacher: z.string().max(80).nullable(),
  color: z.enum(["slate", "indigo", "emerald", "amber", "rose", "sky", "violet"]),
});

export async function createClass(input: z.infer<typeof CreateClass>) {
  const parsed = CreateClass.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("classes").insert({
    owner_id: user.id,
    name: parsed.data.name,
    teacher: parsed.data.teacher,
    color: parsed.data.color,
  });
  if (error) return { error: error.message };

  revalidatePath("/classes");
  return { ok: true };
}
