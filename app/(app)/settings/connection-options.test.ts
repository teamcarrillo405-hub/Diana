import { describe, expect, it } from "vitest";
import type { ProviderFeatureFlags } from "@/lib/lms/provider-features";
import type { LmsConnectionView } from "./source-models";
import { availableConnectionOptions, reconnectConnectionOption } from "./connection-options";

function capabilities(google: Partial<ProviderFeatureFlags["google"]> = {}, canvasImport = false): ProviderFeatureFlags {
  return { canvas: { import: canvasImport, submission: false }, google: { import: false, submission: false, calendar: false, ...google } };
}
function connection(overrides: Partial<LmsConnectionView> = {}): LmsConnectionView {
  return { id: "connection-1", provider: "google_classroom", state: "attention", lastSyncedAt: null, message: null, schoolManaged: false, ...overrides };
}

describe("Settings connection options", () => {
  it("offers Calendar independently without suggesting Classroom import", () => {
    const options = availableConnectionOptions([], capabilities({ calendar: true }));
    expect(options).toEqual([{ id: "google-calendar", label: "Connect Google Calendar", href: "/api/lms/google-oauth/start?calendar=1&return_to=/calendar" }]);
  });
  it("offers Classroom only when its import feature is enabled", () => {
    expect(availableConnectionOptions([], capabilities({ import: true })).map(option => option.id)).toEqual(["google-classroom"]);
    expect(availableConnectionOptions([], capabilities())).toEqual([]);
  });
  it("never invites replacement of an existing Google connection with another scope", () => {
    expect(availableConnectionOptions([connection({ calendarOnly: true, calendarEnabled: true })], capabilities({ calendar: true, import: true }))).toEqual([]);
    expect(availableConnectionOptions([connection()], capabilities({ calendar: true, import: true }))).toEqual([]);
  });
  it("offers Canvas only when enabled and not already connected", () => {
    expect(availableConnectionOptions([], capabilities({}, true)).map(option => option.id)).toEqual(["canvas"]);
    expect(availableConnectionOptions([connection({ provider: "canvas" })], capabilities({}, true))).toEqual([]);
  });
  it("keeps a Calendar-only reconnect in the Calendar flow", () => {
    const calendar = connection({ calendarOnly: true, calendarEnabled: true });
    expect(reconnectConnectionOption(calendar, capabilities({ import: true }))).toBeNull();
    expect(reconnectConnectionOption(calendar, capabilities({ calendar: true }))?.href).toBe("/api/lms/google-oauth/start?calendar=1&return_to=/calendar");
  });
  it("does not downgrade a Classroom connection to Calendar-only access", () => {
    expect(reconnectConnectionOption(connection(), capabilities({ calendar: true }))).toBeNull();
    expect(reconnectConnectionOption(connection(), capabilities({ calendar: true, import: true }))?.href).toBe("/api/lms/google-oauth/start");
  });
  it("does not expose a Google reconnect for school-managed providers", () => {
    expect(reconnectConnectionOption(connection({ provider: "clever", schoolManaged: true }), capabilities({ calendar: true, import: true }))).toBeNull();
  });
});
