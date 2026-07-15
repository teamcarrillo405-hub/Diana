import {
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  FileUp,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { loadProfile } from "@/lib/profile";
import { rankAssignments } from "@/lib/scoring/next-five-minutes";
import { STATUS_LABEL } from "@/lib/state-machine/assignment";
import { createClient } from "@/lib/supabase/server";
import type { AssignmentKind, AssignmentStatus } from "@/lib/supabase/types";

type AssignmentRow = {
  id: string;
  title: string;
  due_at: string | null;
  status: AssignmentStatus;
  estimated_minutes: number | null;
  difficulty: number | null;
  class_id: string;
  kind: AssignmentKind;
  reading_load: number;
  writing_load: number;
  classes: { name: string; color: string | null } | null;
};

type RankedAssignment = AssignmentRow & {
  score: number;
  reasons: string[];
  effective_minutes: number | null;
};

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadProfile();
  const fixedNow = new Date();
  const fourHoursAgoIso = new Date(fixedNow.getTime() - 4 * 60 * 60 * 1000).toISOString();
  const [{ data: assignments }, { data: signals }, { count: inboxCount }] = await Promise.all([
    supabase
      .from("assignments")
      .select(
        "id, title, due_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load, classes(name, color)",
      )
      .eq("owner_id", user.id)
      .neq("status", "abandoned")
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("task_signals")
      .select("assignment_id, occurred_at")
      .eq("owner_id", user.id)
      .in("kind", ["started", "completed"])
      .gte("occurred_at", fourHoursAgoIso)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("inbox_items")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .in("status", ["unclassified", "classified"]),
  ]);

  const rows = (assignments ?? []) as AssignmentRow[];
  const recentSignals = (signals ?? []).filter(
    (signal): signal is { assignment_id: string; occurred_at: string } =>
      signal.assignment_id !== null,
  );
  const ranked = rankAssignments(
    rows,
    recentSignals,
    fixedNow,
    "medium",
    {
      diagnoses: profile?.diagnoses ?? [],
      extra_time_pct: profile?.extra_time_pct ?? 0,
    },
  ) as RankedAssignment[];
  const focusTasks = ranked.filter(
    (assignment) => !["submitted", "graded"].includes(assignment.status),
  );
  const nextDeadline = focusTasks.find((assignment) => assignment.due_at)?.due_at ?? null;

  return (
    <ScreenDesignViewport className="sd-capture-work-screen sd-mission-board">
      <header className="sd-mission-header">
        <div>
          <DianaWordmark />
          <Link href="/search" aria-label="Search assignments">
            <Search aria-hidden="true" />
          </Link>
        </div>
        <div className="sd-mission-heading-row">
          <h1>
            Work
            <span>Board</span>
          </h1>
          <p>
            <span>Next deadline</span>
            <strong>{nextDeadline ? deadlineLabel(nextDeadline) : "Schedule open"}</strong>
          </p>
        </div>
      </header>

      <main className="sd-mission-scroll">
        <section className="sd-mission-section" aria-labelledby="focus-tasks-heading">
          <h2 id="focus-tasks-heading" data-tone="pink">Focus tasks</h2>
          <div className="sd-mission-task-list">
            {focusTasks.length > 0 ? (
              focusTasks.slice(0, 4).map((assignment, index) => (
                <Link
                  key={assignment.id}
                  href={`/assignments/${assignment.id}`}
                  className="sd-mission-task"
                  data-priority={index === 0 || undefined}
                  aria-label="Open assignment"
                >
                  <span className="sd-mission-task-copy">
                    <strong>{assignment.title}</strong>
                    <small>
                      {assignment.classes?.name ?? "Class"} · {workMinutes(assignment)}m · {STATUS_LABEL[assignment.status]}
                    </small>
                  </span>
                  {index === 0 ? <em>Priority</em> : null}
                  <span className="sd-mission-start">Start task</span>
                </Link>
              ))
            ) : (
              <div className="sd-mission-empty">
                <CheckCircle2 aria-hidden="true" />
                <strong>Your work board is clear.</strong>
                <span>Capture something when new schoolwork arrives.</span>
              </div>
            )}
          </div>
        </section>

        <section className="sd-mission-section" aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" data-tone="blue">Quick actions</h2>
          <div className="sd-mission-quick-list">
            <Link href="/inbox">
              <span><CalendarCheck2 aria-hidden="true" /></span>
              <strong>Review scouts</strong>
              <small>{inboxCount ?? 0} waiting · Logistics</small>
              <ChevronRight aria-hidden="true" />
            </Link>
            <Link href="/assignments/new">
              <span><FileUp aria-hidden="true" /></span>
              <strong>Add assignment</strong>
              <small>Manual entry · Work</small>
              <ChevronRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Link className="sd-mission-capture" href="/quick-add" aria-label="Quick add">
        <Plus aria-hidden="true" />
      </Link>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

function workMinutes(assignment: RankedAssignment) {
  return Math.max(
    5,
    Math.round(assignment.effective_minutes ?? assignment.estimated_minutes ?? 10),
  );
}

function deadlineLabel(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  })
    .format(date)
    .toUpperCase();
}
