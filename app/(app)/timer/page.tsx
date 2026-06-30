import Link from "next/link";
import { TimerUi } from "./timer-ui";
import { BodyDoubleUi } from "../body-double/body-double-ui";
import { loadProfile } from "@/lib/profile";
import type { SessionMood } from "@/lib/executive/session";
import { AppTopNav } from "../app-top-nav";

// Focus session — one surface, two modes. Solo = the timer; With others = the
// body-double shared space. /body-double redirects here with ?with=others.
export default async function FocusSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; difficulty?: string; with?: string }>;
}) {
  const [{ mode, difficulty, with: withParam }, profile] = await Promise.all([searchParams, loadProfile()]);
  const roughMode = mode === "rough";
  const withOthers = withParam === "others";
  const parsedDifficulty = difficulty ? Number(difficulty) : null;
  const sessionMood: SessionMood =
    profile?.session_mood === "good" || profile?.session_mood === "meh" || profile?.session_mood === "rough"
      ? profile.session_mood
      : null;

  const modes: { key: "solo" | "others"; label: string; href: string }[] = [
    { key: "solo", label: "Solo", href: "/timer" },
    { key: "others", label: "With others", href: "/timer?with=others" },
  ];
  const activeKey = withOthers ? "others" : "solo";

  return (
    <>
      <AppTopNav active="Work" />
      <div className="diana-page space-y-6">
        <header className="space-y-1">
          <p className="nexus-kicker">Focus session</p>
          <h1 className="text-display">{withOthers ? "Focus together" : "Your session"}</h1>
          <p className="text-sm text-muted">
            {withOthers
              ? "A calm shared space. Someone else is focusing right now too."
              : roughMode
                ? "A smaller block is ready."
                : "Pick a block and a reward. Start when you're ready."}
          </p>
        </header>

        {/* Solo / With-others toggle */}
        <div role="tablist" aria-label="Focus mode" className="flex gap-2 border-b border-border">
          {modes.map(({ key, label, href }) => {
            const isActive = key === activeKey;
            return (
              <Link
                key={key}
                role="tab"
                aria-selected={isActive}
                href={href}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
                  isActive ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {withOthers ? (
          <BodyDoubleUi />
        ) : (
          <TimerUi
            roughMode={roughMode}
            sessionMood={sessionMood}
            difficulty={Number.isFinite(parsedDifficulty) ? parsedDifficulty : null}
          />
        )}
      </div>
    </>
  );
}
