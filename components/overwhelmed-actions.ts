"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Input = z.object({
  path: z.string().max(300),
});

function assignmentIdFromPath(path: string): string | null {
  const match = path.match(/\/assignments\/([0-9a-fA-F-]{36})(?:\/|$)/);
  return match?.[1] ?? null;
}

export async function recordOverwhelmed(
  input: z.infer<typeof Input>,
): Promise<{ ok: true; childId: string | null; message: string } | { ok: false; error: string }> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const assignmentId = assignmentIdFromPath(parsed.data.path);
  let childId: string | null = null;

  if (assignmentId) {
    const { data: original } = await supabase
      .from("assignments")
      .select("title, class_id")
      .eq("id", assignmentId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (original) {
      const { data: child } = await supabase
        .from("assignments")
        .insert({
          owner_id: user.id,
          class_id: original.class_id,
          title: `Smallest next step: ${original.title}`,
          estimated_minutes: 5,
          kind: "other",
          parent_assignment_id: assignmentId,
          status: "todo",
        })
        .select("id")
        .single();
      childId = child?.id ?? null;
    }
  }

  await supabase.from("task_signals").insert({
    owner_id: user.id,
    assignment_id: assignmentId,
    kind: "overwhelmed",
    value: { path: parsed.data.path, childId },
  });

  revalidatePath("/dashboard");
  if (assignmentId) revalidatePath(`/assignments/${assignmentId}`);

  return {
    ok: true,
    childId,
    message: childId
      ? "I made a 5-minute next step."
      : "Take one 5-minute reset, then pick the smallest visible step.",
  };
}
