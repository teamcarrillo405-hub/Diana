import Link from "next/link";
import { BookOpen, CalendarDays, CheckSquare, Home } from "lucide-react";
import { MoreMenu } from "./more-menu";
import type { NavLabel } from "./app-top-nav";

const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";

const TABS: { label: NavLabel; href: string; Icon: typeof Home }[] = [
  { label: "Today", href: "/dashboard", Icon: Home },
  { label: "Work", href: "/assignments", Icon: CheckSquare },
  { label: "Classes", href: "/classes", Icon: BookOpen },
  { label: "Calendar", href: "/calendar", Icon: CalendarDays },
];

/**
 * Fixed bottom tab bar for small screens. AppTopNav's tab row is hidden under
 * 900px (.gl-nav-tabs), so this is the only nav on mobile. Shown only ≤900px;
 * hidden on desktop where the top tabs take over.
 */
export function MobileTabBar({ active }: { active: NavLabel }) {
  return (
    <>
      <style>{`
        .gl-mobile-nav {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
          display: flex; align-items: stretch;
          background: rgba(2,5,14,.94);
          border-top: 1px solid rgba(41,208,255,.18);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          padding-bottom: env(safe-area-inset-bottom);
        }
        @media (min-width: 901px) { .gl-mobile-nav { display: none; } }
      `}</style>
      <nav className="gl-mobile-nav" aria-label="Primary">
        {TABS.map(({ label, href, Icon }) => {
          const isActive = label === active;
          return (
            <Link
              key={label}
              href={href}
              aria-current={isActive ? "page" : undefined}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 0",
                textDecoration: "none",
                color: isActive ? "#29d0ff" : "#8b96bd",
                fontFamily: SF,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: ".04em",
                textTransform: "uppercase",
              }}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
        <MoreMenu variant="mobile" active={active === "More"} />
      </nav>
    </>
  );
}
