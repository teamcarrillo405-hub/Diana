import { redirect } from "next/navigation";
import { BookOpenCheck, SlidersHorizontal, Sparkles } from "lucide-react";

import { AppMark } from "@/components/screen-design/app-mark";
import { loadProfile } from "@/lib/profile";
import { OnboardingForm } from "./form";

export default async function OnboardingPage() {
  const profile = await loadProfile();
  if (!profile) redirect("/login");
  if (profile.onboarded_at) redirect("/dashboard");

  return (
    <main id="main-content" className="sd-onboarding-page">
      <div className="sd-onboarding-shell">
        <aside className="sd-onboarding-intro">
          <AppMark href="/" />
          <div>
            <p className="sd-kicker">Set up Diana</p>
            <h1 className="sd-title">Make school fit the way you learn.</h1>
            <p className="sd-subtitle">
              Five short choices set reading comfort, support needs, school context, and interests. You can change everything later.
            </p>
          </div>
          <div className="sd-onboarding-points">
            <span><SlidersHorizontal size={18} aria-hidden="true" /> One decision at a time</span>
            <span><BookOpenCheck size={18} aria-hidden="true" /> Class sources stay visible</span>
            <span><Sparkles size={18} aria-hidden="true" /> Help adapts without taking over</span>
          </div>
        </aside>

        <section className="sd-onboarding-card">
          <OnboardingForm initial={profile} />
        </section>
      </div>
    </main>
  );
}
