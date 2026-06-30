/**
 * Single source of truth for "does this page render the shared <AppTopNav>?".
 *
 * Pages that show AppTopNav (or the interim DashboardTabs strip) replace the
 * left sidebar AND the floating Capture / I'm Stuck buttons with their own top
 * nav. components/nav.tsx (SideNav + BottomNav), components/quick-capture.tsx,
 * and components/overwhelmed-button.tsx all read THIS helper, so the rule can't
 * drift across files.
 *
 * When a new page is migrated to AppTopNav going forward, add it HERE — and
 * nowhere else. Do not re-check the pathname independently in those components.
 */
export function usesAppTopNav(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/assignments" ||
    pathname.startsWith("/assignments/") ||
    pathname === "/notes" ||
    pathname.startsWith("/notes/") ||
    pathname === "/classes" ||
    pathname.startsWith("/classes/") ||
    pathname === "/calendar" ||
    pathname === "/grades" ||
    pathname === "/inbox" ||
    pathname.startsWith("/inbox/") ||
    pathname === "/proof" ||
    pathname === "/future-path" ||
    pathname === "/flashcards" ||
    pathname.startsWith("/flashcards/") ||
    pathname === "/timer" ||
    pathname === "/break-down" ||
    pathname === "/study-buddy" ||
    pathname === "/study-groups" ||
    pathname === "/voice" ||
    pathname === "/quick-add" ||
    pathname === "/portfolio" ||
    pathname === "/me" ||
    pathname === "/wellness" ||
    pathname === "/export" ||
    pathname === "/ap" ||
    pathname === "/sharing" ||
    pathname === "/insights" ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  );
}
