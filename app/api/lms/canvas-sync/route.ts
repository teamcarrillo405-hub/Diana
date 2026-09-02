import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchCanvasAssignments, getValidCanvasToken } from "@/lib/lms/canvas";
import {
  hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime,
} from "@/lib/lms/credential-policy";
import { lmsOperationErrorDetails } from "@/lib/lms/errors";
import { assertLmsProviderFeatureEnabled } from "@/lib/lms/provider-features";
import { syncLmsAssignments } from "@/lib/lms/sync";
import { provisionCourseModeLmsStudentLinksFromImport } from "@/lib/lms/course-mode-identity";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync" }, { status: 401 });
  try {
    assertLmsProviderFeatureEnabled("canvas_import");
  } catch (error) {
    const detail = lmsOperationErrorDetails(error)!;
    return NextResponse.json({ error: detail.error, code: detail.code }, { status: detail.status });
  }

  const { connectionId } = (await req.json()) as { connectionId: string };
  if (!connectionId) {
    return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });
  }

  const { data: conn, error: connErr } = await supabase
    .from("lms_connections")
    .select("id, owner_id, provider, config")
    .eq("id", connectionId)
    .eq("provider", "canvas")
    .eq("owner_id", user.id)
    .single();

  if (connErr || !conn) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  let securedConnection;
  try {
    securedConnection = await hydrateLmsConnectionForRuntime(user.id, conn);
  } catch (error) {
    const detail = lmsOperationErrorDetails(error);
    return detail
      ? NextResponse.json({ error: detail.error, code: detail.code }, { status: detail.status })
      : NextResponse.json({ error: "Connection credentials are not available" }, { status: 503 });
  }
  const cfg = securedConnection.config as { institution_id?: string; base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
  if (!cfg.base_url) {
    return NextResponse.json({ error: "Connection is missing its Canvas URL" }, { status: 400 });
  }

  try {
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
    const { items, skipped } = await fetchCanvasAssignments({
      base_url: cfg.base_url,
      token: valid.token,
      institution_id: cfg.institution_id,
    });
    const identityProvisioning = await provisionCourseModeLmsStudentLinksFromImport({
      studentId: user.id,
      identityConnectionId: conn.id,
      provider: "canvas",
      token: valid.token,
      assignments: items,
      canvasInstitutionId: cfg.institution_id,
      canvasBaseUrl: cfg.base_url,
    });
    const result = await syncLmsAssignments(supabase, user.id, "canvas", items, skipped);

    await supabase
      .from("lms_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connectionId)
      .eq("owner_id", user.id);

    return NextResponse.json({ ...result, courseModeLinks: identityProvisioning.linked });
  } catch (e) {
    const detail = lmsOperationErrorDetails(e);
    if (detail) {
      return NextResponse.json({ error: detail.error, code: detail.code }, { status: detail.status });
    }
    const message = e instanceof Error ? e.message : "Canvas import had a problem";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
