import Link from "next/link";
import type { ReactNode } from "react";

export function HeroCtaButton({
  href,
  children,
  icon,
  trailingIcon,
  compact = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link className={`ds-hero-cta ${compact ? "ds-hero-cta--compact" : ""} ${className}`.trim()} href={href}>
      {icon}
      <span>{children}</span>
      {trailingIcon}
    </Link>
  );
}
