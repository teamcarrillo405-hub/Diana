import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeGoogleCalendarEvent, syncGoogleCalendarEvents } from "./google-calendar";

describe("normalizeGoogleCalendarEvent", () => {
  it("keeps timed events in a stable ISO format", () => {
    expect(normalizeGoogleCalendarEvent({
      id: "study-group",
      summary: "Study group",
      start: { dateTime: "2026-08-20T15:30:00-07:00" },
      end: { dateTime: "2026-08-20T16:30:00-07:00" },
    })).toMatchObject({
      external_event_id: "study-group",
      title: "Study group",
      all_day: false,
      starts_at: "2026-08-20T22:30:00.000Z",
    });
  });

  it("keeps all-day events on their intended calendar date", () => {
    expect(normalizeGoogleCalendarEvent({
      id: "day-off",
      summary: "No school",
      start: { date: "2026-09-07" },
      end: { date: "2026-09-08" },
    })).toMatchObject({
      external_event_id: "day-off",
      all_day: true,
      starts_at: "2026-09-07T12:00:00.000Z",
    });
  });

  it("drops cancelled and malformed provider events", () => {
    expect(normalizeGoogleCalendarEvent({ id: "gone", status: "cancelled" })).toBeNull();
    expect(normalizeGoogleCalendarEvent({ id: "missing-start", summary: "Missing" })).toBeNull();
  });
});

describe("completed Google Calendar snapshot reconciliation", () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  const event = { id: "active", summary: "Study group", start: { dateTime: "2026-11-17T15:00:00Z" } };
  function store() {
    return {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "student" } } })) },
      rpc: vi.fn(async () => ({ data: { imported: 1, removed: 1, applied: true,
        syncedAt: "2026-11-17T15:00:00Z", rangeStart: "2026-10-13T15:00:00Z", rangeEnd: "2027-05-17T15:00:00Z" }, error: null })),
    };
  }

  it("reconciles once after every page, excluding cancelled events", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ kind: "calendar#events", items: [event], nextPageToken: "second" }))
      .mockResolvedValueOnce(Response.json({ kind: "calendar#events", items: [{ id: "cancelled", status: "cancelled" }] }));
    vi.stubGlobal("fetch", fetcher);
    const client = store();

    expect(await syncGoogleCalendarEvents(client, "student", "test-token")).toMatchObject({ imported: 1, removed: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith("reconcile_google_calendar_snapshot", expect.objectContaining({
      p_complete: true, p_events: [expect.objectContaining({ external_event_id: "active" })],
    }));
    expect(new URL(fetcher.mock.calls[1][0]).searchParams.get("pageToken")).toBe("second");
  });

  it("reconciles an empty successful range so removed provider events can disappear", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ kind: "calendar#events", items: [] })));
    const client = store();
    await syncGoogleCalendarEvents(client, "student", "test-token");
    expect(client.rpc).toHaveBeenCalledWith("reconcile_google_calendar_snapshot", expect.objectContaining({ p_events: [], p_complete: true }));
  });

  it("preserves stored events when a later page is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ kind: "calendar#events", items: [event], nextPageToken: "second" }))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 })));
    const client = store();
    await expect(syncGoogleCalendarEvents(client, "student", "test-token")).rejects.toThrow("503");
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it.each([{}, { kind: "calendar#events", items: "partial" }, { kind: "calendar#events", items: [{ id: "missing-start" }] }, { error: "incomplete" }])("rejects malformed snapshots before any reconciliation", async payload => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(payload)));
    const client = store();
    await expect(syncGoogleCalendarEvents(client, "student", "test-token")).rejects.toThrow("incomplete");
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("preserves stored events when pagination exceeds the bound", async () => {
    const fetcher = vi.fn(async () => Response.json({ kind: "calendar#events", items: [], nextPageToken: "more" }));
    vi.stubGlobal("fetch", fetcher);
    const client = store();
    await expect(syncGoogleCalendarEvents(client, "student", "test-token")).rejects.toThrow("too many pages");
    expect(fetcher).toHaveBeenCalledTimes(20);
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("binds reconciliation to the signed-in student before contacting Google", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const client = store();
    await expect(syncGoogleCalendarEvents(client, "another-student", "test-token")).rejects.toThrow("Sign in");
    expect(fetcher).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });
});
