import Link from "next/link";
import { format } from "date-fns";
import { BookOpenCheck, Brain, CalendarClock, ListChecks, Moon, RotateCcw } from "lucide-react";
import type { PrepEntryKind, TestPrepPlan } from "@/lib/test-prep/plan";

const ENTRY_ICON: Record<PrepEntryKind, typeof Brain> = {
  concept_review: BookOpenCheck,
  make_cards: Brain,
  practice_test: ListChecks,
  review_results: RotateCcw,
  light_recall: Moon,
};

/**
 * The Test Prep Engine surface: countdown, weakest-first triage, and a
 * backward-planned day list with today spotlighted. Presentation only —
 * the plan is computed server-side from the student's mastery map.
 */
export function TestPrepPanel({
  plan,
  className: classNameLabel,
  coversSince = null,
}: {
  plan: TestPrepPlan;
  className?: string | null;
  coversSince?: string | null;
}) {
  const countdown =
    plan.daysUntil <= 0
      ? "Test day"
      : plan.daysUntil === 1
        ? "Tomorrow"
        : `${plan.daysUntil} days out`;

  return (
    <section className="hero-glow card-lift animate-slide-up space-y-4 rounded-2xl border border-brand/25 bg-surface-raised p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock size={15} className="text-brand" />
          Test prep plan{classNameLabel ? ` · ${classNameLabel}` : ""}
        </h2>
        <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand-strong dark:text-brand">
          {countdown}
        </span>
      </div>

      <p className="text-sm text-muted">{plan.readiness}</p>
      {coversSince && (
        <p className="text-xs text-muted">
          Planning around class material since {format(new Date(coversSince), "MMMM d")}: your spot in
          the curriculum, not the whole year.
        </p>
      )}

      {plan.triage.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Where time pays off</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {plan.triage.slice(0, 4).map((concept) => (
              <li
                key={concept.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{concept.name}</span>
                <span className="flex shrink-0 gap-0.5" aria-label={`Mastery ${concept.masteryLevel} of 4`}>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`size-1.5 rounded-full ${i < concept.masteryLevel ? "bg-brand" : "bg-border"}`}
                    />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="space-y-2">
        {plan.days.map((day) => (
          <li
            key={day.offset}
            className={`rounded-xl border px-3 py-2.5 ${
              day.isToday ? "border-brand/30 bg-brand/5" : "border-border bg-surface"
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wider ${day.isToday ? "text-brand-strong dark:text-brand" : "text-muted"}`}>
              {day.heading}
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {day.entries.map((item) => {
                const Icon = ENTRY_ICON[item.kind];
                return (
                  <li key={item.label} className="flex items-start gap-2 text-sm">
                    <Icon size={15} className="mt-0.5 shrink-0 text-muted" />
                    <span>{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <a
          href="#study-artifacts"
          className="touch-target inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-strong"
        >
          <ListChecks size={15} /> Make a practice test
        </a>
        <Link
          href="/flashcards"
          className="touch-target inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-soft"
        >
          <Brain size={15} /> Review cards
        </Link>
      </div>
    </section>
  );
}
