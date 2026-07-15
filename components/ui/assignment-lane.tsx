import type { CSSProperties, ReactNode } from "react";
import { MISSION_TONE_TOKEN, type MissionTone } from "./metric-tile";

export function AssignmentLane({
  eyebrow,
  title,
  count,
  tone,
  children,
}: {
  eyebrow: string;
  title: string;
  count: number;
  tone: MissionTone;
  children: ReactNode;
}) {
  const style = { "--lane-tone": MISSION_TONE_TOKEN[tone] } as CSSProperties;
  return (
    <section className="ds-assignment-lane" style={style}>
      <header className="ds-assignment-lane__header">
        <div>
          <p className="ds-assignment-lane__eyebrow">{eyebrow}</p>
          <h2 className="ds-assignment-lane__title">{title}</h2>
        </div>
        <span className="ds-assignment-lane__count">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </header>
      <div className="ds-assignment-lane__grid">{children}</div>
    </section>
  );
}
