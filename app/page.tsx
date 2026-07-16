import Link from "next/link";

import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";

export default function DianaLandingPage() {
  return (
    <ScreenDesignViewport
      className="sd-source-onboarding"
      data-onboarding-step="welcome"
      aria-label="Diana welcome"
    >
      <main id="main-content" className="sd-onboarding-state sd-onboarding-welcome">
        <SourceMedia
          assetId="onboarding-welcome-background"
          width={1586}
          height={992}
          decorative
          className="sd-onboarding-welcome-background"
        />
        <header className="sd-onboarding-welcome-header">
          <SourceMedia
            assetId="diana-logo"
            width={96}
            height={30}
            alt="DIANA logo"
            className="sd-onboarding-logo sd-onboarding-logo-hero"
          />
        </header>
        <div className="sd-onboarding-welcome-copy">
          <h1>
            DIANA
            <span>AI TUTOR</span>
          </h1>
          <p>
            Your Academic Coach
            <br />
            for the Win.
          </p>
        </div>
        <footer className="sd-onboarding-footer">
          <Link href="/signup" className="sd-onboarding-primary">
            GET STARTED
          </Link>
        </footer>
      </main>
    </ScreenDesignViewport>
  );
}
