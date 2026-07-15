import type { ReactNode } from "react";

import { AppTopNav, type NavLabel } from "./app-top-nav";

type IconType = React.ComponentType<{ size?: number | string; "aria-hidden"?: boolean }>;

export function PageShell({
  active,
  eyebrow,
  title,
  subtitle,
  accent = "var(--diana-blue)",
  icon: Icon,
  action,
  titleMaxWidth,
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
    <div className="sd-page">
      <AppTopNav active={active} />
      <div className="sd-container">
        <header className="sd-page-header">
          <div className="sd-heading-group">
            <p className="sd-eyebrow" style={{ color: accent }}>
              {Icon ? <Icon size={13} aria-hidden /> : null}
              {eyebrow}
            </p>
            <h1 className="sd-title" style={titleMaxWidth ? { maxWidth: titleMaxWidth } : undefined}>{title}</h1>
            {subtitle ? <p className="sd-subtitle">{subtitle}</p> : null}
          </div>
          {action ? (
            <div style={{ minWidth: 0, maxWidth: "100%", flexShrink: 1 }}>
              {action}
            </div>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}
