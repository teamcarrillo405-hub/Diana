"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  CheckSquare,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  Images,
  Menu,
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

const PRIMARY_MOBILE_ITEMS = [
  { href: "/dashboard", label: "Focus", icon: Home },
  { href: "/assignments", label: "Assignments", icon: CheckSquare },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/flashcards", label: "Study", icon: Brain },
] satisfies AppShellNavItem[];

const SECONDARY_ITEMS = [
  { href: "/portfolio", label: "Portfolio", icon: Images },
  { href: "/wellness", label: "Wellness", icon: HeartPulse },
  { href: "/ap", label: "AP", icon: GraduationCap },
  { href: "/study-groups", label: "Groups", icon: UsersRound },
  { href: "/timer", label: "Timer", icon: Timer },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/wins", label: "Wins", icon: Sparkles },
  { href: "/proof", label: "Proof", icon: ShieldCheck },
  { href: "/classes", label: "Classes", icon: BookOpen },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Cog },
] satisfies AppShellNavItem[];

const DESKTOP_ITEMS = [...PRIMARY_MOBILE_ITEMS, ...SECONDARY_ITEMS] satisfies AppShellNavItem[];

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
        <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-border bg-surface-raised p-3 shadow-xl md:hidden">
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
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface-raised md:block">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold">
          <span className="flex size-8 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Sparkles size={17} />
          </span>
          Diana
        </Link>
      </div>
      <ul className="space-y-1 px-2">
        {DESKTOP_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(path, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                  active
                    ? "bg-brand/10 text-brand-strong dark:text-brand"
                    : "text-fg/80 hover:bg-surface-soft"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
