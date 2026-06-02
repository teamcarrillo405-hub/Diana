import Link from "next/link";
import { Timer } from "lucide-react";

export function StartSessionButton({ roughMode = false, difficulty = null }: { roughMode?: boolean; difficulty?: number | null }) {
  const params = new URLSearchParams();
  if (roughMode) params.set("mode", "rough");
  if (difficulty !== null) params.set("difficulty", String(difficulty));
  const href = `/timer${params.size > 0 ? `?${params.toString()}` : ""}`;
  return (
    <Link
      href={href}
      className="touch-target inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-2 text-sm hover:bg-surface-soft"
    >
      <Timer size={16} />
      Start a work session
    </Link>
  );
}
