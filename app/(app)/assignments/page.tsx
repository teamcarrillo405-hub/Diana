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
  NexusArcadeScene,
  NexusKicker,
  NexusMetric,
  NexusPageHeader,
  NexusPageShell,
  NexusPanel,
} from "@/components/nexus/nexus-ui";

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
      <NexusPageHeader
        eyebrow="Mission board"
        title={<>This is not a pile. It is an order.</>}
        description="Assignments are grouped by what Grayson can do next: start, protect a due date, save proof, study, or park for later."
        actions={
          <Link href="/assignments/new" className="nexus-button nexus-button-primary nexus-tone-gold">
            Add assignment
            <FilePlus2 size={17} />
          </Link>
        }
        visual={<NexusArcadeScene />}
        tone="gold"
      />

      <div className="assignment-command-grid">
        <NexusPanel className="assignment-next-panel" tone="cyan">
          <NexusKicker>
            <Clock3 size={14} />
            Start now
          </NexusKicker>
          {next ? (
            <>
              <div className="assignment-next-title">
                <span>{next.classes?.name ?? "Class"}</span>
                <h2>{next.title}</h2>
                <p>
                  {next.due_at ? formatDueAt(next.due_at) : "No due date"} / {starterMinutes(next)} min start / {KIND_LABEL[next.kind]}
                </p>
              </div>
              <div className="assignment-why-strip" aria-label="Why this assignment is first">
                {[reasonLabel(next), "small visible start", "proof stays visible"].map((reason) => (
                  <span key={reason}>
                    <CheckCircle2 size={14} />
                    {reason}
                  </span>
                ))}
              </div>
              <div className="assignment-next-actions">
                <Link href={`/assignments/${next.id}?focus=next-step`} className="nexus-button nexus-button-primary">
                  Start {starterMinutes(next)} minutes
                  <ArrowRight size={17} />
                </Link>
                <Link href={`/assignments/${next.id}?focus=breakdown`} className="nexus-button nexus-button-secondary">
                  Break it down
                </Link>
              </div>
            </>
          ) : (
            <div className="assignment-next-title">
              <span>Setup</span>
              <h2>No open schoolwork.</h2>
              <p>Add one assignment or capture a teacher note when something new arrives.</p>
            </div>
          )}
        </NexusPanel>

        <NexusPanel className="assignment-metrics-panel" tone="purple">
          <NexusMetric label="Start now" value={next ? 1 : 0} detail="top move" tone="cyan" />
          <NexusMetric label="Due soon" value={dueSoonCount} detail="3-day window" tone="gold" />
          <NexusMetric label="Needs proof" value={proofCount} detail="receipt lane" tone="pink" />
        </NexusPanel>
      </div>

      <NexusPanel className="assignment-sort-panel" tone="blue">
        <NexusKicker>
          <SlidersHorizontal size={14} />
          Why this order
        </NexusKicker>
        <div className="assignment-sort-rules">
          <span>Due window</span>
          <span>Effort</span>
          <span>Energy fit</span>
          <span>Class priority</span>
          <span>Proof needed</span>
        </div>
      </NexusPanel>

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
