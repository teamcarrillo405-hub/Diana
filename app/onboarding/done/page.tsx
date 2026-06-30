import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AccentPicker } from "@/components/accent-picker";
import { ThemePicker } from "@/components/theme-picker";

export default function OnboardingDonePage() {
  return (
    <main id="main-content" className="signal-page">
      <section className="signal-stage signal-stage-dark">
        <div className="signal-shell grid min-h-dvh items-center gap-8 py-10 lg:grid-cols-[1fr_0.85fr]">
          <div className="space-y-6">
            <p className="signal-eyebrow">Diana is set</p>
            <h1 className="max-w-[12ch] text-[clamp(2.8rem,6vw,5.8rem)] font-black leading-[0.96] tracking-normal text-white">
              Your deck is ready.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-300">
              Save the feel now. Diana will open to one next move, with sources and authorship proof attached.
            </p>
            <div className="nexus-panel grid max-w-2xl gap-4 p-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-black text-white">Theme</span>
                <ThemePicker />
              </div>
              <AccentPicker />
            </div>
            <Link href="/dashboard" className="signal-pill-primary">
              Open Today
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="nexus-auth-preview">
            <div className="min-h-[28rem]" aria-hidden="true" />
          </div>
        </div>
      </section>
    </main>
  );
}
