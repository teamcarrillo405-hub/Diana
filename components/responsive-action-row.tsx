import type { ReactNode } from "react";

export function ResponsiveActionRow({
  children,
  className = "",
  align = "start",
}: {
  children: ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
}) {
  const alignment =
    align === "end" ? "sm:justify-end" : align === "center" ? "sm:justify-center" : "sm:justify-start";

  return (
    <div className={`flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap ${alignment} ${className}`}>
      {children}
    </div>
  );
}
