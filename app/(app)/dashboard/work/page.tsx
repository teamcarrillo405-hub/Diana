import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { rankAssignments, type Assignment, type EnergyLevel } from "@/lib/scoring/next-five-minutes";
import { computeNightBudget, type BudgetAssignment } from "@/lib/time-budget/compute";
import { buildSupportPlan } from "@/lib/support/policy";

import { DashboardTabs } from "../dashboard-tabs";
import { FocusHeroCard } from "../focus-hero-card";
import { StartSessionButton } from "../start-session-button";
import { TimeBudget } from "../time-budget";
import { DueCards } from "../due-cards";
import { ReadingLoadToggle, ReadingLoadBadge } from "../reading-load-toggle";

function isEnergy(v: string | undefined): v is EnergyLevel {
  return v === "low" || v === "medium" || v === "high";
}

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ energy?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const energy: EnergyLevel = isEnergy(sp.energy) ? sp.energy : "medium";
  const readingLoadView = sp.view === "reading-load";

  const supabase = await createClient();
  const profile = await loadProfile();
  const now = new Date();
  const nowIso = now.toISOString();
  const fourHoursAgoIso = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();

  const cookieStore = await cookies();
  const lastShownClassId = cookieStore.get("diana_last_class")?.value ?? null;

  const [
    { data: assignments },
    { data: signals },
    { data: dueCards },
  ] = await Promise.all([
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
    supabase
      .from("flashcards")
      .select("id, due_at")
      .lte("due_at", nowIso)
      .order("due_at", { ascending: true }),
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
  const top = ranked[0];

  // FocusHeroCard assignment — normalize the joined class to { name, color }.
  const rawTop = top ? (assignments ?? []).find((a) => a.id === top.id) : undefined;
  const topClass = top
    ? Array.isArray(top.classes)
      ? top.classes[0]
      : top.classes
    : null;
  const focusAssignment = top
    ? {
        ...top,
        created_at: rawTop?.created_at ?? null,
        classes: topClass
          ? { name: topClass.name ?? null, color: (topClass as { color?: string | null }).color ?? null }
          : null,
      }
    : null;

  const roughMode = Boolean(
    profile?.rough_mode_until && new Date(profile.rough_mode_until).getTime() > now.getTime(),
  );

  const supportPlan = top ? buildSupportPlan({ assignment: top, energy }) : null;

  // TimeBudget — effective minutes for everything still on the plate tonight.
  const budgetAssignments: BudgetAssignment[] = (assignments ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    classId: a.class_id,
    kind: a.kind,
    estimated_minutes: a.estimated_minutes,
    reading_load: a.reading_load,
    due_at: a.due_at,
    status: a.status,
  }));
  const { totalMinutes, items } = computeNightBudget(budgetAssignments, {
    diagnoses: profile?.diagnoses ?? [],
    extra_time_pct: profile?.extra_time_pct ?? 0,
  });

  const dueCount = dueCards?.length ?? 0;
  const firstCardId = dueCards?.[0]?.id ?? null;

  return (
    <div style={{ background: "var(--gl-bg-base)", minHeight: "100dvh" }}>
      <div
        style={{
          maxWidth: "var(--layout-max-width)",
          margin: "0 auto",
          padding: "var(--space-17) var(--space-17) var(--space-21)",
        }}
      >
        <style>{`
.dw-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-13);}
@media(min-width:1024px){.dw-grid{grid-template-columns:minmax(0,1fr) 380px;align-items:start;}}
`}</style>
        <DashboardTabs />

        {/* Tab heading block */}
        <header style={{ marginBottom: "var(--space-15)" }}>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-13)",
              fontWeight: "var(--weight-700)",
              letterSpacing: "var(--tracking-30)",
              textTransform: "uppercase",
              color: "var(--gl-cyan)",
            }}
          >
            Do the work
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
            Work
          </h1>
          <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-15)", color: "var(--gl-text-overlay-60)" }}>
            Your next move, the clock on it, and what&apos;s left tonight.
          </p>
        </header>

        {top && focusAssignment ? (
          <div className="dw-grid">
            {/* Left — focus surface (brings TimeBar + reason pills) */}
            <div style={{ minWidth: 0 }}>
              <FocusHeroCard
                assignment={focusAssignment}
                createdAt={rawTop?.created_at ?? null}
                energy={energy}
                roughMode={roughMode}
                supportPlan={supportPlan}
              />
            </div>

            {/* Right rail */}
            <aside style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
              <StartSessionButton roughMode={roughMode} difficulty={top.difficulty ?? null} />
              <TimeBudget totalMinutes={totalMinutes} items={items} />
              <DueCards count={dueCount} firstCardId={firstCardId} />
            </aside>
          </div>
        ) : (
          <div
            style={{
              borderRadius: "var(--radius-card)",
              border: "1px dashed var(--gl-border-neutral)",
              background: "var(--gl-bg-card)",
              padding: "var(--space-19)",
              textAlign: "center",
              color: "var(--gl-text-muted)",
              fontSize: "var(--text-15)",
            }}
          >
            Nothing queued right now. New assignments will show up here as your next move.
          </div>
        )}

        {/* Reading-load row — full width */}
        <div
          style={{
            marginTop: "var(--space-15)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "var(--space-8)",
            borderTop: "1px solid var(--gl-border-neutral)",
            paddingTop: "var(--space-12)",
          }}
        >
          <ReadingLoadToggle active={readingLoadView} />
          {top && <ReadingLoadBadge load={top.reading_load} />}
        </div>
      </div>
    </div>
  );
}
