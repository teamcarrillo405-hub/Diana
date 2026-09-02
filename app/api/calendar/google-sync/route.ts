import { NextResponse } from "next/server";

import {
  hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime,
} from "@/lib/lms/credential-policy";
import { LmsReconnectRequiredError, lmsOperationErrorDetails } from "@/lib/lms/errors";
import { getValidGoogleToken, type GoogleClassroomConfig } from "@/lib/lms/google";
import { syncGoogleCalendarEvents } from "@/lib/lms/google-calendar";
import { assertLmsProviderFeatureEnabled } from "@/lib/lms/provider-features";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function googleCredentialRejection(error: unknown): boolean {
  return error instanceof Error && /\b(?:401|403)\b/u.test(error.message);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync your calendar." }, { status: 401 });
  try {
    assertLmsProviderFeatureEnabled("google_import");
  } catch (error) {
    const detail = lmsOperationErrorDetails(error)!;
    return NextResponse.json({ error: detail.error, code: detail.code }, { status: detail.status });
  }

  const { data: connection, error } = await supabase
    .from("lms_connections")
    .select("id, owner_id, provider, config, last_synced_at, created_at")
    .eq("owner_id", user.id)
    .eq("provider", "google_classroom")
    .maybeSingle();
  if (error || !connection) {
    return NextResponse.json({ error: "Connect Google Calendar before syncing." }, { status: 409 });
  }
  const config = connection.config as Record<string, unknown>;
  if (config.calendar_enabled !== true) {
    return NextResponse.json({ error: "Google Calendar permission is not connected yet." }, { status: 409 });
  }

  try {
    const securedConnection = await hydrateLmsConnectionForRuntime(user.id, connection as any);
    const valid = await getValidGoogleToken(securedConnection.config as GoogleClassroomConfig);
    if (valid.refreshed) {
      await persistLmsTokenRefreshForRuntime(supabase as any, {
        ownerId: user.id,
        connection: securedConnection,
        accessToken: valid.refreshed.access_token,
        expiresAt: valid.refreshed.expires_at,
      });
    }
    const result = await syncGoogleCalendarEvents(supabase as any, user.id, valid.token);
    return NextResponse.json({ ok: true, imported: result.imported, syncedAt: new Date().toISOString() });
  } catch (error) {
    const normalized = googleCredentialRejection(error)
      ? new LmsReconnectRequiredError("google_classroom")
      : error;
    const detail = lmsOperationErrorDetails(normalized);
    if (detail) {
      return NextResponse.json({ error: detail.error, code: detail.code }, { status: detail.status });
    }
    return NextResponse.json({ error: "Google Calendar could not sync right now. Try again shortly." }, { status: 502 });
  }
}
