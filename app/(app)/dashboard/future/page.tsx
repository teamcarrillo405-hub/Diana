import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { rankAssignments, type Assignment, type EnergyLevel } from "@/lib/scoring/next-five-minutes";
import { formatDueAt } from "@/lib/format";
import { KIND_LABEL } from "@/lib/checklists/templates";

import { DashboardTabShell } from "@/components/ui/dashboard-tab-shell";
import { TabHeading } from "@/components/ui/tab-heading";
import { DashboardTabs } from "../dashboard-tabs";
import { EveningPlanning } from "../evening-planning";
import { QuestCarousel, type QuestItem } from "../quest-carousel";
import { getEventIntentions } from "../actions";

const ACCENT_CYCLE = ["#29d0ff", "#7e5cff", "#ffd24a", "#36e07a", "#f25fb0"];

function isEnergy(v: string | undefined): v is EnergyLevel {
  return v === "low" || v === "medium" || v === "high";
}

// Diana — FUTURE tab. "What's coming." EveningPlanning self-gates to 5–8pm;
// QuestCarousel is built from the same ranked list page.tsx uses for the lobby.
export default async function FuturePage({
  searchParams,
}: {
  searchParams: Promise<{ energy?: string }>;
}) {
  const sp = await searchParams;
  const energy: EnergyLevel = isEnergy(sp.energy) ? sp.energy : "medium";

  const supabase = await createClient();
  const profile = await loadProfile();
  const now = new Date();
  const fourHoursAgoIso = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();

  const cookieStore = await cookies();
  const lastShownClassId = cookieStore.get("diana_last_class")?.value ?? null;

  const [{ data: assignments }, { data: signals }, intentions] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, description, rubric_text, due_at, created_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load, ai_mode_override, classes(name, color, ai_mode)")
      .neq("status", "submitted")
      .neq("status", "graded")
      .neq("status", "abandoned")
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("task_signals")
      .select("assignment_id, occurred_at")
      .in("kind", ["started", "completed"])
      .gte("occurred_at", fourHoursAgoIso)
      .order("occurred_at", { ascending: false }),
    getEventIntentions(),
  ]);

  const recentSignals = (signals ?? []).filter(
    (s): s is { assignment_id: string; occurred_at: string } => s.assignment_id !== null,
  );

  const ranked = rankAssignments(
    (assignments ?? []) as Assignment[],
    recentSignals,
    now,
    energy,
    { diagnoses: profile?.diagnoses ?? [], extra_time_pct: profile?.extra_time_pct ?? 0 },
    lastShownClassId,
  );

  const questItems: QuestItem[] = ranked.slice(0, 5).map((a, i) => {
    const aRow = (assignments ?? []).find((x) => x.id === a.id);
    const joined = aRow ? (Array.isArray(aRow.classes) ? aRow.classes[0] : aRow.classes) : null;
    const subject =
      joined?.name?.trim() || KIND_LABEL[a.kind as keyof typeof KIND_LABEL] || "Work";
    return {
      n: i + 1,
      subject,
      title: a.title,
      due: a.due_at ? formatDueAt(a.due_at) : "no due date",
      accent: ACCENT_CYCLE[i % ACCENT_CYCLE.length],
      href: `/assignments/${a.id}?focus=next-step`,
    };
  });

  return (
    <DashboardTabShell>
        <DashboardTabs />
        <TabHeading
          kicker="What's coming"
          title="Future"
          sub="Tonight's plan and the quest path ahead."
          accent="var(--gl-gold)"
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
          {/* EveningPlanning self-gates to 5–8pm and hides when there are no intentions. */}
          <EveningPlanning intentions={intentions} />

          {/* NOTE: QuestCarousel was authored as an absolutely-positioned hero
              overlay (position:absolute; left:34; bottom:36; width:460). It needs
              a positioned shell to lay out inside a normal tab. This makes it work
              as-is; for a cleaner FUTURE layout, lift the absolute positioning in
              quest-carousel.tsx so it flows statically and goes full-width. */}
          {questItems.length > 0 && (
            <div style={{ position: "relative", minHeight: 240 }}>
              <QuestCarousel quests={questItems} />
            </div>
          )}
        </div>
    </DashboardTabShell>
  );
}
