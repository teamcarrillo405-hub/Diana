import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncLmsAssignments } from "@/lib/lms/sync";
import { getValidGoogleToken, fetchClassroomAssignments, type GoogleClassroomConfig } from "@/lib/lms/google";
import {
  hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime,
} from "@/lib/lms/credential-policy";
import { lmsOperationErrorDetails } from "@/lib/lms/errors";
import { assertLmsProviderFeatureEnabled } from "@/lib/lms/provider-features";
import { provisionCourseModeLmsStudentLinksFromImport } from "@/lib/lms/course-mode-identity";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync" }, { status: 401 });
  try {
    assertLmsProviderFeatureEnabled("google_import");
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
    .eq("provider", "google_classroom")
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
  const cfg = securedConnection.config as GoogleClassroomConfig;
  try {
    const valid = await getValidGoogleToken(cfg);
    if (valid.refreshed) {
      await persistLmsTokenRefreshForRuntime(supabase as any, {
        ownerId: user.id,
        connection: securedConnection,
        accessToken: valid.refreshed.access_token,
        expiresAt: valid.refreshed.expires_at,
      });
    }
    const { items, skipped } = await fetchClassroomAssignments(valid.token);

    const identityProvisioning = await provisionCourseModeLmsStudentLinksFromImport({
      studentId: user.id,
      identityConnectionId: conn.id,
      provider: "google_classroom",
      token: valid.token,
      assignments: items,
    });

    const result = await syncLmsAssignments(supabase, user.id, "google_classroom", items, skipped);
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
    const message = e instanceof Error ? e.message : "Classroom import had a problem";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
