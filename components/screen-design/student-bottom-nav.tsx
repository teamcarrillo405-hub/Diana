"use client";

import {
  BookOpen,
  CalendarDays,
  LayoutGrid,
  MoreHorizontal,
  Swords,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const STUDENT_BOTTOM_NAV_ITEMS = [
  { label: "Today", href: "/dashboard", Icon: LayoutGrid },
  { label: "Work", href: "/assignments", Icon: Swords },
  { label: "Classes", href: "/classes", Icon: BookOpen },
  { label: "Calendar", href: "/calendar", Icon: CalendarDays },
  { label: "More", href: "/settings", Icon: MoreHorizontal },
] as const;

export type StudentNavLabel = (typeof STUDENT_BOTTOM_NAV_ITEMS)[number]["label"];

export function getStudentNavOwner(pathname: string): StudentNavLabel {
  const route = pathname.split(/[?#]/u, 1)[0] || "/settings";
  const owner = STUDENT_BOTTOM_NAV_ITEMS.slice(0, -1).find(
    ({ href }) => route === href || route.startsWith(`${href}/`),
  );

  return owner?.label ?? "More";
}

export function StudentBottomNav() {
  const pathname = usePathname() ?? "/settings";
  const active = getStudentNavOwner(pathname);

  return (
    <nav className="sd-student-bottom-nav" aria-label="Primary">
      {STUDENT_BOTTOM_NAV_ITEMS.map(({ label, href, Icon }) => (
        <Link
          key={label}
          href={href}
          aria-current={label === active ? "page" : undefined}
          data-active={label === active || undefined}
        >
          <Icon size={24} strokeWidth={1.9} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
