"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  briefToClipboardText,
  buildDesignBrief,
  createCanvaDesign,
  type DesignBrief,
} from "@/lib/integrations/canva";
import { getValidCanvaToken } from "@/lib/integrations/canva-server";
import { parseRubricText } from "@/lib/rubric/rubric";

const Input = z.object({ assignmentId: z.string().uuid() });

export type CanvaDesignResult =
  | { ok: true; editUrl: string | null; brief: DesignBrief; briefText: string }
  | { ok: false; error: string };

/**
 * Create a titled draft in the student's Canva account and return the design
 * brief built from their own material (rubric criteria first, then notes).
 * The brief is the head start; the content stays the student's to write.
 */
export async function createCanvaDesignForAssignment(
  input: z.infer<typeof Input>,
): Promise<CanvaDesignResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Open an assignment first." };

  const supabase = await createClient();
  const token = await getValidCanvaToken(supabase);
  if (!token) {
    return { ok: false, error: "Connect Canva in Settings first. Then this works in one tap." };
  }

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, description, rubric_text, class_id")
    .eq("id", parsed.data.assignmentId)
    .maybeSingle();
  if (!assignment) return { ok: false, error: "Assignment was not found." };

  const { data: notes } = assignment.class_id
    ? await supabase
        .from("notes")
        .select("title")
        .eq("class_id", assignment.class_id)
        .order("updated_at", { ascending: false })
        .limit(6)
    : { data: [] as Array<{ title: string }> };

  const brief = buildDesignBrief({
    assignmentTitle: assignment.title,
    description: assignment.description,
    rubricCriteria: parseRubricText(assignment.rubric_text).map((c) => c.title),
    noteTitles: (notes ?? []).map((n) => n.title).filter(Boolean),
  });

  try {
    const design = await createCanvaDesign(token, brief);
    return { ok: true, editUrl: design?.editUrl ?? null, brief, briefText: briefToClipboardText(brief) };
  } catch {
    return { ok: false, error: "Canva didn't answer just now. Your brief is safe, so try again in a bit." };
  }
}

export async function disconnectCanva(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase.from("canva_connections").delete().eq("owner_id", user.id);
  return { ok: !error };
}
