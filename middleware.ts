import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // api/email, api/push/send-due, api/cron/lms-sync are cron endpoints with
    // their own CRON_SECRET bearer auth — the session middleware must not
    // redirect them (no Supabase session on a cron request).
    // design/ is the static mock-data design reference (public/design) used to
    // review every screen side-by-side with the real pages — no student data.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sw.js|design/|design$|api/email/|api/push/send-due|api/cron/lms-sync|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)).*)",
  ],
};
