import Link from "next/link";

export function AppMark({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="sd-brand" aria-label="Diana home">
      <span className="sd-brand-mark" aria-hidden="true">D</span>
      <span>DIANA</span>
    </Link>
  );
}
