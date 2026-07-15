"use client";

import type { ReactNode } from "react";

export function AlertStrip({
  tone = "info",
  children,
  trailing,
  onClick,
  expanded,
  label,
  className = "",
}: {
  tone?: "info" | "warning" | "success";
  children: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  expanded?: boolean;
  label?: string;
  className?: string;
}) {
  const content = (
    <>
      <span className="ds-alert-strip__dot" aria-hidden="true" />
      <span className="ds-alert-strip__content">{children}</span>
      {trailing && <span className="ds-alert-strip__trailing">{trailing}</span>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`ds-alert-strip ds-alert-strip--${tone} ${className}`.trim()}
        onClick={onClick}
        aria-expanded={expanded}
        aria-label={label}
      >
        {content}
      </button>
    );
  }

  return <div className={`ds-alert-strip ds-alert-strip--${tone} ${className}`.trim()}>{content}</div>;
}
