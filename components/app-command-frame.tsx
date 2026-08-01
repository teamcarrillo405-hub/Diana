import type { ReactNode } from "react";

/**
 * Canonical ScreenDesign pages own their viewport and spacing. Keeping this
 * wrapper server-rendered avoids a pathname-dependent hydration boundary around
 * streamed route templates.
 */
export function AppCommandFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-command-frame app-command-frame--flush min-w-0">
      {children}
    </div>
  );
}
