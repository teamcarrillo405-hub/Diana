import Link from "next/link";
import { Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchCanvasGrades } from "@/lib/lms/canvas";
import { recoveryMoves } from "@/lib/grades/insights";

const GRADE_FETCH_TIMEOUT_MS = 2500;

/**
 * The single highest-leverage grade move, surfaced where decisions happen.
 * Streams in behind Suspense and silently renders nothing on slow or absent
 * Canvas — the dashboard never waits on a network call to an LMS.
 */
export async function GradeMoveCard() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lms_connections")
    .select("config")
    .eq("provider", "canvas")
    .order("created_at", { ascending: false })
    .limit(1);

  const config = (data?.[0]?.config ?? null) as { base_url?: string; token?: string } | null;
  if (!config?.base_url || !config?.token) return null;

  try {
    const records = await withTimeout(
      fetchCanvasGrades({ base_url: config.base_url, token: config.token }),
      GRADE_FETCH_TIMEOUT_MS,
    );
    const move = recoveryMoves(records)[0];
    if (!move) return null;

    return (
      <Link
        href="/grades"
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
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}
