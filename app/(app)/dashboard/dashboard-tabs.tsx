"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { label: string; href: string; accent: string };

// Destinations locked in docs/design/NAVIGATION.md (one layer, real pages —
// no curated middle page). Accent colors per Dashboard Plan §Tab layout specs.
const TABS: Tab[] = [
  { label: "Today", href: "/dashboard", accent: "var(--gl-cyan)" },
  { label: "Work", href: "/assignments", accent: "var(--gl-cyan)" },
  { label: "Think", href: "/notes", accent: "var(--gl-purple-light)" },
  { label: "Proof", href: "/proof", accent: "var(--gl-green)" },
  { label: "Future", href: "/future-path", accent: "var(--gl-gold)" },
];

/**
 * Lobby-skinned secondary tab strip. Lets a student move between the four
 * dashboard tabs (and back to TODAY) without the full-bleed lobby HUD nav,
 * which only renders on the /dashboard landing page.
 */
export function DashboardTabs() {
  const path = usePathname();

  return (
    <nav
      aria-label="Dashboard sections"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "var(--space-2)",
        borderBottom: "1px solid var(--gl-cyan-18)",
        paddingBottom: "var(--space-6)",
        marginBottom: "var(--space-15)",
      }}
    >
      {TABS.map(({ label, href, accent }) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              padding: "var(--space-3) var(--space-8)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-18)",
              fontWeight: "var(--weight-800)",
              letterSpacing: "var(--tracking-06)",
              textTransform: "uppercase",
              textDecoration: "none",
              color: active ? accent : "var(--gl-text-nav-inactive)",
            }}
          >
            {label}
            {active && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  bottom: "calc(-1 * var(--space-6) - 1px)",
                  left: "var(--space-8)",
                  right: "var(--space-8)",
                  height: 2,
                  background: accent,
                  borderRadius: "var(--radius-xs)",
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
