import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncLmsAssignments } from "@/lib/lms/sync";
import { getValidGoogleToken, fetchClassroomAssignments, type GoogleClassroomConfig } from "@/lib/lms/google";
import {
  hydrateLmsConnectionCredentials,
  persistLmsTokenRefresh,
} from "@/lib/integrations/credential-vault";

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
    .eq("provider", "google_classroom")
    .eq("owner_id", user.id)
    .single();
  if (connErr || !conn) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  // Prefer the stored OAuth token (refreshed via refresh_token); fall back to the
  // interactive Supabase Google session token for connections made the old way.
  let securedConnection;
  try {
    securedConnection = await hydrateLmsConnectionCredentials(user.id, conn);
  } catch {
    return NextResponse.json({ error: "Connection credentials are not available" }, { status: 503 });
  }
  const cfg = securedConnection.config as GoogleClassroomConfig;
  let token: string | null = null;
  const valid = await getValidGoogleToken(cfg);
  if (valid) {
    token = valid.token;
    if (valid.refreshed) {
      await persistLmsTokenRefresh(supabase as any, {
        ownerId: user.id,
        connection: securedConnection,
        accessToken: valid.refreshed.access_token,
        expiresAt: valid.refreshed.expires_at,
      });
    }
  } else {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.provider_token ?? null;
  }
  if (!token) {
    return NextResponse.json(
      { error: "Reconnect Google Classroom: connect via the Google button to enable background sync" },
      { status: 401 },
    );
  }

  try {
    const { items, skipped } = await fetchClassroomAssignments(token);

    const result = await syncLmsAssignments(supabase, user.id, "google_classroom", items, skipped);
    await supabase
      .from("lms_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connectionId)
      .eq("owner_id", user.id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Classroom import had a problem";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
