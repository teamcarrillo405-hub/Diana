import type { ReactNode } from "react";

// Shared wrapper for all WORK / THINK / PROOF / FUTURE tab pages.
// Provides the bg-base full-height outer div and the max-width centered inner div.
export function DashboardTabShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "var(--gl-bg-base)", minHeight: "100dvh" }}>
      <div
        style={{
          maxWidth: "var(--layout-max-width)",
          margin: "0 auto",
          padding: "var(--space-17) var(--space-17) var(--space-21)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
