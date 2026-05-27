import Link from "next/link";

export type ComingSoonProps = {
  slug: string;
  title: string;
  summary: string;
  slice: number;
};

export function ComingSoon({ slug, title, summary, slice }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted">Feature {slug}</p>
        <h1 className="text-2xl font-bold">{title}</h1>
      </header>
      <div className="rounded-xl border border-dashed border-border bg-card p-5">
        <p className="text-sm">{summary}</p>
        <p className="mt-3 text-xs text-muted">
          Planned for slice {slice}. Not in the working build yet.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-block text-sm text-accent hover:underline"
      >
        ← Back to today
      </Link>
    </div>
  );
}
