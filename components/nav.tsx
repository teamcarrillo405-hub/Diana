"use client";

import { useState } from "react";
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
  Settings as Cog,
  ShieldCheck,
  Sparkles,
  Timer,
  UsersRound,
  X,
} from "lucide-react";

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
  { href: "/dashboard", label: "Focus", icon: Home },
  { href: "/assignments", label: "Assignments", icon: CheckSquare },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/flashcards", label: "Study", icon: Brain },
] satisfies AppShellNavItem[];

const SECONDARY_ITEMS = [
  { href: "/focus", label: "Focus plan", icon: Timer },
  { href: "/study-buddy", label: "Study buddy", icon: MessageCircle },
  { href: "/break-down", label: "Break down", icon: ListChecks },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/portfolio", label: "Portfolio", icon: Images },
  { href: "/voice", label: "Voice", icon: Mic2 },
  { href: "/wellness", label: "Wellness", icon: HeartPulse },
  { href: "/ap", label: "AP", icon: GraduationCap },
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

const DESKTOP_CORE_ITEMS = [
  ...PRIMARY_MOBILE_ITEMS,
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/voice", label: "Voice", icon: Mic2 },
] satisfies AppShellNavItem[];

const DESKTOP_GROUPS = [
  {
    label: "Study tools",
    defaultOpen: true,
    items: [
      { href: "/focus", label: "Focus plan", icon: Timer },
      { href: "/study-buddy", label: "Study buddy", icon: MessageCircle },
      { href: "/break-down", label: "Break down", icon: ListChecks },
      { href: "/ap", label: "AP", icon: GraduationCap },
      { href: "/timer", label: "Timer", icon: Timer },
      { href: "/templates", label: "Templates", icon: LayoutTemplate },
    ],
  },
  {
    label: "Capture",
    items: [
      { href: "/imports", label: "Imports", icon: CalendarPlus },
      { href: "/classes", label: "Classes", icon: BookOpen },
    ],
  },
  {
    label: "Life and progress",
    items: [
      { href: "/reminders", label: "Reminders", icon: Bell },
      { href: "/wellness", label: "Wellness", icon: HeartPulse },
      { href: "/wins", label: "Wins", icon: Sparkles },
      { href: "/portfolio", label: "Portfolio", icon: Images },
      { href: "/study-groups", label: "Groups", icon: UsersRound },
      { href: "/insights", label: "Insights", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/proof", label: "Proof", icon: ShieldCheck },
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
  const [moreOpen, setMoreOpen] = useState(false);
  const secondaryActive = SECONDARY_ITEMS.some((item) => isActivePath(path, item.href));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 mx-auto max-h-[70dvh] max-w-md overflow-y-auto rounded-2xl border border-border bg-surface-raised p-3 shadow-xl md:hidden">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <p className="text-sm font-semibold">More</p>
            <button
              type="button"
              aria-label="Close more menu"
              onClick={() => setMoreOpen(false)}
              className="touch-target inline-flex items-center justify-center rounded-xl text-muted hover:bg-surface-soft hover:text-fg"
            >
              <X size={18} />
            </button>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {SECONDARY_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(path, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`touch-target flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      active
                        ? "border-brand/30 bg-brand/10 text-brand-strong dark:text-brand"
                        : "border-border bg-surface text-muted hover:bg-surface-soft"
                    }`}
                  >
                    <Icon size={17} className="shrink-0" />
                    <span className="min-w-0 truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-raised/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-5 items-stretch">
          {PRIMARY_MOBILE_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(path, href);
            return (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  className={`touch-target flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium ${
                    active ? "text-brand-strong dark:text-brand" : "text-muted"
                  }`}
                >
                  <Icon size={20} />
                  <span className="max-w-full truncate">{label}</span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-label="Open more navigation"
              onClick={() => setMoreOpen((open) => !open)}
              className={`touch-target flex w-full min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium ${
                moreOpen || secondaryActive ? "text-brand-strong dark:text-brand" : "text-muted"
              }`}
            >
              <Menu size={20} />
              <span className="max-w-full truncate">More</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

export function SideNav() {
  const path = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface-raised md:block">
      <div className="sticky top-0 flex max-h-dvh flex-col">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold">
          <span className="flex size-8 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Sparkles size={17} />
          </span>
          Diana
        </Link>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Core</p>
          <ul className="mt-2 space-y-1">
            {DESKTOP_CORE_ITEMS.map((item) => (
              <DesktopNavLink key={item.href} item={item} active={isActivePath(path, item.href)} />
            ))}
          </ul>
        </div>

        {DESKTOP_GROUPS.map((group) => (
          <DesktopNavGroup
            key={group.label}
            group={group}
            path={path}
          />
        ))}
      </nav>
      <div className="border-t border-border px-5 py-4">
        <p className="text-xs font-semibold text-fg">Next move first</p>
        <p className="mt-1 text-xs leading-5 text-muted">Tools stay grouped so the student sees the school move before the toolbox.</p>
      </div>
      </div>
    </aside>
  );
}

function DesktopNavGroup({
  group,
  path,
}: {
  group: AppShellNavGroup;
  path: string;
}) {
  const hasActiveItem = group.items.some((item) => isActivePath(path, item.href));

  return (
    <details className="group rounded-2xl border border-border bg-background/60 p-1" open={group.defaultOpen || hasActiveItem}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted transition hover:bg-surface-soft">
        <span>{group.label}</span>
        <ChevronDown size={14} className="transition group-open:rotate-180" />
      </summary>
      <ul className="mt-1 space-y-1">
        {group.items.map((item) => (
          <DesktopNavLink key={item.href} item={item} active={isActivePath(path, item.href)} compact />
        ))}
      </ul>
    </details>
  );
}

function DesktopNavLink({
  item,
  active,
  compact = false,
}: {
  item: AppShellNavItem;
  active: boolean;
  compact?: boolean;
}) {
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        className={`flex min-w-0 items-center gap-3 rounded-xl px-3 text-sm transition ${
          compact ? "py-2" : "py-2.5"
        } ${
          active
            ? "bg-brand/10 text-brand-strong dark:text-brand"
            : "text-fg/80 hover:bg-surface-soft"
        }`}
      >
        <Icon size={16} className="shrink-0" />
        <span className="min-w-0 truncate">{item.label}</span>
      </Link>
    </li>
  );
}
