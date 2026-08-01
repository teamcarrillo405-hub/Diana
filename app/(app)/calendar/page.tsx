import Link from "next/link";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Settings2 } from "lucide-react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { adjustForUser, type Assignment } from "@/lib/scoring/next-five-minutes";
import { createClient } from "@/lib/supabase/server";

type CalendarAssignment = Assignment & {
  external_source: string | null;
  external_url: string | null;
};

type PageProps = {
  searchParams: Promise<{ day?: string; month?: string; view?: string; week?: string }>;
};

type CalendarView = "month" | "week" | "day";

const safeView = (value: string | undefined): CalendarView =>
  value === "week" || value === "day" ? value : "month";

const calendarTone = (assignment: CalendarAssignment): "blue" | "gold" | "pink" => {
  const label = (assignment.kind + " " + assignment.title).toLowerCase();
  if (label.includes("exam") || label.includes("ap ")) return "gold";
  if (label.includes("reminder")) return "pink";
  return "blue";
};

const safeMonth = (value: string | undefined): Date | null => {
  if (!value || !/^\d{4}-\d{2}$/u.test(value)) return null;
  const parsed = parseISO(`${value}-01T12:00:00.000Z`);
  return isValid(parsed) ? parsed : null;
};

export default async function StudyCalendarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let assignments: CalendarAssignment[] = [];
  let profile = { diagnoses: [] as string[], extra_time_pct: 0 };
  let navProfile: {
    displayName?: string | null;
    photoUrl?: string | null;
    photoOffsetX?: number | null;
    photoOffsetY?: number | null;
  } = {};
  if (user) {
    const [{ data: assignmentRows }, { data: profileRow }] = await Promise.all([
      supabase
        .from("assignments")
        .select("id, title, due_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load, external_source, external_url")
        .eq("owner_id", user.id)
        .not("status", "in", "(submitted,graded,abandoned)")
        .not("due_at", "is", null)
        .order("due_at", { ascending: true })
        .limit(100),
      supabase
        .from("profiles")
        .select("diagnoses, extra_time_pct, display_name, photo_url, photo_offset_x, photo_offset_y")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    assignments = (assignmentRows ?? []) as CalendarAssignment[];
    if (profileRow) {
      profile = {
        diagnoses: (profileRow.diagnoses as string[] | null) ?? [],
        extra_time_pct: profileRow.extra_time_pct ?? 0,
      };
      navProfile = {
        displayName: profileRow.display_name,
        photoUrl: profileRow.photo_url,
        photoOffsetX: profileRow.photo_offset_x,
        photoOffsetY: profileRow.photo_offset_y,
      };
    }
  }

  const explicitMonth = safeMonth(params.month ?? (params.week ? params.week.slice(0, 7) : undefined));
  const nextScheduledDate = assignments.find((assignment) => assignment.due_at)?.due_at;
  const anchor = explicitMonth ?? (nextScheduledDate ? parseISO(nextScheduledDate) : new Date());
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const monthKey = format(monthStart, "yyyy-MM");

  const byDay = new Map<string, CalendarAssignment[]>();
  for (const day of days) byDay.set(format(day, "yyyy-MM-dd"), []);
  for (const assignment of assignments) {
    if (!assignment.due_at) continue;
    const key = format(parseISO(assignment.due_at), "yyyy-MM-dd");
    byDay.get(key)?.push(assignment);
  }

  const firstPopulatedDay = days.find((day) => (byDay.get(format(day, "yyyy-MM-dd"))?.length ?? 0) > 0);
  const selectedKey = /^\d{4}-\d{2}-\d{2}$/u.test(params.day ?? "")
    ? params.day!
    : format(firstPopulatedDay ?? monthStart, "yyyy-MM-dd");
  const selectedAssignments = byDay.get(selectedKey) ?? [];
  const monthAssignments = assignments.filter((assignment) =>
    assignment.due_at ? isSameMonth(parseISO(assignment.due_at), monthStart) : false,
  );
  const upcoming = selectedAssignments.length > 0 ? selectedAssignments : monthAssignments.slice(0, 4);
  const view = safeView(params.view);
  const selectedDate = parseISO(selectedKey + "T12:00:00.000Z");
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
  });
  const previousPeriod =
    view === "month"
      ? subMonths(monthStart, 1)
      : subDays(selectedDate, view === "week" ? 7 : 1);
  const nextPeriod =
    view === "month"
      ? addMonths(monthStart, 1)
      : addDays(selectedDate, view === "week" ? 7 : 1);
  const periodHref = (date: Date) =>
    "/calendar?view=" +
    view +
    "&month=" +
    format(date, "yyyy-MM") +
    "&day=" +
    format(date, "yyyy-MM-dd");
  const today = new Date();
  const headerLabel =
    view === "month"
      ? format(monthStart, "MMMM yyyy")
      : view === "week"
        ? format(weekStart, "MMM d") + " - " + format(weekDays[6], "MMM d, yyyy")
        : format(selectedDate, "EEEE, MMMM d");

  return (
    <ScreenDesignViewport className="sd-study-calendar" data-view={view}>
      <StudentDesktopNav active="Calendar" {...navProfile} />
      <header className="sd-calendar-header">
        <div className="sd-calendar-title-row">
          <div className="sd-calendar-mobile-identity">
            <DianaWordmark alt="Diana" />
            <h1>Study<br /><span>Calendar</span></h1>
          </div>
          <h1 className="sd-calendar-desktop-heading">{headerLabel}</h1>
          <Link className="sd-calendar-mobile-settings" href="/settings" aria-label="Calendar settings">
            <Settings2 aria-hidden="true" />
          </Link>
          <div className="sd-calendar-desktop-controls">
            <Link className="sd-calendar-add-event" href="/quick-add">
              <Plus aria-hidden="true" />
              Add event
            </Link>
            <nav className="sd-calendar-view-tabs" aria-label="Calendar view">
              {(["month", "week", "day"] as const).map((tab) => (
                <Link
                  key={tab}
                  href={"/calendar?view=" + tab + "&month=" + monthKey + "&day=" + selectedKey}
                  aria-current={view === tab ? "page" : undefined}
                >
                  {tab}
                </Link>
              ))}
            </nav>
            <Link
              className="sd-calendar-today"
              href={"/calendar?view=" + view + "&month=" + format(today, "yyyy-MM") + "&day=" + format(today, "yyyy-MM-dd")}
            >
              Today
            </Link>
            <div className="sd-calendar-period-controls">
              <Link href={periodHref(previousPeriod)} aria-label="Previous period">
                <ChevronLeft aria-hidden="true" />
              </Link>
              <Link href={periodHref(nextPeriod)} aria-label="Next period">
                <ChevronRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
        <nav className="sd-calendar-mobile-month-nav" aria-label="Calendar month">
          <Link href={"/calendar?month=" + format(subMonths(monthStart, 1), "yyyy-MM")} aria-label="Previous month"><ChevronLeft aria-hidden="true" /></Link>
          <strong>{format(monthStart, "MMMM yyyy")}</strong>
          <Link href={"/calendar?month=" + format(addMonths(monthStart, 1), "yyyy-MM")} aria-label="Next month"><ChevronRight aria-hidden="true" /></Link>
        </nav>
      </header>

      <main className="sd-calendar-scroll">
        <div className="sd-calendar-legend" aria-label="Calendar legend">
          <span data-tone="blue"><i aria-hidden="true" />Scheduled</span>
          <span data-tone="gold"><i aria-hidden="true" />AP exam</span>
          <span data-tone="pink"><i aria-hidden="true" />Reminder</span>
        </div>

        <section
          className="sd-calendar-month"
          aria-label={format(monthStart, "MMMM yyyy")}
          data-desktop-hidden={view !== "month" || undefined}
        >
          <div className="sd-calendar-weekdays" aria-hidden="true">
            {[
              ["S", "Sun"], ["M", "Mon"], ["T", "Tue"], ["W", "Wed"],
              ["T", "Thu"], ["F", "Fri"], ["S", "Sat"],
            ].map(([shortLabel, longLabel]) => (
              <span key={longLabel}>
                <b className="sd-calendar-weekday-mobile">{shortLabel}</b>
                <b className="sd-calendar-weekday-desktop">{longLabel}</b>
              </span>
            ))}
          </div>
          <div className="sd-calendar-days">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = byDay.get(key) ?? [];
              const totalMinutes = items.reduce(
                (sum, assignment) => sum + (adjustForUser(assignment, profile) ?? 0),
                0,
              );
              return (
                <Link
                  key={key}
                  href={"/calendar?view=month&month=" + monthKey + "&day=" + key}
                  aria-label={
                    format(day, "MMMM d") +
                    (items.length
                      ? ", " + items.length + " item" + (items.length === 1 ? "" : "s") + ", " + totalMinutes + " minutes"
                      : ", no scheduled work")
                  }
                  data-selected={key === selectedKey || undefined}
                  data-outside={!isSameMonth(day, monthStart) || undefined}
                  data-has-items={items.length > 0 || undefined}
                >
                  <span className="sd-calendar-day-number">{format(day, "d")}</span>
                  <span className="sd-calendar-cell-items">
                    {items.slice(0, 2).map((assignment) => (
                      <span key={assignment.id} data-tone={calendarTone(assignment)}>
                        <i aria-hidden="true" />
                        <b>{assignment.title}</b>
                      </span>
                    ))}
                    {items.length > 2 ? <em>+{items.length - 2} more</em> : null}
                  </span>
                  {items.length > 0 ? (
                    <i className="sd-calendar-day-dots" aria-hidden="true" data-count={Math.min(items.length, 2)} />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>

        {view === "week" ? (
          <section className="sd-calendar-week" aria-label={headerLabel}>
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = byDay.get(key) ?? [];
              return (
                <article key={key}>
                  <Link
                    className="sd-calendar-week-heading"
                    href={"/calendar?view=day&month=" + format(day, "yyyy-MM") + "&day=" + key}
                    data-selected={key === selectedKey || undefined}
                  >
                    <span>{format(day, "EEE")}</span>
                    <strong>{format(day, "d")}</strong>
                  </Link>
                  <div>
                    {items.map((assignment) => (
                      <Link
                        key={assignment.id}
                        href={"/assignments/" + assignment.id}
                        data-tone={calendarTone(assignment)}
                      >
                        <small>{assignment.due_at ? format(parseISO(assignment.due_at), "h:mm a") : "Time open"}</small>
                        <strong>{assignment.title}</strong>
                        <span>{calendarTone(assignment) === "gold" ? "AP exam" : assignment.kind}</span>
                      </Link>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}

        {view === "day" ? (
          <section className="sd-calendar-day" aria-label={headerLabel}>
            {selectedAssignments.length ? selectedAssignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={"/assignments/" + assignment.id}
                data-tone={calendarTone(assignment)}
              >
                <time>{assignment.due_at ? format(parseISO(assignment.due_at), "h:mm a") : "Time open"}</time>
                <div>
                  <strong>{assignment.title}</strong>
                  <span>{calendarTone(assignment) === "gold" ? "AP exam" : assignment.kind}</span>
                </div>
              </Link>
            )) : (
              <p>Nothing scheduled. Add an event when you need one.</p>
            )}
          </section>
        ) : null}

        <section className="sd-calendar-events">
          <h2>{upcoming.length ? "Upcoming events" : "Selected day"}</h2>
          <div>
            {upcoming.length ? upcoming.map((assignment, index) => {
              const effectiveMinutes = adjustForUser(assignment, profile) ?? assignment.estimated_minutes ?? 0;
              return (
                <Link key={assignment.id} href={"/assignments/" + assignment.id} aria-label={index === 0 ? "Open calendar item" : "Open " + assignment.title} data-tone={index % 2 === 0 ? "pink" : "blue"}>
                  <div>
                    <h3>{assignment.title}</h3>
                    <p>{assignment.external_source ? assignment.external_source + " import" : assignment.kind} / {assignment.due_at ? format(parseISO(assignment.due_at), "h:mm a") : "Time open"}</p>
                  </div>
                  <strong>{effectiveMinutes ? effectiveMinutes + " min" : "Open"}</strong>
                </Link>
              );
            }) : (
              <p>No scheduled work for {format(selectedDate, "MMMM d")}. Choose another day whenever you&apos;re ready.</p>
            )}
          </div>
        </section>
      </main>

      <Link className="sd-calendar-quick-add" href="/quick-add" aria-label="Quick capture"><Plus aria-hidden="true" /></Link>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}
