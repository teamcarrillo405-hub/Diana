export const runtime = "nodejs";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchClassroomAssignments,
  googleClassroomOAuthScopes,
  missingGoogleScopes,
} from "@/lib/lms/google";
import { syncGoogleCalendarEvents } from "@/lib/lms/google-calendar";
import { saveLmsConnectionForRuntime } from "@/lib/lms/credential-policy";
import { lmsOAuthStateSecret, verifyLmsOAuthState } from "@/lib/lms/oauth-state";
import { lmsProviderCapabilities } from "@/lib/lms/provider-features";
import { syncLmsAssignments } from "@/lib/lms/sync";
import { provisionCourseModeLmsStudentLinksFromImport } from "@/lib/lms/course-mode-identity";
import { lmsOperationErrorDetails } from "@/lib/lms/errors";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

function settingsRedirect(
  requestUrl: string,
  status: string,
  courseMode = false,
  returnTo: "/calendar" | "/settings" = "/settings",
): NextResponse {
  const url = new URL(courseMode ? "/classes" : returnTo, requestUrl);
  url.searchParams.set("classroom", status);
  const response = NextResponse.redirect(url);
  response.cookies.delete("google_oauth_state");
  response.cookies.delete("google_oauth_course_mode");
  response.cookies.delete("google_oauth_calendar");
  response.cookies.delete("google_oauth_return_to");
  return response;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return settingsRedirect(request.url, "sign-in");

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");
  const returnedState = requestUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const verification = verifyLmsOAuthState({
    state: returnedState,
    cookieVerifier: cookieStore.get("google_oauth_state")?.value,
    provider: "google_classroom",
    authenticatedOwnerId: user.id,
    secret: lmsOAuthStateSecret("google_classroom"),
  });
  if (!verification.ok || verification.payload.provider !== "google_classroom") {
    return settingsRedirect(request.url, "state-mismatch");
  }
  const { courseMode, calendar, returnTo } = verification.payload.context;
  const capabilities = lmsProviderCapabilities();

  if (!calendar && !capabilities.google.import && !capabilities.google.submission) {
    return settingsRedirect(request.url, "disabled", courseMode, returnTo);
  }
  if (providerError) return settingsRedirect(request.url, "denied", courseMode, returnTo);
  if (!code) return settingsRedirect(request.url, "invalid-response", courseMode, returnTo);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return settingsRedirect(request.url, "not-configured", courseMode, returnTo);

  const redirectUri = new URL("/api/lms/google-oauth/callback", request.url).toString();
  let tokenRes: Response;
  try {
    tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });
  } catch {
    return settingsRedirect(request.url, "token-error", courseMode, returnTo);
  }
  if (!tokenRes.ok) return settingsRedirect(request.url, "token-error", courseMode, returnTo);

  const tokenBody = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokenBody.access_token) return settingsRedirect(request.url, "token-error", courseMode, returnTo);
  const grantedScopes = tokenBody.scope?.split(/\s+/u).filter(Boolean) ?? [];
  const requiredScopes = googleClassroomOAuthScopes({
    calendarEnabled: calendar,
    importEnabled: capabilities.google.import,
    submissionEnabled: capabilities.google.submission,
    teacher: courseMode,
  });
  if (missingGoogleScopes(grantedScopes, requiredScopes).length > 0) {
    return settingsRedirect(request.url, "scope-error", courseMode, returnTo);
  }

  const expiresAt =
    typeof tokenBody.expires_in === "number"
      ? new Date(Date.now() + tokenBody.expires_in * 1000).toISOString()
      : null;
  const { data: existingConnection } = await supabase
    .from("lms_connections")
    .select("config")
    .eq("owner_id", user.id)
    .eq("provider", "google_classroom")
    .maybeSingle();
  const calendarEnabledBefore =
    (existingConnection?.config as { calendar_enabled?: boolean } | null)?.calendar_enabled === true;
  const config = {
    oauth: true,
    expires_at: expiresAt,
    token_type: tokenBody.token_type ?? "Bearer",
    granted_scopes: grantedScopes,
    connection_mode: courseMode ? "teacher" : "student",
    calendar_enabled: calendar || calendarEnabledBefore,
  };
  let savedConnection: Awaited<ReturnType<typeof saveLmsConnectionForRuntime>>;
  try {
    savedConnection = await saveLmsConnectionForRuntime(supabase, {
      ownerId: user.id,
      provider: "google_classroom",
      config,
      accessToken: tokenBody.access_token,
      refreshToken: tokenBody.refresh_token,
    });
  } catch {
    return settingsRedirect(request.url, "save-error", courseMode, returnTo);
  }

  if (courseMode) return settingsRedirect(request.url, "connected", true, returnTo);
  try {
    if (calendar || calendarEnabledBefore) {
      await syncGoogleCalendarEvents(supabase as any, user.id, tokenBody.access_token);
    }
    if (capabilities.google.import) {
      const { items, skipped } = await fetchClassroomAssignments(tokenBody.access_token);
      await provisionCourseModeLmsStudentLinksFromImport({
        studentId: user.id,
        identityConnectionId: savedConnection.id,
        provider: "google_classroom",
        token: tokenBody.access_token,
        assignments: items,
      });
      await syncLmsAssignments(supabase, user.id, "google_classroom", items, skipped);
      await supabase
        .from("lms_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("owner_id", user.id)
        .eq("provider", "google_classroom");
    }
    return settingsRedirect(request.url, calendar ? "calendar-connected" : "connected", false, returnTo);
  } catch (error) {
    const detail = lmsOperationErrorDetails(error);
    if (detail?.code === "reconnect_required") {
      return settingsRedirect(request.url, "reconnect_required", courseMode, returnTo);
    }
    return settingsRedirect(request.url, calendar ? "calendar-connected-sync-later" : "connected-sync-later", false, returnTo);
  }
}
