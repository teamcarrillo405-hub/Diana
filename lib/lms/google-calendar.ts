type GoogleCalendarDate = {
  dateTime?: string;
  date?: string;
  timeZone?: string;
};

type GoogleCalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  updated?: string;
  start?: GoogleCalendarDate;
  end?: GoogleCalendarDate;
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
};

export type NormalizedGoogleCalendarEvent = {
  external_event_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  html_link: string | null;
  source_updated_at: string | null;
};

const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const MAX_PAGES = 20;

function normalizeDate(value: GoogleCalendarDate | undefined): { value: string; allDay: boolean } | null {
  if (!value?.dateTime && !value?.date) return null;
  if (value.dateTime) {
    const parsed = new Date(value.dateTime);
    return Number.isNaN(parsed.getTime()) ? null : { value: parsed.toISOString(), allDay: false };
  }
  // Google returns all-day values as an ISO calendar day. Noon UTC avoids
  // shifting the displayed day in a negative-offset student timezone.
  const parsed = new Date(`${value.date}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : { value: parsed.toISOString(), allDay: true };
}

export function normalizeGoogleCalendarEvent(event: GoogleCalendarEvent): NormalizedGoogleCalendarEvent | null {
  if (!event.id || event.status === "cancelled") return null;
  const start = normalizeDate(event.start);
  const end = normalizeDate(event.end);
  if (!start) return null;
  return {
    external_event_id: event.id,
    title: event.summary?.trim() || "Google Calendar event",
    description: event.description?.trim() || null,
    starts_at: start.value,
    ends_at: end?.value ?? null,
    all_day: start.allDay,
    html_link: event.htmlLink ?? null,
    source_updated_at: event.updated ?? null,
  };
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  range: { start: Date; end: Date },
): Promise<NormalizedGoogleCalendarEvent[]> {
  const events: NormalizedGoogleCalendarEvent[] = [];
  let pageToken: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL(GOOGLE_EVENTS_URL);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("timeMin", range.start.toISOString());
    url.searchParams.set("timeMax", range.end.toISOString());
    url.searchParams.set("maxResults", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Google Calendar request returned ${response.status}`);
    const payload = (await response.json()) as GoogleCalendarListResponse;
    events.push(...(payload.items ?? []).map(normalizeGoogleCalendarEvent).filter(Boolean) as NormalizedGoogleCalendarEvent[]);
    pageToken = payload.nextPageToken ?? null;
    if (!pageToken) return events;
  }
  throw new Error("Google Calendar returned too many pages.");
}

export async function syncGoogleCalendarEvents(
  supabase: any,
  ownerId: string,
  accessToken: string,
): Promise<{ imported: number }> {
  const start = new Date();
  start.setDate(start.getDate() - 35);
  const end = new Date();
  end.setMonth(end.getMonth() + 6);
  const events = await fetchGoogleCalendarEvents(accessToken, { start, end });
  if (events.length === 0) return { imported: 0 };
  const syncedAt = new Date().toISOString();
  const { error } = await supabase.from("calendar_events").upsert(
    events.map((event) => ({
      owner_id: ownerId,
      provider: "google_calendar",
      external_calendar_id: "primary",
      ...event,
      last_synced_at: syncedAt,
    })),
    { onConflict: "owner_id,provider,external_calendar_id,external_event_id" },
  );
  if (error) throw new Error(error.message);
  return { imported: events.length };
}
