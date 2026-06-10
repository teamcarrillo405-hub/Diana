import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Dev QA bootstrap: clear onboarded_at for the signed-in QA user so E2E can
 * exercise the onboarding wizard. Same gating as the anonymous-session
 * route — never available in production.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production" || process.env.QA_CREATE_USER !== "true") {
    return NextResponse.json({ error: "QA auth bootstrap is disabled." }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: null })
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
