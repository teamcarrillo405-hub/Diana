import Link from "next/link";
import { TimerReset } from "lucide-react";
import { TimerUi } from "./timer-ui";
import { BodyDoubleUi } from "../body-double/body-double-ui";
import { loadProfile } from "@/lib/profile";
import type { SessionMood } from "@/lib/executive/session";
import { PageShell } from "../page-shell";

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
    <PageShell
      active="Work"
      eyebrow="Focus session"
      title={withOthers ? "Focus together." : "Your session."}
      subtitle={
        withOthers
          ? "A calm shared space. Someone else is focusing right now too."
          : roughMode
            ? "A smaller block is ready."
            : "Pick a block and a reward. Start when you're ready."
      }
      accent="var(--gl-cyan)"
      icon={TimerReset}
    >
      {/* Solo / With-others toggle */}
      <div role="tablist" aria-label="Focus mode" style={{ display: "flex", gap: "var(--space-4)", borderBottom: "1px solid var(--gl-border-neutral)" }}>
        {modes.map(({ key, label, href }) => {
          const isActive = key === activeKey;
          return (
            <Link
              key={key}
              role="tab"
              aria-selected={isActive}
              href={href}
              style={{
                marginBottom: -1,
                borderBottom: `2px solid ${isActive ? "var(--gl-cyan)" : "transparent"}`,
                padding: "var(--space-6) var(--space-10)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-13)",
                fontWeight: "var(--weight-700)",
                color: isActive ? "var(--gl-text-primary)" : "var(--gl-text-muted)",
                textDecoration: "none",
              }}
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
    </PageShell>
  );
}
