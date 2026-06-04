import { AudioLines, Bot, CheckCircle2, LockKeyhole, Mic2, ShieldCheck } from "lucide-react";

type FutureVoicePreviewProps = {
  compact?: boolean;
};

export function FutureVoicePreview({ compact = false }: FutureVoicePreviewProps) {
  return (
    <section className="future-card future-command-surface w-full min-w-0 overflow-hidden rounded-3xl border border-brand/20 bg-surface-raised/92 p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">
            Future voice mode
          </p>
          <h2 className="mt-1 text-lg font-bold leading-tight sm:text-xl">Talk it through, keep the work yours.</h2>
        </div>
        <span className="future-mic flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Mic2 size={20} />
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-border/80 bg-surface/70 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <AudioLines size={16} className="text-subject-science" />
          <span>Listening for the stuck point</span>
        </div>
        <div className="mt-3 flex h-10 items-center gap-1" aria-hidden="true">
          {[18, 28, 15, 34, 22, 38, 18, 30, 14, 26].map((height, index) => (
            <span
              key={`${height}-${index}`}
              className="future-wave-bar w-full rounded-full bg-brand/75"
              style={{ height: `${height}px`, animationDelay: `${index * 60}ms` }}
            />
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          "I know what the lab showed, but I do not know how to start the conclusion."
        </p>
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <PreviewPill icon={Bot} label="Next move ready" />
        <PreviewPill icon={ShieldCheck} label="Source anchored" />
        <PreviewPill icon={LockKeyhole} label="No takeover" />
      </div>

      {!compact && (
        <div className="mt-4 rounded-2xl border border-subject-science/30 bg-subject-science/10 p-3">
          <div className="flex min-w-0 items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-700 dark:text-teal-300" />
            <p className="min-w-0 text-sm">
              Diana answers with one academic step, a reason, and the option to ask for the next step.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function PreviewPill({ icon: Icon, label }: { icon: typeof Bot; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-surface-raised/80 px-3 py-2 text-xs text-muted">
      <Icon size={14} className="shrink-0 text-brand" />
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}
