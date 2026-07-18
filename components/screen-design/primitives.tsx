import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

import { SourceMedia } from "./source-media";

export type ScreenDesignAccent = "blue" | "pink" | "teal" | "amber";

type GlassPanelProps = HTMLAttributes<HTMLDivElement> & {
  strength?: "default" | "strong";
};

export function GlassPanel({
  strength = "default",
  className,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={["sd-source-glass", className].filter(Boolean).join(" ")}
      data-strength={strength}
      {...props}
    />
  );
}

type AccentChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: ScreenDesignAccent;
};

export function AccentChip({
  tone = "blue",
  className,
  ...props
}: AccentChipProps) {
  return (
    <span
      className={["sd-source-chip", className].filter(Boolean).join(" ")}
      data-tone={tone}
      {...props}
    />
  );
}

type NeonActionShared = {
  children: ReactNode;
  className?: string;
  tone?: ScreenDesignAccent;
  variant?: "solid" | "outline";
};

type NeonActionButtonProps = NeonActionShared &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    href?: never;
  };

type NeonActionLinkProps = NeonActionShared &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href"> & {
    href: string;
  };

export type NeonActionProps = NeonActionButtonProps | NeonActionLinkProps;

export function NeonAction(props: NeonActionProps) {
  const {
    children,
    className,
    tone = "teal",
    variant = "solid",
  } = props;
  const classes = ["sd-source-action", className].filter(Boolean).join(" ");

  if (typeof props.href === "string") {
    const {
      href,
      tone: _tone,
      variant: _variant,
      className: _className,
      children: _children,
      ...anchorProps
    } = props;

    return (
      <Link
        href={href}
        className={classes}
        data-tone={tone}
        data-variant={variant}
        {...anchorProps}
      >
        {children}
      </Link>
    );
  }

  const {
    type = "button",
    tone: _tone,
    variant: _variant,
    className: _className,
    children: _children,
    ...buttonProps
  } = props;

  return (
    <button
      type={type}
      className={classes}
      data-tone={tone}
      data-variant={variant}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

export function DianaWordmark({
  className,
  alt = "Diana",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <SourceMedia
      assetId="diana-logo"
      width={79}
      height={24}
      alt={alt}
      className={["sd-source-wordmark", className].filter(Boolean).join(" ")}
    />
  );
}

export function DianaMascotMark({
  className,
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  const shared = {
    assetId: "diana-mascot" as const,
    width: 64,
    height: 64,
    className: ["sd-source-mascot", className].filter(Boolean).join(" "),
  };

  return decorative ? (
    <SourceMedia {...shared} decorative />
  ) : (
    <SourceMedia {...shared} alt="Diana assistant" />
  );
}
