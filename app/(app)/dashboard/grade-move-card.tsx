import Link from "next/link";
import { Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchCanvasGrades, getValidCanvasToken } from "@/lib/lms/canvas";
import {
  hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime,
} from "@/lib/lms/credential-policy";
import { LmsReconnectRequiredError, lmsOperationErrorDetails } from "@/lib/lms/errors";
import { assertLmsProviderFeatureEnabled } from "@/lib/lms/provider-features";
import { recoveryMoves } from "@/lib/grades/insights";

const GRADE_FETCH_TIMEOUT_MS = 2500;

/**
 * The single highest-leverage grade move, surfaced where decisions happen.
 * Streams in behind Suspense and silently renders nothing on slow or absent
 * Canvas — the dashboard never waits on a network call to an LMS.
 */
export async function GradeMoveCard() {
  try {
    assertLmsProviderFeatureEnabled("canvas_import");
  } catch {
    return null;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("lms_connections")
    .select("id, provider, config")
    .eq("owner_id", user.id)
    .eq("provider", "canvas")
    .order("created_at", { ascending: false })
    .limit(1);

  try {
    if (!data?.[0]) return null;
    const securedConnection = await hydrateLmsConnectionForRuntime(user.id, data[0]);
    const config = securedConnection.config as {
      institution_id?: string;
      base_url?: string;
      token?: string;
      oauth?: boolean;
      refresh_token?: string | null;
      expires_at?: string | null;
    };
    if (!config.base_url) throw new LmsReconnectRequiredError("canvas");
    const valid = await getValidCanvasToken({
      institution_id: config.institution_id,
      base_url: config.base_url,
      token: config.token,
      oauth: config.oauth,
      refresh_token: config.refresh_token,
      expires_at: config.expires_at,
    });
    if (valid.refreshed) {
      await persistLmsTokenRefreshForRuntime(supabase as any, {
        ownerId: user.id,
        connection: securedConnection,
        accessToken: valid.refreshed.token,
        expiresAt: valid.refreshed.expires_at,
      });
    }
    const records = await withTimeout(
      fetchCanvasGrades({
        institution_id: config.institution_id,
        base_url: config.base_url,
        token: valid.token,
      }),
      GRADE_FETCH_TIMEOUT_MS,
    );
    const move = recoveryMoves(records)[0];
    if (!move) return null;

    return (
      <Link
        href="/classes"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-6)",
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--gl-cyan-22)",
          background: "var(--gl-cyan-08)",
          padding: "var(--space-12)",
          textDecoration: "none",
        }}
      >
        <Target size={17} style={{ marginTop: 2, flexShrink: 0, color: "var(--gl-cyan)" }} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "var(--text-14)", fontWeight: "var(--weight-600)", color: "var(--gl-text-primary)" }}>
            One move that helps your grade: {move.title}
            <span style={{ fontWeight: "var(--weight-400)", color: "var(--gl-text-muted)" }}> · {move.courseName}</span>
          </span>
          <span style={{ display: "block", marginTop: 2, fontSize: "var(--text-12)", color: "var(--gl-text-muted)" }}>{move.reason}</span>
        </span>
      </Link>
    );
  } catch (error) {
    const normalized = error instanceof Error && /\b(?:401|403)\b/u.test(error.message)
      ? new LmsReconnectRequiredError("canvas")
      : error;
    if (lmsOperationErrorDetails(normalized)?.code === "reconnect_required") {
      return (
        <Link href="/settings?canvas=reconnect_required">
          Reconnect Canvas to refresh grade insights.
        </Link>
      );
    }
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}
