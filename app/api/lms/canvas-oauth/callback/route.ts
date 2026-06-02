export const runtime = "nodejs";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fetchCanvasAssignments } from "@/lib/lms/canvas";
import { syncLmsAssignments } from "@/lib/lms/sync";
import { createClient } from "@/lib/supabase/server";

type CanvasTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

function settingsRedirect(requestUrl: string, status: string): NextResponse {
  const url = new URL("/settings", requestUrl);
  url.searchParams.set("canvas", status);
  const response = NextResponse.redirect(url);
  response.cookies.delete("canvas_oauth_state");
  response.cookies.delete("canvas_oauth_base");
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
  const canvasBase = cookieStore.get("canvas_oauth_base")?.value;

  if (!code || !returnedState || !expectedState || returnedState !== expectedState || !canvasBase) {
    return settingsRedirect(request.url, "state-mismatch");
  }

  const clientId = process.env.CANVAS_CLIENT_ID;
  const clientSecret = process.env.CANVAS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return settingsRedirect(request.url, "not-configured");

  const redirectUri = new URL("/api/lms/canvas-oauth/callback", request.url).toString();
  const tokenUrl = new URL("/login/oauth2/token", canvasBase);
  const tokenRes = await fetch(tokenUrl, {
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
  if (!tokenRes.ok) return settingsRedirect(request.url, "token-error");

  const tokenBody = (await tokenRes.json()) as CanvasTokenResponse;
  if (!tokenBody.access_token) return settingsRedirect(request.url, "token-error");

  const expiresAt =
    typeof tokenBody.expires_in === "number"
      ? new Date(Date.now() + tokenBody.expires_in * 1000).toISOString()
      : null;
  const config = {
    base_url: canvasBase,
    token: tokenBody.access_token,
    oauth: true,
    refresh_token: tokenBody.refresh_token ?? null,
    expires_at: expiresAt,
    token_type: tokenBody.token_type ?? "Bearer",
  };

  const { data: existing } = await supabase
    .from("lms_connections")
    .select("id")
    .eq("owner_id", user.id)
    .eq("provider", "canvas")
    .limit(1)
    .maybeSingle();

  const write = existing?.id
    ? supabase.from("lms_connections").update({ config }).eq("id", existing.id)
    : supabase.from("lms_connections").insert({ owner_id: user.id, provider: "canvas", config });
  const { error: writeError } = await write;
  if (writeError) return settingsRedirect(request.url, "save-error");

  try {
    const { items, skipped } = await fetchCanvasAssignments({
      base_url: canvasBase,
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
