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

export async function logActivity(
  input: z.infer<typeof ActivityInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ActivityInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the movement log fields." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("wellness_activity_logs").insert({
    owner_id: user.id,
    logged_for: parsed.data.loggedFor,
    activity_type: parsed.data.activityType,
    duration_minutes: parsed.data.durationMinutes,
    felt: parsed.data.felt,
    notes: parsed.data.notes || null,
  });
  if (error) return { ok: false, error: error.message };

  await supabase.from("task_signals").insert({
    owner_id: user.id,
    kind: "activity_log",
    value: {
      activityType: parsed.data.activityType,
      durationMinutes: parsed.data.durationMinutes,
      felt: parsed.data.felt,
    },
  });

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
  if (error) return { ok: false, error: error.message };

  revalidatePath("/wellness");
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

  const { error } = await supabase.from("sleep_logs").upsert({
    owner_id: user.id,
    sleep_date: parsed.data.sleepDate,
    sleep_quality: parsed.data.sleepQuality,
    sleep_hours: parsed.data.sleepHours,
    focus_note: parsed.data.focusNote || null,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: "owner_id,sleep_date",
  });
  if (error) return { ok: false, error: error.message };

  await supabase.from("task_signals").insert({
    owner_id: user.id,
    kind: "sleep_log",
    value: {
      sleepDate: parsed.data.sleepDate,
      sleepQuality: parsed.data.sleepQuality,
      sleepHours: parsed.data.sleepHours,
    },
  });

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
  if (error) return { ok: false, error: error.message };

  revalidatePath("/flashcards");
  revalidatePath("/dashboard");
  revalidatePath("/wellness");
  return { ok: true, count: rows.length };
}
