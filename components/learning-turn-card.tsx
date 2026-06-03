import { HelpCircle, Lightbulb, ShieldCheck } from "lucide-react";
import type { LearningTurn } from "@/lib/study-helper/guided-learning";

export function LearningTurnCard({ turn }: { turn: LearningTurn }) {
  return (
    <section className="space-y-3 rounded-2xl border border-brand/20 bg-surface-raised p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-strong dark:text-brand">
            Guided learning loop
          </p>
          <h2 className="mt-1 text-base font-semibold">{turn.nextTeachingMove.label}</h2>
          <p className="mt-1 text-sm text-muted">{turn.authorshipBoundary}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted">
          <ShieldCheck size={13} />
          Source: {turn.question.sourceAnchor}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-background/70 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
            <HelpCircle size={13} />
            First question
          </p>
          <p className="mt-2 text-sm font-medium">{turn.question.prompt}</p>
          <p className="mt-2 text-xs text-muted">{turn.question.expectedStudentAction}</p>
        </div>

        <div className="rounded-xl border border-border bg-background/70 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
            <Lightbulb size={13} />
            Hint ladder
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {turn.hintLadder.hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-background/70 p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Knowledge check</p>
          <p className="mt-2 text-sm font-medium">{turn.knowledgeCheck.question}</p>
          <p className="mt-2 text-xs text-muted">{turn.knowledgeCheck.successSignal}</p>
        </div>
      </div>
    </section>
  );
}
