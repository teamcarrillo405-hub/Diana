import Link from "next/link";
import { Plus } from "lucide-react";

export function Fab() {
  return (
    <Link
      href="/assignments/new"
      aria-label="Add assignment"
      className="md:hidden fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg hover:opacity-90 active:scale-95 transition-transform"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <Plus size={24} />
    </Link>
  );
}
