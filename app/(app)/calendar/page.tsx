import { redirect } from "next/navigation";
import { isValid, parseISO, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { adjustForUser, type Assignment } from "@/lib/scoring/next-five-minutes";
import { assignmentDestination, assignmentStatusLabel, subjectArtwork } from "@/lib/assignment-navigation";
import type { AssignmentStatus } from "@/lib/supabase/types";
import type { CalendarItem } from "@/lib/calendar/calendar-items";
import type { PersonalEvent } from "@/lib/calendar/personal-events";
import { calendarDayKey, calendarLocalTime, calendarTimeZone } from "@/lib/calendar/time-zone";
import { CalendarGoogleSync } from "./calendar-google-sync";
import { StudentCalendar } from "./student-calendar";

type CalendarAssignment = Assignment & { status: AssignmentStatus; description: string | null; external_source: string | null; classes: { name: string; color: string | null } | null };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ day?: string; month?: string; view?: string; week?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: assignments, error: assignmentError }, { data: profile }, { data: googleEvents, error: googleError }, { data: personalEvents, error: personalError }, { data: googleConnection }] = await Promise.all([
    supabase.from("assignments").select("id,title,description,due_at,status,estimated_minutes,difficulty,class_id,kind,reading_load,writing_load,external_source,classes(name,color)").eq("owner_id", user.id).neq("status", "abandoned").not("due_at", "is", null).order("due_at"),
    supabase.from("profiles").select("diagnoses,extra_time_pct,display_name,photo_url,photo_offset_x,photo_offset_y,timezone").eq("user_id", user.id).maybeSingle(),
    supabase.from("calendar_events").select("id,title,description,starts_at,ends_at,all_day,html_link").eq("owner_id", user.id).order("starts_at"),
    supabase.from("personal_calendar_events").select("id,event,photo_key,time_zone").eq("owner_id", user.id).is("deleted_at", null).order("created_at"),
    supabase.from("lms_connections").select("config").eq("owner_id", user.id).eq("provider", "google_classroom").maybeSingle(),
  ]);
  const timeZone = calendarTimeZone(profile?.timezone);
  const today = calendarDayKey(new Date(), timeZone);
  const dateCandidate = params.day ?? params.week ?? (params.month ? `${params.month}-01` : today);
  const initialDay = /^\d{4}-\d{2}-\d{2}$/.test(dateCandidate) && isValid(parseISO(dateCandidate)) && format(parseISO(dateCandidate), "yyyy-MM-dd") === dateCandidate ? dateCandidate : today;
  const savedEvents: PersonalEvent[] = await Promise.all((personalEvents ?? []).map(async row => {
    const { data } = row.photo_key ? await supabase.storage.from("note-docs").createSignedUrl(row.photo_key, 3600) : { data: null };
    return { ...(row.event as Omit<PersonalEvent, "id" | "photo">), id: row.id, photo: data?.signedUrl ?? "", timeZone: row.time_zone };
  }));
  const importedItems: CalendarItem[] = [
    ...((assignments ?? []) as CalendarAssignment[]).map(assignment => ({
      id: `assignment-${assignment.id}`, day: calendarDayKey(assignment.due_at!, timeZone), title: assignment.title, subject: assignment.classes?.name ?? "Assignment", kind: "deadline" as const,
      time: calendarLocalTime(assignment.due_at!, timeZone), minutes: adjustForUser(assignment, { diagnoses: profile?.diagnoses ?? [], extra_time_pct: profile?.extra_time_pct ?? 0 }) ?? assignment.estimated_minutes ?? undefined,
      status: assignmentStatusLabel(assignment.status), image: subjectArtwork(assignment.classes?.name ?? assignment.title), imageAlt: "", color: "#91ddeb", source: assignment.external_source || "Diana", brief: assignment.description ?? "", href: assignmentDestination(assignment.id, assignment.status),
    })),
    ...(googleEvents ?? []).map(event => {
      let href: string | undefined;
      try { const url = new URL(event.html_link ?? ""); if (url.protocol === "https:" && ["calendar.google.com", "www.google.com"].includes(url.hostname)) href = url.href; } catch { /* No external link available. */ }
      return { id: `google-${event.id}`, day: event.all_day ? event.starts_at.slice(0, 10) : calendarDayKey(event.starts_at, timeZone), title: event.title, subject: "Calendar", kind: "event" as const, time: calendarLocalTime(event.starts_at, timeZone), endTime: event.ends_at && calendarDayKey(event.ends_at, timeZone) === calendarDayKey(event.starts_at, timeZone) ? calendarLocalTime(event.ends_at, timeZone) : undefined, allDay: event.all_day, image: subjectArtwork(""), imageAlt: "", color: "#b9d6d4", source: "Google Calendar", brief: event.description ?? "", href, external: true };
    }),
  ];
  return <StudentCalendar today={today} importedItems={importedItems} savedEvents={savedEvents} timeZone={timeZone} initialDay={initialDay} initialView={params.view === "month" ? "Month" : params.view === "week" ? "Week" : "Schedule"} unavailable={Boolean(assignmentError || googleError || personalError)} profile={{ displayName: profile?.display_name, photoUrl: profile?.photo_url, photoOffsetX: profile?.photo_offset_x, photoOffsetY: profile?.photo_offset_y }} sync={<CalendarGoogleSync connected={(googleConnection?.config as { calendar_enabled?: boolean } | null)?.calendar_enabled === true} available={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />} />;
}

