import type { ProviderFeatureFlags } from "@/lib/lms/provider-features";
import type { LmsConnectionView } from "./source-models";

export type ConnectionOption = Readonly<{ id: string; label: string; href: string }>;
const GOOGLE_CALENDAR: ConnectionOption = { id: "google-calendar", label: "Connect Google Calendar", href: "/api/lms/google-oauth/start?calendar=1&return_to=/calendar" };
const GOOGLE_CLASSROOM: ConnectionOption = { id: "google-classroom", label: "Connect Google Classroom", href: "/api/lms/google-oauth/start" };
const CANVAS: ConnectionOption = { id: "canvas", label: "Connect Canvas LMS", href: "/api/lms/canvas-oauth/start" };

/** Only offer flows the deployment enables; Calendar never implies Classroom. */
export function availableConnectionOptions(connections: readonly LmsConnectionView[], capabilities: Readonly<ProviderFeatureFlags>): readonly ConnectionOption[] {
  const googleConnected = connections.some(connection => connection.provider === "google_classroom");
  return [
    ...(capabilities.google.calendar && !googleConnected ? [GOOGLE_CALENDAR] : []),
    ...(capabilities.google.import && !googleConnected ? [GOOGLE_CLASSROOM] : []),
    ...(capabilities.canvas.import && !connections.some(connection => connection.provider === "canvas") ? [CANVAS] : []),
  ];
}

export function reconnectConnectionOption(connection: LmsConnectionView, capabilities: Readonly<ProviderFeatureFlags>): ConnectionOption | null {
  if (connection.provider !== "google_classroom") return null;
  if (connection.calendarOnly) return capabilities.google.calendar ? { ...GOOGLE_CALENDAR, label: "Reconnect Google Calendar" } : null;
  return capabilities.google.import ? { ...GOOGLE_CLASSROOM, label: "Reconnect Google Classroom" } : null;
}
