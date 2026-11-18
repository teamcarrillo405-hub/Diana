import { describe, expect, it } from "vitest";
import { isGoogleCalendarOnlyConnection } from "./google-connection-metadata";

const calendar = "https://www.googleapis.com/auth/calendar.readonly";

describe("known Calendar-only Google connection metadata", () => {
  it("recognizes narrow Calendar grants including Google's identity aliases", () => {
    expect(isGoogleCalendarOnlyConnection({ provider: "google_classroom", config: {
      calendar_enabled: true, granted_scopes: ["openid", "https://www.googleapis.com/auth/userinfo.email", "profile", calendar],
    } })).toBe(true);
  });

  it.each([
    null, {}, { calendar_enabled: true }, { calendar_enabled: true, granted_scopes: [] },
    { calendar_enabled: true, granted_scopes: ["openid", "email"] },
    { calendar_enabled: false, granted_scopes: [calendar] },
    { calendar_enabled: true, granted_scopes: [calendar, "https://www.googleapis.com/auth/classroom.courses.readonly"] },
    { calendar_enabled: true, granted_scopes: [calendar, "https://www.googleapis.com/auth/drive.readonly"] },
    { calendar_enabled: true, granted_scopes: [calendar, "unknown"] },
    { calendar_enabled: true, granted_scopes: [calendar, null] },
  ])("retains mixed, legacy and unverified metadata for existing Classroom behavior: %j", config => {
    expect(isGoogleCalendarOnlyConnection({ provider: "google_classroom", config })).toBe(false);
  });

  it("does not classify another provider from its config", () => {
    expect(isGoogleCalendarOnlyConnection({ provider: "canvas", config: { calendar_enabled: true, granted_scopes: [calendar] } })).toBe(false);
  });
});
