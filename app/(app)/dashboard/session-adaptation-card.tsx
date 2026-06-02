import Link from "next/link";
import type { SessionAdaptation } from "@/lib/emotional/session";

export function SessionAdaptationCard({ adaptation }: { adaptation: SessionAdaptation }) {
  if (!adaptation.mood || adaptation.mood === "good") return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
            {adaptation.headline}
          </h2>
          <p className="mt-1 text-sm text-muted">{adaptation.nextStep}</p>
        </div>
        <Link
          href={adaptation.mood === "rough" ? "/timer?mode=rough" : "/timer"}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-border/30"
        >
          {adaptation.workMinutes} min block
        </Link>
      </div>
    </section>
  );
}
