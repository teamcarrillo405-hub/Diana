export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { fetchCanvasAssignments, getValidCanvasToken } from "@/lib/lms/canvas";
import { fetchGitLabAssignments } from "@/lib/lms/gitlab";
import { fetchIcsAssignments } from "@/lib/lms/ics";
import { getValidGoogleToken, fetchClassroomAssignments, type GoogleClassroomConfig } from "@/lib/lms/google";
import {
  hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime,
} from "@/lib/lms/credential-policy";
import { lmsOperationErrorDetails, type LmsOperationErrorCode } from "@/lib/lms/errors";
import { provisionCourseModeLmsStudentLinksFromImport } from "@/lib/lms/course-mode-identity";
import { assertLmsProviderFeatureEnabled } from "@/lib/lms/provider-features";
import { syncLmsAssignments } from "@/lib/lms/sync";
import type { LmsProvider, NormalizedAssignment, SyncResult } from "@/lib/lms/types";
import { createClient } from "@/lib/supabase/server";

type Connection = {
  id: string;
  provider: LmsProvider;
  config: Record<string, unknown>;
};

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync" }, { status: 401 });

  const { data: rows, error } = await supabase
    .from("lms_connections")
    .select("id, provider, config")
    .eq("owner_id", user.id)
    .in("provider", ["canvas", "google_classroom", "ics", "gitlab"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const connections = (rows ?? []) as Connection[];
  const results: Array<(SyncResult & { connectionId: string; courseModeLinks?: number }) | {
    connectionId: string;
    source: LmsProvider;
    error: string;
    code?: LmsOperationErrorCode;
  }> = [];

  for (const connection of connections) {
    try {
      if (connection.provider === "canvas") assertLmsProviderFeatureEnabled("canvas_import");
      if (connection.provider === "google_classroom") assertLmsProviderFeatureEnabled("google_import");
      const securedConnection = await hydrateLmsConnectionForRuntime(user.id, connection);
      let fetched: { items: NormalizedAssignment[]; skipped: number };
      let courseModeLinks: number | undefined;
      if (connection.provider === "canvas") {
        const cfg = securedConnection.config as { institution_id?: string; base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
        if (!cfg.base_url) throw new Error("Canvas connection is missing its URL");
        const valid = await getValidCanvasToken({
          base_url: cfg.base_url,
          token: cfg.token,
          institution_id: cfg.institution_id,
          oauth: cfg.oauth,
          refresh_token: cfg.refresh_token,
          expires_at: cfg.expires_at,
        });
        if (valid.refreshed) {
          await persistLmsTokenRefreshForRuntime(supabase as any, {
            ownerId: user.id,
            connection: securedConnection,
            accessToken: valid.refreshed.token,
            expiresAt: valid.refreshed.expires_at,
          });
        }
        fetched = await fetchCanvasAssignments({ institution_id: cfg.institution_id, base_url: cfg.base_url, token: valid.token });
        courseModeLinks = (await provisionCourseModeLmsStudentLinksFromImport({
          studentId: user.id,
          identityConnectionId: connection.id,
          provider: "canvas",
          token: valid.token,
          assignments: fetched.items,
          canvasInstitutionId: cfg.institution_id,
          canvasBaseUrl: cfg.base_url,
        })).linked;
      } else if (connection.provider === "ics") {
        const cfg = securedConnection.config as { url?: string };
        if (!cfg.url) throw new Error("Calendar connection is missing its URL");
        fetched = await fetchIcsAssignments(cfg.url);
      } else if (connection.provider === "google_classroom") {
        const cfg = securedConnection.config as GoogleClassroomConfig;
        const valid = await getValidGoogleToken(cfg);
        if (valid.refreshed) {
          await persistLmsTokenRefreshForRuntime(supabase as any, {
            ownerId: user.id,
            connection: securedConnection,
            accessToken: valid.refreshed.access_token,
            expiresAt: valid.refreshed.expires_at,
          });
        }
        const gc = await fetchClassroomAssignments(valid.token);
        fetched = { items: gc.items, skipped: gc.skipped };
        courseModeLinks = (await provisionCourseModeLmsStudentLinksFromImport({
          studentId: user.id,
          identityConnectionId: connection.id,
          provider: "google_classroom",
          token: valid.token,
          assignments: fetched.items,
        })).linked;
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
      results.push({
        ...result,
        connectionId: connection.id,
        ...(courseModeLinks === undefined ? {} : { courseModeLinks }),
      });
    } catch (err) {
      const detail = lmsOperationErrorDetails(err);
      results.push({
        connectionId: connection.id,
        source: connection.provider,
        error: detail?.error ?? (err instanceof Error ? err.message : "Sync had a problem"),
        ...(detail ? { code: detail.code } : {}),
      });
    }
  }

  const imported = results.reduce((sum, result) => sum + ("imported" in result ? result.imported : 0), 0);
  const skipped = results.reduce((sum, result) => sum + ("skipped" in result ? result.skipped : 0), 0);
  return NextResponse.json({ imported, skipped, results });
}
