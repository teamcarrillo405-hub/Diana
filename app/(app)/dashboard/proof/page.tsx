import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

import { DashboardTabShell } from "@/components/ui/dashboard-tab-shell";
import { TabHeading } from "@/components/ui/tab-heading";
import { DashboardTabs } from "../dashboard-tabs";
import { GradeMoveCard } from "../grade-move-card";
import { DoneToday } from "../done-today";

// Diana — PROOF tab. "What I've shown." DoneToday self-hides at count 0;
// GradeMoveCard fetches Canvas internally (2.5s timeout, renders nothing if
// slow/absent) so it stays wrapped in Suspense, same as page.tsx.
export default async function ProofPage() {
  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: doneToday } = await supabase
    .from("task_signals")
    .select("id")
    .eq("kind", "completed")
    .gte("occurred_at", todayStart.toISOString());
  const doneTodayCount = doneToday?.length ?? 0;

  return (
    <DashboardTabShell>
        <DashboardTabs />
        <TabHeading
          kicker="What I've shown"
          title="Proof"
          sub="The quiet payoff: what you finished and the one move that helps your grade most."
          accent="var(--gl-green)"
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
          <DoneToday count={doneTodayCount} />
          <Suspense fallback={null}>
            <GradeMoveCard />
          </Suspense>
          <Link
            href="/proof"
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-3)",
              borderRadius: "var(--radius-button)",
              border: "1px solid var(--gl-green-30)",
              background: "var(--gl-green-12)",
              padding: "var(--space-5) var(--space-10)",
              fontFamily: "var(--font-display)",
              fontWeight: "var(--weight-800)",
              fontSize: "var(--text-13)",
              letterSpacing: "var(--tracking-04)",
              textTransform: "uppercase",
              color: "var(--gl-green)",
              textDecoration: "none",
            }}
          >
            See all proof →
          </Link>
        </div>
    </DashboardTabShell>
  );
}
