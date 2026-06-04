import Link from "next/link";
import { AudioLines, BookOpenCheck, LockKeyhole, Mic2 } from "lucide-react";
import { FutureModeToggle } from "@/components/future-mode-toggle";
import { FutureVoicePreview } from "@/components/future-voice-preview";
import { ProductPreviewCard } from "@/components/product-preview-card";
import { ResponsiveActionRow } from "@/components/responsive-action-row";

export default function LandingPage() {
  return (
    <main className="future-field min-h-dvh w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
      <section className="mobile-safe-width mx-auto grid min-h-[calc(100dvh-3rem)] min-w-0 items-center gap-8 pb-10 pt-6 sm:max-w-6xl md:grid-cols-[0.9fr_1.1fr] md:gap-10">
        <div className="w-full min-w-0 space-y-7">
          <header className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-sm font-medium text-brand-strong dark:text-brand">
                <span className="size-2 shrink-0 rounded-full bg-brand" />
                <span className="min-w-0 truncate">Built for high school focus</span>
              </div>
              <FutureModeToggle compact />
            </div>
            <h1 className="mt-5 max-w-full text-[2rem] font-bold leading-[1.08] tracking-normal sm:max-w-3xl sm:text-5xl lg:text-6xl">
              <span className="block">Your next 5{" "}</span>
              <span className="block">minutes, made clear.</span>
            </h1>
            <p className="safe-copy mt-5 max-w-full text-base leading-7 text-muted sm:max-w-xl sm:text-lg">
              Diana turns school chaos into one calm move at a time. It helps you plan, read, write, study, and check your work while keeping the work yours.
            </p>
          </header>

          <ResponsiveActionRow>
            <Link
              href="/signup"
              className="touch-target inline-flex w-full items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong sm:w-auto"
            >
              Get started
            </Link>
            <Link
              href="/signup?mode=voice"
              className="touch-target inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface-raised px-5 py-3 text-sm font-semibold text-fg transition hover:bg-surface-soft sm:w-auto"
            >
              Try voice setup
            </Link>
          </ResponsiveActionRow>

          <div className="grid min-w-0 gap-3 text-sm text-fg/90 sm:grid-cols-3">
            <FeatureSignal icon={Mic2} label="Talk through the stuck point." />
            <FeatureSignal icon={BookOpenCheck} label="Get one source-linked next move." />
            <FeatureSignal icon={LockKeyhole} label="Keep proof that the work stays yours." />
          </div>

          <p className="max-w-full text-xs leading-5 text-muted sm:max-w-xl">
            Signup requires a date of birth. Users under 13 cannot use AI features.
          </p>
        </div>

        <div className="w-full min-w-0 space-y-4">
          <ProductPreviewCard />
          <FutureVoicePreview />
        </div>
      </section>
    </main>
  );
}

function FeatureSignal({
  icon: Icon,
  label,
}: {
  icon: typeof AudioLines;
  label: string;
}) {
  return (
    <div className="future-card flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-surface-raised/90 p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon size={16} />
      </span>
      <span className="min-w-0 text-sm leading-snug">{label}</span>
    </div>
  );
}
