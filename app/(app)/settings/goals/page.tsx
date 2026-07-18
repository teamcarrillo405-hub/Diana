import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { createClient } from "@/lib/supabase/server";
import { GoalWizard } from "./goal-wizard";

export default async function StudyGoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: latestGoal } = user
    ? await supabase
        .from("wellness_goals")
        .select("title, target_text, next_step, created_at")
        .eq("owner_id", user.id)
        .eq("active", true)
        .in("category", ["skill", "consistency", "recovery"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  return (
    <ScreenDesignViewport className="sd-goal-wizard-screen">
      <header className="sd-goal-header">
        <div className="sd-goal-header-row">
          <Link href="/settings" aria-label="Back to settings"><ChevronLeft aria-hidden="true" /></Link>
          <DianaWordmark alt="Diana" />
          <span aria-hidden="true" />
        </div>
      </header>
      <GoalWizard latestGoal={latestGoal ? {
        title: latestGoal.title,
        targetText: latestGoal.target_text,
        nextStep: latestGoal.next_step,
      } : null} />
    </ScreenDesignViewport>
  );
}
