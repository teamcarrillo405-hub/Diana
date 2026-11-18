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
  kind?: string;
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
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Google Calendar request returned ${response.status}`);
    const payload = (await response.json()) as GoogleCalendarListResponse;
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload.kind !== "calendar#events"
      || (payload.items !== undefined && !Array.isArray(payload.items))
      || (payload.nextPageToken !== undefined && typeof payload.nextPageToken !== "string")
      || "error" in payload) throw new Error("Google Calendar returned an incomplete event list.");
    for (const event of payload.items ?? []) {
      if (!event || typeof event !== "object" || typeof event.id !== "string" || !event.id) {
        throw new Error("Google Calendar returned an incomplete event.");
      }
      if (event.status === "cancelled") continue;
      const normalized = normalizeGoogleCalendarEvent(event);
      if (!normalized) throw new Error("Google Calendar returned an incomplete event.");
      events.push(normalized);
    }
    pageToken = payload.nextPageToken ?? null;
    if (!pageToken) return events;
  }
  throw new Error("Google Calendar returned too many pages.");
}

export async function syncGoogleCalendarEvents(
  supabase: any,
  ownerId: string,
  accessToken: string,
): Promise<{ imported: number; removed: number; applied: boolean; syncedAt: string; rangeStart: string; rangeEnd: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ownerId) throw new Error("Sign in to sync your calendar.");
  const snapshotAt = new Date().toISOString();
  const start = new Date(snapshotAt);
  start.setDate(start.getDate() - 35);
  const end = new Date(snapshotAt);
  end.setMonth(end.getMonth() + 6);
  const events = await fetchGoogleCalendarEvents(accessToken, { start, end });
  const { data, error } = await supabase.rpc("reconcile_google_calendar_snapshot", {
    p_range_start: start.toISOString(), p_range_end: end.toISOString(),
    p_snapshot_at: snapshotAt, p_events: events, p_complete: true,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data.imported !== "number" || typeof data.removed !== "number"
    || typeof data.applied !== "boolean" || typeof data.syncedAt !== "string"
    || typeof data.rangeStart !== "string" || typeof data.rangeEnd !== "string") {
    throw new Error("Calendar sync could not be confirmed.");
  }
  return data;
}
