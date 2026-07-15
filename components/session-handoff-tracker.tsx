"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SKIP_PREFIXES = ["/login", "/onboarding", "/offline"];

export function SessionHandoffTracker() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (!pathname || SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

    const timeout = window.setTimeout(() => {
      const route = `${pathname}${window.location.search}`.slice(0, 240);
      void fetch("/api/profile/handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          route,
          context: {
            title: document.title,
            source: "web",
          },
        }),
      }).catch(() => undefined);
    }, 750);

    return () => window.clearTimeout(timeout);
  }, [pathname]);

  return null;
}
