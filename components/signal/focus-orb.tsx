import { ArrowRight, BookOpenCheck, Clock3, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { ClarityOrb, type DianaOrbState } from "@/components/signal/clarity-orb";
import { SpotlightSurface } from "@/components/student-portal/spotlight-surface";

const fallbackDotCount = 138;

const fallbackDots = Array.from({ length: fallbackDotCount }, (_, index) => {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / (fallbackDotCount - 1)) * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const angle = goldenAngle * index;
  const depth = Math.sin(angle) * radius;
  const shellNoise =
    0.92 +
    Math.sin(index * 1.713) * 0.052 +
    Math.cos(index * 0.691) * 0.036;
  const x = radius * Math.cos(angle) * shellNoise * (1 + Math.sin(index * 0.37) * 0.035);
  const projectedY = y * shellNoise * (0.95 + Math.cos(index * 0.41) * 0.04);
  const scaleNoise = 0.9 + Math.sin(index * 2.317) * 0.08 + Math.cos(index * 0.823) * 0.045;

  return {
    x: 50 + x * 36,
    y: 50 + projectedY * 34,
    scale: (0.78 + (depth + 1) * 0.13) * scaleNoise,
    opacity: 0.46 + (depth + 1) * 0.2,
    size: 0.88 + Math.max(0, depth) * 0.16 + Math.sin(index * 1.119) * 0.06,
  };
});

const stateLabels: Record<DianaOrbState, string> = {
  low: "low energy",
  okay: "okay",
  "on-it": "on it",
  overwhelmed: "overwhelmed",
  creative: "creative",
};

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

export function FocusOrb({
  title,
  nextMove,
  reason,
  href,
  minutes,
  brainState = "okay",
}: {
  title: string;
  nextMove: string;
  reason: string;
  href: string;
  minutes: number;
  brainState?: DianaOrbState;
}) {
  const coreTitle = compactText(title, 38);
  const coreMove = compactText(nextMove, 62);

  return (
    <section
      className="right-now-signal next-move-artifact"
      data-orb-state={brainState}
      data-screenshot-moment="right-now"
    >
      <SpotlightSurface className="next-move-shell">
        <div className="right-now-copy">
          <p className="signal-eyebrow">Your next {minutes} minutes</p>
          <h2>{title}</h2>
          <p>{nextMove}</p>
          <a href={href} className="right-now-action">
            Start this move
            <ArrowRight size={18} />
          </a>
        </div>

        <div className="next-move-visual clarity-orb-stage">
          <div className="clarity-orb-shell">
            <div className="clarity-orb-static" aria-hidden="true">
              {fallbackDots.map((dot, index) => (
                <span
                  key={index}
                  className="clarity-orb-dot"
                  style={
                    {
                      "--dot-x": `${dot.x}%`,
                      "--dot-y": `${dot.y}%`,
                      "--dot-scale": dot.scale,
                      "--dot-opacity": dot.opacity,
                      "--dot-size": dot.size,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
            <ClarityOrb
              size={760}
              visualScale={0.5}
              state={brainState}
              className="clarity-orb-canvas"
              label={`Diana focus orb for ${stateLabels[brainState]} and the next ${minutes} minutes`}
            />
            <div className="clarity-orb-core" aria-hidden="true">
              <span className="clarity-orb-state">{stateLabels[brainState]}</span>
              <strong>{minutes} minutes</strong>
              <em>{coreTitle}</em>
              <small><span>First move</span>{coreMove}</small>
            </div>
          </div>

          <div className="clarity-orb-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="ownership-seal">
            <ShieldCheck size={18} />
            <span>yours</span>
          </div>
        </div>

        <div className="right-now-proof">
          <span><Clock3 size={16} /> {reason}</span>
          <span><BookOpenCheck size={16} /> source visible</span>
          <span><ShieldCheck size={16} /> your words stay yours</span>
        </div>
      </SpotlightSurface>
    </section>
  );
}
