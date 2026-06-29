/**
 * Dashboard layout — full-bleed pass-through.
 *
 * Renders children with no extra chrome so the lobby hero and tabs can run
 * edge-to-edge. Note: in the App Router this nests *inside* the parent
 * `(app)/layout.tsx`; it does not replace it. The parent auth gate still runs,
 * and SideNav/BottomNav visibility is governed by nav.tsx's own route guards.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
