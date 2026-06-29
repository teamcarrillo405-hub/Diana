import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  MessageSquareText,
  NotebookTabs,
  Radar,
  SlidersHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDueAt } from "@/lib/format";
import { ClassForm } from "./class-form";
import {
  NexusArcadeScene,
  NexusEmptyState,
  NexusKicker,
  NexusMetric,
  NexusPageHeader,
  NexusPageShell,
  NexusPanel,
} from "@/components/nexus/nexus-ui";

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

const tones = ["cyan", "pink", "gold", "blue", "purple"] as const;

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
    supabase
      .from("rubrics")
      .select("id, class_id, parse_status"),
    supabase
      .from("notes")
      .select("id, class_id")
      .not("class_id", "is", null),
  ]);

  const activeClasses = (classes ?? []) as ClassRow[];
  const assignmentRows = (assignments ?? []) as AssignmentRow[];
  const rubricRows = (rubrics ?? []) as RubricRow[];
  const noteRows = (notes ?? []) as NoteRow[];
  const openAssignments = assignmentRows.filter((row) => !["submitted", "graded", "abandoned"].includes(row.status));

  const lanes: ClassLane[] = activeClasses
    .map((classRow) => {
      const classAssignments = openAssignments
        .filter((assignment) => assignment.class_id === classRow.id)
        .sort((a, b) => dueMs(a.due_at) - dueMs(b.due_at));
      const classRubrics = rubricRows.filter((rubric) => rubric.class_id === classRow.id);
      const classNotes = noteRows.filter((note) => note.class_id === classRow.id);

      return {
        ...classRow,
        openAssignments: classAssignments,
        nextAssignment: classAssignments[0] ?? null,
        rubricCount: classRubrics.length,
        noteCount: classNotes.length,
        dueSoonCount: classAssignments.filter((assignment) => dueSoon(assignment, now)).length,
        loadScore: loadScore(classAssignments, classRubrics.length, classNotes.length, now),
        rulebrickLabel: rulebrickLabel(classRubrics, classNotes),
      };
    })
    .sort((a, b) => b.loadScore - a.loadScore || dueMs(a.nextAssignment?.due_at ?? null) - dueMs(b.nextAssignment?.due_at ?? null));

  const totalDueSoon = lanes.reduce((sum, lane) => sum + lane.dueSoonCount, 0);
  const withRulebricks = lanes.filter((lane) => lane.rubricCount > 0).length;
  const namedTeachers = lanes.filter((lane) => Boolean(lane.teacher)).length;

  return (
    <NexusPageShell className="classes-lane-page space-y-8">
      <NexusPageHeader
        eyebrow="Class lanes"
        title={<>Every subject gets a signal.</>}
        description="Classes are where teacher rules, homework, notes, rubrics, and proof become one lane instead of scattered school stuff."
        visual={<NexusArcadeScene />}
        tone="blue"
      />

      <div className="class-command-grid">
        <NexusPanel className="class-metrics-panel" tone="purple">
          <NexusMetric label="Active" value={activeClasses.length} detail="class lanes" tone="cyan" />
          <NexusMetric label="Due soon" value={totalDueSoon} detail="3-day window" tone="gold" />
          <NexusMetric label="Rulebricks" value={withRulebricks} detail="teacher rules" tone="pink" />
          <NexusMetric label="Teachers" value={namedTeachers} detail="named contacts" tone="blue" />
        </NexusPanel>

        {lanes[0] ? <ClassFocusPanel lane={lanes[0]} /> : null}
      </div>

      {lanes.length === 0 ? (
        <NexusEmptyState eyebrow="No lanes yet" title="Add the first class.">
          <p>Once a class exists, Diana can connect assignments, rubrics, notes, and proof to the right subject.</p>
        </NexusEmptyState>
      ) : (
        <section className="class-lane-grid" aria-label="Class signal lanes">
          {lanes.map((lane, index) => (
            <ClassLaneCard key={lane.id} lane={lane} tone={tones[index % tones.length]} />
          ))}
        </section>
      )}

      <NexusPanel className="class-add-panel class-add-panel-secondary" tone="cyan">
        <NexusKicker>
          <BookOpen size={14} />
          Add a class
        </NexusKicker>
        <ClassForm />
      </NexusPanel>
    </NexusPageShell>
  );
}

function ClassFocusPanel({ lane }: { lane: ClassLane }) {
  return (
    <NexusPanel className="class-focus-panel" tone="cyan">
      <NexusKicker>
        <SlidersHorizontal size={14} />
        Highest signal
      </NexusKicker>
      <div className="class-focus-main">
        <div>
          <span>{lane.loadScore} signal</span>
          <h2>{lane.name}</h2>
          <p>{lane.teacher ?? "Teacher contact can be added later"}</p>
        </div>
        <Link href={`/classes/${lane.id}`} className="class-focus-action">
          Open lane
          <ArrowRight size={15} />
        </Link>
      </div>
      <div className="class-focus-next">
        <span>
          <Radar size={13} />
          Next move
        </span>
        <strong>{lane.nextAssignment?.title ?? "This lane is clear"}</strong>
        <small>{lane.nextAssignment?.due_at ? formatDueAt(lane.nextAssignment.due_at) : "Ready when something arrives"}</small>
      </div>
    </NexusPanel>
  );
}

function ClassLaneCard({
  lane,
  tone,
}: {
  lane: ClassLane;
  tone: (typeof tones)[number];
}) {
  const colorStyle = lane.color ? ({ "--class-color": lane.color } as CSSProperties) : undefined;

  return (
    <Link href={`/classes/${lane.id}`} className="class-lane-card" data-tone={tone} style={colorStyle}>
      <div className="class-lane-top">
        <span className="class-lane-subject">
          <Layers3 size={14} />
          {lane.name}
        </span>
        <span className="class-lane-score">
          <b>{lane.loadScore}</b>
          signal
        </span>
      </div>

      <div className="class-lane-main">
        <h2>{lane.name}</h2>
        <p>{lane.teacher ?? "Add teacher contact"}</p>
      </div>

      <div className="class-lane-bars" aria-label={`${lane.name} class signal bars`}>
        <SignalBar label="work" value={Math.min(96, 28 + lane.openAssignments.length * 14)} />
        <SignalBar label="due" value={Math.min(96, 20 + lane.dueSoonCount * 28)} />
        <SignalBar label="rules" value={Math.min(96, 22 + lane.rubricCount * 38 + lane.noteCount * 4)} />
      </div>

      <div className="class-lane-next">
        <span>
          <Radar size={14} />
          Next in lane
        </span>
        <strong>{lane.nextAssignment?.title ?? "No open schoolwork"}</strong>
        <small>{lane.nextAssignment?.due_at ? formatDueAt(lane.nextAssignment.due_at) : "Ready when something arrives"}</small>
      </div>

      <div className="class-lane-footer">
        <span>
          <ClipboardCheck size={13} />
          {lane.rulebrickLabel}
        </span>
        <span>
          <NotebookTabs size={13} />
          {lane.noteCount} notes
        </span>
        <span>
          <MessageSquareText size={13} />
          {lane.teacher ? "contact saved" : "add contact"}
        </span>
        <span className="class-lane-open">
          Open lane
          <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}

function SignalBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(6, Math.min(100, Math.round(value)));
  return (
    <span className="class-signal-bar">
      <span>{label}</span>
      <i>
        <b style={{ width: `${clamped}%` }} />
      </i>
      <em>{clamped}</em>
    </span>
  );
}
