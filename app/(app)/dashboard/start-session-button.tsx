import Link from "next/link";
import { Timer } from "lucide-react";

export function StartSessionButton() {
  return (
    <Link
      href="/timer"
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-border/30"
    >
      <Timer size={16} />
      Start a work session
    </Link>
  );
}
