import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";

// Default-deny: everything requires auth unless explicitly allowed here.
const PUBLIC_EXACT = new Set([
  "/",
  "/how-it-works",
  "/student-control",
  "/trust",
  "/early-access/unsubscribe",
  "/early-access/confirm",
  // The offline recovery screen must remain reachable without a session.
  "/offline",
  "/public-not-found",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  // Public, same-origin recognition code only. No student media or model
  // weights live here; keep every other vendor path behind the default gate.
  "/vendor/diana-recognition/worker.js",
  "/vendor/diana-recognition/worker.js.LEGAL.txt",
  "/vendor/diana-recognition/runtime-manifest.json",
  "/vendor/diana-recognition/ort-wasm-simd-threaded.mjs",
  "/vendor/diana-recognition/ort-wasm-simd-threaded.wasm",
  "/vendor/diana-recognition/ort-wasm-simd-threaded.jsep.mjs",
  "/vendor/diana-recognition/ort-wasm-simd-threaded.jsep.wasm",
  // Read-only, key-safe deployment identity used by the release SHA verifier.
  "/api/build-info",
  "/api/health",
  "/api/readiness",
  "/api/qa/anonymous-session",
  // Development-only QA login. The route itself returns 404 in production or
  // when QA_CREATE_USER is disabled.
  "/qa-session",
  // Handles its own feature flag, session check, and JSON response.
  "/api/diana/voice-candidate",
  "/api/diana/voice-candidate/status",
  // Backend worker endpoints use WORKER_API_TOKEN bearer auth, not Supabase sessions.
  "/api/workers/claim",
  "/api/workers/authorize",
  "/api/workers/complete",
  "/api/workers/metrics",
  "/api/workers/metrics/prometheus",
  "/api/workers/version",
  "/api/operations/metrics/prometheus",
]);
// "/share" is the account-less parent/teacher summary - it validates its own
// token server-side (service role), so it must bypass the auth wall.
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/icon",
  "/landing-3d",
  "/share",
  "/assets/landing-cinematic-v3",
];
const AUTH_ONLY_PREFIXES = ["/login", "/signup"];
const PRIVATE_ROUTE_ROOTS = new Set([
  "assignments",
  "calendar",
  "classes",
  "concepts",
  "dashboard",
  "export",
  "grades",
  "inbox",
  "insights",
  "more",
  "notes",
  "onboarding",
  "proof",
  "quick-add",
  "search",
  "settings",
  "sharing",
  "study",
  "study-artifacts",
  "study-buddy",
  "timer",
  "voice",
  "wellness",
]);

function isPublic(path: string): boolean {
  if (PUBLIC_EXACT.has(path)) return true;
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

function isUnknownPublicPath(path: string): boolean {
  if (path === "/" || path.startsWith("/api/") || path.includes(".")) return false;
  const root = path.split("/").filter(Boolean)[0];
  return Boolean(root && !PRIVATE_ROUTE_ROOTS.has(root) && !isPublic(path));
}

export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers = new Headers(request.headers),
) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });

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
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && isUnknownPublicPath(path)) {
    return NextResponse.rewrite(new URL("/public-not-found", request.url), { status: 404 });
  }

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
