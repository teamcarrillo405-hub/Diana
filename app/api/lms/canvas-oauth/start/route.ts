export const runtime = "nodejs";

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function settingsRedirect(requestUrl: string, status: string): NextResponse {
  const url = new URL("/settings", requestUrl);
  url.searchParams.set("canvas", status);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return settingsRedirect(request.url, "sign-in");

  const clientId = process.env.CANVAS_CLIENT_ID;
  if (!clientId) return settingsRedirect(request.url, "not-configured");

  const requestUrl = new URL(request.url);
  const rawBaseUrl = requestUrl.searchParams.get("base_url")?.trim();
  if (!rawBaseUrl) return settingsRedirect(request.url, "missing-url");

  let baseUrl: URL;
  try {
    baseUrl = new URL(rawBaseUrl);
  } catch {
    return settingsRedirect(request.url, "invalid-url");
  }
  if (baseUrl.protocol !== "https:") return settingsRedirect(request.url, "invalid-url");

  const canvasOrigin = baseUrl.origin;
  const state = randomUUID();
  const redirectUri = new URL("/api/lms/canvas-oauth/callback", request.url).toString();
  const authUrl = new URL("/login/oauth2/auth", canvasOrigin);
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
  response.cookies.set("canvas_oauth_base", canvasOrigin, cookieOptions);
  return response;
}
