import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { nextMayExamDate } from "@/lib/ap/command";

import { ApClient } from "./ap-client";

export default async function ApPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: plans }, { data: attempts }] = await Promise.all([
    supabase
      .from("ap_exam_plans")
      .select("id, subject, exam_date, goal_band, current_focus, active, created_at")
      .eq("owner_id", user.id)
      .eq("active", true)
      .order("exam_date", { ascending: true })
      .limit(8),
    supabase
      .from("ap_practice_attempts")
      .select(
        "id, plan_id, subject, practice_type, correct_count, total_count, score_band, notes, practiced_at",
      )
      .eq("owner_id", user.id)
      .order("practiced_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <ApClient
      defaultExamDate={nextMayExamDate()}
      nowIso={new Date().toISOString()}
      plans={plans ?? []}
      attempts={attempts ?? []}
    />
  );
}
