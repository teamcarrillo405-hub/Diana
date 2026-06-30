import { redirect } from "next/navigation";
import { loadProfile } from "@/lib/profile";
import { OnboardingForm } from "./form";
import { SchoolMixRibbon } from "@/components/signal/school-mix-ribbon";
import { SignalStage } from "@/components/signal/signal-stage";

export default async function OnboardingPage() {
  const profile = await loadProfile();
  if (!profile) redirect("/login");
  if (profile.onboarded_at) redirect("/dashboard");

  return (
    <main id="main-content" className="signal-page">
      <SignalStage>
        <div className="signal-shell grid min-h-dvh items-center gap-8 py-8 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="space-y-6 pt-16 lg:pt-0">
            <p className="signal-eyebrow">Set your Diana</p>
            <h1 className="max-w-[11ch] text-[clamp(2.8rem,6vw,5.8rem)] font-black leading-[0.96] tracking-normal text-white">
              Tune your command deck.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-300">
              Choose the look, reading comfort, and learning patterns Diana should respect from the first screen.
            </p>
            <SchoolMixRibbon />
            <div className="nexus-auth-preview hidden lg:block">
              <div className="min-h-[24rem]" aria-hidden="true" />
            </div>
          </aside>

          <section className="onboarding-signal-dock">
            <OnboardingForm initial={profile} />
          </section>
        </div>
      </SignalStage>
    </main>
  );
}
