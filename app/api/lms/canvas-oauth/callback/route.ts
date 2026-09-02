export const runtime = "nodejs";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { canvasOAuthScopes, fetchCanvasAssignments } from "@/lib/lms/canvas";
import { saveLmsConnectionForRuntime } from "@/lib/lms/credential-policy";
import { lmsOAuthStateSecret, verifyLmsOAuthState } from "@/lib/lms/oauth-state";
import { lmsProviderCapabilities } from "@/lib/lms/provider-features";
import { syncLmsAssignments } from "@/lib/lms/sync";
import { provisionCourseModeLmsStudentLinksFromImport } from "@/lib/lms/course-mode-identity";
import { lmsOperationErrorDetails } from "@/lib/lms/errors";
import {
  fetchCanvasDestination,
  resolveCanvasInstitutionById,
} from "@/lib/security/canvas-institutions";
import { createClient } from "@/lib/supabase/server";

type CanvasTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

function settingsRedirect(requestUrl: string, status: string, courseMode = false): NextResponse {
  const url = new URL(courseMode ? "/classes" : "/settings", requestUrl);
  url.searchParams.set("canvas", status);
  const response = NextResponse.redirect(url);
  response.cookies.delete("canvas_oauth_state");
  response.cookies.delete("canvas_oauth_base");
  response.cookies.delete("canvas_oauth_institution");
  response.cookies.delete("canvas_oauth_course_mode");
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
    cookieVerifier: cookieStore.get("canvas_oauth_state")?.value,
    provider: "canvas",
    authenticatedOwnerId: user.id,
    secret: lmsOAuthStateSecret("canvas"),
  });
  if (!verification.ok || verification.payload.provider !== "canvas") {
    return settingsRedirect(request.url, "state-mismatch");
  }
  const { institutionId, courseMode } = verification.payload.context;
  const capabilities = lmsProviderCapabilities();

  if (!capabilities.canvas.import && !capabilities.canvas.submission) {
    return settingsRedirect(request.url, "disabled", courseMode);
  }
  if (providerError) return settingsRedirect(request.url, "denied", courseMode);
  if (!code) return settingsRedirect(request.url, "invalid-response", courseMode);

  const clientId = process.env.CANVAS_CLIENT_ID;
  const clientSecret = process.env.CANVAS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return settingsRedirect(request.url, "not-configured", courseMode);

  let institution;
  try {
    institution = await resolveCanvasInstitutionById(institutionId);
  } catch {
    return settingsRedirect(request.url, "not-configured", courseMode);
  }

  const redirectUri = new URL("/api/lms/canvas-oauth/callback", request.url).toString();
  const tokenUrl = new URL("/login/oauth2/token", institution.origin);
  let tokenRes: Response;
  try {
    tokenRes = await fetchCanvasDestination(institution, tokenUrl, {
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
    return settingsRedirect(request.url, "token-error", courseMode);
  }
  if (!tokenRes.ok) return settingsRedirect(request.url, "token-error", courseMode);

  const tokenBody = (await tokenRes.json()) as CanvasTokenResponse;
  if (!tokenBody.access_token) return settingsRedirect(request.url, "token-error", courseMode);

  const expiresAt =
    typeof tokenBody.expires_in === "number"
      ? new Date(Date.now() + tokenBody.expires_in * 1000).toISOString()
      : null;
  const config = {
    institution_id: institution.id,
    base_url: institution.origin,
    oauth: true,
    expires_at: expiresAt,
    token_type: tokenBody.token_type ?? "Bearer",
    connection_mode: courseMode ? "teacher" : "student",
    requested_scopes: canvasOAuthScopes({
      importEnabled: capabilities.canvas.import,
      submissionEnabled: capabilities.canvas.submission,
      teacher: courseMode,
    }),
  };
  let savedConnection: Awaited<ReturnType<typeof saveLmsConnectionForRuntime>>;
  try {
    savedConnection = await saveLmsConnectionForRuntime(supabase, {
      ownerId: user.id,
      provider: "canvas",
      config,
      accessToken: tokenBody.access_token,
      refreshToken: tokenBody.refresh_token,
    });
  } catch {
    return settingsRedirect(request.url, "save-error", courseMode);
  }

  if (courseMode) return settingsRedirect(request.url, "connected", true);
  if (!capabilities.canvas.import) return settingsRedirect(request.url, "connected");
  try {
    const { items, skipped } = await fetchCanvasAssignments({
      institution_id: institution.id,
      base_url: institution.origin,
      token: tokenBody.access_token,
    });
    await provisionCourseModeLmsStudentLinksFromImport({
      studentId: user.id,
      identityConnectionId: savedConnection.id,
      provider: "canvas",
      token: tokenBody.access_token,
      assignments: items,
      canvasInstitutionId: institution.id,
      canvasBaseUrl: institution.origin,
    });
    await syncLmsAssignments(supabase, user.id, "canvas", items, skipped);
    await supabase
      .from("lms_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("owner_id", user.id)
      .eq("provider", "canvas");
    return settingsRedirect(request.url, "connected");
  } catch (error) {
    const detail = lmsOperationErrorDetails(error);
    if (detail?.code === "reconnect_required") {
      return settingsRedirect(request.url, "reconnect_required", courseMode);
    }
    return settingsRedirect(request.url, "connected-sync-later");
  }
}
