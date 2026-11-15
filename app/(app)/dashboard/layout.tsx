/**
 * Full-bleed Today layout. Authentication remains in the parent app layout.
 *
 * The approved frosted dashboard owns its foreground and surface colors.
 * - Scopes a `prefers-reduced-motion` reset to the dashboard so every
 *   animation/transition (mic pulse, card pulses, progress fills, carousel,
 *   CTA hover) collapses to instant for motion-sensitive students — a calm
 *   invariant requirement for this audience.
 *
 * Note: in the App Router this nests inside the parent `(app)/layout.tsx`;
 * it does not replace it. The parent auth gate still runs.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gl-dash-root">
      <style>{`
        .diana-authenticated-field:has([data-today-dashboard]),
        .app-command-frame:has([data-today-dashboard]) { padding: 0; max-width: none; background: transparent; }
        .app-command-frame:has([data-today-dashboard]) .diana-mobile-command,
        .diana-app:has([data-today-dashboard]) .agent-fab-anchor { display: none !important; }
        .gl-dash-root { width: 100%; min-width: 0; }
        body:has([data-today-dashboard]) { background: #141922; }
        @media (prefers-reduced-motion: reduce) {
          .gl-dash-root, .gl-dash-root * {
            animation: none !important;
            transition: none !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
      {children}
    </div>
  );
}
