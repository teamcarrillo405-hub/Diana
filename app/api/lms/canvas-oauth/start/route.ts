export const runtime = "nodejs";

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { resolveCanvasInstitutionFromRequest } from "@/lib/security/canvas-institutions";
import { createClient } from "@/lib/supabase/server";

function settingsRedirect(requestUrl: string, status: string, courseMode = false): NextResponse {
  const url = new URL(courseMode ? "/course-mode" : "/settings", requestUrl);
  url.searchParams.set("canvas", status);
  return NextResponse.redirect(url);
}

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

  const clientId = process.env.CANVAS_CLIENT_ID;
  if (!clientId || (!process.env.CANVAS_INSTITUTIONS_JSON && !process.env.CANVAS_ALLOWED_ORIGINS)) {
    return settingsRedirect(request.url, "not-configured", courseMode);
  }

  const rawBaseUrl = requestUrl.searchParams.get("base_url")?.trim();
  if (!rawBaseUrl) return settingsRedirect(request.url, "missing-url", courseMode);

  let institution;
  try {
    institution = await resolveCanvasInstitutionFromRequest(rawBaseUrl);
  } catch {
    return settingsRedirect(request.url, "invalid-url", courseMode);
  }

  const state = randomUUID();
  const redirectUri = new URL("/api/lms/canvas-oauth/callback", request.url).toString();
  const authUrl = new URL("/login/oauth2/auth", institution.origin);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  };
  response.cookies.set("canvas_oauth_state", state, cookieOptions);
  response.cookies.set("canvas_oauth_institution", institution.id, cookieOptions);
  response.cookies.delete("canvas_oauth_base");
  response.cookies.set("canvas_oauth_course_mode", courseMode ? "teacher" : "student", cookieOptions);
  return response;
}
