"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Accessibility,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  Calendar,
  CalendarPlus,
  Camera,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  Images,
  LayoutTemplate,
  ListChecks,
  Menu,
  MessageCircle,
  Mic2,
  Search,
  Settings as Cog,
  ShieldCheck,
  Sparkles,
  Timer,
  UsersRound,
  X,
} from "lucide-react";
import { ThemeQuickToggle } from "@/components/theme-picker";

export type AppShellNavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

type AppShellNavGroup = {
  label: string;
  items: AppShellNavItem[];
  defaultOpen?: boolean;
};

const PRIMARY_MOBILE_ITEMS = [
  { href: "/dashboard", label: "Today", icon: Home },
  { href: "/quick-add", label: "Capture", icon: Camera },
  { href: "/assignments", label: "Work", icon: CheckSquare },
  { href: "/notes", label: "Think", icon: Brain },
  { href: "/proof", label: "Proof", icon: ShieldCheck },
] satisfies AppShellNavItem[];

const SECONDARY_ITEMS = [
  { href: "/focus", label: "Focus plan", icon: Timer },
  { href: "/study-buddy", label: "Study buddy", icon: MessageCircle },
  { href: "/break-down", label: "Break down", icon: ListChecks },
  { href: "/grades", label: "Grades", icon: BarChart3 },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/portfolio", label: "Portfolio", icon: Images },
  { href: "/voice", label: "Voice", icon: Mic2 },
  { href: "/me", label: "My brain", icon: Sparkles },
  { href: "/wellness", label: "Wellness", icon: HeartPulse },
  { href: "/future-path", label: "Future Path", icon: GraduationCap },
  { href: "/ap", label: "AP plan", icon: GraduationCap },
  { href: "/study-groups", label: "Groups", icon: UsersRound },
  { href: "/timer", label: "Timer", icon: Timer },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/imports", label: "Imports", icon: CalendarPlus },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/wins", label: "Wins", icon: Sparkles },
  { href: "/shame-mode", label: "Reset mode", icon: ClipboardList },
  { href: "/proof", label: "Proof", icon: ShieldCheck },
  { href: "/classes", label: "Classes", icon: BookOpen },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/accessibility", label: "Access", icon: Accessibility },
  { href: "/settings", label: "Settings", icon: Cog },
] satisfies AppShellNavItem[];

// Rail labels must fit the w-24 compact rail without truncating — keep them
// to one short word ("Assignments" becomes "Tasks" here only).
const DESKTOP_CORE_ITEMS = [
  { href: "/dashboard", label: "Today", icon: Home },
  { href: "/assignments", label: "Work", icon: CheckSquare },
  { href: "/notes", label: "Think", icon: Brain },
  { href: "/proof", label: "Proof", icon: ShieldCheck },
  { href: "/future-path", label: "Future", icon: GraduationCap },
] satisfies AppShellNavItem[];

const DESKTOP_GROUPS = [
  {
    label: "Schoolwork",
    defaultOpen: true,
    items: [
      { href: "/focus", label: "Focus plan", icon: Timer },
      { href: "/break-down", label: "Break down", icon: ListChecks },
      { href: "/templates", label: "Templates", icon: LayoutTemplate },
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/grades", label: "Grades", icon: BarChart3 },
      { href: "/classes", label: "Classes", icon: BookOpen },
    ],
  },
  {
    label: "Think",
    items: [
      { href: "/voice", label: "Talk it through", icon: Mic2 },
      { href: "/study-buddy", label: "Study buddy", icon: MessageCircle },
      { href: "/flashcards", label: "Flashcards", icon: Brain },
      { href: "/timer", label: "Timer", icon: Timer },
      { href: "/imports", label: "Imports", icon: CalendarPlus },
    ],
  },
  {
    label: "Proof and me",
    items: [
      { href: "/reminders", label: "Reminders", icon: Bell },
      { href: "/wellness", label: "Wellness", icon: HeartPulse },
      { href: "/wins", label: "Wins", icon: Sparkles },
      { href: "/portfolio", label: "Portfolio", icon: Images },
      { href: "/me", label: "My brain", icon: Sparkles },
      { href: "/study-groups", label: "Groups", icon: UsersRound },
      { href: "/insights", label: "Insights", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/accessibility", label: "Access", icon: Accessibility },
      { href: "/settings", label: "Settings", icon: Cog },
      { href: "/shame-mode", label: "Reset mode", icon: ClipboardList },
    ],
  },
] satisfies AppShellNavGroup[];

function isActivePath(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

export function BottomNav() {
  const path = usePathname();

  // Dashboard routes are full-bleed (own top nav) — hide the bottom nav there.
  if (path.startsWith("/dashboard")) return null;

  return (
    <nav
      className="nexus-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-raised/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-5 items-stretch">
        {PRIMARY_MOBILE_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(path, href);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                className={`touch-target flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold ${
                  active ? "is-active text-brand-strong dark:text-brand" : "text-muted"
                }`}
              >
                <Icon size={20} />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const path = usePathname();
  const secondaryActive = DESKTOP_GROUPS.some((group) => group.items.some((item) => isActivePath(path, item.href)));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  // The drawer is an overlay: never resting-open on page load, and any route
  // change dismisses it so it cannot cover the destination page's content.
  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = DESKTOP_GROUPS.map((group) => ({
    ...group,
    items: normalizedQuery
      ? group.items.filter((item) => item.label.toLowerCase().includes(normalizedQuery))
      : group.items,
  })).filter((group) => group.items.length > 0);

  // Dashboard routes are full-bleed (own top nav) — hide the sidebar there.
  if (path.startsWith("/dashboard")) return null;

  return (
    <aside className="nexus-side-nav hidden w-24 shrink-0 border-r border-border bg-surface-raised md:block" data-nav="compact-app-rail">
      <div className="sticky top-0 flex h-dvh flex-col items-center gap-4 px-2 py-4">
        <Link href="/dashboard" aria-label="Diana dashboard" className="nexus-logo-mark flex size-12 items-center justify-center rounded-3xl bg-brand/10 text-brand">
          <Sparkles size={20} />
        </Link>

        <nav className="flex w-full flex-1 flex-col items-stretch gap-2" aria-label="Primary app navigation">
          <ul className="space-y-2">
            {DESKTOP_CORE_ITEMS.map((item) => (
              <DesktopRailLink key={item.href} item={item} active={isActivePath(path, item.href)} />
            ))}
          </ul>
          <button
            type="button"
            aria-expanded={drawerOpen}
            aria-controls="desktop-more-drawer"
            onClick={() => setDrawerOpen((open) => !open)}
            className={`touch-target nexus-rail-link mt-2 flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
              drawerOpen || secondaryActive ? "is-active bg-brand/10 text-brand-strong dark:text-brand" : "text-muted hover:bg-surface-soft hover:text-fg"
            }`}
          >
            <Menu size={18} />
            <span className="max-w-full truncate">More</span>
          </button>
        </nav>

        <ThemeQuickToggle className="w-full" />

        <div className="nexus-rail-chip w-full rounded-3xl border border-brand/20 bg-brand/10 px-2 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase leading-4 tracking-wider text-brand-strong dark:text-brand">
            Next
            <br />
            move
          </p>
        </div>
      </div>

      {drawerOpen && (
        <div
          id="desktop-more-drawer"
          className="nexus-more-drawer fixed left-24 top-0 z-30 hidden h-dvh w-80 border-r border-border bg-surface/96 p-4 shadow-2xl backdrop-blur md:block"
          data-nav="searchable-more-drawer"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="nexus-kicker text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">More places</p>
              <h2 className="text-lg font-bold">Find what helps</h2>
            </div>
            <button
              type="button"
              aria-label="Close more navigation"
              onClick={() => setDrawerOpen(false)}
              className="touch-target inline-flex items-center justify-center rounded-2xl text-muted hover:bg-surface-soft hover:text-fg"
            >
              <X size={18} />
            </button>
          </div>

          <label className="nexus-route-search mt-4 flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-surface-raised px-3 py-2 text-sm" data-nav="desktop-route-search">
            <Search size={16} className="shrink-0 text-brand" />
            <span className="sr-only">Search Diana places</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search places"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </label>

          <nav className="mt-4 max-h-[calc(100dvh-8.5rem)] overflow-y-auto pr-1" aria-label="Secondary app navigation">
            <div className="space-y-4">
              {visibleGroups.map((group) => (
                <DesktopNavGroup
                  key={group.label}
                  group={group}
                  path={path}
                  onNavigate={() => setDrawerOpen(false)}
                />
              ))}
              {visibleGroups.length === 0 && (
                <p className="rounded-2xl border border-border bg-surface-raised p-4 text-sm text-muted">
                  No place matches that search.
                </p>
              )}
            </div>
          </nav>
        </div>
      )}
    </aside>
  );
}

function DesktopRailLink({
  item,
  active,
}: {
  item: AppShellNavItem;
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`touch-target nexus-rail-link flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
          active
            ? "is-active bg-brand/10 text-brand-strong dark:text-brand"
            : "text-muted hover:bg-surface-soft hover:text-fg"
        }`}
      >
        <Icon size={18} />
        <span className="max-w-full truncate">{item.label}</span>
      </Link>
    </li>
  );
}

function DesktopNavGroup({
  group,
  path,
  onNavigate,
}: {
  group: AppShellNavGroup;
  path: string;
  onNavigate?: () => void;
}) {
  const hasActiveItem = group.items.some((item) => isActivePath(path, item.href));

  return (
    <details className="group nexus-nav-group rounded-2xl border border-border bg-surface-raised p-1" open={group.defaultOpen || hasActiveItem}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted transition hover:bg-surface-soft">
        <span>{group.label}</span>
        <ChevronDown size={14} className="transition group-open:rotate-180" />
      </summary>
      <ul className="mt-1 space-y-1">
        {group.items.map((item) => (
          <DesktopNavLink key={item.href} item={item} active={isActivePath(path, item.href)} compact onNavigate={onNavigate} />
        ))}
      </ul>
    </details>
  );
}

function DesktopNavLink({
  item,
  active,
  compact = false,
  onNavigate,
}: {
  item: AppShellNavItem;
  active: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`nexus-drawer-link flex min-w-0 items-center gap-3 rounded-xl px-3 text-sm transition ${
          compact ? "py-2" : "py-2.5"
        } ${
          active
            ? "is-active bg-brand/10 text-brand-strong dark:text-brand"
            : "text-fg/80 hover:bg-surface-soft"
        }`}
      >
        <Icon size={16} className="shrink-0" />
        <span className="min-w-0 truncate">{item.label}</span>
      </Link>
    </li>
  );
}
