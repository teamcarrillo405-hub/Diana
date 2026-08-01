export const runtime = "nodejs";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fetchCanvasAssignments } from "@/lib/lms/canvas";
import { syncLmsAssignments } from "@/lib/lms/sync";
import {
  fetchCanvasDestination,
  resolveCanvasInstitutionById,
} from "@/lib/security/canvas-institutions";
import {
  saveLmsConnectionWithCredential,
} from "@/lib/integrations/credential-vault";
import { createClient } from "@/lib/supabase/server";

type CanvasTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

function settingsRedirect(requestUrl: string, status: string, courseMode = false): NextResponse {
  const url = new URL(courseMode ? "/course-mode" : "/settings", requestUrl);
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
  const returnedState = requestUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("canvas_oauth_state")?.value;
  const institutionId = cookieStore.get("canvas_oauth_institution")?.value;
  const courseMode = cookieStore.get("canvas_oauth_course_mode")?.value === "teacher";

  if (!code || !returnedState || !expectedState || returnedState !== expectedState || !institutionId) {
    return settingsRedirect(request.url, "state-mismatch", courseMode);
  }

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
  };
  try {
    await saveLmsConnectionWithCredential(supabase, {
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
  try {
    const { items, skipped } = await fetchCanvasAssignments({
      institution_id: institution.id,
      base_url: institution.origin,
      token: tokenBody.access_token,
    });
    await syncLmsAssignments(supabase, user.id, "canvas", items, skipped);
    await supabase
      .from("lms_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("owner_id", user.id)
      .eq("provider", "canvas");
    return settingsRedirect(request.url, "connected");
  } catch {
    return settingsRedirect(request.url, "connected-sync-later");
  }
}
