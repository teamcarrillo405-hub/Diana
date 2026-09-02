import {
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
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

type AssignmentGroup = {
  id: "today" | "week" | "later";
  label: string;
  items: WorkCommandItem[];
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
  const groups = groupAssignments(assignments.slice(1), now);
  const overview = getOverview(assignments);

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
          <Link href="/dashboard" aria-label="Diana home">
            <DianaWordmark tight tone="dark" />
          </Link>
          <div className="sd-work-mobile-actions">
            <Link
              className="sd-work-mobile-capture"
              href="/quick-add"
              aria-label="Add assignment"
            >
              <Camera aria-hidden="true" />
              <span>Add</span>
            </Link>
            <Link
              className="sd-work-mobile-record"
              href="/notes/new?mode=voice"
              aria-label="Capture a note by voice"
            >
              <Mic aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="sd-work-main" tabIndex={-1}>
        {next ? (
          <div className="sd-work-hub">
            <header className="sd-work-page-heading">
              <h1>WORK</h1>
            </header>

            <section className="sd-work-feature" aria-labelledby="work-now-title">
              <div className="sd-work-feature-copy">
                <p className="sd-work-feature-course">{next.className}</p>
                <h2 id="work-now-title" title={next.title}>
                  {displayAssignmentTitle(next.title)}
                </h2>
                <p className="sd-work-feature-context">
                  <Clock3 aria-hidden="true" />
                  <span>{formatFeaturedDeadline(next.dueAt, now)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{next.minutes} min</span>
                </p>
              </div>
              <Link
                className="sd-work-feature-action"
                href={workHref(next)}
                aria-label={`${primaryActionLabel(next)} ${next.title}`}
              >
                <span>{primaryActionLabel(next)}</span>
                <ChevronRight aria-hidden="true" />
              </Link>
            </section>

            <div className="sd-work-content-grid">
              {groups.length ? (
                <section className="sd-work-queue" aria-labelledby="work-queue-title">
                  <div className="sd-work-queue-heading">
                    <h2 id="work-queue-title">Your assignments</h2>
                  </div>

                  {groups.map((group) => (
                    <AssignmentGroupSection key={group.id} group={group} now={now} />
                  ))}
                </section>
              ) : (
                <section className="sd-work-clear-queue" aria-labelledby="work-clear-title">
                  <p>Queue clear</p>
                  <h2 id="work-clear-title">This is the only assignment waiting for you.</h2>
                  <span>Open it when you are ready.</span>
                </section>
              )}

              <aside className="sd-work-overview" aria-labelledby="work-overview-title">
                <p id="work-overview-title">At a glance</p>
                <dl>
                  <div>
                    <dt>In progress</dt>
                    <dd>{overview.inProgress}</dd>
                  </div>
                  <div>
                    <dt>Ready to turn in</dt>
                    <dd>{overview.readyToTurnIn}</dd>
                  </div>
                  <div>
                    <dt>Coming up</dt>
                    <dd>{overview.comingUp}</dd>
                  </div>
                </dl>
                <Link href="/quick-add">Add assignment</Link>
              </aside>
            </div>
          </div>
        ) : (
          <section className="sd-work-empty" aria-labelledby="work-empty-title">
            <CheckCircle2 aria-hidden="true" />
            <h1 id="work-empty-title">Caught up.</h1>
            <p>Nothing needs your attention right now.</p>
            <Link href="/quick-add">Add assignment</Link>
          </section>
        )}
      </main>

      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

function AssignmentGroupSection({ group, now }: { group: AssignmentGroup; now: Date }) {
  const visibleItems = group.items.slice(0, 5);
  const remainingItems = group.items.slice(5);

  return (
    <section className="sd-work-assignment-group" aria-labelledby={`work-group-${group.id}`}>
      <h3 id={`work-group-${group.id}`}>{group.label}</h3>
      <div className="sd-work-queue-list">
        {visibleItems.map((assignment) => (
          <AssignmentRow key={assignment.id} assignment={assignment} now={now} />
        ))}
      </div>
      {remainingItems.length ? (
        <details className="sd-work-more-assignments">
          <summary>Show {remainingItems.length} more</summary>
          <div className="sd-work-queue-list">
            {remainingItems.map((assignment) => (
              <AssignmentRow key={assignment.id} assignment={assignment} now={now} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function AssignmentRow({ assignment, now }: { assignment: WorkCommandItem; now: Date }) {
  const state = assignmentState(assignment, now);
  const displayTitle = displayAssignmentTitle(assignment.title);

  return (
    <Link
      className="sd-work-queue-row"
      href={workHref(assignment)}
      data-tone={state.tone}
      aria-label={`${displayTitle}, ${assignment.className}, ${state.label}`}
    >
      <span className="sd-work-queue-course">{assignment.className}</span>
      <span className="sd-work-queue-copy">
        <strong title={assignment.title}>{displayTitle}</strong>
        <small>{state.label}</small>
      </span>
      <span className="sd-work-queue-duration">{assignment.minutes} min</span>
      <ChevronRight className="sd-work-queue-chevron" aria-hidden="true" />
    </Link>
  );
}

function groupAssignments(assignments: WorkCommandItem[], now: Date): AssignmentGroup[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() + 7);
  const groups: Record<AssignmentGroup["id"], WorkCommandItem[]> = {
    today: [],
    week: [],
    later: [],
  };

  for (const assignment of assignments) {
    if (!assignment.dueAt) {
      groups.later.push(assignment);
      continue;
    }

    const due = new Date(assignment.dueAt);
    if (due < startOfWeek) {
      groups.today.push(assignment);
    } else if (due < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      groups.week.push(assignment);
    } else {
      groups.later.push(assignment);
    }
  }

  return ([
    { id: "today", label: "Today", items: groups.today },
    { id: "week", label: "This week", items: groups.week },
    { id: "later", label: "Later", items: groups.later },
  ] satisfies AssignmentGroup[]).filter(
    (group): group is AssignmentGroup => group.items.length > 0,
  );
}

function getOverview(assignments: WorkCommandItem[]) {
  return {
    inProgress: assignments.filter((assignment) => assignment.status === "drafting").length,
    readyToTurnIn: assignments.filter(
      (assignment) => assignment.status === "checking" || assignment.status === "exporting",
    ).length,
    comingUp: assignments.filter((assignment) => assignment.status === "todo").length,
  };
}

function workHref(assignment: WorkCommandItem) {
  if (assignment.status === "exporting") {
    return `/assignments/${assignment.id}/submit`;
  }
  return `/assignments/${assignment.id}/workspace`;
}

function primaryActionLabel(assignment: WorkCommandItem) {
  if (assignment.status === "exporting") return "Review submission";
  if (assignment.status === "drafting") return "Continue";
  if (assignment.status === "checking") return "Open";
  if (assignment.kind === "test_prep") return "Practice";
  return "Start";
}

function assignmentState(assignment: WorkCommandItem, now: Date) {
  if (assignment.status === "checking" || assignment.status === "exporting") {
    return { label: "Ready to turn in", tone: "ready" };
  }
  if (assignment.status === "drafting") {
    return { label: "In progress", tone: "working" };
  }
  if (assignment.kind === "test_prep") {
    return { label: "Practice", tone: "neutral" };
  }
  return { label: formatDeadline(assignment.dueAt, now), tone: deadlineTone(assignment.dueAt, now) };
}

const assignmentQuestionSuffixPattern = new RegExp(
  String.raw`\s*(?:` +
    ["-", ":", String.raw`\|`].join("|") +
    String.raw`)?\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+questions?\s*$`,
  "iu",
);

function displayAssignmentTitle(title: string) {
  return title.replace(assignmentQuestionSuffixPattern, "").trim();
}

function formatFeaturedDeadline(value: string | null, now: Date) {
  const formatted = formatDeadline(value, now);
  return formatted === "No due date" ? "Schedule open" : formatted;
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

  if (dayOffset < 0) return "Late";
  if (dayOffset === 0) return `Due today ${time}`;
  if (dayOffset === 1) return `Due tomorrow ${time}`;
  if (dayOffset < 7) {
    return `Due ${new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(due)}`;
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(due);
}

function deadlineTone(value: string | null, now: Date) {
  if (!value) return "neutral";
  const due = new Date(value).getTime();
  if (due < now.getTime()) return "late";
  if (due <= now.getTime() + 48 * 60 * 60 * 1000) return "soon";
  return "neutral";
}
