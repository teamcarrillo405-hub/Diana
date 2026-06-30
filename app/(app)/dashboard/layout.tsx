/**
 * Dashboard layout — full-bleed, dark-locked pass-through.
 *
 * - Wraps children in `.dark` so the app's token-based Tailwind components
 *   (THINK/PROOF cards: MoodCheckIn, GradeMoveCard, etc.) resolve to their
 *   dark values on the always-dark lobby, instead of leaking light-mode
 *   colors for light-mode users.
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
    <div className="dark gl-dash-root">
      <style>{`
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
