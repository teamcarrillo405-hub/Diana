export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { canvasOAuthScopes } from "@/lib/lms/canvas";
import { assertLmsCredentialVaultAvailable } from "@/lib/lms/credential-policy";
import {
  issueLmsOAuthState,
  lmsOAuthStateSecret,
  LMS_OAUTH_STATE_TTL_MS,
} from "@/lib/lms/oauth-state";
import { lmsProviderCapabilities } from "@/lib/lms/provider-features";
import { resolveCanvasInstitutionFromRequest } from "@/lib/security/canvas-institutions";
import { createClient } from "@/lib/supabase/server";

function settingsRedirect(requestUrl: string, status: string, courseMode = false): NextResponse {
  const url = new URL(courseMode ? "/classes" : "/settings", requestUrl);
  url.searchParams.set("canvas", status);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return settingsRedirect(request.url, "sign-in");
  const requestUrl = new URL(request.url);
  const courseMode = requestUrl.searchParams.get("course_mode") === "teacher";
  const capabilities = lmsProviderCapabilities();
  if (!capabilities.canvas.import && !capabilities.canvas.submission) {
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

  const clientId = process.env.CANVAS_CLIENT_ID;
  const stateSecret = lmsOAuthStateSecret("canvas");
  if (
    !clientId
    || !process.env.CANVAS_CLIENT_SECRET
    || !stateSecret
    || (!process.env.CANVAS_INSTITUTIONS_JSON && !process.env.CANVAS_ALLOWED_ORIGINS)
  ) {
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

  const { state, cookieVerifier } = issueLmsOAuthState({
    provider: "canvas",
    ownerId: user.id,
    secret: stateSecret,
    context: {
      institutionId: institution.id,
      courseMode,
    },
  });
  const redirectUri = new URL("/api/lms/canvas-oauth/callback", request.url).toString();
  const authUrl = new URL("/login/oauth2/auth", institution.origin);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", canvasOAuthScopes({
    importEnabled: capabilities.canvas.import,
    submissionEnabled: capabilities.canvas.submission,
    teacher: courseMode,
  }).join(" "));

  const response = NextResponse.redirect(authUrl);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LMS_OAUTH_STATE_TTL_MS / 1000,
  };
  response.cookies.set("canvas_oauth_state", cookieVerifier, cookieOptions);
  response.cookies.delete("canvas_oauth_base");
  response.cookies.delete("canvas_oauth_institution");
  response.cookies.delete("canvas_oauth_course_mode");
  return response;
}
