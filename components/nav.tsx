"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Brain,
  Calendar,
  CheckSquare,
  HeartPulse,
  Images,
  BarChart3,
  Settings as Cog,
  Timer,
  Sparkles,
  FileText,
  GraduationCap,
  UsersRound,
} from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Focus", icon: Home },
  { href: "/assignments", label: "Assignments", icon: CheckSquare },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/portfolio", label: "Portfolio", icon: Images },
  { href: "/wellness", label: "Wellness", icon: HeartPulse },
  { href: "/ap", label: "AP", icon: GraduationCap },
  { href: "/flashcards", label: "Study", icon: Brain },
  { href: "/study-groups", label: "Groups", icon: UsersRound },
  { href: "/timer", label: "Timer", icon: Timer },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/wins", label: "Wins", icon: Sparkles },
  { href: "/classes", label: "Classes", icon: BookOpen },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Cog },
] as const;

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2 text-xs ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon size={20} />
                {label}
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
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:block">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-lg font-bold">
          <span className="text-accent text-xl leading-none" aria-hidden="true">✦</span>
          Diana
        </Link>
      </div>
      <ul className="space-y-1 px-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-fg/80 hover:bg-border/40"
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
