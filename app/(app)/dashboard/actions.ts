"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ClassIdInput = z.string().uuid();

/**
 * Phase 8 — Scorer interleaving. Set the cookie that drives the next render's
 * de-promotion of the same-class top task. Called fire-and-forget from the
 * dashboard server component after the top assignment is identified.
 *
 * Cookie: diana_last_class
 * - HttpOnly: false (no XSS-sensitive data; just a class id)
 * - SameSite: lax (default behavior; the cookie is only read on same-origin GET)
 * - Path: /
 * - Max-Age: 12 hours — bounded so cross-session reset is natural
 */
export async function setLastShownClass(classId: string): Promise<void> {
  const parsed = ClassIdInput.safeParse(classId);
  if (!parsed.success) return;
  const c = await cookies();
  c.set("diana_last_class", parsed.data, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}

// ---------- Phase 8 — F14 Evening planning surface ----------

export type EveningIntention = {
  id: string;
  cue_text: string;
  assignment_id: string;
  assignment_title: string;
};

/**
 * Fetch event-based intentions for the signed-in user that have not yet
 * been marked fired. Used by the dashboard's EveningPlanning section.
 *
 * Returns up to 10 oldest-first so students see the cues they wrote first,
 * not whichever happened to be touched last.
 */
export async function getEventIntentions(): Promise<EveningIntention[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("assignment_intentions")
    .select("id, cue_text, assignment_id, assignments(title)")
    .eq("owner_id", user.id)
    .eq("cue_type", "event")
    .is("fired_at", null)
    .order("created_at", { ascending: true })
    .limit(10);

  if (error || !data) return [];

  return (data as { id: string; cue_text: string; assignment_id: string; assignments: { title: string } }[])
    .filter((row) =>
      row.assignments !== null && typeof row.assignments === "object" && "title" in row.assignments
    )
    .map((row) => ({
      id: row.id,
      cue_text: row.cue_text,
      assignment_id: row.assignment_id,
      assignment_title: row.assignments.title,
    }));
}

const MarkFiredInput = z.object({ intentionId: z.string().uuid() });

/**
 * Set fired_at = now() on an event-based intention. Idempotent — repeat calls
 * are safe; we just overwrite with a fresh timestamp.
 */
export async function markIntentionFired(
  input: z.infer<typeof MarkFiredInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = MarkFiredInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("assignment_intentions")
    .update({ fired_at: new Date().toISOString() })
    .eq("id", parsed.data.intentionId)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
