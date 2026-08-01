export const runtime = "nodejs";

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  GOOGLE_CLASSROOM_SCOPES,
  GOOGLE_CLASSROOM_TEACHER_SCOPES,
} from "@/lib/lms/google";

function settingsRedirect(requestUrl: string, status: string, courseMode = false): NextResponse {
  const url = new URL(courseMode ? "/course-mode" : "/settings", requestUrl);
  url.searchParams.set("classroom", status);
  return NextResponse.redirect(url);
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
  if (!clientId) return settingsRedirect(request.url, "not-configured", courseMode);

  const state = randomUUID();
  const redirectUri = new URL("/api/lms/google-oauth/callback", request.url).toString();
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set(
    "scope",
    (courseMode ? GOOGLE_CLASSROOM_TEACHER_SCOPES : GOOGLE_CLASSROOM_SCOPES).join(" "),
  );
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent"); // force a refresh_token even on re-consent
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  response.cookies.set("google_oauth_course_mode", courseMode ? "teacher" : "student", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
