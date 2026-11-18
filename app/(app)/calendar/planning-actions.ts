"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validWeekPlan } from "@/lib/calendar/planning";

export async function saveCalendarWeekPlan(input: { weekStart: string; availableMinutes: number | null }) {
  if (!input || !validWeekPlan(input)) return { error: "Choose a Monday and a study time between 0 and 168 hours." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to save your available study time." };
  const result = input.availableMinutes === null
    ? await supabase.from("calendar_week_plans").delete().eq("owner_id", user.id).eq("week_start", input.weekStart)
    : await supabase.from("calendar_week_plans").upsert({ owner_id: user.id, week_start: input.weekStart, available_minutes: input.availableMinutes, updated_at: new Date().toISOString() }, { onConflict: "owner_id,week_start" });
  if (result.error) return { error: "Your available study time could not be saved. Try again." };
  revalidatePath("/calendar");
  return { availableMinutes: input.availableMinutes };
}
