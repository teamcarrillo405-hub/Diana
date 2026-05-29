"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";

export function ReadingLoadToggle({ active }: { active: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();

  const baseParams = new URLSearchParams(params.toString());
  // Preserve ?energy=... but remove view
  baseParams.delete("view");
  const offHref = pathname + "?" + baseParams.toString();

  const onParams = new URLSearchParams(params.toString());
  onParams.set("view", "reading-load");
  const onHref = pathname + "?" + onParams.toString();

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted">Sort by:</span>
      <Link
        href={offHref}
        className={
          !active
            ? "rounded-full bg-accent/15 px-2 py-1 text-accent"
            : "rounded-full border border-border px-2 py-1 text-muted hover:bg-border/30"
        }
      >
        Right now
      </Link>
      <Link
        href={onHref}
        className={
          active
            ? "rounded-full bg-accent/15 px-2 py-1 text-accent"
            : "rounded-full border border-border px-2 py-1 text-muted hover:bg-border/30"
        }
      >
        <span className="inline-flex items-center gap-1">
          <BookOpen size={12} aria-hidden />
          By reading load
        </span>
      </Link>
    </div>
  );
}

/** Render a row of book icons sized by reading_load (capped at 5). */
export function ReadingLoadBadge({ load }: { load: number | null }) {
  if (load == null || load <= 0) return null;
  const count = Math.min(5, Math.max(0, Math.round(load)));
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs text-muted"
      aria-label={`Reading load ${count} of 5`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <BookOpen key={i} size={12} aria-hidden />
      ))}
    </span>
  );
}
