import Link from "next/link";
import { Camera, Settings } from "lucide-react";

import { AppMark } from "@/components/screen-design/app-mark";
import { MoreMenu } from "./more-menu";
import { MobileTabBar } from "./mobile-tab-bar";

export type NavLabel = "Today" | "Work" | "Classes" | "Calendar" | "More";

const NAV_TABS: { label: NavLabel; href: string }[] = [
  { label: "Today", href: "/dashboard" },
  { label: "Work", href: "/assignments" },
  { label: "Classes", href: "/classes" },
  { label: "Calendar", href: "/calendar" },
];

export function AppTopNav({ active }: { active: NavLabel }) {
  return (
    <>
      <nav
        className="sd-top-nav"
        aria-label="Primary"
        style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
      >
        <AppMark />
        <div className="sd-nav-links">
          {NAV_TABS.map(({ label, href }) => {
            const isActive = label === active;
            return (
              <Link
                key={label}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className="sd-nav-link"
              >
                {label}
              </Link>
            );
          })}
          <MoreMenu active={active === "More"} />
        </div>

        <div className="sd-nav-actions">
          <Link href="/quick-add" className="sd-button" aria-label="Quick capture">
            <Camera size={16} aria-hidden="true" />
            Capture
          </Link>
          <Link className="sd-nav-icon" href="/settings" aria-label="Settings">
            <Settings size={18} aria-hidden="true" />
          </Link>
        </div>
      </nav>
      <MobileTabBar active={active} />
    </>
  );
}
