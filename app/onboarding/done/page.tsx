import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { AccentPicker } from "@/components/accent-picker";
import { AppMark } from "@/components/screen-design/app-mark";
import { ThemePicker } from "@/components/theme-picker";

export default function OnboardingDonePage() {
  return (
    <main id="main-content" className="sd-onboarding-page">
      <div className="sd-onboarding-shell">
        <section className="sd-onboarding-intro">
          <AppMark href="/" />
          <div>
            <p className="sd-kicker"><CheckCircle2 size={14} aria-hidden="true" /> Diana is set</p>
            <h1 className="sd-title">Your game plan is ready.</h1>
            <p className="sd-subtitle">
              Diana will open to one useful next move with your class source and authorship boundary visible.
            </p>
          </div>
          <Link href="/dashboard" className="sd-button sd-button-primary">
            Open Today <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>

        <section className="sd-onboarding-card sd-grid">
          <div>
            <p className="sd-kicker">Final look</p>
            <h2 className="sd-section-title">Keep it comfortable</h2>
            <p className="sd-subtitle">Adjust the theme and accent now or change them any time in Settings.</p>
          </div>
          <div className="sd-panel sd-panel-pad sd-grid">
            <ThemePicker />
            <AccentPicker />
          </div>
        </section>
      </div>
    </main>
  );
}
