import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildCanvaAuthUrl, canvaEnv } from "@/lib/integrations/canva";

export const dynamic = "force-dynamic";

/** Start the Canva OAuth (PKCE) flow. Auth required; state + verifier ride
 *  an httpOnly cookie to the callback. */
export async function GET(request: Request) {
  const env = canvaEnv();
  if (!env) {
    return NextResponse.redirect(new URL("/settings?canva=needs-setup", request.url));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const state = randomBytes(16).toString("hex");
  const verifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(verifier).digest("base64url");

  const cookieStore = await cookies();
  cookieStore.set("diana_canva_oauth", JSON.stringify({ state, verifier }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/api/canva",
  });

  return NextResponse.redirect(
    buildCanvaAuthUrl({ clientId: env.clientId, redirectUri: env.redirectUri, state, codeChallenge }),
  );
}
