"use client";

import type { PointerEvent, ReactNode } from "react";

export function SpotlightSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  function moveSpotlight(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
    event.currentTarget.dataset.spotlight = "on";
  }

  function clearSpotlight(event: PointerEvent<HTMLDivElement>) {
    delete event.currentTarget.dataset.spotlight;
  }

  return (
    <div
      className={`diana-spotlight-surface ${className}`}
      onPointerMove={moveSpotlight}
      onPointerLeave={clearSpotlight}
    >
      {children}
    </div>
  );
}
