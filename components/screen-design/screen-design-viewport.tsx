import type { HTMLAttributes, ReactNode } from "react";

type ScreenDesignViewportProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
};

export function ScreenDesignViewport({
  children,
  className,
  ...props
}: ScreenDesignViewportProps) {
  const classes = ["sd-source-viewport", className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      data-screen-design-viewport="393x852"
      data-screen-design-responsive="mobile-desktop"
      {...props}
    >
      {children}
    </div>
  );
}
