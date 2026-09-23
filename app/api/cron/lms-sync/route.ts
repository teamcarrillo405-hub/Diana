export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { runObservedCronJob, type CronRunOutcome } from "@/lib/operations/cron-run";
import { hasValidCronBearer } from "@/lib/security/cron-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchCanvasAssignments, getValidCanvasToken } from "@/lib/lms/canvas";
import { fetchIcsAssignments } from "@/lib/lms/ics";
import { fetchGitLabAssignments } from "@/lib/lms/gitlab";
import { getValidGoogleToken, fetchClassroomAssignments, type GoogleClassroomConfig } from "@/lib/lms/google";
import { syncLmsAssignments } from "@/lib/lms/sync";
import type { LmsProvider, NormalizedAssignment } from "@/lib/lms/types";
import {
  hydrateLmsConnectionCredentials,
  persistLmsTokenRefresh,
} from "@/lib/integrations/credential-vault";

/**
 * Background LMS sync — invoked by Vercel cron (see vercel.json). Keeps Canvas
 * courses/classes + assignments (and ICS/GitLab) fresh without requiring a
 * student to open /settings. Service-role: walks every token-based connection
 * across all owners and re-syncs it.
 *
 * google_classroom is included when the service-only vault has a refresh token
 * (from the dedicated Google OAuth flow) — getValidGoogleToken mints a fresh
 * access token. Connections made the old session-token-only way have no refresh
 * token, so they're skipped here and stay on-demand until reconnected.
 *
 * Protected by CRON_SECRET; Vercel cron sends it as a bearer token.
 */
const CRON_PROVIDERS: LmsProvider[] = ["canvas", "ics", "gitlab", "google_classroom"];

export async function GET(request: Request) {
  if (!hasValidCronBearer(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  return runObservedCronJob({
    routeName: "/api/cron/lms-sync",
    jobName: "lms-sync",
    serviceClient: supabase,
    execute: () => runLmsSync(supabase),
    summarize: summarizeLmsSyncRun,
  });
}

async function runLmsSync(supabase: ReturnType<typeof createServiceClient>) {
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
    try {
      const securedConnection = await hydrateLmsConnectionCredentials(c.owner_id as string, c);
      const cfg = securedConnection.config;
      let fetched: { items: NormalizedAssignment[]; skipped: number };
      if (c.provider === "canvas") {
        const base_url = cfg.base_url as string | undefined;
        const token = cfg.token as string | undefined;
        if (!base_url || !token) throw new Error("missing Canvas credentials");
        const valid = await getValidCanvasToken({
          institution_id: cfg.institution_id as string | undefined,
          base_url,
          token,
          oauth: cfg.oauth as boolean | undefined,
          refresh_token: cfg.refresh_token as string | null | undefined,
          expires_at: cfg.expires_at as string | null | undefined,
        });
        if (valid.refreshed) {
          await persistLmsTokenRefresh(supabase as any, {
            ownerId: c.owner_id as string,
            connection: securedConnection,
            accessToken: valid.refreshed.token,
            expiresAt: valid.refreshed.expires_at,
          });
        }
        fetched = await fetchCanvasAssignments({
          institution_id: cfg.institution_id as string | undefined,
          base_url,
          token: valid.token,
        });
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
          await persistLmsTokenRefresh(supabase as any, {
            ownerId: c.owner_id as string,
            connection: securedConnection,
            accessToken: valid.refreshed.access_token,
            expiresAt: valid.refreshed.expires_at,
          });
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

function summarizeLmsSyncRun(response: Response, body: unknown): CronRunOutcome {
  const result = asRecord(body);
  const processed = Number(result.connections) || 0;
  const failed = Number(result.failed) || 0;
  const healthy = response.ok && failed === 0;
  return {
    processed,
    succeeded: Math.max(0, processed - failed),
    failed,
    retryCount: healthy ? 0 : Math.max(1, failed),
    errorCode: healthy ? null : "lms_sync_failed",
    errorSummary: healthy ? null : "LMS synchronization did not complete successfully.",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
