export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchCanvasAssignments } from "@/lib/lms/canvas";
import { fetchIcsAssignments } from "@/lib/lms/ics";
import { fetchGitLabAssignments } from "@/lib/lms/gitlab";
import { getValidGoogleToken, fetchClassroomAssignments, type GoogleClassroomConfig } from "@/lib/lms/google";
import { syncLmsAssignments } from "@/lib/lms/sync";
import type { LmsProvider, NormalizedAssignment } from "@/lib/lms/types";

/**
 * Background LMS sync — invoked by Vercel cron (see vercel.json). Keeps Canvas
 * courses/classes + assignments (and ICS/GitLab) fresh without requiring a
 * student to open /settings. Service-role: walks every token-based connection
 * across all owners and re-syncs it.
 *
 * google_classroom is included when the connection has a stored refresh_token
 * (from the dedicated Google OAuth flow) — getValidGoogleToken mints a fresh
 * access token. Connections made the old session-token-only way have no refresh
 * token, so they're skipped here and stay on-demand until reconnected.
 *
 * Protected by CRON_SECRET; Vercel cron sends it as a bearer token.
 */
const CRON_PROVIDERS: LmsProvider[] = ["canvas", "ics", "gitlab", "google_classroom"];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service client not configured" }, { status: 500 });
  }

  const { data: rows, error } = await supabase
    .from("lms_connections")
    .select("id, owner_id, provider, config")
    .in("provider", CRON_PROVIDERS)
    .limit(1000);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let connections = 0;
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const c of rows ?? []) {
    connections += 1;
    const cfg = (c.config ?? {}) as Record<string, unknown>;
    try {
      let fetched: { items: NormalizedAssignment[]; skipped: number };
      if (c.provider === "canvas") {
        const base_url = cfg.base_url as string | undefined;
        const token = cfg.token as string | undefined;
        if (!base_url || !token) throw new Error("missing Canvas credentials");
        fetched = await fetchCanvasAssignments({ base_url, token });
      } else if (c.provider === "ics") {
        const url = cfg.url as string | undefined;
        if (!url) throw new Error("missing ICS url");
        fetched = await fetchIcsAssignments(url);
      } else if (c.provider === "gitlab") {
        fetched = await fetchGitLabAssignments(
          cfg as { project: string; token: string; base_url?: string; labels?: string },
        );
      } else if (c.provider === "google_classroom") {
        const valid = await getValidGoogleToken(cfg as GoogleClassroomConfig);
        if (!valid) {
          // No stored refresh_token — can't background-sync; stays on-demand.
          failed += 1;
          continue;
        }
        if (valid.refreshed) {
          await supabase
            .from("lms_connections")
            .update({ config: { ...cfg, ...valid.refreshed } })
            .eq("id", c.id);
        }
        const gc = await fetchClassroomAssignments(valid.token);
        fetched = { items: gc.items, skipped: gc.skipped };
      } else {
        continue;
      }

      const result = await syncLmsAssignments(
        supabase,
        c.owner_id as string,
        c.provider as LmsProvider,
        fetched.items,
        fetched.skipped,
      );
      imported += result.imported;
      skipped += result.skipped;

      await supabase
        .from("lms_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", c.id);
    } catch {
      // One bad connection (expired token, dead ICS url) never blocks the rest.
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, connections, imported, skipped, failed });
}
