"use client";

import {
  BookOpen,
  CalendarDays,
  LayoutGrid,
  MoreHorizontal,
  Swords,
} from "lucide-react";
import Link from "next/link";

const ITEMS = [
  { label: "Today", href: "/dashboard", Icon: LayoutGrid },
  { label: "Work", href: "/assignments", Icon: Swords },
  { label: "Classes", href: "/classes", Icon: BookOpen },
  { label: "Calendar", href: "/calendar", Icon: CalendarDays },
  { label: "More", href: "/settings", Icon: MoreHorizontal },
] as const;

export function StudentBottomNav() {
  return (
    <nav className="sd-student-bottom-nav" aria-label="Primary">
      {ITEMS.map(({ label, href, Icon }) => (
        <Link
          key={label}
          href={href}
          aria-current={label === "Today" ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
