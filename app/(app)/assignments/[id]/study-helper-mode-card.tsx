"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Brain,
  HelpCircle,
  Layers3,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { recordStudyHelperEvent } from "./study-helper-actions";
import {
  studyHelperModeOption,
  type StudyBarId,
  type StudyHelperContext,
  type StudyHelperMode,
} from "@/lib/study-helper/modes";

const MODE_ICONS = {
  guided_steps: ListChecks,
  visual_breakdown: Layers3,
  retrieval_quiz: Brain,
  flashcard_builder: BookOpen,
} satisfies Record<StudyHelperMode, typeof ListChecks>;

export function StudyHelperModeCard({
  assignmentId,
  context,
}: {
  assignmentId: string;
  context: StudyHelperContext;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedMode, setSelectedMode] = useState(context.selectedMode);
  const [stuckOpen, setStuckOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedMode(context.selectedMode);
  }, [context.selectedMode]);

  const selected = studyHelperModeOption(selectedMode);
  const activeBar = context.bars.find((bar) => bar.id === selected.bar);

  const paramsFor = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    return (mode: StudyHelperMode) => {
      params.set("study", mode);
      return `${pathname}?${params.toString()}`;
    };
  }, [pathname, searchParams]);

  function choose(mode: StudyHelperMode, bar: StudyBarId) {
    setSelectedMode(mode);
    setStuckOpen(false);
    router.replace(paramsFor(mode), { scroll: false });
    startTransition(async () => {
      await recordStudyHelperEvent({
        assignmentId,
        mode,
        bar,
        event: "mode_selected",
      });
    });
  }

  function openStuckPath() {
    setStuckOpen(true);
    startTransition(async () => {
      await recordStudyHelperEvent({
        assignmentId,
        mode: selectedMode,
        bar: selected.bar,
        event: "escape_valve",
      });
    });
  }

  return (
    <section className="space-y-4 rounded-3xl border border-brand/25 bg-surface-raised p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-strong dark:text-brand">
            5-bar study helper
          </p>
          <h2 className="mt-1 text-lg font-semibold leading-tight">{selected.label}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{context.reason}</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-medium text-muted">
          <ShieldCheck size={13} />
          {context.aiPolicyLabel}
        </div>
      </div>

      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {context.modeOptions.map((option) => {
          const Icon = MODE_ICONS[option.mode];
          const active = selectedMode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              disabled={pending}
              onClick={() => choose(option.mode, option.bar)}
              aria-pressed={active}
              className={`touch-target flex min-w-0 items-start gap-2 rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-brand/30 bg-brand/10 text-brand-strong dark:text-brand"
                  : "border-border bg-background hover:bg-surface-soft"
              } disabled:opacity-60`}
            >
              <Icon size={16} className="mt-0.5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">{option.shortLabel}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_0.82fr]">
        <div className="min-w-0 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
            <Sparkles size={13} />
            Next move
          </div>
          <p className="mt-2 text-sm font-medium">{context.nextStep}</p>
          <p className="mt-2 text-xs text-muted">{context.trustNote}</p>
          <button
            type="button"
            onClick={openStuckPath}
            disabled={pending}
            className="touch-target mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface-soft disabled:opacity-60"
          >
            <HelpCircle size={13} />
            I am stuck
          </button>
          {stuckOpen && (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-400/10 dark:text-amber-100">
              {context.escapeValve}
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Bars active here</p>
          <div className="mt-3 grid gap-2">
            {context.bars.map((bar) => (
              <div key={bar.id} className="flex min-w-0 items-start gap-2">
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${
                    bar.status === "active"
                      ? "bg-brand"
                      : bar.status === "guarded"
                        ? "bg-amber-500"
                        : "bg-border"
                  }`}
                />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">{bar.label}</span>
                  <span className="block text-xs leading-5 text-muted">
                    {bar.id === activeBar?.id ? activeBar.detail : bar.detail}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">{context.adaptNote}</p>
        </div>
      </div>
    </section>
  );
}
