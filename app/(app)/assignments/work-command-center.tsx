import {
  Camera,
  CheckCircle2,
  ChevronRight,
  Mic,
} from "lucide-react";
import Link from "next/link";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import type {
  AssignmentKind,
  AssignmentStatus,
} from "@/lib/supabase/types";

export type WorkCommandItem = {
  id: string;
  title: string;
  className: string;
  classColor: string;
  dueAt: string | null;
  minutes: number;
  kind: AssignmentKind;
  status: AssignmentStatus;
  reasons: string[];
};

type WorkCommandCenterProps = {
  assignments: WorkCommandItem[];
  displayName?: string | null;
  photoUrl?: string | null;
  photoOffsetX?: number | null;
  photoOffsetY?: number | null;
  nowIso: string;
};

export function WorkCommandCenter({
  assignments,
  displayName,
  photoUrl,
  photoOffsetX,
  photoOffsetY,
  nowIso,
}: WorkCommandCenterProps) {
  const now = new Date(nowIso);
  const next = assignments[0] ?? null;
  const queue = assignments;

  return (
    <ScreenDesignViewport
      className="sd-capture-work-screen sd-mission-board"
      aria-label="Work command center"
    >
      <StudentDesktopNav
        active="Work"
        displayName={displayName}
        photoUrl={photoUrl}
        photoOffsetX={photoOffsetX}
        photoOffsetY={photoOffsetY}
      />

      <header className="sd-work-mobile-header">
        <div className="sd-work-mobile-bar">
          <DianaWordmark tight />
          <div className="sd-work-mobile-actions">
            <Link
              className="sd-work-mobile-capture"
              href="/quick-add"
              aria-label="Capture"
            >
              <Camera aria-hidden="true" />
            </Link>
            <Link
              className="sd-work-mobile-record"
              href="/voice"
              aria-label="Record"
            >
              <Mic aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="sd-work-mobile-heading">
          <strong>Work</strong>
          <p>
            <span>Next due</span>
            <b>{nextDeadline(assignments, now)}</b>
          </p>
        </div>
      </header>

      <main className="sd-work-main">
        {next ? (
          <>
            <header className="sd-work-page-heading">
              <h1>Work</h1>
            </header>

            <section
              className="sd-work-queue"
              aria-labelledby="work-queue-title"
            >
              <div className="sd-work-queue-heading">
                <h2 id="work-queue-title">Up next, in order</h2>
                <div aria-hidden="true" />
              </div>

              <div className="sd-work-queue-list">
                {queue.map((assignment, index) => (
                  <Link
                    key={assignment.id}
                    className="sd-work-queue-row"
                    href={workHref(assignment)}
                    data-priority={index === 0 ? "true" : undefined}
                    data-tone={chipTone(assignment, now)}
                  >
                    <span className="sd-work-rank" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span className="sd-work-queue-copy">
                      <small>{assignment.className}</small>
                      <strong>{assignment.title}</strong>
                    </span>
                    <span className="sd-work-queue-meta">
                      <small>
                        {index === 0
                          ? `${formatDeadline(assignment.dueAt, now)} / ${assignment.minutes} min`
                          : `${assignment.minutes} min`}
                      </small>
                      <em>
                        {queueChip(assignment, now, index === 0)}
                      </em>
                    </span>
                    <ChevronRight
                      className="sd-work-queue-chevron"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>

            </section>
          </>
        ) : (
          <section className="sd-work-empty" aria-labelledby="work-empty-title">
            <p className="sd-work-kicker">Your next move</p>
            <CheckCircle2 aria-hidden="true" />
            <h1 id="work-empty-title">Caught up.</h1>
            <p>Nothing needs your attention right now.</p>
            <Link href="/quick-add">Capture new work</Link>
          </section>
        )}

      </main>

      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

function nextDeadline(assignments: WorkCommandItem[], now: Date) {
  const nextDue = assignments.find((assignment) => assignment.dueAt)?.dueAt;
  return nextDue ? formatDeadline(nextDue, now) : "Schedule open";
}

function workHref(assignment: WorkCommandItem) {
  if (assignment.status === "exporting") {
    return `/assignments/${assignment.id}/submit`;
  }
  if (assignment.status === "checking") {
    return `/assignments/${assignment.id}/workspace`;
  }
  return assignment.kind === "test_prep"
    ? `/study-artifacts?source=assignment:${assignment.id}&type=practice_test`
    : `/assignments/${assignment.id}/workspace`;
}

function formatDeadline(value: string | null, now: Date) {
  if (!value) return "No due date";
  const due = new Date(value);
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const dayOffset = Math.round((dueDay.getTime() - today.getTime()) / dayMs);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: due.getMinutes() === 0 ? undefined : "2-digit",
  }).format(due);

  if (dayOffset < 0) return "Due date passed";
  if (dayOffset === 0) return `Due today ${time}`;
  if (dayOffset === 1) return `Due tomorrow ${time}`;
  if (dayOffset < 7) {
    return `Due ${new Intl.DateTimeFormat("en-US", {
      weekday: "short",
    }).format(due)}`;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(due);
}

function isDueSoon(value: string | null, now: Date) {
  if (!value) return false;
  const delta = new Date(value).getTime() - now.getTime();
  return delta <= 48 * 60 * 60 * 1000;
}

function queueChip(assignment: WorkCommandItem, now: Date, isFirst = false) {
  if (assignment.kind === "test_prep") return "Prepare";
  if (assignment.status === "checking" || assignment.status === "exporting") return "Turn in";
  if (assignment.status === "drafting") return "In progress";
  if (isFirst) return "Start";
  return formatDeadline(assignment.dueAt, now);
}

function chipTone(assignment: WorkCommandItem, now: Date) {
  if (assignment.status === "checking" || assignment.status === "exporting") return "proof";
  if (isDueSoon(assignment.dueAt, now)) return "soon";
  return "calm";
}
