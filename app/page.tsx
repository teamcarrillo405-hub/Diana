import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  GraduationCap,
  LockKeyhole,
  Mic2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FutureModeToggle } from "@/components/future-mode-toggle";
import { NexusArcadeScene, NexusMetric } from "@/components/nexus/nexus-ui";

export default function LandingPage() {
  return (
    <main id="main-content" className="nexus-landing min-h-dvh">
      <header className="nexus-public-header fixed inset-x-0 top-0 z-40 border-b border-white/10 text-white backdrop-blur-2xl">
        <div className="diana-page flex h-16 items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 font-black">
            <span className="nexus-logo-mark grid size-8 place-items-center text-sm">D</span>
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-nexus-cyan">Diana</span>
          </Link>
          <div className="flex items-center gap-2">
            <FutureModeToggle compact className="hidden bg-white/[0.08] text-white sm:inline-flex" />
            <Link href="/login" className="hidden text-sm font-bold text-slate-300 hover:text-white sm:inline">
              Sign in
            </Link>
            <Link href="/signup" className="nexus-button nexus-button-primary min-h-10 px-4 py-2 text-sm">
              Start
            </Link>
          </div>
        </div>
      </header>

      <section className="nexus-hero relative overflow-hidden text-white">
        <div className="diana-page relative grid min-h-[100dvh] items-center gap-10 pb-14 pt-24 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-7">
            <p className="nexus-kicker">
              <Sparkles size={15} />
              Student command arcade
            </p>
            <div className="space-y-5">
              <h1 className="diana-title">
                Diana
                <span className="block text-nexus-cyan">Nexus</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                A private learning companion that helps teenagers understand their brain, finish schoolwork,
                protect original thinking, and build a future path.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="nexus-button nexus-button-primary">
                Start with my next move
                <ArrowRight size={17} />
              </Link>
              <Link href="/login" className="nexus-button nexus-button-secondary">
                Open Diana
              </Link>
            </div>
            <div className="grid max-w-2xl gap-2 text-sm text-slate-300 sm:grid-cols-3">
              <HeroCue icon={Mic2} label="Talk first" />
              <HeroCue icon={ShieldCheck} label="Keep the work yours" />
              <HeroCue icon={GraduationCap} label="Build the path" />
            </div>
          </div>

          <div className="nexus-hero-core">
            <NexusArcadeScene />
            <div className="nexus-hero-stats grid gap-3 sm:grid-cols-3">
              <NexusMetric label="Start" value="05" detail="minutes" tone="cyan" />
              <NexusMetric label="Sources" value="ON" detail="visible" tone="gold" />
              <NexusMetric label="Proof" value="YRS" detail="student-owned" tone="pink" />
            </div>
          </div>
        </div>
      </section>

      <section className="diana-page grid gap-8 py-16 lg:grid-cols-[0.86fr_1.14fr] lg:py-24">
        <div className="space-y-5">
          <p className="nexus-kicker">The daily product</p>
          <h2 className="diana-app-title max-w-xl">One move now. A clearer story over time.</h2>
          <p className="diana-copy">
            Diana is not another blank chat box. It starts from the student&apos;s words, class sources,
            and energy level, then turns the next five minutes into a visible action.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_0.72fr]">
          <FeaturePanel
            icon={Brain}
            title="Understand myself"
            body="Patterns, strengths, accommodations, and brain-day settings become part of the product, not hidden profile fields."
          />
          <FeaturePanel
            icon={BookOpenCheck}
            title="Finish schoolwork"
            body="Diana shows one next move, the source behind it, and the smallest action that starts momentum."
          />
          <FeaturePanel
            icon={LockKeyhole}
            title="Protect original thinking"
            body="Brain dumps, outlines, checks, and receipts show what came from the student and what Diana organized."
          />
          <FeaturePanel
            icon={GraduationCap}
            title="Prepare for college"
            body="Future Path connects grades, activities, proof points, essays, scholarships, and support plans."
          />
        </div>
      </section>

      <section className="nexus-process-band text-white">
        <div className="diana-page grid gap-10 py-16 lg:grid-cols-[0.72fr_1.28fr] lg:py-24">
          <div className="space-y-5">
            <p className="nexus-kicker">Student voice first</p>
            <h2 className="diana-app-title max-w-lg">Diana helps you find your own words.</h2>
            <p className="max-w-xl text-base leading-8 text-slate-300">
              The writing flow starts with rough thoughts, voice notes, evidence, or photos. Diana can
              organize and check the work, but the student owns the idea.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              ["Think", "Say what you noticed. Capture the rough idea first."],
              ["Outline", "Turn your own thoughts into a structure."],
              ["Draft", "Write in your voice. Diana asks questions and checks clarity."],
              ["Proof", "Keep a receipt of student work, Diana help, and final choices."],
            ].map(([label, body], index) => (
              <div key={label} className="nexus-process-card grid gap-4 p-4 sm:grid-cols-[4rem_1fr]">
                <span className="nexus-process-number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-lg font-black">{label}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="diana-page flex flex-col gap-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-nexus-cyan">Diana</p>
          <p>Voice-first, dyslexia-aware, student-owned school support.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 font-black text-nexus-gold">
            Start with one move
            <ArrowRight size={16} />
          </Link>
        </div>
      </footer>
    </main>
  );
}

function HeroCue({ icon: Icon, label }: { icon: typeof Mic2; label: string }) {
  return (
    <span className="nexus-hero-cue inline-flex min-h-10 items-center gap-2 px-3 py-2">
      <Icon size={15} className="shrink-0 text-nexus-cyan" />
      {label}
    </span>
  );
}

function FeaturePanel({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Brain;
  title: string;
  body: string;
}) {
  return (
    <article className="diana-zone p-5">
      <Icon size={22} className="text-nexus-cyan" />
      <h3 className="mt-6 text-2xl font-black">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
      <div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-nexus-gold">
        <CheckCircle2 size={14} />
        Ready
      </div>
    </article>
  );
}
