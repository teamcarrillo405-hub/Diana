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
  hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime,
} from "@/lib/lms/credential-policy";
import { lmsOperationErrorDetails } from "@/lib/lms/errors";
import { assertLmsProviderFeatureEnabled } from "@/lib/lms/provider-features";

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
const CONNECTION_PAGE_SIZE = 250;
const MAX_CONNECTIONS_PER_RUN = 5_000;
const RUN_TIME_BUDGET_MS = 270_000;

type CronLmsConnection = {
  id: string;
  owner_id: string;
  provider: string;
  config: unknown;
};

type LmsSyncPartialReason =
  | "connection_failures"
  | "connection_limit"
  | "query_error"
  | "time_budget";

export async function GET(request: Request) {
  if (!hasValidCronBearer(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const resumeCursor = readResumeCursor(request);
  const supabase = createServiceClient();
  return runObservedCronJob({
    routeName: "/api/cron/lms-sync",
    jobName: "lms-sync",
    serviceClient: supabase,
    execute: () => runLmsSync(supabase, {
      cursor: resumeCursor,
      deadline: startedAt + RUN_TIME_BUDGET_MS,
    }),
    summarize: summarizeLmsSyncRun,
  });
}

async function runLmsSync(
  supabase: ReturnType<typeof createServiceClient>,
  options: { cursor: string | null; deadline: number },
) {
  if (!supabase) {
    return NextResponse.json({ error: "Service client not configured" }, { status: 500 });
  }

  let connections = 0;
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let reconnectRequired = 0;
  let cursor = options.cursor;
  let stopReason: Exclude<LmsSyncPartialReason, "connection_failures"> | null = null;
  let queryError: string | null = null;
  const attemptedConnectionIds = new Set<string>();

  pageLoop:
  while (true) {
    if (Date.now() >= options.deadline) {
      stopReason = "time_budget";
      break;
    }

    const remaining = MAX_CONNECTIONS_PER_RUN - connections;
    if (remaining <= 0) {
      stopReason = "connection_limit";
      break;
    }

    const pageSize = Math.min(CONNECTION_PAGE_SIZE, remaining);
    let query = supabase
      .from("lms_connections")
      .select("id, owner_id, provider, config")
      .in("provider", CRON_PROVIDERS);
    if (cursor) query = query.gt("id", cursor);

    const { data, error } = await query
      .order("id", { ascending: true })
      .limit(pageSize + 1);
    if (error) {
      stopReason = "query_error";
      queryError = error.message;
      break;
    }

    const rows = (data ?? []) as CronLmsConnection[];
    const hasMore = rows.length > pageSize;
    const page = rows.slice(0, pageSize);
    if (page.length === 0) break;

    let pageAdvanced = false;
    for (const connection of page) {
      if (
        attemptedConnectionIds.has(connection.id)
        || (cursor !== null && connection.id <= cursor)
      ) {
        continue;
      }

      if (Date.now() >= options.deadline) {
        stopReason = "time_budget";
        break pageLoop;
      }

      pageAdvanced = true;
      cursor = connection.id;
      attemptedConnectionIds.add(connection.id);
      connections += 1;
      try {
        const result = await syncConnection(supabase, connection);
        imported += result.imported;
        skipped += result.skipped;
      } catch (error) {
        // One bad connection (expired token, dead ICS url) never blocks the rest.
        if (lmsOperationErrorDetails(error)?.code === "reconnect_required") reconnectRequired += 1;
        failed += 1;
      }
    }

    if (!pageAdvanced) {
      stopReason = "query_error";
      queryError = "LMS connection pagination did not advance.";
      break;
    }
    if (!hasMore) break;
    if (connections >= MAX_CONNECTIONS_PER_RUN) {
      stopReason = "connection_limit";
      break;
    }
  }

  const continuationRequired = stopReason !== null;
  const partialReason: LmsSyncPartialReason | null = stopReason ?? (
    failed > 0 ? "connection_failures" : null
  );
  const response = {
    ok: stopReason !== "query_error",
    status: partialReason ? "partial" as const : "complete" as const,
    continuation_required: continuationRequired,
    partial_reason: partialReason,
    next_cursor: continuationRequired ? cursor : null,
    connections,
    imported,
    skipped,
    failed,
    reconnect_required: reconnectRequired,
    ...(queryError ? { error: queryError } : {}),
  };

  return NextResponse.json(response, stopReason === "query_error" ? { status: 500 } : undefined);
}

async function syncConnection(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  connection: CronLmsConnection,
) {
  if (connection.provider === "canvas") assertLmsProviderFeatureEnabled("canvas_import");
  if (connection.provider === "google_classroom") assertLmsProviderFeatureEnabled("google_import");
  const securedConnection = await hydrateLmsConnectionForRuntime(connection.owner_id, connection);
  const cfg = securedConnection.config;
  let fetched: { items: NormalizedAssignment[]; skipped: number };
  if (connection.provider === "canvas") {
    const base_url = cfg.base_url as string | undefined;
    if (!base_url) throw new Error("Canvas connection is missing its URL");
    const valid = await getValidCanvasToken({
      institution_id: cfg.institution_id as string | undefined,
      base_url,
      token: cfg.token as string | undefined,
      oauth: cfg.oauth as boolean | undefined,
      refresh_token: cfg.refresh_token as string | null | undefined,
      expires_at: cfg.expires_at as string | null | undefined,
    });
    if (valid.refreshed) {
      await persistLmsTokenRefreshForRuntime(supabase as any, {
        ownerId: connection.owner_id,
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
  } else if (connection.provider === "ics") {
    const url = cfg.url as string | undefined;
    if (!url) throw new Error("missing ICS url");
    fetched = await fetchIcsAssignments(url);
  } else if (connection.provider === "gitlab") {
    fetched = await fetchGitLabAssignments(
      cfg as { project: string; token: string; base_url?: string; labels?: string },
    );
  } else if (connection.provider === "google_classroom") {
    const valid = await getValidGoogleToken(cfg as GoogleClassroomConfig);
    if (valid.refreshed) {
      await persistLmsTokenRefreshForRuntime(supabase as any, {
        ownerId: connection.owner_id,
        connection: securedConnection,
        accessToken: valid.refreshed.access_token,
        expiresAt: valid.refreshed.expires_at,
      });
    }
    const gc = await fetchClassroomAssignments(valid.token);
    fetched = { items: gc.items, skipped: gc.skipped };
  } else {
    return { imported: 0, skipped: 0 };
  }

  const result = await syncLmsAssignments(
    supabase,
    connection.owner_id,
    connection.provider as LmsProvider,
    fetched.items,
    fetched.skipped,
  );

  await supabase
    .from("lms_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  return result;
}

function readResumeCursor(request: Request): string | null {
  const cursor = new URL(request.url).searchParams.get("cursor")?.trim();
  return cursor || null;
}

function summarizeLmsSyncRun(response: Response, body: unknown): CronRunOutcome {
  const result = asRecord(body);
  const connections = Number(result.connections) || 0;
  const connectionFailures = Number(result.failed) || 0;
  const continuationRequired = result.continuation_required === true;
  const continuationUnits = continuationRequired ? 1 : 0;
  const processed = connections + continuationUnits;
  const failed = connectionFailures + continuationUnits;
  const healthy = response.ok && failed === 0;
  return {
    processed,
    succeeded: Math.max(0, connections - connectionFailures),
    failed,
    retryCount: healthy ? 0 : Math.max(1, failed),
    errorCode: healthy ? null : continuationRequired ? "lms_sync_incomplete" : "lms_sync_failed",
    errorSummary: healthy
      ? null
      : continuationRequired
        ? "LMS synchronization requires continuation from its reported cursor."
        : "LMS synchronization did not complete successfully.",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
