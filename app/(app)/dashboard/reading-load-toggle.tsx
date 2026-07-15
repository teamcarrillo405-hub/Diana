"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";

const segBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "var(--space-2) var(--space-6)",
  fontSize: "var(--text-12)",
  fontWeight: "var(--weight-600)",
  textDecoration: "none",
};
const segActive: React.CSSProperties = {
  ...segBase,
  background: "var(--gl-cyan-10)",
  color: "var(--gl-cyan)",
};
const segInactive: React.CSSProperties = {
  ...segBase,
  border: "1px solid var(--gl-border-neutral)",
  color: "var(--gl-text-muted)",
};

export function ReadingLoadToggle({ active }: { active: boolean }) {
  const pathname = usePathname() ?? "/dashboard";
  const params = useSearchParams();

  const baseParams = new URLSearchParams(params?.toString() ?? "");
  // Preserve ?energy=... but remove view
  baseParams.delete("view");
  const offQuery = baseParams.toString();
  const offHref = offQuery ? `${pathname}?${offQuery}` : pathname;

  const onParams = new URLSearchParams(params?.toString() ?? "");
  onParams.set("view", "reading-load");
  const onQuery = onParams.toString();
  const onHref = onQuery ? `${pathname}?${onQuery}` : pathname;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-4)" }}>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-11)",
          fontWeight: "var(--weight-700)",
          letterSpacing: "var(--tracking-20)",
          textTransform: "uppercase",
          color: "var(--gl-text-muted)",
        }}
      >
        Sort
      </span>
      <Link href={offHref} style={!active ? segActive : segInactive}>
        Right now
      </Link>
      <Link href={onHref} style={active ? segActive : segInactive}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
          <BookOpen size={12} aria-hidden />
          By reading load
        </span>
      </Link>
    </div>
  );
}
