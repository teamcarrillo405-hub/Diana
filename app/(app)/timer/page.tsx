import Link from "next/link";
import { X } from "lucide-react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { type SessionMood } from "@/lib/executive/session";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { BodyDoubleUi } from "../body-double/body-double-ui";
import { TimerUi } from "./timer-ui";

export default async function FocusSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; difficulty?: string; with?: string }>;
}) {
  const [{ mode, difficulty, with: withParam }, profile, supabase] = await Promise.all([
    searchParams,
    loadProfile(),
    createClient(),
  ]);
  const roughMode = mode === "rough";
  const withOthers = withParam === "others";
  const parsedDifficulty = difficulty ? Number(difficulty) : null;
  const sessionMood: SessionMood =
    profile?.session_mood === "good" ||
    profile?.session_mood === "meh" ||
    profile?.session_mood === "rough"
      ? profile.session_mood
      : null;

  const { data: { user } } = await supabase.auth.getUser();
  const { data: assignment } = user
    ? await supabase
        .from("assignments")
        .select("id, title, kind, estimated_minutes, status")
        .eq("owner_id", user.id)
        .not("status", "in", "(submitted,graded,abandoned)")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  return (
    <ScreenDesignViewport className="sd-focus-session">
      <header className="sd-focus-header">
        <div>
          <DianaWordmark alt="Diana" />
          <i aria-hidden="true" />
          <h1>{withOthers ? "Focus together" : "Focus session"}</h1>
        </div>
        <Link href="/assignments" aria-label="Close focus session">
          <X aria-hidden="true" />
        </Link>
      </header>

      {withOthers ? (
        <div className="sd-focus-body-double"><BodyDoubleUi /></div>
      ) : (
        <TimerUi
          assignment={assignment ? {
            id: assignment.id,
            title: assignment.title,
            kind: assignment.kind,
            estimatedMinutes: assignment.estimated_minutes,
          } : null}
          roughMode={roughMode}
          sessionMood={sessionMood}
          difficulty={Number.isFinite(parsedDifficulty) ? parsedDifficulty : null}
        />
      )}
    </ScreenDesignViewport>
  );
}
