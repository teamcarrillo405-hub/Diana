"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  FileCheck2,
  LockKeyhole,
  Quote,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";
import {
  DEFAULT_LANDING_PAGE_CONFIG,
  type LandingPageConfig,
} from "@/lib/landing-page/config";

export type UpgradeScreenView = "standard" | "community";

const UPGRADE_STYLES = `
  .diana-authenticated-field:has(.sd-upgrade-screen) { padding-bottom:0!important; }
  .app-command-frame:has(.sd-upgrade-screen) { width:100%!important; max-width:none!important; padding:0!important; }
  .app-command-frame:has(.sd-upgrade-screen) .diana-mobile-command,
  .diana-app-shell:has(.sd-upgrade-screen) .agent-fab-anchor { display:none!important; }
  .diana-app:has(.sd-upgrade-screen) nextjs-portal { display:none!important; }
  .diana-app:has(.sd-upgrade-screen) .skip-link { transition:none; }
  .diana-app:has(.sd-upgrade-screen) .skip-link:focus { transform:translateY(0)!important; }
  .sd-upgrade-screen { display:flex; height:max(100dvh,852px); max-height:max(100dvh,852px); flex-direction:column; overflow:hidden; background:#0f172a; color:#fff; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .sd-upgrade-screen * { box-sizing:border-box; }
  .sd-upgrade-screen a:focus-visible,
  .sd-upgrade-screen button:focus-visible { outline:2px solid #74c0ff; outline-offset:3px; }
  .sd-upgrade-header { position:relative; z-index:20; display:flex; flex:none; align-items:center; justify-content:space-between; padding:52px 24px 10px; }
  .sd-upgrade-header .sd-source-wordmark { width:auto; height:17px; margin-left:8px; }
  .diana-app .sd-upgrade-screen .sd-upgrade-close { display:grid; width:40px; height:40px; min-height:40px; place-items:center; border:0; border-radius:999px; background:rgb(255 255 255 / .1); padding:0; clip-path:none; color:#fff; font:inherit; text-decoration:none; box-shadow:none; }
  .sd-upgrade-close svg { width:21px; height:21px; }
  .sd-upgrade-scroll { min-height:0; flex:1; overflow-y:auto; padding:15px 32px 26px; scrollbar-width:none; }
  .sd-upgrade-scroll::-webkit-scrollbar { display:none; }
  .sd-upgrade-hero { margin-bottom:26px; text-align:center; }
  .sd-upgrade-kicker { margin:0; color:#74c0ff!important; font-size:11px; font-style:italic; font-weight:950; letter-spacing:.18em; text-transform:uppercase; }
  .sd-upgrade-hero h1 { margin:8px 0 0; color:#fff; font-family:var(--font-display),Arial,sans-serif; font-size:38px; font-style:italic; font-weight:950; letter-spacing:-.045em; line-height:.92; text-transform:uppercase; }
  .sd-upgrade-hero h1 span { color:#ff79da; }
  .sd-upgrade-benefits { display:grid; gap:10px; margin-bottom:24px; }
  .sd-upgrade-benefit { display:grid; grid-template-columns:40px minmax(0,1fr); align-items:center; gap:13px; min-height:76px; border:1px solid rgb(255 255 255 / .1); border-radius:16px; background:rgb(255 255 255 / .05); padding:13px 14px; text-align:left; }
  .sd-upgrade-benefit-icon { display:grid; width:40px; height:40px; place-items:center; border-radius:10px; background:rgb(255 255 255 / .05); color:#ff79da; }
  .sd-upgrade-benefit:nth-child(2) .sd-upgrade-benefit-icon { color:#74c0ff; }
  .sd-upgrade-benefit:nth-child(3) .sd-upgrade-benefit-icon { color:#2dd4bf; }
  .sd-upgrade-benefit h2 { margin:0; color:#fff; font-size:12px; font-style:italic; font-weight:950; letter-spacing:.01em; text-transform:uppercase; }
  .sd-upgrade-benefit p { margin:4px 0 0; color:#cbd5e1!important; font-size:10px; font-weight:650; line-height:1.35; }
  .sd-upgrade-options { display:grid; gap:10px; }
  .diana-app .sd-upgrade-screen .sd-upgrade-option { position:relative; display:flex; width:100%; min-height:83px; align-items:center; justify-content:space-between; gap:12px; overflow:hidden; border:1px solid rgb(15 23 42 / .08); border-radius:16px; background:#fff; padding:17px; clip-path:none; color:#0f172a; font:inherit; text-align:left; text-decoration:none; text-transform:none; box-shadow:0 4px 15px rgb(0 0 0 / .1); }
  .diana-app .sd-upgrade-screen .sd-upgrade-option[data-featured="true"] { border:2px solid #ff79da; box-shadow:0 0 20px rgb(255 121 218 / .3); }
  .sd-upgrade-option-badge { position:absolute; top:0; right:0; border-radius:0 0 0 11px; background:linear-gradient(90deg,#ff79da,#74c0ff); padding:4px 11px; color:#0f172a; font-size:7px; font-style:italic; font-weight:950; letter-spacing:.08em; text-transform:uppercase; }
  .sd-upgrade-option h2 { margin:0; color:#0f172a; font-size:16px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-upgrade-option p { margin:4px 0 0; color:#64748b!important; font-size:9px; font-weight:750; line-height:1.35; }
  .sd-upgrade-option-state { display:flex; flex:none; align-items:center; gap:6px; color:#0f172a; font-size:8px; font-style:italic; font-weight:950; letter-spacing:.06em; text-transform:uppercase; }
  .sd-upgrade-unavailable { display:flex; align-items:flex-start; gap:9px; margin:0 0 12px; border:1px solid rgb(251 191 36 / .3); border-radius:11px; background:rgb(251 191 36 / .08); padding:10px 11px; color:#fde68a; font-size:9px; font-weight:750; line-height:1.4; }
  .sd-upgrade-footer { flex:none; padding:14px 32px max(25px,env(safe-area-inset-bottom)); text-align:center; }
  .diana-app .sd-upgrade-screen .sd-upgrade-primary { display:flex; width:100%; min-height:59px; align-items:center; justify-content:center; gap:9px; border:0; border-radius:12px; background:linear-gradient(90deg,#ff79da,#74c0ff); padding:0 18px; clip-path:none; color:#0f172a!important; font-family:inherit; font-size:12px; font-style:italic; font-weight:950; letter-spacing:.12em; text-decoration:none; text-transform:uppercase; box-shadow:0 10px 30px rgb(255 121 218 / .2); }
  .diana-app .sd-upgrade-screen .sd-upgrade-primary:hover:not(:disabled) { border:0; background:linear-gradient(90deg,#ff79da,#74c0ff); color:#0f172a; transform:none; }
  .sd-upgrade-screen button.sd-upgrade-close,
  .sd-upgrade-screen button.sd-upgrade-option,
  .sd-upgrade-screen button.sd-upgrade-primary { cursor:pointer; }
  .sd-upgrade-footer p { margin:10px 0 0; color:#64748b!important; font-size:7px; font-style:italic; font-weight:850; letter-spacing:.12em; line-height:1.45; text-transform:uppercase; }
  .sd-upgrade-community .sd-upgrade-scroll { padding-top:17px; }
  .sd-upgrade-community-hero { margin-bottom:24px; text-align:center; }
  .sd-upgrade-community-hero h1 { margin:0; color:#fff; font-family:var(--font-display),Arial,sans-serif; font-size:35px; font-style:italic; font-weight:950; letter-spacing:-.055em; line-height:.9; text-transform:uppercase; }
  .sd-upgrade-community-hero h1 span { display:block; color:#ff79da; }
  .sd-upgrade-community-hero p { margin:13px auto 0; color:#cbd5e1!important; font-size:9px; font-style:italic; font-weight:800; letter-spacing:.1em; line-height:1.45; text-transform:uppercase; }
  .sd-upgrade-proof { position:relative; overflow:hidden; margin-bottom:18px; border-radius:17px; background:#fff; padding:21px; color:#0f172a; box-shadow:0 4px 20px rgb(0 0 0 / .1); }
  .sd-upgrade-proof > svg { position:absolute; top:13px; left:13px; width:31px; height:31px; color:rgb(15 23 42 / .06); }
  .sd-upgrade-proof > p { position:relative; z-index:1; margin:0; color:#0f172a!important; font-size:14px; font-style:italic; font-weight:950; letter-spacing:-.02em; line-height:1.22; text-transform:uppercase; }
  .sd-upgrade-proof-person { display:flex; align-items:center; gap:11px; margin-top:17px; }
  .sd-upgrade-proof-person .sd-source-media { width:46px; height:46px; border:2px solid #74c0ff; border-radius:999px; object-fit:cover; }
  .sd-upgrade-proof-person strong { display:block; color:#0f172a; font-size:11px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-upgrade-proof-person small { display:block; margin-top:3px; color:#64748b; font-size:7px; font-weight:900; letter-spacing:.11em; text-transform:uppercase; }
  .sd-upgrade-community-facts { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
  .sd-upgrade-community-fact { display:grid; min-height:69px; place-content:center; border:1px solid rgb(255 255 255 / .1); border-radius:15px; background:rgb(255 255 255 / .05); padding:10px; text-align:center; }
  .sd-upgrade-community-fact strong { color:#fff; font-size:15px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-upgrade-community-fact span { margin-top:4px; color:#74c0ff; font-size:7px; font-style:italic; font-weight:950; letter-spacing:.1em; text-transform:uppercase; }
  .sd-upgrade-community-plan { display:grid; gap:12px; }
  .sd-upgrade-community-plan-label { display:flex; align-items:center; gap:7px; color:#74c0ff; font-size:8px; font-style:italic; font-weight:950; letter-spacing:.14em; text-transform:uppercase; }
  .sd-upgrade-community-plan-row { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; }
  .sd-upgrade-community-plan h2 { margin:0; color:#fff; font-size:17px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-upgrade-community-plan p { margin:4px 0 0; color:#cbd5e1!important; font-size:8px; font-weight:750; line-height:1.35; }
  .sd-upgrade-community-state { flex:none; color:#fff; font-size:10px; font-style:italic; font-weight:950; text-align:right; text-transform:uppercase; }
  .sd-upgrade-community-state small { display:block; margin-top:2px; color:#94a3b8; font-size:6px; letter-spacing:.08em; }
  .sd-upgrade-screen[data-public-scroll-section="true"] { height:auto; min-height:max(100dvh,852px); max-height:none; overflow:visible; }
  .sd-upgrade-screen[data-public-scroll-section="true"] .sd-upgrade-scroll { min-height:auto; flex:0 0 auto; overflow:visible; }
  @media (min-width:960px) {
    .sd-upgrade-screen[data-public-scroll-section="true"] { min-height:max(100dvh,760px); }
    .sd-upgrade-screen[data-public-scroll-section="true"] .sd-upgrade-header,
    .sd-upgrade-screen[data-public-scroll-section="true"] .sd-upgrade-scroll,
    .sd-upgrade-screen[data-public-scroll-section="true"] .sd-upgrade-footer { width:min(100%,1240px); margin-right:auto; margin-left:auto; }
    .sd-upgrade-screen[data-public-scroll-section="true"] .sd-upgrade-header { padding:40px 64px 12px; }
    .sd-upgrade-screen[data-public-scroll-section="true"] .sd-upgrade-header .sd-source-wordmark { height:21px; margin-left:0; }
    .sd-upgrade-screen[data-public-scroll-section="true"] .sd-upgrade-scroll { min-height:0; flex:1 1 auto; align-content:center; gap:24px 48px; padding:24px 64px; }
    .sd-upgrade-screen[data-public-scroll-section="true"] .sd-upgrade-footer { display:flex; flex-direction:column; align-items:flex-end; padding:14px 64px 34px; }
    .sd-upgrade-screen[data-public-scroll-section="true"] .sd-upgrade-primary { width:340px; min-height:64px; font-size:13px; }
    .sd-upgrade-screen[data-public-scroll-section="true"] .sd-upgrade-footer p { width:340px; font-size:8px; }
    .sd-upgrade-standard[data-public-scroll-section="true"] .sd-upgrade-scroll { display:grid; grid-template-columns:minmax(0,.8fr) minmax(30rem,1.2fr); grid-template-rows:auto auto; }
    .sd-upgrade-standard[data-public-scroll-section="true"] .sd-upgrade-hero { grid-column:1; grid-row:1 / span 2; align-self:center; margin:0; text-align:left; }
    .sd-upgrade-standard[data-public-scroll-section="true"] .sd-upgrade-hero h1 { font-size:68px; letter-spacing:0; line-height:.9; }
    .sd-upgrade-standard[data-public-scroll-section="true"] .sd-upgrade-benefits { grid-column:2; grid-row:1; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin:0; }
    .sd-upgrade-standard[data-public-scroll-section="true"] .sd-upgrade-benefit { min-height:154px; grid-template-columns:1fr; align-content:start; gap:14px; padding:20px; }
    .sd-upgrade-standard[data-public-scroll-section="true"] .sd-upgrade-benefit h2 { font-size:13px; letter-spacing:0; }
    .sd-upgrade-standard[data-public-scroll-section="true"] .sd-upgrade-benefit p { font-size:11px; }
    .sd-upgrade-standard[data-public-scroll-section="true"] .sd-upgrade-options { grid-column:2; grid-row:2; }
    .sd-upgrade-standard[data-public-scroll-section="true"] .sd-upgrade-option { min-height:106px; padding:22px; }
    .sd-upgrade-standard[data-public-scroll-section="true"] .sd-upgrade-option h2 { font-size:20px; letter-spacing:0; }
    .sd-upgrade-standard[data-public-scroll-section="true"] .sd-upgrade-option p { max-width:34rem; font-size:11px; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-scroll { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(24rem,.9fr); grid-template-rows:auto auto auto; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-community-hero { grid-column:1 / -1; margin:0 0 10px; text-align:left; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-community-hero h1 { max-width:58rem; font-size:58px; letter-spacing:0; line-height:.92; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-community-hero p { max-width:42rem; margin:16px 0 0; font-size:11px; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-proof { grid-column:1; grid-row:2 / span 2; align-self:stretch; margin:0; padding:32px; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-proof > p { max-width:36rem; font-size:23px; letter-spacing:0; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-proof-person { margin-top:28px; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-proof-person .sd-source-media { width:58px; height:58px; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-community-facts { grid-column:2; grid-row:2; margin:0; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-community-fact { min-height:96px; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-community-fact strong { font-size:17px; letter-spacing:0; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-community-plan { grid-column:2; grid-row:3; align-content:center; min-height:124px; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-community-plan h2 { font-size:21px; letter-spacing:0; }
    .sd-upgrade-community[data-public-scroll-section="true"] .sd-upgrade-community-plan p { font-size:10px; }
  }
  @media (prefers-reduced-motion:reduce) { .sd-upgrade-screen * { scroll-behavior:auto!important; transition:none!important; } }
`;

export function UpgradeScreen({
  view,
  billingEnabled,
  billingUnavailable = false,
  onPrimaryAction,
  primaryActionLabel,
  onClose,
  closeLabel = "Close access options",
  publicScrollSection = false,
  sectionId,
  landingConfig = DEFAULT_LANDING_PAGE_CONFIG,
}: {
  view: UpgradeScreenView;
  billingEnabled: boolean;
  billingUnavailable?: boolean;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  onClose?: () => void;
  closeLabel?: string;
  publicScrollSection?: boolean;
  sectionId?: string;
  landingConfig?: LandingPageConfig;
}) {
  const actionHref = billingEnabled ? "/api/billing/checkout" : "/settings";
  const actionLabel =
    primaryActionLabel ??
    (billingEnabled
      ? "Continue to secure checkout"
      : "Manage access settings");
  const closeControl = onClose ? (
    <button
      type="button"
      onClick={onClose}
      className="sd-upgrade-close"
      aria-label={closeLabel}
    >
      <X aria-hidden="true" />
    </button>
  ) : (
    <Link href="/settings" className="sd-upgrade-close" aria-label={closeLabel}>
      <X aria-hidden="true" />
    </Link>
  );
  const ContentElement = publicScrollSection ? "div" : "main";
  const communityContent = landingConfig.community;
  const standardContent = landingConfig.standard;

  if (view === "community") {
    return (
      <ScreenDesignViewport
        id={sectionId}
        className={`sd-upgrade-screen sd-upgrade-community${publicScrollSection ? " sd-public-home-panel" : ""}`}
        data-public-scroll-section={publicScrollSection}
        aria-label="Diana community access"
      >
        <style>{UPGRADE_STYLES}</style>
        <header className="sd-upgrade-header">
          <span
            className="sd-landing-logo-node"
            data-landing-node="community.logo"
            data-landing-movable="true"
          >
            <DianaWordmark />
          </span>
          {closeControl}
        </header>

        <ContentElement className="sd-upgrade-scroll">
          <section
            className="sd-upgrade-community-hero"
            data-landing-node="community.heading"
            data-landing-movable="true"
          >
            <h1>
              {communityContent.title}
              <span>{communityContent.accentTitle}</span>
            </h1>
            <p>{communityContent.subtitle}</p>
          </section>

          <section
            className="sd-upgrade-proof"
            aria-label="Community privacy promise"
            data-landing-node="community.proof"
            data-landing-movable="true"
          >
            <Quote aria-hidden="true" />
            <p>{communityContent.proof}</p>
            <div className="sd-upgrade-proof-person">
              <SourceMedia
                assetId="social-proof-marcus-avatar"
                width={1024}
                height={1024}
                alt="Student-athlete illustration"
              />
              <span>
                <strong>{communityContent.proofTitle}</strong>
                <small>{communityContent.proofSubtitle}</small>
              </span>
            </div>
          </section>

          <section className="sd-upgrade-community-facts" aria-label="Community safeguards">
            {communityContent.facts.map((fact) => (
              <div
                key={fact.id}
                className="sd-upgrade-community-fact"
                data-landing-node={`community.fact.${fact.id}`}
                data-landing-movable="true"
              >
                <strong>{fact.value}</strong>
                <span>{fact.label}</span>
              </div>
            ))}
          </section>

          {billingUnavailable ? (
            <p className="sd-upgrade-unavailable" role="status">
              <ShieldCheck size={16} aria-hidden="true" />
              Secure checkout is not configured. Your current access has not changed.
            </p>
          ) : null}

          <section
            className="sd-upgrade-community-plan"
            aria-label="Diana access status"
            data-landing-node="community.plan"
            data-landing-movable="true"
          >
            <div className="sd-upgrade-community-plan-label">
              <UsersRound size={16} aria-hidden="true" />
              {communityContent.planLabel}
            </div>
            <div className="sd-upgrade-community-plan-row">
              <div>
                <h2>{communityContent.planTitle}</h2>
                <p>
                  {billingEnabled
                    ? "The server has confirmed a secure checkout provider."
                    : onPrimaryAction
                      ? communityContent.planBody
                      : "Current learning tools remain available while checkout is unavailable."}
                </p>
              </div>
              <span className="sd-upgrade-community-state">
                {billingEnabled ? "Ready" : onPrimaryAction ? "Account next" : "Preview"}
                <small>
                  {billingEnabled ? "Server verified" : "No purchase claimed"}
                </small>
              </span>
            </div>
          </section>
        </ContentElement>

        <footer
          className="sd-upgrade-footer"
          data-landing-node="community.cta"
          data-landing-movable="true"
        >
          {onPrimaryAction ? (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="sd-upgrade-primary"
              aria-label={actionLabel}
            >
              <ShieldCheck size={18} aria-hidden="true" />
              {actionLabel}
            </button>
          ) : (
            <Link
              href={actionHref}
              className="sd-upgrade-primary"
              aria-label="Review access options"
            >
              <ShieldCheck size={18} aria-hidden="true" />
              {actionLabel}
            </Link>
          )}
          <p>{communityContent.footer}</p>
        </footer>
      </ScreenDesignViewport>
    );
  }

  return (
    <ScreenDesignViewport
      id={sectionId}
      className={`sd-upgrade-screen sd-upgrade-standard${publicScrollSection ? " sd-public-home-panel" : ""}`}
      data-public-scroll-section={publicScrollSection}
      aria-label="Diana access options"
    >
      <style>{UPGRADE_STYLES}</style>
      <header className="sd-upgrade-header">
        <span
          className="sd-landing-logo-node"
          data-landing-node="standard.logo"
          data-landing-movable="true"
        >
          <DianaWordmark />
        </span>
        {closeControl}
      </header>

      <ContentElement className="sd-upgrade-scroll">
        <section
          className="sd-upgrade-hero"
          data-landing-node="standard.heading"
          data-landing-movable="true"
        >
          <p className="sd-upgrade-kicker">{standardContent.kicker}</p>
          <h1>
            {standardContent.title}
            <br />
            <span>{standardContent.accentTitle}</span>
          </h1>
        </section>

        <section className="sd-upgrade-benefits" aria-label="Supported Diana capabilities">
          {standardContent.benefits.map((benefit) => {
            const Icon =
              benefit.id === "guided"
                ? Sparkles
                : benefit.id === "learning"
                  ? CalendarRange
                  : FileCheck2;
            return (
              <article
                key={benefit.id}
                className="sd-upgrade-benefit"
                data-landing-node={`standard.benefit.${benefit.id}`}
                data-landing-movable="true"
              >
                <span className="sd-upgrade-benefit-icon">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <div>
                  <h2>{benefit.title}</h2>
                  <p>{benefit.body}</p>
                </div>
              </article>
            );
          })}
        </section>

        {billingUnavailable ? (
          <p className="sd-upgrade-unavailable" role="status">
            <ShieldCheck size={16} aria-hidden="true" />
            Secure checkout is not configured. Your current access has not changed.
          </p>
        ) : null}

        <section className="sd-upgrade-options" aria-label="Access status">
          {onPrimaryAction ? (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="sd-upgrade-option"
              data-featured="true"
              aria-label="Choose Diana access"
              data-landing-node="standard.access"
              data-landing-movable="true"
            >
              <StandardAccessOption
                billingEnabled={billingEnabled}
                publicFlow
                title={standardContent.accessTitle}
                body={standardContent.accessBody}
              />
            </button>
          ) : (
            <Link
              href={actionHref}
              className="sd-upgrade-option"
              data-featured="true"
              aria-label="Review access options"
              data-landing-node="standard.access"
              data-landing-movable="true"
            >
              <StandardAccessOption
                billingEnabled={billingEnabled}
                title={standardContent.accessTitle}
                body={standardContent.accessBody}
              />
            </Link>
          )}
          {onPrimaryAction ? (
            <div
              className="sd-upgrade-option"
              data-landing-node="standard.controls"
              data-landing-movable="true"
            >
              <AccountControlsOption
                publicFlow
                title={standardContent.controlsTitle}
                body={standardContent.controlsBody}
              />
            </div>
          ) : (
            <Link
              href="/settings"
              className="sd-upgrade-option"
              data-landing-node="standard.controls"
              data-landing-movable="true"
            >
              <AccountControlsOption
                title={standardContent.controlsTitle}
                body={standardContent.controlsBody}
              />
            </Link>
          )}
        </section>
      </ContentElement>

      <footer
        className="sd-upgrade-footer"
        data-landing-node="standard.cta"
        data-landing-movable="true"
      >
        {onPrimaryAction ? (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="sd-upgrade-primary"
            aria-label={actionLabel}
          >
            {actionLabel}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        ) : (
          <Link
            href={actionHref}
            className="sd-upgrade-primary"
            aria-label="Review access options"
          >
            {actionLabel}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        )}
        <p>{standardContent.footer}</p>
      </footer>
    </ScreenDesignViewport>
  );
}

function StandardAccessOption({
  billingEnabled,
  publicFlow = false,
  title = "Diana access",
  body,
}: {
  readonly billingEnabled: boolean;
  readonly publicFlow?: boolean;
  readonly title?: string;
  readonly body?: string;
}) {
  return (
    <>
      <span className="sd-upgrade-option-badge">
        {billingEnabled
          ? "Server verified"
          : publicFlow
            ? "Account setup"
            : "Current access"}
      </span>
      <span>
        <h2>{title}</h2>
        <p>
          {billingEnabled
            ? "Continue through the configured secure provider."
            : body
              ?? (publicFlow
                ? "Create a private account to continue. No purchase is claimed."
                : "Your current learning tools stay available.")}
        </p>
      </span>
      <span className="sd-upgrade-option-state">
        {billingEnabled ? "Ready" : publicFlow ? "Next" : "Preview"}
        <ArrowRight size={15} aria-hidden="true" />
      </span>
    </>
  );
}

function AccountControlsOption({
  publicFlow = false,
  title = "Account controls",
  body,
}: {
  readonly publicFlow?: boolean;
  readonly title?: string;
  readonly body?: string;
}) {
  return (
    <>
      <span>
        <h2>{title}</h2>
        <p>
          {body
            ?? (publicFlow
              ? "Private controls become available after account creation."
              : "Review privacy, accessibility, AI history, and connection settings.")}
        </p>
      </span>
      <span className="sd-upgrade-option-state">
        <LockKeyhole size={15} aria-hidden="true" /> Private
      </span>
    </>
  );
}
