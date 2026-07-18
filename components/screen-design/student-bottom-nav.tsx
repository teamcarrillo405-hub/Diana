"use client";

import {
  BookOpen,
  CalendarDays,
  LayoutGrid,
  type LucideIcon,
  MoreHorizontal,
  Swords,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  STUDENT_NAV_DESTINATIONS,
  getStudentNavOwner,
  type StudentNavLabel,
} from "@/lib/navigation";

const STUDENT_NAV_ICONS: Readonly<Record<StudentNavLabel, LucideIcon>> = {
  Today: LayoutGrid,
  Work: Swords,
  Classes: BookOpen,
  Calendar: CalendarDays,
  More: MoreHorizontal,
};

export const STUDENT_BOTTOM_NAV_ITEMS = STUDENT_NAV_DESTINATIONS.map(
  ({ label, href }) => ({ label, href, Icon: STUDENT_NAV_ICONS[label] }),
);

export { getStudentNavOwner } from "@/lib/navigation";
export type { StudentNavLabel } from "@/lib/navigation";

export function StudentBottomNav() {
  const pathname = usePathname() ?? "/settings";
  const active = getStudentNavOwner(pathname);

  return (
    <nav className="sd-student-bottom-nav" aria-label="Primary">
      <div className="sd-desktop-nav-brand" aria-hidden="true">
        <strong>Diana</strong>
        <span>Student workspace</span>
      </div>
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
      <p className="sd-desktop-nav-note" aria-hidden="true">
        Your work. Your pace.
      </p>
    </nav>
  );
}
