"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { usesAppTopNav } from "@/lib/navigation";

/**
 * The per-page content frame. Normally supplies the app-wide gutter + max-width
 * (and the default text color). On pages that render their own <AppTopNav>, it
 * switches to "flush" mode so the nav sits at the very top/edge with no gap.
 *
 * Which pages are flush is decided ONLY by usesAppTopNav (lib/navigation.ts) —
 * migrate a page there and this follows automatically.
 */
export function AppCommandFrame({ children }: { children: ReactNode }) {
  const flush = usesAppTopNav(usePathname() ?? "/");
  return (
    <div className={`app-command-frame min-w-0${flush ? " app-command-frame--flush" : ""}`}>
      {children}
    </div>
  );
}
