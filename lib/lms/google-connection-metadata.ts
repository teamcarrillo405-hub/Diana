const CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const CALENDAR_ONLY_SCOPES = new Set([
  "openid", "email", "profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  CALENDAR_READONLY_SCOPE,
]);

/** Only verified narrow grants may be excluded from existing Classroom imports. */
export function isGoogleCalendarOnlyConnection(connection: {
  provider: unknown;
  config: unknown;
}): boolean {
  if (connection.provider !== "google_classroom" || !connection.config
    || typeof connection.config !== "object" || Array.isArray(connection.config)) return false;
  const config = connection.config as Record<string, unknown>;
  if (config.calendar_enabled !== true || !Array.isArray(config.granted_scopes)) return false;
  const scopes = config.granted_scopes;
  return scopes.includes(CALENDAR_READONLY_SCOPE)
    && scopes.every(scope => typeof scope === "string" && CALENDAR_ONLY_SCOPES.has(scope));
}
