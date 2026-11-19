import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthDestination } from "@/lib/auth/entry";
import { issueRecoveryState, RECOVERY_COOKIE, recoveryCookieOptions, recoveryStateSecret } from "@/lib/auth/recovery-state";
function result(request: Request, status: string) {
  const url = new URL("/auth/result", request.url);
  url.searchParams.set("status", status);
  const response = NextResponse.redirect(url);
  response.cookies.set(RECOVERY_COOKIE, "", {
    ...recoveryCookieOptions(),
    maxAge: 0
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has("error")) return result(request, "link-unavailable");
  const code = url.searchParams.get("code"),
    hash = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type");
  if (!code && !hash || code && hash || (code?.length ?? 0) > 2048 || (hash?.length ?? 0) > 2048) return result(request, "link-unavailable");
  try {
    const supabase = await createClient();
    let recovery = false;
    let userId: string | undefined, accessToken: string | undefined, userRevision: string | undefined;
    if (hash) {
      if (type !== "recovery" && type !== "signup" && type !== "email") return result(request, "link-unavailable");
      const {
        data,
        error
      } = await supabase.auth.verifyOtp({
        token_hash: hash,
        type
      });
      if (error || !data.user || !data.session) return result(request, "link-unavailable");
      recovery = type === "recovery";
      userId = data.user.id;
      userRevision = data.user.updated_at;
      accessToken = data.session.access_token;
    } else {
      const {
        data,
        error
      } = await supabase.auth.exchangeCodeForSession(code!);
      if (error || !data.user || !data.session) return result(request, "link-unavailable");
      recovery = "redirectType" in data && data.redirectType === "recovery";
      userId = data.user.id;
      userRevision = data.user.updated_at;
      accessToken = data.session.access_token;
      // A query parameter cannot upgrade a normal sign-in/confirmation code into recovery.
      if (!recovery && (type === "recovery" || url.searchParams.get("next") === "/reset-password")) return result(request, "link-unavailable");
    }
    if (recovery) {
      const secret = recoveryStateSecret();
      if (!secret || !userId || !accessToken || !userRevision) return result(request, "recovery-unavailable");
      const next = safeAuthDestination(url.searchParams.get("return_to"));
      const destination = new URL("/reset-password", request.url);
      const response = NextResponse.redirect(destination);
      response.cookies.set(RECOVERY_COOKIE, issueRecoveryState({
        userId,
        userRevision,
        accessToken,
        next,
        secret
      }), recoveryCookieOptions());
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
    const response = NextResponse.redirect(new URL(safeAuthDestination(url.searchParams.get("next")), request.url));
    response.cookies.set(RECOVERY_COOKIE, "", {
      ...recoveryCookieOptions(),
      maxAge: 0
    });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return result(request, "link-unavailable");
  }
}
