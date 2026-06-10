import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // api/email + api/push/send-due are cron endpoints with their own
    // CRON_SECRET bearer auth — the session middleware must not redirect them.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sw.js|api/email/|api/push/send-due|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)).*)",
  ],
};
