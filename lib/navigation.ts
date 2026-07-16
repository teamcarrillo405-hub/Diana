import {
  SCREEN_DESIGN_SCREENS,
  type ScreenDesignScreen,
} from "@/lib/screendesign/screens";

export const STUDENT_NAV_DESTINATIONS = Object.freeze([
  Object.freeze({ label: "Today", href: "/dashboard" }),
  Object.freeze({ label: "Work", href: "/assignments" }),
  Object.freeze({ label: "Classes", href: "/classes" }),
  Object.freeze({ label: "Calendar", href: "/calendar" }),
  Object.freeze({ label: "More", href: "/settings" }),
] as const);

export type StudentNavLabel =
  (typeof STUDENT_NAV_DESTINATIONS)[number]["label"];

const primaryRoute = (pathname: string): string =>
  pathname.split(/[?#]/u, 1)[0] || "/settings";

export function getStudentNavOwner(pathname: string): StudentNavLabel {
  const route = primaryRoute(pathname);
  const owner = STUDENT_NAV_DESTINATIONS.slice(0, -1).find(
    ({ href }) => route === href || route.startsWith(`${href}/`),
  );

  return owner?.label ?? "More";
}

export const SCREEN_DESIGN_NAV_OWNERS: ReadonlyMap<string, StudentNavLabel> =
  new Map(
    SCREEN_DESIGN_SCREENS.filter(
      (screen) => screen.authClass === "authenticated",
    ).map((screen) => [screen.id, getStudentNavOwner(screen.route)] as const),
  );

export function screenDesignStateKey(screen: ScreenDesignScreen): string {
  return `${screen.route}::${screen.stateSelector ?? "default"}`;
}

export function getScreenDesignRouteOwnerFile(
  screen: ScreenDesignScreen,
): string {
  if (screen.id === "smart-loading") return "app/(app)/loading.tsx";
  if (screen.id === "review-submit-checkpoint") {
    return "app/(app)/assignments/[id]/submit/page.tsx";
  }
  if (screen.route === "/onboarding") return "app/onboarding/page.tsx";
  if (screen.authClass === "public-token") {
    return `app${screen.route}/page.tsx`;
  }
  return `app/(app)${screen.route}/page.tsx`;
}

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
    pathname.startsWith("/grades/") ||
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
    pathname === "/study-artifacts" ||
    pathname.startsWith("/study-artifacts/") ||
    pathname === "/search" ||
    pathname === "/notifications" ||
    pathname === "/knowledge-graph" ||
    pathname.startsWith("/concepts/") ||
    pathname === "/upgrade" ||
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
