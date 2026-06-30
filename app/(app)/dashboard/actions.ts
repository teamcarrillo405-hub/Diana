"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fallbackReflection, roughModeUntil, startOfWeekIsoDate } from "@/lib/emotional/session";
import { moodFromReadiness } from "@/lib/support/policy";

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

// ---------- F7 — Smart reminders ----------

export type ReminderItem = {
  id: string;
  title: string;
  due_at: string | null;
  class_name: string | null;
  class_color: string | null;
  is_past_due: boolean;
  hours_until_due: number | null;
};

/**
 * F7 — Fetch reminder candidates. Returns assignments that are either:
 *   - past due (due_at < now), OR
 *   - due within 48 hours (due_at < now + 48h)
 * Excludes submitted/graded/abandoned. Quiet-hours and weekend gating happens
 * client-side in ReminderBanner (Pitfall 1 — server runs UTC).
 */
export async function getReminderItems(): Promise<ReminderItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date();
  const window48hIso = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("assignments")
    .select("id, title, due_at, classes(name, color)")
    .eq("owner_id", user.id)
    .not("status", "in", "(submitted,graded,abandoned)")
    .not("due_at", "is", null)
    .lt("due_at", window48hIso)
    .order("due_at", { ascending: true })
    .limit(10);

  if (error || !data) return [];

  return (data as Array<{ id: string; title: string; due_at: string | null; classes: { name: string; color: string } | null }>)
    .map((row) => {
      const past = row.due_at ? new Date(row.due_at) < now : false;
      const hours = row.due_at && !past
        ? Math.floor((new Date(row.due_at).getTime() - now.getTime()) / (60 * 60 * 1000))
        : null;
      return {
        id: row.id,
        title: row.title,
        due_at: row.due_at,
        class_name: row.classes?.name ?? null,
        class_color: row.classes?.color ?? null,
        is_past_due: past,
        hours_until_due: hours,
      };
    });
}

// ---------- Phase 24 - session mood + weekly reflection ----------

const MoodInput = z.object({
  mood: z.enum(["good", "meh", "rough"]).nullable().optional(),
  body: z.enum(["low", "okay", "ready"]).optional(),
  focus: z.enum(["scattered", "steady", "locked"]).optional(),
  disable: z.boolean().optional(),
});

export async function saveMoodCheckIn(
  input: z.infer<typeof MoodInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = MoodInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const now = new Date();
  const readinessMood = parsed.data.body && parsed.data.focus
    ? moodFromReadiness({ body: parsed.data.body, focus: parsed.data.focus })
    : parsed.data.mood ?? null;
  const patch = {
    session_mood: readinessMood,
    last_mood_checkin_at: now.toISOString(),
    mood_checkin_disabled: parsed.data.disable ?? false,
    rough_mode_until: readinessMood === "rough" ? roughModeUntil(now) : null,
  };

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("task_signals").insert({
    owner_id: user.id,
    kind: "mood_checkin",
    value: {
      mood: readinessMood,
      body: parsed.data.body ?? null,
      focus: parsed.data.focus ?? null,
      disabled: parsed.data.disable ?? false,
    },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

const ReflectionInput = z.object({
  body: z.string().trim().min(2).max(1500),
  mood: z.enum(["good", "meh", "rough"]).nullable().optional(),
});

export async function saveWeeklyReflection(
  input: z.infer<typeof ReflectionInput>,
): Promise<{ ok: true; reflection: string } | { ok: false; error: string }> {
  const parsed = ReflectionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add a few words first." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  let aiReflection = fallbackReflection(parsed.data.body);
  const { data } = await supabase.functions.invoke("weekly-reflection", {
    body: {
      ownerId: user.id,
      reflection: parsed.data.body,
      mood: parsed.data.mood ?? null,
    },
  }).catch(() => ({ data: null }));
  if (typeof data?.reflection === "string" && data.reflection.trim()) {
    aiReflection = data.reflection.trim();
  }

  const now = new Date();
  const weekStart = startOfWeekIsoDate(now);
  const { error } = await supabase
    .from("student_reflections")
    .upsert({
      owner_id: user.id,
      week_start: weekStart,
      mood: parsed.data.mood ?? null,
      body: parsed.data.body,
      ai_reflection: aiReflection,
      updated_at: now.toISOString(),
    }, { onConflict: "owner_id,week_start" });
  if (error) return { ok: false, error: error.message };

  await supabase
    .from("profiles")
    .update({ last_weekly_reflection_at: now.toISOString() })
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  return { ok: true, reflection: aiReflection };
}

export async function skipWeeklyReflection(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ last_weekly_reflection_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
