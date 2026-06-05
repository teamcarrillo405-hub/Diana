import { LayoutGrid } from "lucide-react";
import type { VisualBreakdown } from "@/lib/study-helper/visual-breakdown";

export function VisualBreakdownPanel({ breakdown }: { breakdown: VisualBreakdown }) {
  return (
    <section className="space-y-3 rounded-2xl border border-subject-reading/20 bg-surface-raised p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            <LayoutGrid size={13} />
            Visual breakdown
          </p>
          <h2 className="mt-1 text-base font-semibold">{breakdown.title}</h2>
        </div>
        <span className="inline-flex w-fit rounded-full border border-border bg-background px-3 py-1 text-xs text-muted">
          {breakdown.sourceAnchored ? "Source anchored" : "Needs source"}
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {breakdown.blocks.map((block) => (
          <div key={`${block.label}-${block.sourceAnchor}`} className="rounded-xl border border-border bg-background/70 p-3">
            <p className="text-sm font-semibold">{block.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{block.prompt}</p>
            <p className="mt-2 text-xs font-medium">{block.studentAction}</p>
            <p className="mt-1 text-xs text-muted">Source: {block.sourceAnchor}</p>
          </div>
        ))}
      </div>

      <p className="rounded-xl border border-border bg-background/70 px-3 py-2 text-sm">
        {breakdown.quizPrompt}
      </p>

      <div className="grid gap-2 rounded-2xl border border-border bg-background/70 p-3 text-sm md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Show another way</p>
          <p className="mt-1 font-semibold">{breakdown.storyboard.format.replace(/_/g, " ")}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{breakdown.storyboard.layout}</p>
          <p className="mt-2 text-xs text-muted">{breakdown.storyboard.altText}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-soft p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Student interaction</p>
          <p className="mt-1 text-sm font-medium">{breakdown.storyboard.interactionPrompt}</p>
          <p className="mt-2 text-xs text-muted">
            Sources: {breakdown.storyboard.sourceAnchors.join(" | ")}
          </p>
        </div>
      </div>
    </section>
  );
}
