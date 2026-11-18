import { redirect } from "next/navigation";
import { isValid, parseISO, format, addDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { adjustForUser, type Assignment } from "@/lib/scoring/next-five-minutes";
import { assignmentDestination, assignmentStatusLabel, subjectArtwork } from "@/lib/assignment-navigation";
import type { AssignmentStatus } from "@/lib/supabase/types";
import { expandCalendarItem, type CalendarItem } from "@/lib/calendar/calendar-items";
import { validatePersonalEvent, type PersonalEvent } from "@/lib/calendar/personal-events";
import { calendarPlanningSupport } from "@/lib/calendar/planning";
import { buildCalendarReturnHref } from "@/lib/calendar-return";
import { lmsProviderCapabilities } from "@/lib/lms/provider-features";
import { calendarDayKey, calendarLocalTime, calendarTimeZone } from "@/lib/calendar/time-zone";
import { CalendarGoogleSync } from "./calendar-google-sync";
import { StudentCalendar } from "./student-calendar";

type CalendarAssignment = Assignment & { status: AssignmentStatus; description: string | null; external_source: string | null; classes: { name: string; color: string | null } | null };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ day?: string; month?: string; view?: string; week?: string; item?: string; calendar_status?: string; classroom?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const now = new Date();
  const [{ data: assignments, error: assignmentError }, { data: profile, error: profileError }, { data: googleEvents, error: googleError }, { data: personalEvents, error: personalError }, { data: googleConnection }, { data: weekPlans, error: planningError }, { data: readinessSignals }] = await Promise.all([
    supabase.from("assignments").select("id,title,description,due_at,status,estimated_minutes,difficulty,class_id,kind,reading_load,writing_load,external_source,classes(name,color)").eq("owner_id", user.id).neq("status", "abandoned").not("due_at", "is", null).order("due_at"),
    supabase.from("profiles").select("diagnoses,extra_time_pct,display_name,photo_url,photo_offset_x,photo_offset_y,timezone,school_name,mood_checkin_disabled").eq("user_id", user.id).maybeSingle(),
    supabase.from("calendar_events").select("id,title,description,starts_at,ends_at,all_day,html_link").eq("owner_id", user.id).order("starts_at"),
    supabase.from("personal_calendar_events").select("id,event,photo_key,time_zone").eq("owner_id", user.id).is("deleted_at", null).order("created_at"),
    supabase.from("lms_connections").select("config").eq("owner_id", user.id).eq("provider", "google_classroom").maybeSingle(),
    supabase.from("calendar_week_plans").select("week_start,available_minutes").eq("owner_id", user.id),
    supabase.from("task_signals").select("value,occurred_at").eq("owner_id", user.id).eq("kind", "mood_checkin").gte("occurred_at", new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString()).lte("occurred_at", now.toISOString()).order("occurred_at", { ascending: false }).order("id", { ascending: false }).limit(16),
  ]);
  const timeZone = calendarTimeZone(profile?.timezone);
  const today = calendarDayKey(now, timeZone);
  const parameter = (value: unknown) => typeof value === "string" ? value : undefined;
  const month = parameter(params.month);
  const dateCandidate = parameter(params.day) ?? parameter(params.week) ?? (month ? `${month}-01` : today);
  const initialDay = /^\d{4}-\d{2}-\d{2}$/.test(dateCandidate) && isValid(parseISO(dateCandidate)) && format(parseISO(dateCandidate), "yyyy-MM-dd") === dateCandidate ? dateCandidate : today;
  const initialView = params.view === "month" ? "Month" : params.view === "week" ? "Week" : "Schedule";
  const initialItem = typeof params.item === "string" && params.item.length <= 180 ? params.item : undefined;
  const returnTo = buildCalendarReturnHref({ day: initialDay, view: initialView === "Month" ? "month" : initialView === "Week" ? "week" : "schedule", item: initialItem });
  let invalidSavedEvents = false;
  const savedEvents: PersonalEvent[] = (await Promise.all((personalEvents ?? []).map(async (row): Promise<PersonalEvent | null> => {
    const event = { ...(row.event as Omit<PersonalEvent, "id" | "photo">), id: row.id, photo: "", timeZone: calendarTimeZone(row.time_zone) };
    if (validatePersonalEvent(event, event.timeZone)) { invalidSavedEvents = true; return null; }
    const { data } = row.photo_key ? await supabase.storage.from("note-docs").createSignedUrl(row.photo_key, 3600) : { data: null };
    return { ...event, photo: data?.signedUrl ?? "" };
  }))).filter((event): event is PersonalEvent => event !== null);
  const importedItems: CalendarItem[] = [
    ...((assignments ?? []) as CalendarAssignment[]).map(assignment => ({
      id: `assignment-${assignment.id}`, assignmentId: assignment.id, day: calendarDayKey(assignment.due_at!, timeZone), title: assignment.title, subject: assignment.classes?.name ?? "Assignment", kind: "deadline" as const,
      time: calendarLocalTime(assignment.due_at!, timeZone), minutes: adjustForUser(assignment, { diagnoses: profile?.diagnoses ?? [], extra_time_pct: profile?.extra_time_pct ?? 0 }) ?? assignment.estimated_minutes ?? undefined,
      status: assignmentStatusLabel(assignment.status), image: subjectArtwork(assignment.classes?.name ?? assignment.title), imageAlt: "", color: assignment.classes?.color ?? "#d9c395", source: assignment.external_source || "Diana", brief: assignment.description ?? "", href: assignmentDestination(assignment.id, assignment.status),
    })),
    ...(googleEvents ?? []).flatMap(event => {
      let href: string | undefined;
      try { const url = new URL(event.html_link ?? ""); if (url.protocol === "https:" && ["calendar.google.com", "www.google.com"].includes(url.hostname)) href = url.href; } catch { /* No external link available. */ }
      const day = event.all_day ? event.starts_at.slice(0, 10) : calendarDayKey(event.starts_at, timeZone);
      return expandCalendarItem({ id: `google-${event.id}`, day, title: event.title, subject: "Calendar", kind: "event", time: event.all_day ? "00:00" : calendarLocalTime(event.starts_at, timeZone), startsAt: event.all_day ? undefined : event.starts_at, endsAt: event.all_day ? undefined : event.ends_at ?? undefined, endDay: event.all_day ? event.ends_at?.slice(0, 10) ?? format(addDays(parseISO(day), 1), "yyyy-MM-dd") : undefined, allDay: event.all_day, image: subjectArtwork(""), imageAlt: "", color: "#b9d6d4", source: "Google Calendar", brief: event.description ?? "", href, external: true }, timeZone);
    }),
  ];
  const config = googleConnection?.config as { calendar_enabled?: boolean; calendar_last_synced_at?: string; calendar_range_start?: string; calendar_range_end?: string } | null;
  const support = profile?.mood_checkin_disabled ? { planningNote: null, suggestedBlockMinutes: null } : calendarPlanningSupport(readinessSignals ?? [], now, timeZone);
  return <StudentCalendar today={today} importedItems={importedItems} savedEvents={savedEvents} timeZone={timeZone} initialDay={initialDay} initialView={initialView} initialItem={initialItem} schoolName={profile?.school_name}
    feedErrors={{ assignments: assignmentError ? "Assignments could not load. Your due list may be incomplete." : profileError ? "Your learning preferences could not load. Work estimates may need adjustment." : undefined, imported: googleError ? "Imported calendar events could not load." : undefined, personal: personalError ? "Your saved events could not load." : invalidSavedEvents ? "Some saved events need updated date or time details and could not be displayed." : undefined }}
    weekPlans={(weekPlans ?? []).map(plan => ({ weekStart: plan.week_start, availableMinutes: plan.available_minutes }))} planningUnavailable={Boolean(planningError || profileError)} {...support}
    profile={{ displayName: profile?.display_name, photoUrl: profile?.photo_url, photoOffsetX: profile?.photo_offset_x, photoOffsetY: profile?.photo_offset_y }}
    sync={<CalendarGoogleSync connected={config?.calendar_enabled === true} available={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) && lmsProviderCapabilities().google.calendar} returnTo={returnTo} lastSyncedAt={config?.calendar_last_synced_at} rangeStart={config?.calendar_range_start} rangeEnd={config?.calendar_range_end} timeZone={timeZone} initialStatus={parameter(params.calendar_status) ?? parameter(params.classroom)} />} />;
}

