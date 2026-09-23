export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { fetchCanvasAssignments, getValidCanvasToken } from "@/lib/lms/canvas";
import { fetchGitLabAssignments } from "@/lib/lms/gitlab";
import { fetchIcsAssignments } from "@/lib/lms/ics";
import { getValidGoogleToken, fetchClassroomAssignments, type GoogleClassroomConfig } from "@/lib/lms/google";
import { syncLmsAssignments } from "@/lib/lms/sync";
import type { LmsProvider, NormalizedAssignment, SyncResult } from "@/lib/lms/types";
import { createClient } from "@/lib/supabase/server";
import {
  hydrateLmsConnectionCredentials,
  persistLmsTokenRefresh,
} from "@/lib/integrations/credential-vault";

type Connection = {
  id: string;
  provider: LmsProvider;
  config: Record<string, unknown>;
};

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync" }, { status: 401 });

  const { data: { session } } = await supabase.auth.getSession();
  const { data: rows, error } = await supabase
    .from("lms_connections")
    .select("id, provider, config")
    .eq("owner_id", user.id)
    .in("provider", ["canvas", "google_classroom", "ics", "gitlab"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const connections = (rows ?? []) as Connection[];
  const results: Array<(SyncResult & { connectionId: string }) | { connectionId: string; source: LmsProvider; error: string }> = [];

  for (const connection of connections) {
    try {
      const securedConnection = await hydrateLmsConnectionCredentials(user.id, connection);
      let fetched: { items: NormalizedAssignment[]; skipped: number };
      if (connection.provider === "canvas") {
        const cfg = securedConnection.config as { institution_id?: string; base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
        if (!cfg.base_url || !cfg.token) throw new Error("Canvas connection is missing credentials");
        const valid = await getValidCanvasToken({
          base_url: cfg.base_url,
          token: cfg.token,
          institution_id: cfg.institution_id,
          oauth: cfg.oauth,
          refresh_token: cfg.refresh_token,
          expires_at: cfg.expires_at,
        });
        if (valid.refreshed) {
          await persistLmsTokenRefresh(supabase as any, {
            ownerId: user.id,
            connection: securedConnection,
            accessToken: valid.refreshed.token,
            expiresAt: valid.refreshed.expires_at,
          });
        }
        fetched = await fetchCanvasAssignments({ institution_id: cfg.institution_id, base_url: cfg.base_url, token: valid.token });
      } else if (connection.provider === "ics") {
        const cfg = securedConnection.config as { url?: string };
        if (!cfg.url) throw new Error("Calendar connection is missing its URL");
        fetched = await fetchIcsAssignments(cfg.url);
      } else if (connection.provider === "google_classroom") {
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
          token = session?.provider_token ?? null;
        }
        if (!token) throw new Error("Google Classroom session needs to be refreshed");
        const gc = await fetchClassroomAssignments(token);
        fetched = { items: gc.items, skipped: gc.skipped };
      } else if (connection.provider === "gitlab") {
        fetched = await fetchGitLabAssignments(securedConnection.config as {
          project: string;
          token: string;
          base_url?: string;
          labels?: string;
        });
      } else {
        continue;
      }

      const result = await syncLmsAssignments(
        supabase,
        user.id,
        connection.provider,
        fetched.items,
        fetched.skipped,
      );
      await supabase
        .from("lms_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", connection.id)
        .eq("owner_id", user.id);
      results.push({ ...result, connectionId: connection.id });
    } catch (err) {
      results.push({
        connectionId: connection.id,
        source: connection.provider,
        error: err instanceof Error ? err.message : "Sync had a problem",
      });
    }
  }

  const imported = results.reduce((sum, result) => sum + ("imported" in result ? result.imported : 0), 0);
  const skipped = results.reduce((sum, result) => sum + ("skipped" in result ? result.skipped : 0), 0);
  return NextResponse.json({ imported, skipped, results });
}
