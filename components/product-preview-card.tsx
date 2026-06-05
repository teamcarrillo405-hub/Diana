import { ArrowRight, BookOpen, CheckCircle2, Clock3, PenLine, Sparkles } from "lucide-react";

export function ProductPreviewCard({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`command-gradient future-card w-full min-w-0 max-w-full overflow-hidden rounded-3xl border border-brand/20 shadow-sm ${
        compact ? "p-3" : "p-4 sm:p-5"
      }`}
      data-visual="right-now-product-preview"
    >
      <div className={`min-w-0 max-w-full rounded-2xl border border-white/60 bg-surface-raised/90 shadow-sm backdrop-blur dark:border-border ${
        compact ? "p-3" : "p-4 sm:p-5"
      }`}>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Right now</p>
            <h2 className={`${compact ? "mt-0.5 text-lg" : "mt-1 text-xl"} font-bold leading-tight`}>Bio lab conclusion</h2>
          </div>
          <div className="shrink-0 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-strong dark:text-brand">
            9 min for you
          </div>
        </div>

        <div className={`${compact ? "mt-3" : "mt-4"} grid min-w-0 gap-3 ${compact ? "" : "sm:grid-cols-[1fr_0.88fr]"}`}>
          <section className="min-w-0 rounded-2xl border border-subject-science/25 bg-subject-science/10 p-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-subject-science/15 text-teal-700 dark:text-teal-300">
                <BookOpen size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">One clear first move</p>
                <p className="text-xs text-muted">Turn observations into a claim.</p>
              </div>
            </div>
            <button className="touch-target mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white">
              Start focus
              <ArrowRight size={16} />
            </button>
          </section>

          <section className={`${compact ? "hidden" : ""} min-w-0 rounded-2xl border border-border bg-surface-raised p-3 sm:block`}>
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles size={15} className="text-brand" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted">AI scaffold</p>
            </div>
            <ol className="mt-3 space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="mt-1 size-2 rounded-full bg-subject-science" />
                <span className="min-w-0">Name the pattern you saw.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 size-2 rounded-full bg-subject-history" />
                <span className="min-w-0">Connect it to one data point.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 size-2 rounded-full bg-subject-writing" />
                <span className="min-w-0">Write the claim in your words.</span>
              </li>
            </ol>
          </section>
        </div>

        <div className={`${compact ? "hidden" : "mt-3 grid"} min-w-0 gap-2 sm:grid-cols-3`}>
          <PreviewCue icon={Clock3} label="Started" />
          <PreviewCue icon={PenLine} label="One step done" />
          <PreviewCue icon={CheckCircle2} label="Ready to submit" />
        </div>
      </div>
    </div>
  );
}

function PreviewCue({
  icon: Icon,
  label,
}: {
  icon: typeof Clock3;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-surface-raised/85 px-3 py-2 text-xs text-muted">
      <Icon size={14} className="shrink-0 text-brand" />
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}
