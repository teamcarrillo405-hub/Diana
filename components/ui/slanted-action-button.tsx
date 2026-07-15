"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type SharedProps = {
  children: ReactNode;
  compact?: boolean;
  className?: string;
};

type LinkVariant = SharedProps & { href: string; onClick?: never; disabled?: never };
type ButtonVariant = SharedProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & { href?: never };

export function SlantedActionButton(props: LinkVariant | ButtonVariant) {
  const className = `ds-slanted-action ${props.compact ? "ds-slanted-action--compact" : ""} ${props.className ?? ""}`.trim();
  const content = <span>{props.children}</span>;

  if ("href" in props && props.href) {
    return <Link className={className} href={props.href}>{content}</Link>;
  }

  const { compact: _compact, children: _children, className: _className, ...buttonProps } = props as ButtonVariant;
  return <button className={className} type="button" {...buttonProps}>{content}</button>;
}
