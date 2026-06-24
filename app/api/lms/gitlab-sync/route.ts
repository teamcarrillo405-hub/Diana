import { NextResponse } from "next/server";
import { fetchGitLabAssignments } from "@/lib/lms/gitlab";
import { syncLmsAssignments } from "@/lib/lms/sync";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync" }, { status: 401 });

  const { connectionId } = (await req.json()) as { connectionId?: string };
  if (!connectionId) {
    return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });
  }

  const { data: conn, error: connErr } = await supabase
    .from("lms_connections")
    .select("id, owner_id, provider, config")
    .eq("id", connectionId)
    .eq("owner_id", user.id)
    .eq("provider", "gitlab")
    .single();

  if (connErr || !conn) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  try {
    const fetched = await fetchGitLabAssignments(conn.config as {
      project: string;
      token: string;
      base_url?: string;
      labels?: string;
    });
    const result = await syncLmsAssignments(supabase, user.id, "gitlab", fetched.items, fetched.skipped);

    await supabase
      .from("lms_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connectionId)
      .eq("owner_id", user.id);

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "GitLab sync had a problem";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const runtime = "nodejs";
