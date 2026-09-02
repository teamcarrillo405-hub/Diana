export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { assertLmsCredentialVaultAvailable } from "@/lib/lms/credential-policy";
import { createClient } from "@/lib/supabase/server";
import {
  googleClassroomOAuthScopes,
} from "@/lib/lms/google";
import {
  issueLmsOAuthState,
  lmsOAuthStateSecret,
  LMS_OAUTH_STATE_TTL_MS,
} from "@/lib/lms/oauth-state";
import { lmsProviderCapabilities } from "@/lib/lms/provider-features";

function settingsRedirect(requestUrl: string, status: string, courseMode = false): NextResponse {
  const url = new URL(courseMode ? "/classes" : "/settings", requestUrl);
  url.searchParams.set("classroom", status);
  return NextResponse.redirect(url);
}

function safeReturnPath(value: string | null): "/calendar" | "/settings" {
  return value === "/calendar" ? "/calendar" : "/settings";
}

/**
 * Begin the dedicated Google Classroom OAuth flow. Requests offline access so
 * Google returns a refresh_token (stored in the callback), which lets sync —
 * including the background cron — mint fresh access tokens without an
 * interactive session.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return settingsRedirect(request.url, "sign-in");
  const requestUrl = new URL(request.url);
  const courseMode = requestUrl.searchParams.get("course_mode") === "teacher";
  const calendar = requestUrl.searchParams.get("calendar") === "1";
  const returnPath = safeReturnPath(requestUrl.searchParams.get("return_to"));
  const capabilities = lmsProviderCapabilities();
  if (!calendar && !capabilities.google.import && !capabilities.google.submission) {
    return settingsRedirect(request.url, "disabled", courseMode);
  }
  try {
    await assertLmsCredentialVaultAvailable();
  } catch {
    return settingsRedirect(request.url, "vault-unavailable", courseMode);
  }
  if (courseMode) {
    const { data: membership } = await (supabase as any)
      .from("organization_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("verification_status", "verified")
      .in("role", ["district_admin", "school_admin", "teacher"])
      .limit(1)
      .maybeSingle();
    if (!membership) return settingsRedirect(request.url, "not-authorized", true);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const stateSecret = lmsOAuthStateSecret("google_classroom");
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET || !stateSecret) {
    return settingsRedirect(request.url, "not-configured", courseMode);
  }

  const { state, cookieVerifier } = issueLmsOAuthState({
    provider: "google_classroom",
    ownerId: user.id,
    secret: stateSecret,
    context: {
      courseMode,
      calendar,
      returnTo: returnPath,
    },
  });
  const redirectUri = new URL("/api/lms/google-oauth/callback", request.url).toString();
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set(
    "scope",
    googleClassroomOAuthScopes({
      calendarEnabled: calendar,
      importEnabled: capabilities.google.import,
      submissionEnabled: capabilities.google.submission,
      teacher: courseMode,
    }).join(" "),
  );
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent"); // force a refresh_token even on re-consent
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("google_oauth_state", cookieVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LMS_OAUTH_STATE_TTL_MS / 1000,
  });
  response.cookies.delete("google_oauth_course_mode");
  response.cookies.delete("google_oauth_calendar");
  response.cookies.delete("google_oauth_return_to");
  return response;
}
