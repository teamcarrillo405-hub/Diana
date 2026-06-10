import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import type { FirstWeekJourney } from "@/lib/journey/first-week";

/**
 * The guided path from empty app to first focus session. Pure presentation —
 * the journey state is computed server-side from real data, so steps complete
 * themselves and the card retires on its own.
 */
export function FirstWeekJourneyCard({ journey }: { journey: FirstWeekJourney }) {
  if (!journey.show) return null;

  return (
    <section className="hero-glow animate-slide-up space-y-3 rounded-3xl border border-brand/25 bg-surface-raised p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Getting rolling</h2>
        <span className="text-xs text-muted">
          {journey.doneCount} of {journey.steps.length} done
        </span>
      </div>

      <ol className="space-y-1.5">
        {journey.steps.map((step) => {
          const isActive = journey.active?.key === step.key;
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition ${
                  step.done
                    ? "border-transparent bg-transparent text-muted"
                    : isActive
                      ? "border-brand/30 bg-brand/5 hover:bg-brand/10"
                      : "border-transparent hover:bg-surface-soft"
                }`}
              >
                {step.done ? (
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-ok" />
                ) : (
                  <Circle size={17} className={`mt-0.5 shrink-0 ${isActive ? "text-brand" : "text-muted"}`} />
                )}
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${step.done ? "line-through decoration-ok/40" : "font-medium"}`}>
                    {step.title}
                  </span>
                  {isActive && <span className="mt-0.5 block text-xs text-muted">{step.detail}</span>}
                </span>
                {isActive && <ArrowRight size={15} className="mt-1 shrink-0 text-brand" />}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
