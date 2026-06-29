import {
  Activity,
  AudioLines,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  Cpu,
  Gauge,
  LockKeyhole,
  Mic2,
  Radar,
  ShieldCheck,
} from "lucide-react";

type FutureVoicePreviewProps = {
  compact?: boolean;
};

export function FutureVoicePreview({ compact = false }: FutureVoicePreviewProps) {
  return (
    <section
      className="future-card future-command-surface future-hud-shell cinematic-command-hud w-full min-w-0 overflow-hidden rounded-3xl border border-brand/20 bg-surface-raised/92 p-4 shadow-sm sm:p-5"
      data-visual="diana-os-cinematic-command-mode"
    >
      <div className="future-hud-topline flex min-w-0 flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider">
        <span className="inline-flex items-center gap-2">
          <Cpu size={14} />
          Diana OS
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="future-status-dot" aria-hidden="true" />
          Manual mic ready
        </span>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[1.02fr_0.78fr]">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            <span className="future-mic future-core-icon flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Mic2 size={21} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">
                Diana OS voice layer
              </p>
              <h2 className="mt-1 text-xl font-bold leading-tight sm:text-2xl">Talk it through. Diana maps the next move.</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                A voice-first layer for capture, source anchors, and proof that the work stays yours.
              </p>
            </div>
          </div>

          <div className="future-audio-strip mt-4 min-w-0">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                <AudioLines size={16} className="shrink-0 text-subject-science" />
                <span className="min-w-0 truncate">Stuck-point capture</span>
              </div>
              <span className="rounded-full border border-subject-history/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-subject-history">
                Student controlled
              </span>
            </div>
            <div className="mt-3 flex h-11 items-center gap-1" aria-hidden="true">
              {[16, 32, 19, 39, 24, 43, 18, 34, 21, 37, 15, 29].map((height, index) => (
                <span
                  key={`${height}-${index}`}
                  className="future-wave-bar w-full rounded-full bg-brand/75"
                  style={{ height: `${height}px`, animationDelay: `${index * 48}ms` }}
                />
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">
              "I know what the lab showed, but I need the first sentence of the conclusion."
            </p>
          </div>

          <div className="future-command-stack mt-4 grid min-w-0 grid-cols-3 gap-2 text-[11px] font-semibold uppercase tracking-wider">
            <span>Capture</span>
            <span>Anchor</span>
            <span>Move</span>
          </div>
        </div>

        <div className="future-hud-panel min-w-0">
          <div className="future-hud-ring mx-auto">
            <span className="text-display">84%</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">student control</span>
          </div>
          <div className="mt-4 space-y-2">
            <HudRow icon={Radar} label="Next move" value="ready" />
            <HudRow icon={BookOpenCheck} label="Source vault" value="linked" />
            <HudRow icon={ShieldCheck} label="Final work" value="protected" />
          </div>
          <div className="future-signal-matrix mt-4 grid grid-cols-4 gap-1" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, index) => (
              <span key={index} className={index % 5 === 0 ? "is-lit" : ""} />
            ))}
          </div>
        </div>
      </div>

      <div className="future-data-rail mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <PreviewPill icon={Bot} label="One move ready" />
        <PreviewPill icon={Gauge} label="Support adapts" />
        <PreviewPill icon={LockKeyhole} label="No takeover" />
      </div>

      {!compact && (
        <div className="future-response-line mt-4">
          <div className="flex min-w-0 items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-700 dark:text-teal-300" />
            <p className="min-w-0 text-sm">
              Diana answers with one academic step, the source it came from, and a next-step option.
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

function HudRow({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="future-hud-row flex min-w-0 items-center justify-between gap-3 text-xs">
      <span className="flex min-w-0 items-center gap-2">
        <Icon size={14} className="shrink-0 text-subject-science" />
        <span className="min-w-0 truncate">{label}</span>
      </span>
      <span className="shrink-0 font-semibold uppercase tracking-wider text-subject-history">{value}</span>
    </div>
  );
}
