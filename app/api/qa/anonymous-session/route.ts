import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production" || process.env.QA_CREATE_USER !== "true") {
    return NextResponse.json({ error: "QA auth bootstrap is disabled." }, { status: 404 });
  }

  const supabase = await createClient();
  const timezone = "America/Los_Angeles";
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        display_name: "Diana QA Student",
        date_of_birth: "2009-09-01",
        timezone,
      },
    },
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Anonymous QA sign-in did not return a user." },
      { status: 403 },
    );
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: data.user.id,
        display_name: "Diana QA Student",
        date_of_birth: "2009-09-01",
        age_bracket: "13_to_17",
        timezone,
        onboarded_at: new Date().toISOString(),
        consent_ai: true,
      },
      { onConflict: "user_id" },
    );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
