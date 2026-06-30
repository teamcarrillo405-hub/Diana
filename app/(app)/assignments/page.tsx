import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Layers3,
  ListChecks,
  MessagesSquare,
  Mic,
  ScanLine,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { STATUS_LABEL } from "@/lib/state-machine/assignment";
import { formatDueAt } from "@/lib/format";
import { KIND_LABEL } from "@/lib/checklists/templates";
import { rankAssignments } from "@/lib/scoring/next-five-minutes";
import type { AssignmentStatus, AssignmentKind } from "@/lib/supabase/types";
import { AppTopNav } from "../app-top-nav";
import { computeNightBudget } from "@/lib/time-budget/compute";
import { TimeBudget } from "../dashboard/time-budget";
import { DueCards } from "../dashboard/due-cards";
import { ReadingLoadToggle } from "../dashboard/reading-load-toggle";

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

  // "Start now" is intentionally NOT a lane — the top pick already has its own
  // Start Now panel above the lane stack. startNow/startIds remain so the lanes
  // below still exclude that top pick (no duplicate across panel + lanes).
  const lanes: Lane[] = [
    { title: "Due soon", eyebrow: "Time window", items: dueSoon, tone: "gold" },
    { title: "Needs proof", eyebrow: "Receipt lane", items: needsProof, tone: "pink" },
    { title: "Study / test prep", eyebrow: "Recall lane", items: studyPrep, tone: "blue" },
    { title: "Later this week", eyebrow: "Parked", items: later, tone: "purple" },
  ];

  return lanes.filter((lane) => lane.items.length > 0);
}

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const isReadingLoad = view === "reading-load";
  const supabase = await createClient();
  const profile = await loadProfile();
  const now = new Date();
  const fourHoursAgoIso = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  const [{ data: assignments }, { data: signals }, { data: dueCards }, { data: inboxItems }] = await Promise.all([
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
    supabase
      .from("flashcards")
      .select("id")
      .lte("due_at", new Date().toISOString())
      .order("due_at", { ascending: true }),
    supabase
      .from("inbox_items")
      .select("id, raw, capture_mode")
      .in("status", ["unclassified", "classified"])
      .order("created_at", { ascending: false })
      .limit(5),
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
  const dueCardCount = dueCards?.length ?? 0;
  const firstCardId = dueCards?.[0]?.id ?? null;
  const { totalMinutes, items: budgetItems } = computeNightBudget(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      classId: row.class_id,
      kind: row.kind,
      estimated_minutes: row.estimated_minutes,
      reading_load: row.reading_load,
      due_at: row.due_at,
      status: row.status,
    })),
    { diagnoses: profile?.diagnoses ?? [], extra_time_pct: profile?.extra_time_pct ?? 0 },
  );

  return (
    <div style={{ background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      {/* Shared top nav (replaces the left sidebar here) — destinations per docs/design/NAVIGATION.md */}
      <AppTopNav active="Work" />

      {/* Header — title + Add assignment only */}
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-12)",
          marginBottom: "var(--space-15)",
        }}
      >
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
          Mission Board
        </h1>
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

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {[
            { label: "Start now", value: next ? 1 : 0, detail: "top move", tone: "var(--gl-cyan)" },
            { label: "Due soon", value: dueSoonCount, detail: "3-day window", tone: "var(--gl-gold)" },
            { label: "Needs proof", value: proofCount, detail: "receipt lane", tone: "var(--gl-pink)" },
          ].map((tile) => (
            <div
              key={tile.label}
              style={{
                position: "relative",
                borderRadius: "var(--radius-panel)",
                border: "1px solid var(--gl-border-neutral)",
                background: "var(--gl-bg-card)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                padding: "var(--space-13) var(--space-13) var(--space-12)",
                overflow: "hidden",
              }}
            >
              <span style={{ position: "absolute", left: 0, right: 0, top: 0, height: 3, background: tile.tone }} />
              <div style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-800)", fontSize: "38px", lineHeight: 1, color: tile.tone }}>
                {tile.value}
              </div>
              <div style={{ marginTop: "var(--space-3)", fontFamily: "var(--font-display)", fontWeight: "var(--weight-700)", fontSize: "var(--text-14)", letterSpacing: "var(--tracking-04)", textTransform: "uppercase", color: "var(--gl-text-secondary)" }}>
                {tile.label}
              </div>
              <div style={{ marginTop: "var(--space-1)", fontSize: "var(--text-12)", color: "var(--gl-text-dim)" }}>
                {tile.detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capture inbox — unclassified items waiting for sorting */}
      {(inboxItems ?? []).length > 0 && (
        <section style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-gold-28)", background: "var(--gl-gold-08, rgba(255,210,74,.08))", padding: "var(--space-13) var(--space-14)", display: "grid", gap: "var(--space-9)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-8)", flexWrap: "wrap" }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-gold)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <ScanLine size={13} />
              Capture inbox · {(inboxItems ?? []).length} waiting
            </p>
            <Link
              href="/inbox"
              style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-12)", fontWeight: "var(--weight-700)", color: "var(--gl-gold)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
            >
              See all <ArrowRight size={12} />
            </Link>
          </div>
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            {(inboxItems ?? []).slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href={`/inbox/${item.id}`}
                style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", padding: "var(--space-9) var(--space-10)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", textDecoration: "none" }}
              >
                <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-12)", textTransform: "uppercase", color: "var(--gl-gold)", flexShrink: 0 }}>
                  {item.capture_mode === "photo" ? "Photo" : item.capture_mode === "voice" ? "Voice" : "Note"}
                </span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-13)", color: "var(--gl-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {item.raw.replace(/^\[Grayson demo\]\s*/i, "")}
                </span>
                <ArrowRight size={13} style={{ color: "var(--gl-text-muted)", flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Time budget + due cards — right rail tools */}
      <div style={{ display: "grid", gap: "var(--space-9)" }}>
        <TimeBudget totalMinutes={totalMinutes} items={budgetItems} />
        {dueCardCount > 0 && <DueCards count={dueCardCount} firstCardId={firstCardId} />}
      </div>

      {/* Reading-load toggle — full-width row */}
      <ReadingLoadToggle active={isReadingLoad} />

      {/* Voice entry point — slanted lime CTA to the general-purpose Diana agent (see docs/design/NAVIGATION.md) */}
      <Link
        href="/voice"
        style={{
          display: "inline-block",
          transform: "skewX(-10deg)",
          padding: "22px 40px",
          borderRadius: "var(--radius-hero)",
          background: "var(--gl-lime)",
          boxShadow: "0 0 32px var(--gl-lime-45), 0 8px 28px rgba(0,0,0,.6)",
          textDecoration: "none",
        }}
      >
        <div
          style={{
            transform: "skewX(10deg)",
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-4)",
            fontFamily: "var(--font-display)",
            fontWeight: "var(--weight-800)",
            fontSize: "var(--text-36)",
            letterSpacing: "var(--tracking-04)",
            textTransform: "uppercase",
            color: "var(--gl-text-on-cyan)",
          }}
        >
          <Mic size={30} />
          Talk to Diana
        </div>
      </Link>

      {/* Study tools — quick access to the work-session surfaces */}
      <section style={{ display: "grid", gap: "var(--space-9)" }} aria-label="Study tools">
        <style>{`.atools{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-6);}@media(max-width:760px){.atools{grid-template-columns:repeat(2,minmax(0,1fr));}}`}</style>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: 0 }}>
          Study tools
        </p>
        <div className="atools">
          {[
            { href: "/timer", label: "Focus timer", note: "Timed work block", Icon: TimerReset },
            { href: "/flashcards", label: "Flashcards", note: "Spaced review", Icon: Brain },
            { href: "/break-down", label: "Break it down", note: "Prompt → steps", Icon: ListChecks },
            { href: "/study-buddy", label: "Study buddy", note: "Socratic hints", Icon: MessagesSquare },
          ].map(({ href, label, note, Icon }) => (
            <Link
              key={href}
              href={href}
              style={{ display: "grid", gap: "var(--space-3)", padding: "var(--space-11) var(--space-12)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", textDecoration: "none" }}
            >
              <Icon size={18} style={{ color: "var(--gl-cyan)" }} />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-800)", fontSize: "var(--text-16)", textTransform: "uppercase", color: "var(--gl-text-primary)" }}>{label}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-11)", color: "var(--gl-text-muted)" }}>{note}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="assignment-lane-stack" aria-label="Assignment priority lanes">
        {lanes.map((lane) => (
          <AssignmentLane key={lane.title} lane={lane} />
        ))}
      </section>
    </div>
  );
}

const TONE_COLOR: Record<Lane["tone"], string> = {
  cyan: "var(--gl-cyan)",
  pink: "var(--gl-pink)",
  gold: "var(--gl-gold)",
  blue: "var(--gl-blue)",
  purple: "var(--gl-purple-light)",
};

const TONE_BORDER: Record<Lane["tone"], string> = {
  cyan: "var(--gl-cyan-22)",
  pink: "var(--gl-pink-30)",
  gold: "var(--gl-gold-28)",
  blue: "var(--gl-blue-28)",
  purple: "var(--gl-purple-30)",
};

const TONE_BG: Record<Lane["tone"], string> = {
  cyan: "var(--gl-cyan-08)",
  pink: "var(--gl-pink-12)",
  gold: "var(--gl-gold-12)",
  blue: "var(--gl-blue-12)",
  purple: "var(--gl-purple-12)",
};

function AssignmentLane({ lane }: { lane: Lane }) {
  const color = TONE_COLOR[lane.tone];
  return (
    <section style={{ display: "grid", gap: "var(--space-9)" }}>
      <style>{`.alg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-9);}@media(max-width:640px){.alg{grid-template-columns:minmax(0,1fr);}}`}</style>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--space-12)" }}>
        <div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color, margin: "0 0 var(--space-3)" }}>
            {lane.eyebrow}
          </p>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-800)", fontSize: "var(--text-34)", lineHeight: "var(--leading-tight)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>
            {lane.title}
          </h2>
        </div>
        <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", border: "1px solid var(--gl-border-neutral)", borderRadius: "var(--radius-pill)", padding: "var(--space-3) var(--space-6)", whiteSpace: "nowrap", flexShrink: 0 }}>
          {lane.items.length} {lane.items.length === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="alg">
        {lane.items.map((assignment) => (
          <AssignmentMissionCard key={assignment.id} assignment={assignment} tone={lane.tone} />
        ))}
      </div>
    </section>
  );
}

function AssignmentMissionCard({ assignment, tone }: { assignment: MissionAssignment; tone: Lane["tone"] }) {
  const percent = readiness(assignment);
  const color = TONE_COLOR[tone];
  const borderColor = TONE_BORDER[tone];
  const bgColor = TONE_BG[tone];
  const classColor = assignment.classes?.color ?? color;

  return (
    <Link
      href={`/assignments/${assignment.id}`}
      style={{
        position: "relative",
        overflow: "hidden",
        display: "grid",
        gap: "var(--space-5)",
        padding: "var(--space-12) var(--space-12) var(--space-12) var(--space-15)",
        borderRadius: "var(--radius-card)",
        border: `1px solid ${borderColor}`,
        background: bgColor,
        backdropFilter: "var(--blur-card)",
        textDecoration: "none",
        clipPath: "polygon(0 0, calc(100% - 13px) 0, 100% 13px, 100% 100%, 13px 100%, 0 calc(100% - 13px))",
        transition: "transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
      }}
    >
      <span aria-hidden="true" style={{ position: "absolute", insetBlock: 0, left: 0, width: 3, background: color }} />
      <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)", fontFamily: "var(--font-body)", fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: classColor }}>
        <Layers3 size={13} />
        {assignment.classes?.name ?? "Class"}
      </span>
      <strong style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-18)", fontWeight: "var(--weight-800)", lineHeight: "var(--leading-snug)", color: "var(--gl-text-primary)", overflowWrap: "anywhere" }}>
        {assignment.title}
      </strong>
      <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-11)", fontWeight: "var(--weight-600)", letterSpacing: "var(--tracking-12)", color: "var(--gl-text-muted)" }}>
        {assignment.due_at ? formatDueAt(assignment.due_at) : "No due date"} / {starterMinutes(assignment)} min start
      </span>
      <span
        aria-label={`${percent}% ready`}
        style={{ display: "block", height: 5, borderRadius: 3, border: `1px solid ${borderColor}`, background: bgColor, overflow: "hidden" }}
      >
        <i style={{ display: "block", height: "100%", width: `${percent}%`, background: `linear-gradient(90deg, ${color}, var(--gl-cyan))` }} />
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
        {[KIND_LABEL[assignment.kind], reasonLabel(assignment)].map((label) => (
          <span
            key={label}
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-2) var(--space-6)", borderRadius: "var(--radius-pill)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", fontFamily: "var(--font-body)", fontSize: "var(--text-11)", fontWeight: "var(--weight-600)", color: "var(--gl-text-muted)" }}
          >
            {label}
          </span>
        ))}
        <StatusPill status={assignment.status} color={color} />
      </div>
    </Link>
  );
}

function StatusPill({ status, color }: { status: string; color: string }) {
  const isComplete = status === "submitted" || status === "graded";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-2) var(--space-6)", borderRadius: "var(--radius-pill)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", fontFamily: "var(--font-body)", fontSize: "var(--text-11)", fontWeight: "var(--weight-600)", color: isComplete ? "var(--gl-green)" : color }}>
      {isComplete ? <CheckCircle2 size={12} /> : <ShieldCheck size={12} />}
      {STATUS_LABEL[status as AssignmentStatus] ?? status}
    </span>
  );
}
