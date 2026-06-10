import Link from "next/link";
import { BookOpenCheck, CalendarCheck2, LockKeyhole, Mic2, Sparkles } from "lucide-react";
import { FutureModeToggle } from "@/components/future-mode-toggle";
import { FutureVoicePreview } from "@/components/future-voice-preview";
import { ProductPreviewCard } from "@/components/product-preview-card";
import { SparkConstellation } from "@/components/spark/spark-constellation";

/**
 * Landing — paced like a product film, not a widget collage.
 * Dark cinematic hero (one visual), one story per section, Wrapped-style
 * calm stats, manifesto, frame top and bottom. Quiet Command throughout.
 */
export default function LandingPage() {
  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-surface">
      {/* Frame: frosted sticky header */}
      <header className="landing-header-glass sticky top-0 z-50 border-b border-white/10">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-base font-bold text-slate-100">
            <span className="text-violet-400">✦</span> Diana
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <FutureModeToggle compact />
            <Link href="/login" className="hidden text-sm font-medium text-slate-300 hover:text-white sm:block">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="press-scale touch-target inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Act 1 — the hero. One headline, one promise, one product. */}
      <section className="landing-hero relative -mt-14 overflow-hidden pt-14">
        <SparkConstellation
          seed="diana-hero"
          stars={18}
          className="pointer-events-none absolute right-[-6%] top-[-8%] h-[34rem] w-[34rem] text-violet-400/40"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-violet-200">
            <span className="size-2 rounded-full bg-violet-400" />
            Built for high school focus
          </p>

          <h1 className="mt-8 text-balance text-[2.6rem] font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            <span className="block">Your next 5 minutes,</span>
            <span className="block bg-gradient-to-r from-violet-300 via-violet-400 to-teal-300 bg-clip-text text-transparent">
              made clear.
            </span>
          </h1>

          <p className="safe-copy mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Diana turns school chaos into one calm move at a time — plan, read, write, and study,
            while the work stays completely yours.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="press-scale touch-target inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-slate-950 hover:bg-slate-200 sm:w-auto"
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="/signup?mode=voice"
              className="press-scale touch-target inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 sm:w-auto"
            >
              <Sparkles size={16} className="text-teal-300" /> Try Diana OS
            </Link>
          </div>

          <div className="future-mode-only future-os-strip mt-8 w-full max-w-lg">
            <span>Diana OS</span>
            <span>Manual mic</span>
            <span>Source link</span>
            <span>Proof on</span>
          </div>

          {/* The one product visual — glowing, alone, Apple-style. */}
          <div
            className="landing-product-frame mt-14 w-full max-w-2xl sm:mt-20"
            data-visual="landing-mobile-preview-above-fold"
          >
            <ProductPreviewCard />
          </div>
        </div>
      </section>

      {/* Act 2 — one calm move (the voice layer, large and alone). */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-strong dark:text-brand">
            Talk it through
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Stuck is a place Diana knows the way out of.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted">
            Say what&apos;s blocking you — out loud if you want. Diana maps the next move from your
            own class material, and never writes the work for you.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-3xl">
          <FutureVoicePreview />
        </div>
      </section>

      {/* Act 3 — three pillars with room to breathe. */}
      <section className="border-y border-border bg-surface-soft/60">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-24 md:grid-cols-3">
          <Pillar
            icon={CalendarCheck2}
            title="Plan without the panic"
            body="Canvas imports, test-prep plans built backward from the date, and a dashboard that shows one move — never the whole mountain."
          />
          <Pillar
            icon={BookOpenCheck}
            title="Learn it your way"
            body="Read-aloud, dyslexia-friendly type, grid paper that keeps math lined up, and helpers that ask questions instead of giving answers."
          />
          <Pillar
            icon={LockKeyhole}
            title="Prove it's yours"
            body="Every AI assist is logged and visible. Receipts you can show a teacher. The thinking — and the credit — stay with you."
          />
        </div>
      </section>

      {/* Act 4 — Wrapped-style numbers, calm edition. */}
      <section className="landing-wash">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 text-center sm:grid-cols-2 sm:px-6 sm:py-24 lg:grid-cols-4">
          <Stat big="1" label="move at a time — never a wall of tasks" />
          <Stat big="5 min" label="steps, sized for real attention spans" />
          <Stat big="(i)" label="on every AI assist — nothing hidden" />
          <Stat big="100%" label="your work, with the proof to show it" />
        </div>
      </section>

      {/* Act 5 — the manifesto + final ask. */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
          No red ink. No streaks to lose. No guilt mechanics.
          <span className="text-muted"> Just the next five minutes, made doable — for brains that
          school wasn&apos;t built for.</span>
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="press-scale touch-target inline-flex w-full items-center justify-center rounded-full bg-brand px-8 py-3.5 text-base font-semibold text-white hover:bg-brand-strong sm:w-auto"
          >
            Start with your next 5 minutes
          </Link>
          <Link
            href="/login"
            className="touch-target inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-base font-medium text-muted hover:text-fg sm:w-auto"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Frame: footer */}
      <footer className="border-t border-border bg-surface-soft/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:px-6">
          <p className="inline-flex items-center gap-2 font-semibold text-fg">
            <span aria-hidden="true" className="text-brand">✦</span> Diana
            <span className="font-normal text-muted">— calm help with school</span>
          </p>
          <p className="flex items-center gap-2">
            <Mic2 size={14} className="text-brand" /> Voice-first · Dyslexia-friendly · Student-owned
          </p>
          <p className="max-w-xs text-center text-xs sm:text-right">
            Signup requires a date of birth. Users under 13 cannot use AI features.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Pillar({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BookOpenCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="min-w-0 text-center md:text-left">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Icon size={22} />
      </span>
      <h3 className="mt-5 text-emphasis font-semibold">{title}</h3>
      <p className="mt-3 leading-7 text-muted">{body}</p>
    </div>
  );
}

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-5xl font-bold tracking-tight text-white sm:text-6xl">{big}</p>
      <p className="mx-auto mt-3 max-w-[16rem] text-sm leading-6 text-slate-300">{label}</p>
    </div>
  );
}
