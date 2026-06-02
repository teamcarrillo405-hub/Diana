import Link from "next/link";
import { Users } from "lucide-react";
import { TimerUi } from "./timer-ui";
import { loadProfile } from "@/lib/profile";
import type { SessionMood } from "@/lib/executive/session";

export default async function TimerPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; difficulty?: string }>;
}) {
  const [{ mode, difficulty }, profile] = await Promise.all([searchParams, loadProfile()]);
  const roughMode = mode === "rough";
  const parsedDifficulty = difficulty ? Number(difficulty) : null;
  const sessionMood: SessionMood =
    profile?.session_mood === "good" || profile?.session_mood === "meh" || profile?.session_mood === "rough"
      ? profile.session_mood
      : null;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Your session</h1>
        <p className="text-sm text-muted">
          {roughMode ? "A smaller block is ready." : "Pick a block and a reward. Start when you&apos;re ready."}
        </p>
      </header>
      <TimerUi
        roughMode={roughMode}
        sessionMood={sessionMood}
        difficulty={Number.isFinite(parsedDifficulty) ? parsedDifficulty : null}
      />
      <Link
        href="/body-double"
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-border/30"
      >
        <Users size={20} className="shrink-0 text-muted" />
        <div>
          <p className="font-medium text-sm">Focus with others</p>
          <p className="text-xs text-muted">Someone else is studying right now too.</p>
        </div>
      </Link>
    </div>
  );
}
