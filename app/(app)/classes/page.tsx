import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Layers3,
  MessageSquareText,
  NotebookTabs,
  Radar,
  SlidersHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDueAt } from "@/lib/format";
import { ClassForm } from "./class-form";
import { AppTopNav } from "../app-top-nav";
import { classTheme } from "../dashboard/classes-grid";

const SF = "var(--font-display)";
const BODY = "var(--font-body)";

type ClassRow = {
  id: string;
  name: string;
  teacher: string | null;
  color: string | null;
  created_at: string;
};

type AssignmentRow = {
  id: string;
  title: string;
  class_id: string | null;
  status: string;
  due_at: string | null;
  estimated_minutes: number | null;
  reading_load: number;
};

type RubricRow = {
  id: string;
  class_id: string | null;
  parse_status: string | null;
};

type NoteRow = {
  id: string;
  class_id: string | null;
};

type ClassLane = ClassRow & {
  openAssignments: AssignmentRow[];
  nextAssignment: AssignmentRow | null;
  rubricCount: number;
  noteCount: number;
  loadScore: number;
  dueSoonCount: number;
  rulebrickLabel: string;
};

function dueMs(value: string | null) {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}

function dueSoon(row: AssignmentRow, now: Date) {
  if (!row.due_at) return false;
  const days = (new Date(row.due_at).getTime() - now.getTime()) / 86_400_000;
  return days <= 3;
}

function loadScore(assignments: AssignmentRow[], rubricCount: number, noteCount: number, now: Date) {
  const due = assignments.filter((row) => dueSoon(row, now)).length;
  const reading = assignments.reduce((sum, row) => sum + Math.max(0, row.reading_load ?? 0), 0);
  const minutes = assignments.reduce((sum, row) => sum + Math.max(0, row.estimated_minutes ?? 0), 0);
  const sourceBoost = Math.min(18, rubricCount * 8 + noteCount * 2);
  return Math.max(10, Math.min(96, Math.round(24 + due * 18 + assignments.length * 7 + reading * 3 + minutes / 18 + sourceBoost)));
}

function rulebrickLabel(rubrics: RubricRow[], notes: NoteRow[]) {
  if (rubrics.some((rubric) => rubric.parse_status === "parsed")) return "parsed rulebrick";
  if (rubrics.length > 0) return "teacher rules saved";
  if (notes.length > 0) return "notes captured";
  return "needs teacher rules";
}

export default async function ClassesPage() {
  const supabase = await createClient();
  const now = new Date();

  const [{ data: classes }, { data: assignments }, { data: rubrics }, { data: notes }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, teacher, color, created_at")
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("assignments")
      .select("id, title, class_id, status, due_at, estimated_minutes, reading_load")
      .not("class_id", "is", null)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("rubrics").select("id, class_id, parse_status"),
    supabase.from("notes").select("id, class_id").not("class_id", "is", null),
  ]);

  const activeClasses = (classes ?? []) as ClassRow[];
  const assignmentRows = (assignments ?? []) as AssignmentRow[];
  const rubricRows = (rubrics ?? []) as RubricRow[];
  const noteRows = (notes ?? []) as NoteRow[];
  const openAssignments = assignmentRows.filter((row) => !["submitted", "graded", "abandoned"].includes(row.status));

  const lanes: ClassLane[] = activeClasses
    .map((classRow) => {
      const classAssignments = openAssignments
        .filter((a) => a.class_id === classRow.id)
        .sort((a, b) => dueMs(a.due_at) - dueMs(b.due_at));
      const classRubrics = rubricRows.filter((r) => r.class_id === classRow.id);
      const classNotes = noteRows.filter((n) => n.class_id === classRow.id);
      return {
        ...classRow,
        openAssignments: classAssignments,
        nextAssignment: classAssignments[0] ?? null,
        rubricCount: classRubrics.length,
        noteCount: classNotes.length,
        dueSoonCount: classAssignments.filter((a) => dueSoon(a, now)).length,
        loadScore: loadScore(classAssignments, classRubrics.length, classNotes.length, now),
        rulebrickLabel: rulebrickLabel(classRubrics, classNotes),
      };
    })
    .sort((a, b) => b.loadScore - a.loadScore || dueMs(a.nextAssignment?.due_at ?? null) - dueMs(b.nextAssignment?.due_at ?? null));

  const totalDueSoon = lanes.reduce((sum, l) => sum + l.dueSoonCount, 0);
  const withRulebricks = lanes.filter((l) => l.rubricCount > 0).length;
  const namedTeachers = lanes.filter((l) => Boolean(l.teacher)).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      <AppTopNav active="Today" />
      <style>{`
        .cls-lane-grid { display: grid; gap: var(--space-9); }
        @media (min-width: 768px) { .cls-lane-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1280px) { .cls-lane-grid { grid-template-columns: 1fr 1fr 1fr; } }
        .cls-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-9); }
        @media (min-width: 640px) { .cls-metrics { grid-template-columns: repeat(4, 1fr); } }
        .cls-focus { display: grid; gap: var(--space-13); }
        @media (min-width: 1024px) { .cls-focus { grid-template-columns: 1fr 1fr; align-items: start; } }
      `}</style>
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>

        {/* Hero */}
        <header style={{ display: "grid", gap: "var(--space-8)" }}>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-cyan)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Layers3 size={13} aria-hidden="true" />
            Class lanes
          </p>
          <h1 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-50)", lineHeight: "var(--leading-tight)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0, maxWidth: "20ch" }}>
            Every subject gets a signal.
          </h1>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-16)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", maxWidth: "52ch", margin: 0 }}>
            Classes are where teacher rules, homework, notes, rubrics, and proof become one lane instead of scattered school stuff.
          </p>
        </header>

        {/* Metrics */}
        <div className="cls-metrics">
          {[
            { label: "Active", value: activeClasses.length, detail: "class lanes" },
            { label: "Due soon", value: totalDueSoon, detail: "3-day window" },
            { label: "Rulebricks", value: withRulebricks, detail: "teacher rules" },
            { label: "Teachers", value: namedTeachers, detail: "named contacts" },
          ].map((m) => (
            <div key={m.label} style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-12)" }}>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: "0 0 var(--space-4)" }}>{m.label}</p>
              <p style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-36)", lineHeight: 1, color: "var(--gl-text-primary)", margin: "0 0 var(--space-2)" }}>{m.value}</p>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-muted)", margin: 0 }}>{m.detail}</p>
            </div>
          ))}
        </div>

        {/* Highest-signal focus card */}
        {lanes[0] && (
          <div className="cls-focus" style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-cyan)", background: "var(--gl-cyan-10)", padding: "var(--space-14)" }}>
            <div style={{ display: "grid", gap: "var(--space-8)" }}>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-cyan)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <SlidersHorizontal size={13} />
                Highest signal
              </p>
              <div>
                <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", color: "var(--gl-text-muted)", margin: "0 0 var(--space-2)" }}>{lanes[0].loadScore} signal</p>
                <h2 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-36)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>{lanes[0].name}</h2>
                <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", margin: "var(--space-3) 0 var(--space-10)" }}>{lanes[0].teacher ?? "Teacher contact can be added later"}</p>
                <Link href={`/classes/${lanes[0].id}`} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", background: "var(--gl-cyan)", color: "#04080f", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none" }}>
                  Open lane
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
            <div style={{ display: "grid", gap: "var(--space-5)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-12)" }}>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <Radar size={12} />
                Next move
              </p>
              <p style={{ fontFamily: SF, fontWeight: "var(--weight-700)", fontSize: "var(--text-20)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>{lanes[0].nextAssignment?.title ?? "This lane is clear"}</p>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-13)", color: "var(--gl-text-muted)", margin: 0 }}>
                {lanes[0].nextAssignment?.due_at ? formatDueAt(lanes[0].nextAssignment.due_at) : "Ready when something arrives"}
              </p>
            </div>
          </div>
        )}

        {/* Lane grid */}
        {lanes.length === 0 ? (
          <div style={{ borderRadius: "var(--radius-card)", border: "1px dashed var(--gl-border-neutral)", padding: "var(--space-20)", textAlign: "center", display: "grid", gap: "var(--space-6)" }}>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: 0 }}>No lanes yet</p>
            <p style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-28)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>Add the first class.</p>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", margin: 0 }}>Once a class exists, Diana can connect assignments, rubrics, notes, and proof to the right subject.</p>
          </div>
        ) : (
          <section className="cls-lane-grid" aria-label="Class signal lanes">
            {lanes.map((lane) => (
              <LaneCard key={lane.id} lane={lane} />
            ))}
          </section>
        )}

        {/* Add a class */}
        <section style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-14)" }}>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-cyan)", margin: "0 0 var(--space-8)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <BookOpen size={13} />
            Add a class
          </p>
          <ClassForm />
        </section>
      </div>
    </div>
  );
}

function LaneCard({ lane }: { lane: ClassLane }) {
  const theme = classTheme({ id: lane.id, name: lane.name, color: lane.color });
  return (
    <Link
      href={`/classes/${lane.id}`}
      style={{ display: "grid", gap: "var(--space-9)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-14)", textDecoration: "none", overflow: "hidden" }}
    >
      {/* Class banner strip */}
      <div style={{ borderRadius: "var(--radius-card)", background: theme.bannerBg, padding: "var(--space-10) var(--space-12)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-28)", textTransform: "uppercase", color: theme.accent }}>{theme.symbol}</span>
        <span style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", color: theme.accent, opacity: 0.8 }}>{lane.loadScore} signal</span>
      </div>

      {/* Name + teacher */}
      <div>
        <h2 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-22)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: "0 0 var(--space-2)" }}>{lane.name}</h2>
        <p style={{ fontFamily: BODY, fontSize: "var(--text-13)", color: "var(--gl-text-muted)", margin: 0 }}>{lane.teacher ?? "Add teacher contact"}</p>
      </div>

      {/* Signal bars */}
      <div style={{ display: "grid", gap: "var(--space-5)" }}>
        {[
          { label: "work", value: Math.min(96, 28 + lane.openAssignments.length * 14) },
          { label: "due", value: Math.min(96, 20 + lane.dueSoonCount * 28) },
          { label: "rules", value: Math.min(96, 22 + lane.rubricCount * 38 + lane.noteCount * 4) },
        ].map((bar) => (
          <div key={bar.label} style={{ display: "grid", gridTemplateColumns: "3rem 1fr 2rem", gap: "var(--space-4)", alignItems: "center" }}>
            <span style={{ fontFamily: BODY, fontSize: "var(--text-10)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-12)", textTransform: "uppercase", color: "var(--gl-text-muted)" }}>{bar.label}</span>
            <div style={{ height: 4, borderRadius: 2, background: "var(--gl-border-neutral)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(6, bar.value)}%`, borderRadius: 2, background: theme.accent, opacity: 0.7 }} />
            </div>
            <span style={{ fontFamily: BODY, fontSize: "var(--text-10)", color: "var(--gl-text-muted)", textAlign: "right" }}>{bar.value}</span>
          </div>
        ))}
      </div>

      {/* Next in lane */}
      <div style={{ display: "grid", gap: "var(--space-3)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--gl-border-neutral)" }}>
        <p style={{ fontFamily: BODY, fontSize: "var(--text-10)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-12)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Radar size={11} />
          Next in lane
        </p>
        <p style={{ fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-14)", color: "var(--gl-text-primary)", margin: 0 }}>{lane.nextAssignment?.title ?? "No open schoolwork"}</p>
        <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-muted)", margin: 0 }}>
          {lane.nextAssignment?.due_at ? formatDueAt(lane.nextAssignment.due_at) : "Ready when something arrives"}
        </p>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4) var(--space-8)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--gl-border-neutral)" }}>
        {[
          { icon: ClipboardCheck, label: lane.rulebrickLabel },
          { icon: NotebookTabs, label: `${lane.noteCount} notes` },
          { icon: MessageSquareText, label: lane.teacher ? "contact saved" : "add contact" },
        ].map(({ icon: Icon, label }) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", fontFamily: BODY, fontSize: "var(--text-11)", color: "var(--gl-text-muted)" }}>
            <Icon size={11} />
            {label}
          </span>
        ))}
        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-11)", color: theme.accent, marginLeft: "auto" }}>
          Open lane <ArrowRight size={11} />
        </span>
      </div>
    </Link>
  );
}
