import Link from "next/link";
import {
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
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Settings2 } from "lucide-react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { adjustForUser, type Assignment } from "@/lib/scoring/next-five-minutes";
import { createClient } from "@/lib/supabase/server";

type CalendarAssignment = Assignment & {
  external_source: string | null;
  external_url: string | null;
};

type PageProps = {
  searchParams: Promise<{ day?: string; month?: string; week?: string }>;
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
        .select("diagnoses, extra_time_pct")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    assignments = (assignmentRows ?? []) as CalendarAssignment[];
    if (profileRow) {
      profile = {
        diagnoses: (profileRow.diagnoses as string[] | null) ?? [],
        extra_time_pct: profileRow.extra_time_pct ?? 0,
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

  return (
    <ScreenDesignViewport className="sd-study-calendar">
      <header className="sd-calendar-header">
        <div className="sd-calendar-title-row">
          <div><DianaWordmark alt="Diana" /><h1>Study<br /><span>Calendar</span></h1></div>
          <Link href="/settings" aria-label="Calendar settings"><Settings2 aria-hidden="true" /></Link>
        </div>
        <nav aria-label="Calendar month">
          <Link href={`/calendar?month=${format(subMonths(monthStart, 1), "yyyy-MM")}`} aria-label="Previous month"><ChevronLeft aria-hidden="true" /></Link>
          <strong>{format(monthStart, "MMMM yyyy")}</strong>
          <Link href={`/calendar?month=${format(addMonths(monthStart, 1), "yyyy-MM")}`} aria-label="Next month"><ChevronRight aria-hidden="true" /></Link>
        </nav>
      </header>

      <main className="sd-calendar-scroll">
        <section className="sd-calendar-month" aria-label={format(monthStart, "MMMM yyyy")}>
          <div className="sd-calendar-weekdays" aria-hidden="true">{["S", "M", "T", "W", "T", "F", "S"].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
          <div className="sd-calendar-days">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = byDay.get(key) ?? [];
              const totalMinutes = items.reduce((sum, assignment) => sum + (adjustForUser(assignment, profile) ?? 0), 0);
              return (
                <Link
                  key={key}
                  href={`/calendar?month=${monthKey}&day=${key}`}
                  aria-label={`${format(day, "MMMM d")}${items.length ? `, ${items.length} item${items.length === 1 ? "" : "s"}, ${totalMinutes} minutes` : ", no scheduled work"}`}
                  data-selected={key === selectedKey || undefined}
                  data-outside={!isSameMonth(day, monthStart) || undefined}
                  data-has-items={items.length > 0 || undefined}
                >
                  <span>{format(day, "d")}</span>
                  {items.length > 0 ? <i aria-hidden="true" data-count={Math.min(items.length, 2)} /> : null}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="sd-calendar-events">
          <h2>{upcoming.length ? "Upcoming events" : "Selected day"}</h2>
          <div>
            {upcoming.length ? upcoming.map((assignment, index) => {
              const effectiveMinutes = adjustForUser(assignment, profile) ?? assignment.estimated_minutes ?? 0;
              return (
                <Link key={assignment.id} href={`/assignments/${assignment.id}`} aria-label={index === 0 ? "Open calendar item" : `Open ${assignment.title}`} data-tone={index % 2 === 0 ? "pink" : "blue"}>
                  <div>
                    <h3>{assignment.title}</h3>
                    <p>{assignment.external_source ? `${assignment.external_source} import` : assignment.kind} · {assignment.due_at ? format(parseISO(assignment.due_at), "h:mm a") : "Time open"}</p>
                  </div>
                  <strong>{effectiveMinutes ? `${effectiveMinutes} min` : "Open"}</strong>
                </Link>
              );
            }) : (
              <p>No scheduled work for {format(parseISO(`${selectedKey}T12:00:00.000Z`), "MMMM d")}. Choose another day whenever you&apos;re ready.</p>
            )}
          </div>
        </section>
      </main>

      <Link className="sd-calendar-quick-add" href="/inbox" aria-label="Quick capture"><Plus aria-hidden="true" /></Link>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}
