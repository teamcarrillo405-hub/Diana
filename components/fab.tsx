import Link from "next/link";
import { Plus } from "lucide-react";

export function Fab() {
  return (
    <Link
      href="/assignments/new"
      aria-label="Add assignment"
      className="press-scale fixed bottom-6 right-28 z-40 hidden h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg transition hover:opacity-90 md:flex"
    >
      <Plus size={24} />
    </Link>
  );
}
