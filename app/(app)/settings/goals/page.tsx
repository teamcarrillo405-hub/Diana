import { Target } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageShell } from "../../page-shell";
import { GoalWizard } from "./goal-wizard";

export default async function StudyGoalsPage() {
  const supabase = await createClient();
  const { data: goals } = await supabase
    .from("wellness_goals")
    .select("id, title, category, target_text, next_step, active, created_at")
    .eq("active", true)
    .in("category", ["skill", "consistency", "recovery"])
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <PageShell active="More" eyebrow="Season objectives" title="Study goal wizard" subtitle="Set a useful direction, then choose one small step. Goals support your work without turning it into pressure." icon={Target}>
      <div className="sd-grid sd-grid-2">
        <GoalWizard />
        <section className="sd-panel sd-panel-pad sd-grid">
          <div className="sd-section-head"><h2 className="sd-section-title">Active objectives</h2><span className="sd-chip">{goals?.length ?? 0}</span></div>
          {(goals ?? []).length ? goals!.map((goal) => (
            <article className="sd-goal" key={goal.id}>
              <span className="sd-chip">{goal.category}</span>
              <h3>{goal.title}</h3>
              <p>{goal.target_text}</p>
              {goal.next_step ? <small>Next: {goal.next_step}</small> : null}
            </article>
          )) : <p className="sd-subtitle">No study objective yet. Use the wizard to make one that fits this week.</p>}
        </section>
      </div>
    </PageShell>
  );
}
