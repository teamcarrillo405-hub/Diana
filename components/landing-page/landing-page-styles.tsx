import type {
  LandingBreakpoint,
  LandingNodeId,
  LandingPageConfig,
} from "@/lib/landing-page/config";

function nodeRules(
  breakpoint: LandingBreakpoint,
  config: LandingPageConfig,
): string {
  return Object.entries(config.nodeStyles[breakpoint])
    .map(([nodeId, style]) => {
      const safeNodeId = nodeId as LandingNodeId;
      const fontSize =
        style.fontSizePx === null ? "" : `font-size:${style.fontSizePx}px!important;`;
      return `
        .diana-app .sd-public-home-scroll [data-landing-node="${safeNodeId}"] {
          width:${style.widthPct}%!important;
          transform:translate3d(${style.x}px,${style.y}px,0)!important;
          ${fontSize}
        }
      `;
    })
    .join("\n");
}

export function LandingPageStyles({
  config,
}: {
  readonly config: LandingPageConfig;
}) {
  const mobileRules = nodeRules("mobile", config);
  const desktopRules = nodeRules("desktop", config);

  return (
    <style>{`
      .sd-public-home-scroll {
        --landing-canvas:${config.theme.canvas};
        --landing-surface:${config.theme.surface};
        --landing-pink:${config.theme.pink};
        --landing-blue:${config.theme.blue};
        --landing-teal:${config.theme.teal};
        background:var(--landing-canvas);
      }
      .sd-public-home-scroll .sd-onboarding-state,
      .sd-public-home-scroll .sd-upgrade-screen {
        background:var(--landing-canvas);
      }
      .sd-public-home-scroll :is(
        .sd-onboarding-welcome-copy h1 span,
        .sd-onboarding-stat-copy p span,
        .sd-upgrade-hero h1 span,
        .sd-upgrade-community-hero h1 span
      ) {
        color:var(--landing-pink);
      }
      .sd-public-home-scroll :is(
        .sd-onboarding-section-title > span,
        .sd-onboarding-stat-copy p b,
        .sd-upgrade-kicker,
        .sd-upgrade-community-plan-label,
        .sd-upgrade-community-fact span
      ) {
        color:var(--landing-blue)!important;
      }
      .diana-app .sd-public-home-scroll :is(
        .sd-onboarding-primary,
        .sd-upgrade-primary,
        .sd-upgrade-option-badge,
        .sd-onboarding-choice-badge
      ) {
        background:linear-gradient(90deg,var(--landing-pink),var(--landing-blue));
      }
      .sd-public-home-scroll .sd-upgrade-benefit:nth-child(3) .sd-upgrade-benefit-icon {
        color:var(--landing-teal);
      }
      .sd-public-home-scroll .sd-landing-logo-node {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        flex:0 0 auto;
      }
      .sd-public-home-scroll :is(
        [data-landing-node="hero.subtitle"],
        [data-landing-node="challenge.heading"],
        [data-landing-node="schedule.heading"]
      ) {
        white-space:pre-line;
      }
      @media (max-width:959px) {
        .sd-public-home-scroll .sd-onboarding-welcome-background {
          opacity:${config.theme.heroImageOpacity.mobile};
        }
        ${mobileRules}
      }
      @media (min-width:960px) {
        .sd-public-home-scroll .sd-onboarding-welcome-background {
          opacity:${config.theme.heroImageOpacity.desktop};
        }
        ${desktopRules}
      }
    `}</style>
  );
}
