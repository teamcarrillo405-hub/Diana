import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { FutureModeToggle } from "@/components/future-mode-toggle";
import { SignalStage } from "@/components/signal/signal-stage";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="signal-page">
      <SignalStage>
        <div className="signal-shell grid min-h-dvh items-center gap-8 py-6 lg:grid-cols-[1fr_0.74fr]">
          <section className="space-y-6 pt-16 lg:pt-0">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-slate-200">
                <ArrowLeft size={16} />
                Diana
              </Link>
              <FutureModeToggle compact className="bg-white/[0.08] text-white" />
            </div>

            <div className="space-y-4">
              <p className="signal-eyebrow">
                <LockKeyhole size={14} />
                Private student space
              </p>
              <h1 className="max-w-[12ch] text-[clamp(2.8rem,6vw,5.8rem)] font-black leading-[0.96] tracking-normal text-white">
                Open your command deck.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Sign in to see what to do now, keep sources visible, and protect what is yours.
              </p>
            </div>

            <div className="nexus-auth-preview">
              <div className="min-h-[24rem]" aria-hidden="true" />
            </div>
          </section>

          <section className="auth-dock w-full justify-self-end">
            {children}
          </section>
        </div>
      </SignalStage>
    </main>
  );
}
