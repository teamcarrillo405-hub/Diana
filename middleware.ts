import { updateSession } from "@/lib/supabase/middleware";
import { createNonce, securityHeaders } from "@/lib/security/response-headers";
import type { NextRequest } from "next/server";

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
    // design/ is the static mock-data reference used for side-by-side review.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sw.js|design/|design$|api/email/|api/push/send-due|api/cron/lms-sync|api/cron/media-retention|api/cron/account-deletion|api/cron/ai-budget-reconciliation|api/cron/assignment-media-cleanup|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)).*)",
  ],
};
