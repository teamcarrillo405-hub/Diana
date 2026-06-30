import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchCanvasAssignments, getValidCanvasToken } from "@/lib/lms/canvas";
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
    .eq("provider", "canvas")
    .single();

  if (connErr || !conn) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const cfg = conn.config as { base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
  if (!cfg.base_url || !cfg.token) {
    return NextResponse.json({ error: "Connection is missing Canvas URL or token" }, { status: 400 });
  }

  try {
    const valid = await getValidCanvasToken({
      base_url: cfg.base_url,
      token: cfg.token,
      oauth: cfg.oauth,
      refresh_token: cfg.refresh_token,
      expires_at: cfg.expires_at,
    });
    if (valid.refreshed) {
      await supabase
        .from("lms_connections")
        .update({ config: { ...cfg, token: valid.refreshed.token, expires_at: valid.refreshed.expires_at } })
        .eq("id", conn.id);
    }
    const { items, skipped } = await fetchCanvasAssignments({
      base_url: cfg.base_url,
      token: valid.token,
    });
    const result = await syncLmsAssignments(supabase, user.id, "canvas", items, skipped);

    await supabase
      .from("lms_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connectionId);

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Canvas import had a problem";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
