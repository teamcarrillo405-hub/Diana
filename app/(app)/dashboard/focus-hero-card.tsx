import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Gauge, Sparkles } from "lucide-react";
import { TimeBar } from "./time-bar";
import { formatDueAt } from "@/lib/format";
import { KIND_LABEL } from "@/lib/checklists/templates";
import { TtsButton } from "@/components/tts-button";
import type { ScoredAssignment } from "@/lib/scoring/next-five-minutes";
import type { AssignmentStatus, TtsProvider } from "@/lib/supabase/types";
import type { SupportPlan } from "@/lib/support/policy";

type DashboardAssignment = ScoredAssignment & {
  created_at?: string | null;
  classes?: { name?: string | null; color?: string | null } | null;
};

type TtsConfig = {
  text: string;
  provider: TtsProvider;
  speed: number;
  pitch: number;
  voice: string;
};

export function FocusHeroCard({
  assignment,
  createdAt,
  energy,
  roughMode,
  supportPlan,
  tts,
}: {
  assignment: DashboardAssignment;
  createdAt?: string | null;
  energy: "low" | "medium" | "high";
  roughMode: boolean;
  supportPlan?: SupportPlan | null;
  tts?: TtsConfig;
}) {
  const classColor = assignment.classes?.color ?? "rgb(var(--brand))";
  const className = assignment.classes?.name ?? "School";
  const adaptationCue = roughMode
    ? "Rough-mode pacing"
    : energy === "low"
      ? "Low-energy start"
      : energy === "high"
        ? "Deep focus window"
        : "Steady focus";

  return (
    <section className="focus-surface animate-slide-up overflow-hidden rounded-3xl border border-brand/25 p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-surface-raised/80 px-3 py-1 text-xs font-medium text-brand-strong dark:text-brand">
              <Sparkles size={13} />
              Right now
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised/80 px-3 py-1 text-xs text-muted">
              <span className="size-2 rounded-full" style={{ background: classColor }} />
              {className}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised/80 px-3 py-1 text-xs text-muted">
              <Gauge size={13} />
              {adaptationCue}
            </span>
          </div>

          <div className="min-w-0">
            <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
              {assignment.title}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {KIND_LABEL[assignment.kind]}
              {assignment.effective_minutes != null && ` | ~${assignment.effective_minutes} min for you`}
              {assignment.due_at && ` | ${formatDueAt(assignment.due_at)}`}
            </p>
          </div>

          {assignment.due_at && (
            <TimeBar
              dueAt={assignment.due_at}
              createdAt={createdAt ?? assignment.created_at ?? undefined}
              status={assignment.status as AssignmentStatus}
              assignmentId={assignment.id}
            />
          )}

          {assignment.reasons.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Why this one
              </p>
              <ul className="flex flex-wrap gap-2">
                {assignment.reasons.map((reason) => (
                  <li
                    key={reason}
                    className="rounded-full border border-brand/20 bg-surface-raised/80 px-3 py-1 text-xs text-brand-strong dark:text-brand"
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {supportPlan && (
            <div className="rounded-2xl border border-brand/20 bg-surface-raised/85 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-strong dark:text-brand">
                  {supportPlan.headline}
                </p>
                {supportPlan.chips.map((chip) => (
                  <span key={chip} className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] text-brand-strong dark:text-brand">
                    {chip}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm text-muted">{supportPlan.rationale}</p>
              <p className="mt-3 text-sm font-medium">
                Next logical step: <span className="font-normal">{supportPlan.nextStep}</span>
              </p>
              {supportPlan.bodyCue && (
                <p className="mt-2 text-xs text-muted">{supportPlan.bodyCue}</p>
              )}
              {supportPlan.patternNote && (
                <p className="mt-2 text-xs text-muted">{supportPlan.patternNote}</p>
              )}
            </div>
          )}
        </div>

        <div className="w-full shrink-0 space-y-3 lg:w-64">
          <Link
            href={`/assignments/${assignment.id}`}
            className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong"
          >
            Start focus
            <ArrowRight size={17} />
          </Link>
          {supportPlan && (
            <Link
              href={`/assignments/${assignment.id}?focus=next-step`}
              className="touch-target inline-flex w-full items-center justify-center rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm font-semibold text-fg transition hover:bg-surface-soft"
            >
              Ask for next step
            </Link>
          )}
          {tts && (
            <TtsButton
              text={tts.text}
              provider={tts.provider}
              speed={tts.speed}
              pitch={tts.pitch}
              voice={tts.voice}
            />
          )}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-muted">
            <ProgressCue label="Started" icon={Clock3} />
            <ProgressCue label="Step done" icon={CheckCircle2} />
            <ProgressCue label="Submit ready" icon={CheckCircle2} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressCue({
  label,
  icon: Icon,
}: {
  label: string;
  icon: typeof Clock3;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface-raised/80 px-2 py-2">
      <Icon size={14} className="mx-auto mb-1 text-brand" />
      <span className="block truncate">{label}</span>
    </div>
  );
}
