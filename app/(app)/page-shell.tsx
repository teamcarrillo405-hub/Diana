import type { ReactNode } from "react";
import { AppTopNav, type NavLabel } from "./app-top-nav";

const SF = "var(--font-display)";
const BODY = "var(--font-body)";

type IconType = React.ComponentType<{ size?: number | string; style?: React.CSSProperties }>;

/**
 * Canonical gl-token page shell + hero header, matching the redesigned pages
 * (/classes, /grades, /proof). Use this to give every page consistent chrome:
 * dark base, top nav, max-width container, eyebrow + Saira h1 + subtitle, and an
 * optional right-aligned action. Functional body goes in `children`.
 */
export function PageShell({
  active,
  eyebrow,
  title,
  subtitle,
  accent = "var(--gl-cyan)",
  icon: Icon,
  action,
  titleMaxWidth = "22ch",
  children,
}: {
  active: NavLabel;
  eyebrow: string;
  title: string;
  subtitle?: string;
  accent?: string;
  icon?: IconType;
  action?: ReactNode;
  titleMaxWidth?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      <AppTopNav active={active} />
      <div
        style={{
          maxWidth: "var(--layout-max-width)",
          margin: "0 auto",
          padding: "var(--space-17) var(--space-17) var(--space-24)",
          display: "grid",
          gap: "var(--space-17)",
        }}
      >
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-12)", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: "var(--space-8)" }}>
            <p
              style={{
                fontFamily: BODY,
                fontSize: "var(--text-11)",
                fontWeight: "var(--weight-700)",
                letterSpacing: "var(--tracking-20)",
                textTransform: "uppercase",
                color: accent,
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              {Icon ? <Icon size={13} /> : null}
              {eyebrow}
            </p>
            <h1
              style={{
                fontFamily: SF,
                fontWeight: "var(--weight-800)",
                fontSize: "var(--text-50)",
                lineHeight: "var(--leading-tight)",
                textTransform: "uppercase",
                color: "var(--gl-text-primary)",
                margin: 0,
                maxWidth: titleMaxWidth,
              }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                style={{
                  fontFamily: BODY,
                  fontSize: "var(--text-16)",
                  lineHeight: "var(--leading-body)",
                  color: "var(--gl-text-secondary)",
                  maxWidth: "48ch",
                  margin: 0,
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
        </header>
        {children}
      </div>
    </div>
  );
}
