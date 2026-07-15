import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { MISSION_TONE_TOKEN, type MissionTone } from "./metric-tile";

const BORDER_TOKENS: Record<MissionTone, string> = {
  cyan: "var(--gl-cyan-22)",
  pink: "var(--gl-pink-30)",
  gold: "var(--gl-gold-28)",
  blue: "var(--gl-blue-28)",
  purple: "var(--gl-purple-30)",
};

const BACKGROUND_TOKENS: Record<MissionTone, string> = {
  cyan: "var(--gl-cyan-08)",
  pink: "var(--gl-pink-12)",
  gold: "var(--gl-gold-12)",
  blue: "var(--gl-blue-12)",
  purple: "var(--gl-purple-12)",
};

export function MissionCard({
  href,
  tone,
  children,
}: {
  href: string;
  tone: MissionTone;
  children: ReactNode;
}) {
  const style = {
    "--mission-tone": MISSION_TONE_TOKEN[tone],
    "--mission-border": BORDER_TOKENS[tone],
    "--mission-bg": BACKGROUND_TOKENS[tone],
  } as CSSProperties;
  return (
    <Link className="ds-mission-card" href={href} style={style}>
      <span className="ds-mission-card__accent" aria-hidden="true" />
      {children}
    </Link>
  );
}

export function MissionProgress({ percent }: { percent: number }) {
  const bounded = Math.max(0, Math.min(100, percent));
  return (
    <span className="ds-mission-progress" aria-label={`${bounded}% ready`}>
      <i style={{ width: `${bounded}%` }} />
    </span>
  );
}
