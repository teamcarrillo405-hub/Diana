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
        className="flex items-start gap-3 rounded-2xl border border-brand/25 bg-brand/5 p-4 transition hover:bg-brand/10"
      >
        <Target size={17} className="mt-0.5 shrink-0 text-brand" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold">
            One move that helps your grade: {move.title}
            <span className="font-normal text-muted"> · {move.courseName}</span>
          </span>
          <span className="mt-0.5 block text-xs text-muted">{move.reason}</span>
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
