import Link from "next/link";
import { BookOpen, CalendarDays, CheckSquare, LayoutGrid } from "lucide-react";

import { MoreMenu } from "./more-menu";
import type { NavLabel } from "./app-top-nav";

const TABS: { label: NavLabel; href: string; Icon: typeof LayoutGrid }[] = [
  { label: "Today", href: "/dashboard", Icon: LayoutGrid },
  { label: "Work", href: "/assignments", Icon: CheckSquare },
  { label: "Classes", href: "/classes", Icon: BookOpen },
  { label: "Calendar", href: "/calendar", Icon: CalendarDays },
];

export function MobileTabBar({ active }: { active: NavLabel }) {
  return (
    <nav className="sd-mobile-nav" aria-label="Primary">
      {TABS.map(({ label, href, Icon }) => {
        const isActive = label === active;
        return (
          <Link key={label} href={href} aria-current={isActive ? "page" : undefined}>
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
      <MoreMenu variant="mobile" active={active === "More"} />
    </nav>
  );
}
