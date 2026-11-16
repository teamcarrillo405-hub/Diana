"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fallbackReflection, roughModeUntil, startOfWeekIsoDate } from "@/lib/emotional/session";
import { moodFromReadiness } from "@/lib/support/policy";
import { maintainWellnessHistory } from "@/lib/wellness/retention";
import type { StudentDailySupportNeed } from "@/lib/dashboard/lobby-check-in";

// This preference is separate from the wellness history. It contains only an
// explicitly selected support request and expires from use after 24 hours.
const StudentSupportNeedInput = z.enum(["food", "water", "break"]).nullable();

export async function getStudentSupportPreferences(): Promise<
  | { ok: true; need: StudentDailySupportNeed | null; personalizationEnabled: boolean }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to view your support choices." };

  const [needResult, profileResult] = await Promise.all([
    supabase.from("student_daily_support_needs").select("need, expires_at")
      .eq("owner_id", user.id).gt("expires_at", new Date().toISOString()).maybeSingle(),
    supabase.from("profiles").select("tutor_personalization_enabled").eq("user_id", user.id).maybeSingle(),
  ]);
  if (needResult.error || profileResult.error || !profileResult.data) {
    return { ok: false, error: "Your support choices are unavailable right now." };
  }
  const need = StudentSupportNeedInput.safeParse(needResult.data?.need ?? null);
  return { ok: true, need: need.success ? need.data : null, personalizationEnabled: profileResult.data.tutor_personalization_enabled === true };
}

export async function saveStudentDailySupportNeed(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = StudentSupportNeedInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a support option." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to save a support choice." };

  const result = parsed.data === null
    ? await supabase.from("student_daily_support_needs").delete().eq("owner_id", user.id)
    : await supabase.from("student_daily_support_needs").upsert({ owner_id: user.id, need: parsed.data });
  if (result.error) return { ok: false, error: "Your support choice could not be saved yet." };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveTutorPersonalizationPreference(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z.boolean().safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a sharing preference." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to save your sharing preference." };
  const { data, error } = await supabase.from("profiles")
    .update({ tutor_personalization_enabled: parsed.data }).eq("user_id", user.id)
    .select("user_id").maybeSingle();
  if (error || !data) return { ok: false, error: "Your sharing preference could not be saved yet." };
  revalidatePath("/dashboard");
  return { ok: true };
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
 * Fetch reminder candidates — ONLY overdue / not-turned-in work: past the due
 * date and still open (not submitted/graded/abandoned). Upcoming "due soon"
 * items are intentionally NOT reminded here. Past-due items bypass the
 * quiet-hours/weekend gate in ReminderBanner, so they always surface.
 */
export async function getReminderItems(): Promise<ReminderItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date();

  const { data, error } = await supabase
    .from("assignments")
    .select("id, title, due_at, classes(name, color)")
    .eq("owner_id", user.id)
    .not("status", "in", "(submitted,graded,abandoned)")
    .not("due_at", "is", null)
    .lt("due_at", now.toISOString())
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

const LobbyCheckInInput = z.object({
  energy: z.enum(["low", "okay", "good"]),
  sleepHours: z.number().min(0).max(12).nullable(),
  movementType: z.enum(["walk", "run", "bike", "team_sport", "strength", "stretch", "dance", "other"]).nullable(),
  movementMinutes: z.number().int().min(1).max(180).nullable(),
  sleepDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine(value => (value.movementType === null) === (value.movementMinutes === null));

export async function saveLobbyCheckIn(
  input: z.infer<typeof LobbyCheckInInput>,
): Promise<{ ok: true; signalId: string } | { ok: false; error: string }> {
  const parsed = LobbyCheckInInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Choose energy and provide both movement fields, or leave movement blank." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to save this check-in." };

  const { data: signalId, error } = await supabase.rpc("record_dashboard_energy_check_in", {
    p_energy: parsed.data.energy,
    p_sleep_date: parsed.data.sleepDate,
    p_sleep_hours: parsed.data.sleepHours,
    p_movement_type: parsed.data.movementType,
    p_movement_minutes: parsed.data.movementMinutes,
  });
  if (error || typeof signalId !== "string" || !/^\d+$/u.test(signalId)) {
    return {
      ok: false,
      error: "The check-in could not be saved yet. Try again when ready.",
    };
  }

  try {
    await maintainWellnessHistory(supabase);
  } catch {
    console.error("Wellness history retention could not run.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/wellness");
  return { ok: true, signalId };
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
