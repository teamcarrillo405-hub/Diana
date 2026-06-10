import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { canvaEnv, exchangeCanvaCode } from "@/lib/integrations/canva";

export const dynamic = "force-dynamic";

/** Canva OAuth callback: verify state, exchange the code, store tokens. */
export async function GET(request: Request) {
  const env = canvaEnv();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const raw = cookieStore.get("diana_canva_oauth")?.value ?? null;
  cookieStore.delete("diana_canva_oauth");

  if (!env || !code || !state || !raw) {
    return NextResponse.redirect(new URL("/settings?canva=connect-issue", request.url));
  }

  let expected: { state?: string; verifier?: string } = {};
  try {
    expected = JSON.parse(raw) as { state?: string; verifier?: string };
  } catch {
    // fall through to the issue redirect below
  }
  if (!expected.state || !expected.verifier || expected.state !== state) {
    return NextResponse.redirect(new URL("/settings?canva=connect-issue", request.url));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const tokens = await exchangeCanvaCode(env, code, expected.verifier);
    const { error } = await supabase.from("canva_connections").upsert({
      owner_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scope: tokens.scope ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return NextResponse.redirect(new URL("/settings?canva=connected", request.url));
  } catch {
    return NextResponse.redirect(new URL("/settings?canva=connect-issue", request.url));
  }
}
