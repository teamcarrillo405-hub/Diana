import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";

// Default-deny: everything requires auth unless explicitly allowed here.
const PUBLIC_EXACT = new Set([
  "/",
  "/manifest.webmanifest",
  "/api/qa/anonymous-session",
  // Handles its own feature flag, session check, and JSON response.
  "/api/diana/voice-candidate",
  "/api/diana/voice-candidate/status",
  // Backend worker endpoints use WORKER_API_TOKEN bearer auth, not Supabase sessions.
  "/api/workers/claim",
  "/api/workers/complete",
  "/api/workers/metrics",
  "/api/workers/metrics/prometheus",
  "/api/workers/version",
]);
// "/share" is the account-less parent/teacher summary — it validates its own
// token server-side (service role), so it must bypass the auth wall.
const PUBLIC_PREFIXES = ["/login", "/signup", "/auth", "/icon", "/film", "/landing-3d", "/share"];
const AUTH_ONLY_PREFIXES = ["/login", "/signup"];

function isPublic(path: string): boolean {
  if (PUBLIC_EXACT.has(path)) return true;
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: import("@supabase/ssr").CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && !isPublic(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ONLY_PREFIXES.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
