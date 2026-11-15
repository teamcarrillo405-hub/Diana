import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createAchievementLedger, type AchievementEvent } from "./achievements";
import { todayDateKey } from "./today-view";

/** Read trusted account events, stopping once every badge threshold is known. */
export async function loadLobbyAchievements(supabase: SupabaseClient<Database>, ownerId: string, timeZone: string) {
  const [{ data: submissions, error: submissionError }, { data: sessions, error: sessionError }] = await Promise.all([
    supabase.from("assignments").select("id, submitted_at").eq("owner_id", ownerId).in("status", ["submitted", "graded"]).not("submitted_at", "is", null).order("submitted_at").limit(5),
    supabase.from("assignment_time_log").select("id, ended_at").eq("owner_id", ownerId).eq("focus_state", "completed").not("ended_at", "is", null).gt("elapsed_minutes", 0).order("ended_at").limit(10),
  ]);
  if (submissionError || sessionError) return null;
  const events: AchievementEvent[] = [
    ...(submissions ?? []).flatMap(row => row.submitted_at ? [{ id: row.id, kind: "submitted" as const, occurredAt: row.submitted_at }] : []),
    ...(sessions ?? []).flatMap(row => row.ended_at ? [{ id: String(row.id), kind: "focus" as const, occurredAt: row.ended_at }] : []),
  ];
  const completed = new Set<string>();
  let checkIn = false;
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("task_signals").select("assignment_id, kind, occurred_at").eq("owner_id", ownerId).in("kind", ["completed", "mood_checkin"]).order("occurred_at").order("id").range(offset, offset + 499);
    if (error) return null;
    for (const row of data ?? []) {
      if (row.kind === "completed" && row.assignment_id && !completed.has(row.assignment_id)) {
        completed.add(row.assignment_id);
        events.push({ id: row.assignment_id, kind: "work", occurredAt: row.occurred_at });
      } else if (row.kind === "mood_checkin" && !checkIn) {
        checkIn = true;
        events.push({ id: todayDateKey(row.occurred_at, timeZone), kind: "check-in", occurredAt: row.occurred_at });
      }
    }
    if ((data?.length ?? 0) < 500 || (completed.size >= 5 && checkIn)) break;
  }
  return createAchievementLedger(events);
}
