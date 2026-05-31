import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchIcsAssignments } from "@/lib/lms/ics";
import { syncLmsAssignments } from "@/lib/lms/sync";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync" }, { status: 401 });

  const { connectionId } = (await req.json()) as { connectionId: string };
  if (!connectionId) {
    return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });
  }

  const { data: conn, error: connErr } = await supabase
    .from("lms_connections")
    .select("id, owner_id, provider, config")
    .eq("id", connectionId)
    .eq("provider", "ics")
    .single();

  if (connErr || !conn) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const cfg = conn.config as { url?: string };
  if (!cfg.url) {
    return NextResponse.json({ error: "Connection is missing the calendar URL" }, { status: 400 });
  }

  try {
    const { items, skipped } = await fetchIcsAssignments(cfg.url);
    const result = await syncLmsAssignments(supabase, user.id, "ics", items, skipped);

    await supabase
      .from("lms_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connectionId);

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Calendar import had a problem";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
