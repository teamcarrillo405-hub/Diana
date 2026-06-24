import type { ReactNode } from "react";

type SignalStageProps = {
  children: ReactNode;
  className?: string;
  tone?: "dark" | "light";
  id?: string;
};

export function SignalStage({
  children,
  className = "",
  tone = "dark",
  id,
}: SignalStageProps) {
  return (
    <section
      id={id}
      className={`signal-stage ${tone === "dark" ? "signal-stage-dark" : "signal-stage-light"} ${className}`}
    >
      <div className="signal-noise" aria-hidden="true" />
      {children}
    </section>
  );
}
