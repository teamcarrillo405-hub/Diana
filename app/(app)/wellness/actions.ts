"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createCard } from "@/lib/fsrs/fsrs";
import { firstAidStudyCards, goalTextIsAllowed } from "@/lib/wellness/health";

const ActivityInput = z.object({
  activityType: z.enum(["walk", "run", "bike", "team_sport", "strength", "stretch", "dance", "other"]),
  durationMinutes: z.number().int().min(1).max(720),
  felt: z.enum(["steady", "tired", "energized", "sore", "proud", "not_sure"]),
  notes: z.string().trim().max(600).optional(),
  loggedFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const GoalInput = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.enum(["skill", "endurance", "strength", "flexibility", "consistency", "recovery"]),
  targetText: z.string().trim().min(2).max(400),
  nextStep: z.string().trim().max(300).optional(),
});

const SleepInput = z.object({
  sleepDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sleepQuality: z.enum(["rested", "ok", "rough"]),
  sleepHours: z.number().min(0).max(18).nullable(),
  focusNote: z.string().trim().max(500).optional(),
});

const WellnessCheckInInput = SleepInput.extend({
  mood: z.enum(["good", "meh", "rough"]),
});

export async function logActivity(
  input: z.infer<typeof ActivityInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ActivityInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the movement log fields." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.rpc("record_wellness_activity", {
    p_logged_for: parsed.data.loggedFor,
    p_activity_type: parsed.data.activityType,
    p_duration_minutes: parsed.data.durationMinutes,
    p_felt: parsed.data.felt,
    p_notes: parsed.data.notes || "",
  });
  if (error) return { ok: false, error: "The activity could not be saved yet. Try again when you are ready." };

  revalidatePath("/wellness");
  revalidatePath("/settings/goals");
  return { ok: true };
}

export async function saveWellnessGoal(
  input: z.infer<typeof GoalInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = GoalInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add a goal and one next step." };
  if (!goalTextIsAllowed(parsed.data.title, parsed.data.targetText, parsed.data.nextStep ?? "")) {
    return { ok: false, error: "Keep goals focused on skills, consistency, recovery, or how movement feels." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("wellness_goals").insert({
    owner_id: user.id,
    title: parsed.data.title,
    category: parsed.data.category,
    target_text: parsed.data.targetText,
    next_step: parsed.data.nextStep || null,
  });
  if (error) return { ok: false, error: "The goal could not be saved yet. Try again when you are ready." };

  revalidatePath("/wellness");
  revalidatePath("/settings/goals");
  return { ok: true };
}

export async function saveSleepLog(
  input: z.infer<typeof SleepInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = SleepInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the sleep log fields." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.rpc("record_wellness_sleep_log", {
    p_sleep_date: parsed.data.sleepDate,
    p_sleep_quality: parsed.data.sleepQuality,
    // PostgreSQL accepts NULL here, though generated RPC argument metadata does
    // not express parameter nullability.
    p_sleep_hours: parsed.data.sleepHours as number,
    p_focus_note: parsed.data.focusNote || "",
  });
  if (error) return { ok: false, error: "The sleep check-in could not be saved yet. Try again when you are ready." };

  revalidatePath("/wellness");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveWellnessCheckIn(
  input: z.infer<typeof WellnessCheckInInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = WellnessCheckInInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the wellness fields and try again." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to save this private check-in." };

  const { error } = await supabase.rpc("record_daily_wellness_check_in", {
    p_mood: parsed.data.mood,
    p_sleep_date: parsed.data.sleepDate,
    p_sleep_quality: parsed.data.sleepQuality,
    p_sleep_hours: parsed.data.sleepHours as number,
    p_focus_note: parsed.data.focusNote || "",
    p_mood_metadata: undefined,
  });
  if (error) {
    return { ok: false, error: "The check-in could not be saved yet. Try again when you are ready." };
  }

  revalidatePath("/wellness");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createFirstAidStudyCards(): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const rows = firstAidStudyCards().map((card) => {
    const fresh = createCard(new Date());
    return {
      owner_id: user.id,
      front: card.front,
      back: card.back,
      source_note_id: null,
      image_storage_key: null,
      state: fresh.state,
      stability: fresh.stability,
      difficulty: fresh.difficulty,
      due_at: fresh.dueAt,
      reps: fresh.reps,
      lapses: fresh.lapses,
      last_review_at: fresh.lastReviewAt,
    };
  });

  const { error } = await supabase.from("flashcards").insert(rows);
  if (error) return { ok: false, error: "The study cards could not be added yet. Try again when you are ready." };

  revalidatePath("/flashcards");
  revalidatePath("/dashboard");
  revalidatePath("/wellness");
  return { ok: true, count: rows.length };
}
