import type { CSSProperties, ReactNode } from "react";

export type MissionTone = "cyan" | "pink" | "gold" | "blue" | "purple";

export const MISSION_TONE_TOKEN: Record<MissionTone, string> = {
  cyan: "var(--gl-cyan)",
  pink: "var(--gl-pink)",
  gold: "var(--gl-gold)",
  blue: "var(--gl-blue)",
  purple: "var(--gl-purple-light)",
};

export function MetricTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  tone: MissionTone;
}) {
  const style = { "--metric-tone": MISSION_TONE_TOKEN[tone] } as CSSProperties;
  return (
    <div className="ds-metric-tile" style={style}>
      <span className="ds-metric-tile__bar" aria-hidden="true" />
      <strong className="ds-metric-tile__value">{value}</strong>
      <span className="ds-metric-tile__label">{label}</span>
      <span className="ds-metric-tile__detail">{detail}</span>
    </div>
  );
}
