import Link from "next/link";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Settings2 } from "lucide-react";
import type { CSSProperties } from "react";

import { CalendarGoogleSync } from "./calendar-google-sync";
import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { adjustForUser, type Assignment } from "@/lib/scoring/next-five-minutes";
import { buildDaySchedule } from "@/lib/calendar/schedule";
import { createClient } from "@/lib/supabase/server";

type CalendarAssignment = Assignment & {
  external_source: string | null;
  external_url: string | null;
};

type GoogleCalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  html_link: string | null;
};

type CalendarEntry =
  | { source: "assignment"; assignment: CalendarAssignment }
  | { source: "google"; event: GoogleCalendarEvent };

type ScheduleCalendarEntry = {
  entry: CalendarEntry;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
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

const entryStart = (entry: CalendarEntry) =>
  entry.source === "assignment" ? entry.assignment.due_at! : entry.event.starts_at;

const entryEnd = (entry: CalendarEntry) =>
  entry.source === "google" ? entry.event.ends_at : null;

const entryIsAllDay = (entry: CalendarEntry) =>
  entry.source === "google" && entry.event.all_day;

const entryTitle = (entry: CalendarEntry) =>
  entry.source === "assignment" ? entry.assignment.title : entry.event.title;

const entryKey = (entry: CalendarEntry) =>
  entry.source === "assignment" ? `assignment-${entry.assignment.id}` : `google-${entry.event.id}`;

const entryTone = (entry: CalendarEntry): "blue" | "gold" | "pink" | "google" =>
  entry.source === "assignment" ? calendarTone(entry.assignment) : "google";

const safeMonth = (value: string | undefined): Date | null => {
  if (!value || !/^\d{4}-\d{2}$/u.test(value)) return null;
  const parsed = parseISO(`${value}-01T12:00:00.000Z`);
  return isValid(parsed) ? parsed : null;
};

const timelineHours = Array.from({ length: 24 }, (_, hour) => hour);
const timelineHourHeight = 64;

export default async function StudyCalendarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let assignments: CalendarAssignment[] = [];
  let googleEvents: GoogleCalendarEvent[] = [];
  let googleCalendarConnected = false;
  let profile = { diagnoses: [] as string[], extra_time_pct: 0 };
  let navProfile: {
    displayName?: string | null;
    photoUrl?: string | null;
    photoOffsetX?: number | null;
    photoOffsetY?: number | null;
  } = {};
  if (user) {
    const [{ data: assignmentRows }, { data: profileRow }, { data: calendarRows }, { data: googleConnection }] = await Promise.all([
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
      (supabase as any)
        .from("calendar_events")
        .select("id, title, starts_at, ends_at, all_day, html_link")
        .eq("owner_id", user.id)
        .order("starts_at", { ascending: true })
        .limit(250),
      supabase
        .from("lms_connections")
        .select("config")
        .eq("owner_id", user.id)
        .eq("provider", "google_classroom")
        .maybeSingle(),
    ]);
    assignments = (assignmentRows ?? []) as CalendarAssignment[];
    googleEvents = (calendarRows ?? []) as GoogleCalendarEvent[];
    googleCalendarConnected = (googleConnection?.config as { calendar_enabled?: boolean } | null)?.calendar_enabled === true;
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

  const allEntries: CalendarEntry[] = [
    ...assignments
      .filter((assignment) => Boolean(assignment.due_at))
      .map((assignment) => ({ source: "assignment" as const, assignment })),
    ...googleEvents.map((event) => ({ source: "google" as const, event })),
  ].sort((left, right) => parseISO(entryStart(left)).getTime() - parseISO(entryStart(right)).getTime());

  const entriesForDay = (day: Date) =>
    allEntries.filter((entry) => isSameDay(parseISO(entryStart(entry)), day));

  const scheduleEntries: ScheduleCalendarEntry[] = allEntries.map((entry) => ({
    entry,
    startsAt: entryStart(entry),
    endsAt: entryEnd(entry),
    allDay: entryIsAllDay(entry),
  }));

  const scheduleForDay = (day: Date) => buildDaySchedule(scheduleEntries, day);

  const byDay = new Map<string, CalendarEntry[]>();
  for (const day of days) byDay.set(format(day, "yyyy-MM-dd"), entriesForDay(day));

  const firstPopulatedDay = days.find((day) => (byDay.get(format(day, "yyyy-MM-dd"))?.length ?? 0) > 0);
  const selectedKey = /^\d{4}-\d{2}-\d{2}$/u.test(params.day ?? "")
    ? params.day!
    : format(firstPopulatedDay ?? monthStart, "yyyy-MM-dd");
  const selectedEntries = entriesForDay(parseISO(selectedKey + "T12:00:00.000Z"));
  const monthEntries = Array.from(byDay.values()).flat();
  const upcoming = selectedEntries.length > 0 ? selectedEntries : monthEntries.slice(0, 4);
  const view = safeView(params.view);
  const selectedDate = parseISO(selectedKey + "T12:00:00.000Z");
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
  });
  const previousPeriod = view === "month"
    ? subMonths(monthStart, 1)
    : subDays(selectedDate, view === "week" ? 7 : 1);
  const nextPeriod = view === "month"
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
  const headerLabel = view === "month"
    ? format(monthStart, "MMMM yyyy")
    : view === "week"
      ? format(weekStart, "MMM d") + " - " + format(weekDays[6], "MMM d, yyyy")
      : format(selectedDate, "EEEE, MMMM d, yyyy");

  return (
    <ScreenDesignViewport className="sd-study-calendar diana-current-page" data-view={view}>
      <StudentDesktopNav active="Calendar" {...navProfile} />
      <div className="sd-calendar-frame">
        <span className="sd-calendar-frame-notch sd-calendar-frame-notch--top" aria-hidden="true" />
        <span className="sd-calendar-frame-notch sd-calendar-frame-notch--bottom" aria-hidden="true" />
        <header className="sd-calendar-header">
        <div className="sd-calendar-title-row">
          <div className="sd-calendar-mobile-identity">
            <DianaWordmark alt="Diana" tone="dark" />
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
              {(["month", "week"] as const).map((tab) => (
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
              href={"/calendar?view=day&month=" + format(today, "yyyy-MM") + "&day=" + format(today, "yyyy-MM-dd")}
              aria-current={view === "day" && isSameDay(selectedDate, today) ? "page" : undefined}
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

        <main className="sd-calendar-scroll" id="calendar-main">
        <div className="sd-calendar-layout">
          <div className="sd-calendar-primary">
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
                (sum, item) => sum + (item.source === "assignment" ? (adjustForUser(item.assignment, profile) ?? 0) : 0),
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
                    {items.slice(0, 2).map((item) => (
                      <span key={entryKey(item)} data-tone={entryTone(item)}>
                        <i aria-hidden="true" />
                        <b>{entryTitle(item)}</b>
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

            {view !== "month" ? (
              <section className="sd-calendar-schedule" aria-label={headerLabel} data-view={view}>
                <div className="sd-calendar-schedule-scroll" tabIndex={0} aria-label={view === "week" ? "Weekly hourly schedule" : "Today hourly schedule"}>
                  <div
                    className="sd-calendar-schedule-grid"
                    style={{ "--sd-calendar-day-count": view === "week" ? 7 : 1 } as CSSProperties}
                  >
                    <div className="sd-calendar-schedule-corner" aria-hidden="true" />
                    {(view === "week" ? weekDays : [selectedDate]).map((day) => {
                      const key = format(day, "yyyy-MM-dd");
                      return (
                        <Link
                          key={key}
                          className="sd-calendar-schedule-heading"
                          href={"/calendar?view=month&month=" + format(day, "yyyy-MM") + "&day=" + key}
                          data-selected={key === selectedKey || undefined}
                        >
                          <span>{format(day, "EEEE")}</span>
                          <strong>{format(day, "d")}</strong>
                        </Link>
                      );
                    })}

                    <div className="sd-calendar-all-day-label">All day</div>
                    {(view === "week" ? weekDays : [selectedDate]).map((day) => {
                      const key = format(day, "yyyy-MM-dd");
                      const schedule = scheduleForDay(day);
                      return (
                        <div key={key} className="sd-calendar-all-day-cell">
                          {schedule.allDay.map(({ entry }) => entry.source === "assignment" ? (
                            <Link key={entryKey(entry)} href={"/assignments/" + entry.assignment.id} data-tone={entryTone(entry)}>
                              {entryTitle(entry)}
                            </Link>
                          ) : (
                            <a key={entryKey(entry)} href={entry.event.html_link ?? "#"} target="_blank" rel="noreferrer" data-tone="google">
                              {entryTitle(entry)}
                            </a>
                          ))}
                        </div>
                      );
                    })}

                    <div className="sd-calendar-time-scale" aria-hidden="true">
                      {timelineHours.map((hour) => <span key={hour}>{format(new Date(2026, 0, 1, hour), "h a")}</span>)}
                    </div>
                    {(view === "week" ? weekDays : [selectedDate]).map((day) => {
                      const key = format(day, "yyyy-MM-dd");
                      const schedule = scheduleForDay(day);
                      return (
                        <div key={key} className="sd-calendar-time-column">
                          {schedule.timed.map(({ item, startMinute, durationMinutes }) => {
                            const entry = item.entry;
                            const eventStyle = {
                              top: `${(startMinute / 60) * timelineHourHeight}px`,
                              height: `${Math.max(38, (durationMinutes / 60) * timelineHourHeight)}px`,
                            } as CSSProperties;
                            const eventContent = <>
                              <time>{format(parseISO(entryStart(entry)), "h:mm a")}</time>
                              <strong>{entryTitle(entry)}</strong>
                            </>;
                            return entry.source === "assignment" ? (
                              <Link
                                key={entryKey(entry)}
                                className="sd-calendar-timeline-event"
                                href={"/assignments/" + entry.assignment.id}
                                style={eventStyle}
                                data-tone={entryTone(entry)}
                                aria-label={`${format(parseISO(entryStart(entry)), "h:mm a")}: ${entryTitle(entry)}`}
                              >
                                {eventContent}
                              </Link>
                            ) : (
                              <a
                                key={entryKey(entry)}
                                className="sd-calendar-timeline-event"
                                href={entry.event.html_link ?? "#"}
                                style={eventStyle}
                                target="_blank"
                                rel="noreferrer"
                                data-tone="google"
                                aria-label={`${format(parseISO(entryStart(entry)), "h:mm a")}: ${entryTitle(entry)} in Google Calendar`}
                              >
                                {eventContent}
                              </a>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            ) : null}

          </div>

          <aside className="sd-calendar-events" aria-label="Calendar agenda">
            <CalendarGoogleSync
              connected={googleCalendarConnected}
              available={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
            />
            <div className="sd-calendar-agenda-heading">
              <p>{selectedEntries.length ? "Selected day" : "Coming up"}</p>
              <h2>{selectedEntries.length ? format(selectedDate, "EEEE, MMMM d") : "Your schedule"}</h2>
            </div>
            <div>
              {upcoming.length ? upcoming.map((item, index) => {
              const effectiveMinutes = item.source === "assignment"
                ? (adjustForUser(item.assignment, profile) ?? item.assignment.estimated_minutes ?? 0)
                : 0;
              const metadata = item.source === "assignment"
                ? `${item.assignment.external_source ? item.assignment.external_source + " import" : item.assignment.kind} / ${item.assignment.due_at ? "Due " + format(parseISO(item.assignment.due_at), "EEE, MMM d h:mm a") : "Time open"}`
                : `${item.event.all_day ? "All day" : format(parseISO(item.event.starts_at), "EEE, MMM d h:mm a")} / Google Calendar`;
              const content = <>
                  <div>
                    <h3>{entryTitle(item)}</h3>
                    <p>{metadata}</p>
                  </div>
                  <strong>{item.source === "google" ? "Open" : effectiveMinutes ? effectiveMinutes + " min" : "Open"}</strong>
                </>;
              return item.source === "assignment" ? (
                <Link key={entryKey(item)} href={"/assignments/" + item.assignment.id} aria-label={index === 0 ? "Open calendar item" : "Open " + entryTitle(item)} data-tone={entryTone(item)}>{content}</Link>
              ) : (
                <a key={entryKey(item)} href={item.event.html_link ?? "#"} target="_blank" rel="noreferrer" data-tone="google" aria-label={"Open " + entryTitle(item) + " in Google Calendar"}>{content}</a>
              );
            }) : (
              <p>No scheduled work for {format(selectedDate, "MMMM d")}. Choose another day whenever you&apos;re ready.</p>
            )}
            </div>
          </aside>
        </div>
        </main>
      </div>

      <Link className="sd-calendar-quick-add" href="/quick-add" aria-label="Quick capture"><Plus aria-hidden="true" /></Link>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}
