import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Layers3,
  ListChecks,
  Mic,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { STATUS_LABEL } from "@/lib/state-machine/assignment";
import { formatDueAt } from "@/lib/format";
import { KIND_LABEL } from "@/lib/checklists/templates";
import { rankAssignments } from "@/lib/scoring/next-five-minutes";
import type { AssignmentStatus, AssignmentKind } from "@/lib/supabase/types";
import {
  NexusKicker,
  NexusMetric,
  NexusPageShell,
  NexusPanel,
} from "@/components/nexus/nexus-ui";
import { DashboardTabs } from "../dashboard/dashboard-tabs";

type AssignmentRow = {
  id: string;
  title: string;
  due_at: string | null;
  status: string;
  estimated_minutes: number | null;
  difficulty: number | null;
  class_id: string;
  kind: AssignmentKind;
  reading_load: number;
  writing_load: number;
  classes: { name: string; color: string | null } | null;
};

type MissionAssignment = AssignmentRow & {
  score: number;
  reasons: string[];
  effective_minutes: number | null;
};

type Lane = {
  title: string;
  eyebrow: string;
  items: MissionAssignment[];
  tone: "cyan" | "pink" | "gold" | "blue" | "purple";
};

function dueWindow(row: { due_at: string | null }, now: Date) {
  if (!row.due_at) return Number.POSITIVE_INFINITY;
  return (new Date(row.due_at).getTime() - now.getTime()) / 86_400_000;
}

function starterMinutes(row: MissionAssignment) {
  return Math.max(5, Math.min(18, Math.round(row.effective_minutes ?? row.estimated_minutes ?? 10)));
}

function readiness(row: MissionAssignment) {
  const dueBoost = row.due_at ? Math.max(0, 34 - Math.max(0, dueWindow(row, new Date())) * 5) : 8;
  const proofBoost = row.status === "done" ? 26 : row.status === "in_progress" ? 18 : 10;
  const loadPenalty = Math.max(0, (row.reading_load ?? 0) - 2) * 7;
  return Math.max(12, Math.min(96, Math.round(42 + dueBoost + proofBoost - loadPenalty)));
}

function reasonLabel(row: MissionAssignment) {
  if (row.reasons.length > 0) return row.reasons[0];
  if (row.due_at) return formatDueAt(row.due_at);
  if ((row.reading_load ?? 0) >= 3) return "reading-aware start";
  return "small visible start";
}

function buildLanes(open: MissionAssignment[], completed: MissionAssignment[], now: Date): Lane[] {
  const startNow = open.slice(0, 1);
  const startIds = new Set(startNow.map((row) => row.id));
  const dueSoon = open
    .filter((row) => !startIds.has(row.id) && dueWindow(row, now) <= 3)
    .slice(0, 4);
  const dueSoonIds = new Set(dueSoon.map((row) => row.id));
  const needsProof = [
    ...open.filter((row) => row.status === "done" || row.status === "in_progress"),
    ...completed,
  ]
    .filter((row, index, rows) => rows.findIndex((candidate) => candidate.id === row.id) === index)
    .slice(0, 4);
  const proofIds = new Set(needsProof.map((row) => row.id));
  const studyPrep = open
    .filter((row) => !startIds.has(row.id) && !dueSoonIds.has(row.id) && row.kind === "test_prep")
    .slice(0, 4);
  const studyIds = new Set(studyPrep.map((row) => row.id));
  const later = open
    .filter((row) => !startIds.has(row.id) && !dueSoonIds.has(row.id) && !proofIds.has(row.id) && !studyIds.has(row.id))
    .slice(0, 6);

  const lanes: Lane[] = [
    { title: "Start now", eyebrow: "Diana pick", items: startNow, tone: "cyan" },
    { title: "Due soon", eyebrow: "Time window", items: dueSoon, tone: "gold" },
    { title: "Needs proof", eyebrow: "Receipt lane", items: needsProof, tone: "pink" },
    { title: "Study / test prep", eyebrow: "Recall lane", items: studyPrep, tone: "blue" },
    { title: "Later this week", eyebrow: "Parked", items: later, tone: "purple" },
  ];

  return lanes.filter((lane) => lane.items.length > 0);
}

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const profile = await loadProfile();
  const now = new Date();
  const fourHoursAgoIso = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  const [{ data: assignments }, { data: signals }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, due_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load, classes(name, color)")
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("task_signals")
      .select("assignment_id, occurred_at")
      .in("kind", ["started", "completed"])
      .gte("occurred_at", fourHoursAgoIso)
      .order("occurred_at", { ascending: false }),
  ]);

  const rows = (assignments ?? []) as AssignmentRow[];
  const recentSignals = (signals ?? []).filter(
    (signal): signal is { assignment_id: string; occurred_at: string } => signal.assignment_id !== null,
  );
  const ranked = rankAssignments(
    rows,
    recentSignals,
    now,
    "medium",
    {
      diagnoses: profile?.diagnoses ?? [],
      extra_time_pct: profile?.extra_time_pct ?? 0,
    },
  ) as MissionAssignment[];
  const open = ranked.filter((a) => !["submitted", "graded", "abandoned"].includes(a.status));
  const completed = rows
    .filter((a) => ["submitted", "graded", "abandoned"].includes(a.status))
    .map((row) => ({ ...row, score: 0, reasons: ["proof ready"], effective_minutes: row.estimated_minutes })) as MissionAssignment[];
  const next = open[0] ?? null;
  const lanes = buildLanes(open, completed, now);
  const dueSoonCount = open.filter((row) => dueWindow(row, now) <= 3).length;
  const proofCount = lanes.find((lane) => lane.title === "Needs proof")?.items.length ?? 0;

  return (
    <NexusPageShell className="assignments-mission-page space-y-8">
      {/* Top tab strip (replaces the left sidebar here) — destinations per docs/design/NAVIGATION.md */}
      <DashboardTabs />

      {/* Mission Board handoff — scan-line keyframes + reduced-motion guard */}
      <style>{`
        @keyframes mb-scan { 0% { transform: translateY(-12px); } 100% { transform: translateY(150px); } }
        @media (prefers-reduced-motion: reduce) { .mb-scan-line { animation: none !important; } }
      `}</style>

      {/* NexusPageHeader — eyebrow / title / description / Add assignment / NexusArcadeScene */}
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 300px",
          gap: "var(--space-16)",
          alignItems: "center",
          marginBottom: "var(--space-15)",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 var(--space-3)",
              fontFamily: "var(--font-display)",
              fontWeight: "var(--weight-700)",
              fontSize: "var(--text-13)",
              letterSpacing: "var(--tracking-28)",
              textTransform: "uppercase",
              color: "var(--gl-cyan-70)",
            }}
          >
            Mission board
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: "var(--weight-800)",
              fontSize: "var(--text-46)",
              lineHeight: "var(--leading-tight)",
              letterSpacing: "var(--tracking-01)",
              textTransform: "uppercase",
              color: "var(--gl-text-primary)",
            }}
          >
            This is not a pile.
            <br />
            It is an order.
          </h1>
          <p
            style={{
              margin: "var(--space-10) 0 0",
              maxWidth: "560px",
              fontSize: "var(--text-15)",
              lineHeight: "var(--leading-relaxed)",
              color: "var(--gl-text-overlay-60)",
            }}
          >
            Assignments are grouped by what Grayson can do next: start, protect a due date, save proof, study, or park for later.
          </p>
          <div style={{ marginTop: "var(--space-12)" }}>
            <Link
              href="/assignments/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-9) var(--space-14)",
                borderRadius: "var(--radius-option)",
                background: "var(--gl-cyan)",
                boxShadow: "0 0 28px var(--gl-cyan-30)",
                fontFamily: "var(--font-display)",
                fontWeight: "var(--weight-800)",
                fontSize: "var(--text-17)",
                letterSpacing: "var(--tracking-04)",
                textTransform: "uppercase",
                color: "var(--gl-text-on-cyan)",
                textDecoration: "none",
              }}
            >
              <FilePlus2 size={17} />
              Add assignment
            </Link>
          </div>
        </div>

        {/* NexusArcadeScene — "priority stack" HUD motif */}
        <div
          style={{
            position: "relative",
            height: "172px",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--gl-cyan-18)",
            background: "linear-gradient(135deg, var(--gl-focus-from), var(--gl-focus-to))",
            overflow: "hidden",
            padding: "var(--space-12) var(--space-13)",
          }}
        >
          <span style={{ position: "absolute", left: -1, top: -1, width: 15, height: 15, borderLeft: "2px solid var(--gl-cyan-85)", borderTop: "2px solid var(--gl-cyan-85)", borderRadius: "2px 0 0 0" }} />
          <span style={{ position: "absolute", right: -1, top: -1, width: 15, height: 15, borderRight: "2px solid var(--gl-cyan-85)", borderTop: "2px solid var(--gl-cyan-85)", borderRadius: "0 2px 0 0" }} />
          <span style={{ position: "absolute", left: -1, bottom: -1, width: 15, height: 15, borderLeft: "2px solid var(--gl-cyan-85)", borderBottom: "2px solid var(--gl-cyan-85)", borderRadius: "0 0 0 2px" }} />
          <span style={{ position: "absolute", right: -1, bottom: -1, width: 15, height: 15, borderRight: "2px solid var(--gl-cyan-85)", borderBottom: "2px solid var(--gl-cyan-85)", borderRadius: "0 0 2px 0" }} />
          <span className="mb-scan-line" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 2, background: "linear-gradient(90deg, transparent, var(--gl-cyan-70), transparent)", animation: "mb-scan 3.2s linear infinite" }} />
          <p style={{ margin: "0 0 var(--space-8)", fontFamily: "var(--font-display)", fontWeight: "var(--weight-700)", fontSize: "var(--text-10)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-dim)" }}>
            Priority stack
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {[
              { n: 1, w: "92%", tone: "var(--gl-cyan)" },
              { n: 2, w: "74%", tone: "var(--gl-gold)" },
              { n: 3, w: "58%", tone: "var(--gl-green)" },
              { n: 4, w: "44%", tone: "var(--gl-blue)" },
              { n: 5, w: "30%", tone: "var(--gl-purple)" },
            ].map((bar) => (
              <div key={bar.n} style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                <span style={{ width: 12, fontFamily: "var(--font-display)", fontWeight: "var(--weight-800)", fontSize: "var(--text-12)", color: bar.tone }}>{bar.n}</span>
                <span style={{ height: 8, width: bar.w, borderRadius: "3px", background: bar.tone, opacity: 0.85 }} />
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="assignment-command-grid">
        {/* NexusPanel tone=cyan — Start now */}
        <div
          style={{
            position: "relative",
            alignSelf: "start",
            borderRadius: "var(--radius-panel)",
            border: "1px solid var(--gl-cyan-25)",
            background: "linear-gradient(135deg, var(--gl-focus-from), var(--gl-focus-to))",
            padding: "var(--space-15) var(--space-16)",
            overflow: "hidden",
            boxShadow: "0 0 40px var(--gl-cyan-08)",
          }}
        >
          <span style={{ position: "absolute", left: -1, top: -1, width: 16, height: 16, borderLeft: "2px solid var(--gl-cyan-85)", borderTop: "2px solid var(--gl-cyan-85)", borderRadius: "2px 0 0 0" }} />
          <span style={{ position: "absolute", right: -1, top: -1, width: 16, height: 16, borderRight: "2px solid var(--gl-cyan-85)", borderTop: "2px solid var(--gl-cyan-85)", borderRadius: "0 2px 0 0" }} />
          <span style={{ position: "absolute", left: -1, bottom: -1, width: 16, height: 16, borderLeft: "2px solid var(--gl-cyan-85)", borderBottom: "2px solid var(--gl-cyan-85)", borderRadius: "0 0 0 2px" }} />
          <span style={{ position: "absolute", right: -1, bottom: -1, width: 16, height: 16, borderRight: "2px solid var(--gl-cyan-85)", borderBottom: "2px solid var(--gl-cyan-85)", borderRadius: "0 0 2px 0" }} />

          {/* NexusKicker */}
          <p
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-3)",
              margin: "0 0 var(--space-10)",
              fontFamily: "var(--font-display)",
              fontWeight: "var(--weight-800)",
              fontSize: "var(--text-12)",
              letterSpacing: "var(--tracking-16)",
              textTransform: "uppercase",
              color: "var(--gl-cyan)",
            }}
          >
            <Clock3 size={14} />
            Start now
          </p>

          {next ? (
            <>
              <div
                style={{
                  fontSize: "var(--text-13)",
                  fontWeight: "var(--weight-600)",
                  letterSpacing: "var(--tracking-06)",
                  textTransform: "uppercase",
                  color: next.classes?.color ?? "var(--gl-cyan)",
                }}
              >
                {next.classes?.name ?? "Class"}
              </div>
              <h2
                style={{
                  margin: "var(--space-2) 0 0",
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontWeight: "var(--weight-800)",
                  fontSize: "var(--text-34)",
                  lineHeight: "var(--leading-snug)",
                  textTransform: "uppercase",
                  color: "var(--gl-text-primary)",
                }}
              >
                {next.title}
              </h2>
              <p style={{ margin: "var(--space-5) 0 0", fontSize: "var(--text-14)", color: "var(--gl-text-overlay-60)" }}>
                {next.due_at ? formatDueAt(next.due_at) : "No due date"} / {starterMinutes(next)} min start / {KIND_LABEL[next.kind]}
              </p>

              {/* assignment-why-strip */}
              <div style={{ marginTop: "var(--space-11)", display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }} aria-label="Why this assignment is first">
                {[reasonLabel(next), "small visible start", "proof stays visible"].map((reason) => (
                  <span
                    key={reason}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      padding: "var(--space-3) var(--space-8)",
                      borderRadius: "var(--radius-pill)",
                      border: "1px solid var(--gl-cyan-25)",
                      background: "var(--gl-cyan-08)",
                      fontSize: "var(--text-12)",
                      color: "var(--gl-cyan)",
                    }}
                  >
                    <CheckCircle2 size={13} />
                    {reason}
                  </span>
                ))}
              </div>

              {/* assignment-next-actions */}
              <div style={{ marginTop: "var(--space-13)", display: "flex", gap: "var(--space-8)", flexWrap: "wrap" }}>
                <Link
                  href={`/assignments/${next.id}?focus=next-step`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-4)",
                    padding: "var(--space-9) var(--space-13)",
                    borderRadius: "var(--radius-option)",
                    background: "var(--gl-cyan)",
                    boxShadow: "0 0 24px var(--gl-cyan-30)",
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--weight-800)",
                    fontSize: "var(--text-16)",
                    letterSpacing: "var(--tracking-04)",
                    textTransform: "uppercase",
                    color: "var(--gl-text-on-cyan)",
                    textDecoration: "none",
                  }}
                >
                  Start {starterMinutes(next)} minutes
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href={`/assignments/${next.id}?focus=breakdown`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "var(--space-9) var(--space-13)",
                    borderRadius: "var(--radius-option)",
                    border: "1px solid var(--gl-cyan-25)",
                    background: "transparent",
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--weight-700)",
                    fontSize: "var(--text-16)",
                    letterSpacing: "var(--tracking-04)",
                    textTransform: "uppercase",
                    color: "var(--gl-text-secondary)",
                    textDecoration: "none",
                  }}
                >
                  Break it down
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontWeight: "var(--weight-800)",
                  fontSize: "var(--text-32)",
                  lineHeight: "var(--leading-snug)",
                  textTransform: "uppercase",
                  color: "var(--gl-text-primary)",
                }}
              >
                No open schoolwork.
              </h2>
              <p style={{ margin: "var(--space-6) 0 0", maxWidth: "420px", fontSize: "var(--text-15)", lineHeight: "var(--leading-relaxed)", color: "var(--gl-text-overlay-60)" }}>
                Add one assignment or capture a teacher note when something new arrives.
              </p>
            </>
          )}
        </div>

        <NexusPanel className="assignment-metrics-panel" tone="purple">
          <NexusMetric label="Start now" value={next ? 1 : 0} detail="top move" tone="cyan" />
          <NexusMetric label="Due soon" value={dueSoonCount} detail="3-day window" tone="gold" />
          <NexusMetric label="Needs proof" value={proofCount} detail="receipt lane" tone="pink" />
        </NexusPanel>
      </div>

      {/* Voice entry point — general-purpose Diana agent (see docs/design/NAVIGATION.md) */}
      <section
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-11)",
          flexWrap: "wrap",
          borderRadius: "var(--radius-panel)",
          border: "1px solid var(--gl-purple-30)",
          background: "var(--gl-purple-12)",
          padding: "var(--space-11) var(--space-13)",
          overflow: "hidden",
        }}
      >
        <span style={{ position: "absolute", left: -1, top: -1, width: 14, height: 14, borderLeft: "2px solid var(--gl-purple)", borderTop: "2px solid var(--gl-purple)", borderRadius: "2px 0 0 0" }} />
        <span style={{ position: "absolute", right: -1, top: -1, width: 14, height: 14, borderRight: "2px solid var(--gl-purple)", borderTop: "2px solid var(--gl-purple)", borderRadius: "0 2px 0 0" }} />
        <span style={{ position: "absolute", left: -1, bottom: -1, width: 14, height: 14, borderLeft: "2px solid var(--gl-purple)", borderBottom: "2px solid var(--gl-purple)", borderRadius: "0 0 0 2px" }} />
        <span style={{ position: "absolute", right: -1, bottom: -1, width: 14, height: 14, borderRight: "2px solid var(--gl-purple)", borderBottom: "2px solid var(--gl-purple)", borderRadius: "0 0 2px 0" }} />

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-4)",
            fontFamily: "var(--font-display)",
            fontWeight: "var(--weight-800)",
            fontSize: "var(--text-14)",
            letterSpacing: "var(--tracking-06)",
            textTransform: "uppercase",
            color: "var(--gl-purple-light)",
          }}
        >
          <Mic size={16} />
          Talk it through with Diana
        </span>
        <Link
          href="/voice"
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-5) var(--space-11)",
            borderRadius: "var(--radius-option)",
            background: "var(--gl-purple)",
            fontFamily: "var(--font-display)",
            fontWeight: "var(--weight-800)",
            fontSize: "var(--text-13)",
            letterSpacing: "var(--tracking-04)",
            textTransform: "uppercase",
            color: "var(--gl-text-primary)",
            textDecoration: "none",
          }}
        >
          Start talking
          <ArrowRight size={15} />
        </Link>
      </section>

      {/* assignment-sort-panel — Why this order (single bordered row) */}
      <section
        style={{
          borderRadius: "var(--radius-panel)",
          border: "1px solid var(--gl-blue-30)",
          background: "var(--gl-bg-card)",
          padding: "var(--space-11) var(--space-13)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-12)", flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-4)",
              fontFamily: "var(--font-display)",
              fontWeight: "var(--weight-800)",
              fontSize: "var(--text-12)",
              letterSpacing: "var(--tracking-16)",
              textTransform: "uppercase",
              color: "var(--gl-blue)",
            }}
          >
            <SlidersHorizontal size={14} />
            Why this order
          </span>
          <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
            {["Due window", "Effort", "Energy fit", "Class priority", "Proof needed"].map((rule) => (
              <span
                key={rule}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "var(--space-3) var(--space-9)",
                  borderRadius: "var(--radius-button)",
                  border: "1px solid var(--gl-border-neutral)",
                  background: "var(--gl-blue-12)",
                  fontSize: "var(--text-13)",
                  color: "var(--gl-text-secondary)",
                }}
              >
                {rule}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="assignment-lane-stack" aria-label="Assignment priority lanes">
        {lanes.map((lane) => (
          <AssignmentLane key={lane.title} lane={lane} />
        ))}
      </section>
    </NexusPageShell>
  );
}

function AssignmentLane({ lane }: { lane: Lane }) {
  return (
    <section className="assignment-lane" data-tone={lane.tone}>
      <div className="assignment-lane-head">
        <div>
          <NexusKicker tone={lane.tone}>{lane.eyebrow}</NexusKicker>
          <h2>{lane.title}</h2>
        </div>
        <span>{lane.items.length} {lane.items.length === 1 ? "item" : "items"}</span>
      </div>
      <div className="assignment-card-grid">
        {lane.items.map((assignment) => (
          <AssignmentMissionCard key={assignment.id} assignment={assignment} />
        ))}
      </div>
    </section>
  );
}

function AssignmentMissionCard({ assignment }: { assignment: MissionAssignment }) {
  const percent = readiness(assignment);
  const color = assignment.classes?.color ?? undefined;

  return (
    <Link
      href={`/assignments/${assignment.id}`}
      className="assignment-mission-card"
      style={color ? { "--assignment-color": color } as CSSProperties : undefined}
    >
      <span className="assignment-card-class">
        <Layers3 size={14} />
        {assignment.classes?.name ?? "Class"}
      </span>
      <strong>{assignment.title}</strong>
      <span className="assignment-card-meta">
        {assignment.due_at ? formatDueAt(assignment.due_at) : "No due date"} / {starterMinutes(assignment)} min start
      </span>
      <span className="assignment-card-progress" aria-label={`${percent}% ready`}>
        <i style={{ width: `${percent}%` }} />
      </span>
      <span className="assignment-card-footer">
        <span>
          <ListChecks size={13} />
          {KIND_LABEL[assignment.kind]}
        </span>
        <span>
          <BookOpenCheck size={13} />
          {reasonLabel(assignment)}
        </span>
        <StatusPill status={assignment.status} />
      </span>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const isComplete = status === "submitted" || status === "graded";
  return (
    <span className="assignment-status-pill">
      {isComplete ? <CheckCircle2 size={13} className="text-ok" /> : <ShieldCheck size={13} />}
      {STATUS_LABEL[status as AssignmentStatus] ?? status}
    </span>
  );
}
