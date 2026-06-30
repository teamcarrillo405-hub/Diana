import { createClient } from "@/lib/supabase/server";
import { nextMayExamDate } from "@/lib/ap/command";
import { ApClient } from "./ap-client";
import { GraduationCap } from "lucide-react";
import { PageShell } from "../page-shell";

export default async function ApPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: plans }, { data: attempts }] = await Promise.all([
    supabase
      .from("ap_exam_plans")
      .select("id, subject, exam_date, goal_band, current_focus, active, created_at")
      .eq("active", true)
      .order("exam_date", { ascending: true })
      .limit(8),
    supabase
      .from("ap_practice_attempts")
      .select("id, plan_id, subject, practice_type, correct_count, total_count, score_band, notes, practiced_at")
      .order("practiced_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <PageShell
      active="More"
      eyebrow="Exam prep"
      title="AP Command"
      subtitle="Plan your exams and track practice toward your goal band."
      accent="var(--gl-gold)"
      icon={GraduationCap}
    >
      <ApClient
        defaultExamDate={nextMayExamDate()}
        plans={plans ?? []}
        attempts={attempts ?? []}
      />
    </PageShell>
  );
}
