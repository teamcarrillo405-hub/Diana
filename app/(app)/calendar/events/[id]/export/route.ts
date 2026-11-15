import { createClient } from "@/lib/supabase/server";
import { personalEventCalendar } from "@/lib/calendar/calendar-export";
import type { PersonalEvent } from "@/lib/calendar/personal-events";
import { calendarTimeZone } from "@/lib/calendar/time-zone";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in to open your event.", { status: 401 });
  const { data: row } = await supabase.from("personal_calendar_events").select("id,event,time_zone").eq("id", id).eq("owner_id", user.id).is("deleted_at", null).maybeSingle();
  if (!row) return new Response("Event not found.", { status: 404 });
  const event = { ...(row.event as Omit<PersonalEvent, "id" | "photo">), id: row.id, photo: "" };
  return new Response(personalEventCalendar(event, calendarTimeZone(row.time_zone)), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="diana-event.ics"', "Cache-Control": "private, no-store" } });
}
