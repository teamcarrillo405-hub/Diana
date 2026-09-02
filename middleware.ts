import { updateSession } from "@/lib/supabase/middleware";
import { createNonce, securityHeaders } from "@/lib/security/response-headers";
import { isRetiredStudentRoute } from "@/lib/student-route-policy";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const nonce = createNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const headersForResponse = securityHeaders(
    nonce,
    process.env.NODE_ENV === "production",
  );
  requestHeaders.set(
    "Content-Security-Policy",
    headersForResponse["Content-Security-Policy"],
  );

  // The old routes are intentionally unavailable. Rewriting to the app's 404
  // keeps them from reviving an obsolete UI while preserving any shared data
  // adapters that canonical routes still use.
  if (isRetiredStudentRoute(request.nextUrl.pathname)) {
    const response = NextResponse.rewrite(new URL("/not-found", request.url), {
      status: 404,
    });
    for (const [name, value] of Object.entries(headersForResponse)) {
      response.headers.set(name, value);
    }
    return response;
  }

  const response = await updateSession(request, requestHeaders);
  for (const [name, value] of Object.entries(headersForResponse)) {
    response.headers.set(name, value);
  }
  if (request.nextUrl.pathname.startsWith("/share/")) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }
  return response;
}

export const config = {
  matcher: [
    // api/email, api/push/send-due, and cron endpoints have their own
    // CRON_SECRET bearer auth, so session middleware must not redirect them.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sw.js|api/email/|api/push/send-due|api/diana/openai-status|api/cron/lms-sync|api/cron/media-retention|api/cron/account-deletion|api/cron/ai-budget-reconciliation|api/cron/assignment-media-cleanup|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|mp4|webm|html)).*)",
  ],
};
