import { describe, expect, it } from "vitest";

import { normalizeGoogleCalendarEvent } from "./google-calendar";

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
