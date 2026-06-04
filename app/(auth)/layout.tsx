import Link from "next/link";
import { BookOpenCheck, LockKeyhole, Mic2, ShieldCheck } from "lucide-react";
import { FutureModeToggle } from "@/components/future-mode-toggle";
import { FutureVoicePreview } from "@/components/future-voice-preview";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="future-field flex min-h-dvh w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl min-w-0 items-center gap-6 lg:grid-cols-[0.95fr_0.85fr]">
        <section className="hidden min-w-0 space-y-5 lg:block">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold">
              <span className="flex size-9 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <ShieldCheck size={18} />
              </span>
              Diana
            </Link>
            <FutureModeToggle compact />
          </div>

          <div className="max-w-xl space-y-4">
            <p className="inline-flex rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-sm font-semibold text-brand-strong dark:text-brand">
              School command center
            </p>
            <h1 className="text-5xl font-bold leading-tight">Start with the next move, not another blank chat.</h1>
            <p className="text-lg leading-8 text-muted">
              Sign in to keep assignments, voice captures, source anchors, study cards, and authorship proof in one private place.
            </p>
          </div>

          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            <AuthSignal icon={Mic2} label="Voice-ready" />
            <AuthSignal icon={BookOpenCheck} label="Source-linked" />
            <AuthSignal icon={LockKeyhole} label="Student-owned" />
          </div>

          <FutureVoicePreview compact />
        </section>

        <div className="mobile-safe-width mx-auto flex min-w-0 flex-col justify-center sm:max-w-md lg:mx-0 lg:justify-self-end">
          {children}
        </div>
      </div>
    </main>
  );
}

function AuthSignal({ icon: Icon, label }: { icon: typeof Mic2; label: string }) {
  return (
    <div className="future-card flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-surface-raised/88 p-3 text-sm">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon size={16} />
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}
