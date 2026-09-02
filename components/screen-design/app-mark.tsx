import Link from "next/link";

import { DianaWordmark } from "./primitives";

export function AppMark({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="sd-brand" aria-label="Diana home">
      <DianaWordmark tight />
    </Link>
  );
}
