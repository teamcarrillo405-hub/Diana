import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

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
    <div style={{ background: "var(--gl-bg-base)", minHeight: "100dvh" }}>
      <div
        style={{
          maxWidth: "var(--layout-max-width)",
          margin: "0 auto",
          padding: "var(--space-17) var(--space-17) var(--space-21)",
        }}
      >
        <DashboardTabs />

        <header style={{ marginBottom: "var(--space-15)" }}>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-13)",
              fontWeight: "var(--weight-700)",
              letterSpacing: "var(--tracking-30)",
              textTransform: "uppercase",
              color: "var(--gl-green)",
            }}
          >
            What I&apos;ve shown
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-40)",
              fontWeight: "var(--weight-800)",
              fontStyle: "italic",
              textTransform: "uppercase",
              color: "var(--gl-text-primary)",
              lineHeight: "var(--leading-tight)",
            }}
          >
            Proof
          </h1>
          <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-15)", color: "var(--gl-text-overlay-60)" }}>
            The quiet payoff — what you finished and the one move that helps your grade most.
          </p>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
          <DoneToday count={doneTodayCount} />
          <Suspense fallback={null}>
            <GradeMoveCard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
