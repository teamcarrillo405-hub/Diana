import { FileUp, Mic, Play, Plus, Timer } from "lucide-react";
import Link from "next/link";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { TodayLiveVoice } from "@/components/today-live-voice";
import type { LobbyCheckInValue } from "@/lib/dashboard/lobby-check-in";
import type { LobbyDashboardView } from "@/lib/dashboard/lobby-view";
import { LobbyPageBackground } from "./lobby-background-layer";
import { LobbyCheckIn } from "./lobby-check-in";
import { NeedsAttention } from "./needs-attention";
import { HomeworkProgressGauge } from "./today-dashboard-visuals";

type LobbyProfile = Readonly<{
  displayName?: string | null;
  photoUrl?: string | null;
  photoOffsetX?: number | null;
  photoOffsetY?: number | null;
}>;

export function LobbyDashboard({
  view,
  profile,
  initialCheckIn,
  today,
}: {
  view: LobbyDashboardView;
  profile: LobbyProfile;
  initialCheckIn: LobbyCheckInValue | null;
  today: string;
}) {
  const initials = view.studentName.slice(0, 1).toUpperCase() || "S";
  return (
    <ScreenDesignViewport className="sd-lobby-screen" aria-label="Student Lobby">
      <style>{LOBBY_STYLES + TODAY_CANONICAL_STYLES}</style>
      <LobbyPageBackground />
      <StudentDesktopNav
        active="Today"
        displayName={profile.displayName}
        photoUrl={profile.photoUrl}
        photoOffsetX={profile.photoOffsetX}
        photoOffsetY={profile.photoOffsetY}
      />

      <header className="sd-lobby-mobile-header">
        <Link href="/dashboard" aria-label="Diana home" className="sd-lobby-mobile-brand">
          <DianaWordmark tight tone="light" />
        </Link>
        <div className="sd-lobby-mobile-actions">
          <details className="today-mobile-add-menu">
            <summary aria-label="Add work or a voice note" data-action="add">
              <Plus size={20} aria-hidden="true" />
            </summary>
            <div className="today-mobile-add-options">
              <Link href="/quick-add">
                <FileUp size={18} aria-hidden="true" />
                <span>Upload assignment</span>
              </Link>
              <Link href="/notes/new?mode=voice">
                <Mic size={18} aria-hidden="true" />
                <span>Capture a note</span>
              </Link>
            </div>
          </details>
          <Link href="/me" aria-label={`${view.studentName} profile`} data-action="profile">
            {profile.photoUrl ? (
              // Profile photos may be data URLs or Supabase object URLs.
              <img
                src={profile.photoUrl}
                alt=""
                style={{
                  objectPosition: `${profile.photoOffsetX ?? 50}% ${profile.photoOffsetY ?? 50}%`,
                }}
              />
            ) : (
              initials
            )}
          </Link>
        </div>
      </header>

      <main className="today-dashboard-grid" aria-label="Today">
        <span className="today-dashboard-notch today-dashboard-notch-top" aria-hidden="true" />
        <span className="today-dashboard-notch today-dashboard-notch-bottom" aria-hidden="true" />
        <div className="today-left-rail">
          <p className="today-section-label">Today</p>
          <section
            className="today-next-card"
            aria-labelledby="next-move-title"
            data-caught-up={view.hasNextMove ? undefined : "true"}
          >
            <div className="today-next-content">
              <div className="today-next-heading-row">
                <p className="today-next-course" id="next-move-title">
                  {view.hasNextMove ? view.nextMove.className : "Caught Up"}
                </p>
                <span className="today-next-due">{view.nextMove.dueLabel}</span>
              </div>
              <p className="today-next-title" title={view.nextMove.fullTitle}>
                {view.nextMove.title}
              </p>
              <div className="today-next-meta">
                <Link
                  href={view.nextMove.href}
                  className="today-next-action"
                  aria-label={view.hasNextMove ? view.nextMove.ariaLabel : "Open work"}
                >
                  {view.hasNextMove ? <Play size={20} fill="currentColor" aria-hidden="true" /> : null}
                  <span>{view.hasNextMove ? "Start" : "Open work"}</span>
                </Link>
                <span className="today-next-estimate">
                  <Timer size={16} strokeWidth={2.2} aria-hidden="true" />
                  {view.nextMove.estimateLabel}
                </span>
              </div>
            </div>
          </section>
        </div>

        <TodayLiveVoice />

        <section className="today-checkin-card" aria-labelledby="today-checkin-title">
          <div className="today-checkin-content">
            <div className="today-checkin-heading">
              <h2 id="today-checkin-title">Check-In</h2>
            </div>
            <LobbyCheckIn initialValue={initialCheckIn} sleepDate={today} />
          </div>
        </section>

        <section className="today-week-card" aria-label="This week homework progress">
          <HomeworkProgressGauge
            percent={view.nextMove.completionPercent}
            completed={view.nextMove.weeklyCompletedCount}
            total={view.nextMove.weeklyTotalCount}
          />
        </section>

        <NeedsAttention categories={view.attention} />
      </main>

      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

const LOBBY_STYLES = `
.sd-lobby-screen {
    --sd-lobby-cyan: #29d0ff;
    --sd-lobby-pink: #ff79da;
    --sd-lobby-purple: #b09cff;
    --sd-lobby-amber: #ffd24a;
    --sd-lobby-green: #36e07a;
    --sd-lobby-cream: #f4efe6;
    --sd-work-pink: var(--sd-lobby-pink);
    position: relative;
    display: flex;
    width: 100%;
    height: 100dvh;
    min-height: 700px;
    max-height: 100dvh;
    flex-direction: column;
    overflow: hidden;
    background: #02050e;
    color: #fff;
    font-family: var(--font-barlow), "Barlow Semi Condensed", sans-serif;
  }

  .sd-lobby-background {
    position: absolute;
    z-index: 0;
    inset: 0;
    overflow: hidden;
    background: #02050e;
  }

  .sd-lobby-background .sd-lobby-background-image {
    width: 100%;
    height: 100%;
    max-width: none;
    object-fit: cover;
    object-position: 48% center;
    transform: scale(1.32);
    transform-origin: 48% bottom;
  }

  .sd-lobby-background-shade {
    position: absolute;
    inset: 0;
    background: rgb(0 0 0 / 0.08);
  }

  .sd-lobby-background::after {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgb(2 5 14 / 0.72) 0%, rgb(2 5 14 / 0.36) 31%, rgb(2 5 14 / 0.06) 59%, transparent 78%),
      linear-gradient(0deg, rgb(2 5 14 / 0.62) 0%, rgb(2 5 14 / 0.28) 25%, transparent 50%);
    content: "";
    pointer-events: none;
  }

  .sd-lobby-mobile-header {
    position: relative;
    z-index: 50;
    display: flex;
    min-height: 76px;
    flex: none;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgb(41 208 255 / 0.18);
    background: rgb(2 5 14 / 0.9);
    padding: 10px 16px;
    backdrop-filter: blur(20px);
  }

  .sd-lobby-mobile-brand {
    display: flex;
    height: 38px;
    align-items: center;
  }

  .sd-lobby-mobile-brand .sd-source-wordmark {
    width: auto;
    height: 32px;
    margin: 0;
    padding: 0;
  }

  .sd-lobby-mobile-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sd-lobby-mobile-actions > a {
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
    border: 1px solid rgb(41 208 255 / 0.32);
    border-radius: 8px;
    background: rgb(41 208 255 / 0.1);
    color: var(--sd-lobby-cyan);
    text-decoration: none;
  }

  .sd-lobby-mobile-actions > a[data-action="record"] {
    border-color: rgb(255 121 218 / 0.52);
    background: var(--sd-lobby-pink);
    color: #08050d;
  }

  .sd-lobby-mobile-actions > a[data-action="profile"] {
    overflow: hidden;
    border-radius: 999px;
    background: var(--sd-lobby-cyan);
    color: #04101b;
    font-size: 14px;
    font-weight: 900;
  }

  .sd-lobby-mobile-actions img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .sd-lobby-stage {
    position: relative;
    z-index: 10;
    display: grid;
    min-height: 0;
    flex: 1;
    grid-template-areas:
      "hero"
      "next"
      "attention";
    grid-template-columns: minmax(0, 1fr);
    overflow-y: auto;
    padding: 18px 16px 112px;
    scrollbar-width: none;
  }

  .sd-lobby-stage::-webkit-scrollbar {
    display: none;
  }

  .sd-lobby-left {
    display: contents;
  }

  .sd-lobby-hero {
    position: relative;
    z-index: 2;
    display: flex;
    min-height: 166px;
    grid-area: hero;
    flex-direction: column;
    justify-content: flex-end;
    padding-bottom: 14px;
  }

  .sd-lobby-kicker,
  .sd-lobby-attention > h2 {
    margin: 0;
    color: #dbe5f8;
    font-family: var(--font-saira-condensed), "Saira Condensed", sans-serif;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.2;
    text-shadow: 0 2px 8px rgb(0 0 0 / 0.9);
    text-transform: uppercase;
  }

  .sd-lobby-title {
    width: calc(100% - 122px);
    margin: 0;
    color: #fff;
    font-family: var(--font-saira-condensed), "Saira Condensed", sans-serif;
    font-size: clamp(42px, 11.2vw, 48px);
    font-style: italic;
    font-weight: 900;
    letter-spacing: 0;
    line-height: 0.9;
    text-shadow: 0 0 34px rgb(41 208 255 / 0.5), 0 4px 24px rgb(0 0 0 / 0.9);
    text-transform: uppercase;
  }

  .sd-lobby-next-title {
    white-space: normal;
  }

  .sd-lobby-athlete-frame {
    position: relative;
    z-index: 1;
    width: 126px;
    height: 164px;
    grid-area: hero;
    align-self: start;
    justify-self: end;
    overflow: visible;
    border: 0;
    border-radius: 0;
    background: transparent;
    filter: drop-shadow(0 18px 16px rgb(0 0 0 / 0.5));
  }

  .sd-lobby-athlete {
    width: 100%;
    height: 100%;
    max-width: none;
    object-fit: contain;
    object-position: center bottom;
  }

  .sd-lobby-athlete-profile {
    object-fit: cover;
    object-position: 50% 24%;
    -webkit-mask-image:
      linear-gradient(to bottom, #000 0%, #000 76%, transparent 100%),
      radial-gradient(ellipse 68% 88% at 50% 44%, #000 58%, transparent 100%);
    -webkit-mask-composite: source-in;
    mask-image:
      linear-gradient(to bottom, #000 0%, #000 76%, transparent 100%),
      radial-gradient(ellipse 68% 88% at 50% 44%, #000 58%, transparent 100%);
    mask-composite: intersect;
  }

  .sd-lobby-next-move {
    position: relative;
    z-index: 4;
    grid-area: next;
    margin-top: 4px;
  }

  .sd-lobby-start {
    display: flex;
    width: 100%;
    min-height: 82px;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-radius: 8px;
    background: var(--sd-lobby-cyan);
    padding: 16px 18px;
    color: #04080f;
    box-shadow: 0 0 30px rgb(41 208 255 / 0.38), 0 8px 24px rgb(0 0 0 / 0.45);
    text-decoration: none;
  }

  .sd-lobby-start > span {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 9px;
    font-family: var(--font-saira-condensed), "Saira Condensed", sans-serif;
    font-size: 26px;
    font-style: italic;
    font-weight: 900;
    letter-spacing: 0;
    line-height: 0.95;
    text-transform: uppercase;
  }

  .sd-lobby-start > svg {
    flex: none;
  }

  .sd-lobby-next-copy {
    margin-top: 8px;
    padding: 0 2px;
  }

  .sd-lobby-next-meta {
    display: flex;
    min-height: 44px;
    align-items: center;
    gap: 8px;
  }

  .sd-lobby-estimate {
    display: inline-flex;
    min-height: 36px;
    align-items: center;
    gap: 6px;
    color: #dbe5f8;
    font-size: 15px;
    font-weight: 700;
    text-shadow: 0 2px 8px rgb(0 0 0 / 0.92);
  }

  .sd-lobby-estimate svg {
    color: var(--sd-lobby-cyan);
  }

  .sd-lobby-checkin {
    position: relative;
    display: inline-flex;
    min-width: 0;
  }

  .sd-lobby-checkin button {
    appearance: none;
    width: auto;
    clip-path: none !important;
    transform: none !important;
  }

  .sd-lobby-checkin-trigger {
    display: inline-flex;
    min-height: 36px;
    align-items: center;
    justify-content: center;
    gap: 5px;
    border: 1px solid rgb(41 208 255 / 0.44);
    border-radius: 7px;
    background: rgb(41 208 255 / 0.13);
    padding: 0 9px;
    color: #67dcff;
    font-family: var(--font-saira-condensed), "Saira Condensed", sans-serif;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
    cursor: pointer;
  }

  .sd-lobby-checkin-trigger svg:last-child {
    transition: transform 160ms ease;
  }

  .sd-lobby-checkin-trigger svg:last-child.is-open {
    transform: rotate(180deg);
  }

  .sd-lobby-checkin[data-primary] .sd-lobby-checkin-trigger {
    min-width: 230px;
    min-height: 66px;
    border: 0;
    border-radius: 8px;
    background: var(--sd-lobby-cyan);
    padding: 14px 22px;
    color: #04080f;
    box-shadow: 0 0 30px rgb(41 208 255 / 0.38), 0 8px 24px rgb(0 0 0 / 0.45);
    font-size: 26px;
  }

  .sd-lobby-checkin-panel {
    position: absolute;
    z-index: 100;
    top: calc(100% + 8px);
    left: 0;
    width: min(390px, calc(100vw - 32px));
    border: 1px dashed rgb(148 163 184 / 0.82);
    border-radius: 8px;
    background: rgb(4 8 20 / 0.98);
    padding: 10px;
    box-shadow: 0 24px 54px rgb(0 0 0 / 0.55);
    backdrop-filter: blur(16px);
  }

  .sd-lobby-checkin-header {
    display: flex;
    min-height: 32px;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 7px;
  }

  .sd-lobby-checkin-header h2 {
    margin: 0;
    color: #fff;
    font-family: var(--font-saira-condensed), "Saira Condensed", sans-serif;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .sd-lobby-checkin-close {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: #dbe5f8;
    cursor: pointer;
  }

  .sd-lobby-checkin-close:hover {
    border-color: rgb(148 163 184 / 0.4);
    background: rgb(148 163 184 / 0.12);
    color: #fff;
  }

  .sd-lobby-checkin-rows {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .sd-lobby-checkin-row {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 7px;
    margin: 0;
    border: 0;
    padding: 0;
  }

  .sd-lobby-checkin-row legend {
    width: 56px;
    flex: none;
    padding: 0;
    color: #fff;
    font-family: var(--font-saira-condensed), "Saira Condensed", sans-serif;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .sd-lobby-checkin-row > div {
    display: grid;
    min-width: 0;
    flex: 1;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .sd-lobby-checkin-row button {
    display: inline-flex;
    width: 100%;
    min-width: 0;
    min-height: 36px;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1px solid rgb(255 255 255 / 0.9);
    border-radius: 6px;
    background: var(--sd-lobby-cream);
    padding: 7px 4px;
    color: #080a10;
    font-family: var(--font-saira-condensed), "Saira Condensed", sans-serif;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0;
    white-space: nowrap;
    cursor: pointer;
  }

  .sd-lobby-checkin-row button[aria-pressed="true"] {
    border-color: var(--sd-lobby-cyan);
    background: var(--sd-lobby-cyan);
    color: #04080f;
    box-shadow: 0 0 14px rgb(41 208 255 / 0.34);
  }

  .sd-lobby-checkin-row button:disabled {
    cursor: wait;
    opacity: 0.72;
  }

  .sd-lobby-checkin-summary {
    display: flex;
    min-height: 78px;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-radius: 6px;
    background: var(--sd-lobby-cream);
    padding: 12px;
    color: #080a10;
  }

  .sd-lobby-checkin-summary strong {
    display: block;
    font-family: var(--font-saira-condensed), "Saira Condensed", sans-serif;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .sd-lobby-checkin-summary span {
    display: block;
    margin-top: 3px;
    font-size: 13px;
    font-weight: 700;
  }

  .sd-lobby-checkin-summary button {
    min-height: 36px;
    border: 1px solid rgb(8 10 16 / 0.24);
    border-radius: 6px;
    background: #fff;
    padding: 7px 10px;
    color: #080a10;
    font-family: var(--font-saira-condensed), "Saira Condensed", sans-serif;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    cursor: pointer;
  }

  .sd-lobby-checkin-message {
    margin: 8px 0 0 63px;
    color: var(--sd-lobby-amber);
    font-size: 12px;
    line-height: 1.35;
  }

  .sd-lobby-attention {
    grid-area: attention;
    margin-top: 24px;
  }

  .sd-lobby-attention > h2 {
    margin-bottom: 9px;
  }

  .sd-lobby-attention-stack {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }

  .sd-lobby-attention-card {
    position: relative;
    display: flex;
    min-height: 108px;
    flex-direction: column;
    border: 1px dashed rgb(148 163 184 / 0.8);
    border-radius: 8px;
    background: rgb(2 5 14 / 0.6);
    padding: 13px;
    color: #fff;
    text-decoration: none;
    backdrop-filter: blur(8px);
  }

  .sd-lobby-attention-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .sd-lobby-attention-heading strong {
    font-family: var(--font-saira-condensed), "Saira Condensed", sans-serif;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 0;
    line-height: 1.05;
    text-transform: uppercase;
  }

  .sd-lobby-attention-count {
    flex: none;
    color: #fff;
    font-family: var(--font-saira-condensed), "Saira Condensed", sans-serif;
    font-size: 25px;
    font-weight: 900;
    line-height: 1;
  }

  .sd-lobby-attention-description {
    margin-top: 6px;
    color: #dbe5f8;
    font-size: 13px;
    line-height: 1.3;
  }

  .sd-lobby-attention-link {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-top: auto;
    font-family: var(--font-saira-condensed), "Saira Condensed", sans-serif;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .sd-lobby-attention-card[data-tone="purple"] strong,
  .sd-lobby-attention-card[data-tone="purple"] .sd-lobby-attention-link {
    color: var(--sd-lobby-purple);
  }

  .sd-lobby-attention-card[data-tone="orange"] strong,
  .sd-lobby-attention-card[data-tone="orange"] .sd-lobby-attention-link {
    color: var(--sd-lobby-pink);
  }

  .sd-lobby-attention-card[data-tone="yellow"] strong,
  .sd-lobby-attention-card[data-tone="yellow"] .sd-lobby-attention-link {
    color: var(--sd-lobby-amber);
  }

  .sd-lobby-attention-card[data-tone="green"] strong,
  .sd-lobby-attention-card[data-tone="green"] .sd-lobby-attention-link {
    color: var(--sd-lobby-green);
  }

  .sd-lobby-mobile-actions > a:focus-visible,
  .sd-lobby-start:focus-visible,
  .sd-lobby-checkin-trigger:focus-visible,
  .sd-lobby-checkin-close:focus-visible,
  .sd-lobby-checkin-row button:focus-visible,
  .sd-lobby-checkin-summary button:focus-visible,
  .sd-lobby-attention-card:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 3px;
  }

  .sd-lobby-screen > .sd-student-bottom-nav {
    position: relative;
    z-index: 60;
    min-height: 88px;
    flex: none;
  }

  .sd-lobby-screen > .sd-student-bottom-nav a[aria-current="page"] {
    color: #fff;
  }

  .app-command-frame:has(.sd-lobby-screen) .diana-mobile-command {
    display: none !important;
  }

  .app-command-frame:has(.sd-lobby-screen) {
    width: 100% !important;
    max-width: none !important;
    padding: 0 !important;
  }

  .diana-authenticated-field:has(.sd-lobby-screen) {
    padding-bottom: 0 !important;
  }

  .diana-app:has(.sd-lobby-screen) nextjs-portal {
    display: none !important;
  }

  @media (min-width: 1100px) {
    .sd-lobby-background .sd-lobby-background-image {
      object-position: center;
      transform: none;
    }

    .sd-lobby-background-shade {
      background: rgb(0 0 0 / 0.06);
    }

    .sd-lobby-background::after {
      background:
        linear-gradient(90deg, rgb(2 5 14 / 0.68) 0%, rgb(2 5 14 / 0.34) 28%, rgb(2 5 14 / 0.04) 55%, transparent 70%),
        linear-gradient(0deg, rgb(2 5 14 / 0.55) 0%, rgb(2 5 14 / 0.24) 23%, transparent 46%);
    }

    .sd-source-viewport.sd-lobby-screen {
      width: 100%;
      max-width: none;
      min-height: 700px;
      height: 100dvh;
      max-height: 100dvh;
      margin: 0;
    }

    .sd-lobby-mobile-header,
    .sd-lobby-screen > .sd-student-bottom-nav {
      display: none;
    }

    .sd-lobby-stage {
      width: min(100%, 1440px);
      margin-inline: auto;
      grid-template-areas:
        "hero athlete"
        "attention attention";
      grid-template-columns: minmax(330px, 45%) minmax(420px, 55%);
      grid-template-rows: minmax(0, 1fr) auto;
      column-gap: 2%;
      overflow: visible;
      padding: clamp(24px, 4vh, 42px) clamp(34px, 3.4vw, 54px) clamp(14px, 2vh, 20px);
    }

    .sd-lobby-left {
      position: relative;
      z-index: 5;
      display: block;
      width: min(100%, 390px);
      grid-area: hero;
      align-self: center;
    }

    .sd-lobby-hero {
      min-height: 0;
      justify-content: center;
      padding: 0;
    }

    .sd-lobby-title {
      width: 100%;
      font-size: clamp(52px, 4.4vw, 64px);
    }

    .sd-lobby-next-move {
      margin-top: 18px;
    }

    .sd-lobby-start {
      width: fit-content;
      min-width: 280px;
      min-height: 88px;
      padding: 18px 22px;
    }

    .sd-lobby-start > span {
      font-size: clamp(28px, 2.5vw, 36px);
    }

    .sd-lobby-next-copy {
      margin-top: 7px;
      padding: 0;
    }

    .sd-lobby-next-meta {
      min-height: 36px;
    }

    .sd-lobby-athlete-frame {
      width: min(29vw, 360px);
      height: min(59vh, 500px);
      grid-area: athlete;
      align-self: end;
      justify-self: center;
    }

    .sd-lobby-checkin-panel {
      width: 390px;
    }

    .sd-lobby-attention {
      margin: 12px 0 0;
    }

    .sd-lobby-attention-stack {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .sd-lobby-attention-card {
      width: auto;
      min-width: 0;
      min-height: 94px;
      padding: 12px 15px;
    }
  }

  @media (min-width: 1100px) and (min-height: 860px) {
    .sd-lobby-attention {
      transform: translateY(-156px);
    }
  }

  @media (max-width: 1099px) {
    .sd-lobby-screen {
      min-height: 100dvh;
    }

    .sd-lobby-checkin-panel {
      position: fixed;
      top: 50%;
      right: 16px;
      left: 16px;
      width: auto;
      transform: translateY(-50%);
    }

    .sd-lobby-checkin-row button,
    .sd-lobby-checkin-summary button,
    .sd-lobby-checkin-close,
    .sd-lobby-checkin-trigger {
      min-height: 44px;
    }

    .sd-lobby-checkin-close {
      height: 44px;
    }
  }

  @media (min-width: 1280px) {
    .sd-lobby-stage {
      width: 798px;
      margin-right: auto;
      margin-left: 225px;
      grid-template-columns: minmax(330px, 45%) minmax(0, 55%);
      padding-right: 0;
      padding-left: 0;
    }

    .sd-lobby-athlete-frame-fallback {
      transform: translateX(150px);
    }
  }

  @media (min-width: 1280px) and (min-height: 860px) {
    .sd-lobby-athlete-frame-fallback {
      transform: translateX(265px);
    }
  }

  @media (max-width: 480px) {
    .sd-lobby-attention-stack {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 380px) {
    .sd-lobby-mobile-actions {
      gap: 6px;
    }

    .sd-lobby-mobile-actions > a {
      width: 40px;
      height: 40px;
    }

    .sd-lobby-checkin-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 4px;
    }

    .sd-lobby-checkin-row legend {
      width: auto;
    }

    .sd-lobby-checkin-row button {
      font-size: 11px;
    }

    .sd-lobby-start > span {
      font-size: 23px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sd-lobby-screen * {
      scroll-behavior: auto !important;
      transition: none !important;
    }
  }

`;

const TODAY_CANONICAL_STYLES = `
  .sd-lobby-screen {
    --today-ink: #182126;
    --today-muted: #dce4e0;
    --today-glass-ink: #182126;
    --today-glass-muted: rgb(24 33 38 / 0.76);
    --today-yellow: #eef66c;
    --today-yellow-hover: #f7ff83;
    --today-cyan: #75dff2;
    --today-coral: #ff756f;
    --today-lime: #cbe95e;
    --today-violet: #b685ff;
    --today-glass-border: rgb(255 255 255 / 0.64);
    --today-glass-panel: linear-gradient(145deg, rgb(249 252 250 / 0.34), rgb(225 235 229 / 0.2));
    --today-glass-shadow: inset 0 1px 0 rgb(255 255 255 / 0.64), inset 0 -1px 0 rgb(255 255 255 / 0.24);
    min-height: 100dvh;
    background: #d6dad6;
    font-family: var(--font-lexend), Lexend, system-ui, sans-serif;
  }

  :root:has(.sd-lobby-screen),
  body:has(.sd-lobby-screen),
  .diana-app:has(.sd-lobby-screen),
  .diana-app-shell:has(.sd-lobby-screen),
  .diana-authenticated-field:has(.sd-lobby-screen),
  .app-command-frame:has(.sd-lobby-screen),
  .sd-source-viewport.sd-lobby-screen {
    background: #d6dad6 !important;
  }

  .sd-source-viewport.sd-lobby-screen {
    height: auto;
    min-height: 100dvh;
    max-height: none;
    overflow: visible;
    box-shadow: none;
  }

  .today-page-background::after {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgb(9 17 19 / 0.26) 0%, transparent 25%, transparent 75%, rgb(9 17 19 / 0.25) 100%),
      linear-gradient(0deg, rgb(9 17 19 / 0.16) 0%, transparent 38%);
    content: "";
  }

  .today-page-background-image { filter: saturate(0.92) contrast(0.98) brightness(0.98); }
  .diana-app:has(.sd-lobby-screen) .agent-fab-anchor { display: none !important; }
  :root:has(.sd-lobby-screen),
  body:has(.sd-lobby-screen),
  .sd-lobby-screen { scroll-padding-bottom: calc(132px + env(safe-area-inset-bottom)); }

  .today-dashboard-grid {
    position: relative;
    z-index: 2;
    display: grid;
    width: calc(100% - 48px);
    max-width: 1540px;
    min-height: calc(100dvh - 72px);
    margin: 0 auto;
    grid-template-areas: "voice" "left" "week" "checkin" "attention";
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
    align-content: start;
    padding: 20px 0 calc(120px + env(safe-area-inset-bottom));
  }

  .today-left-rail {
    display: grid;
    min-width: 0;
    grid-area: left;
    gap: 18px;
  }

  .today-section-label {
    margin: 0 0 -6px;
    color: #fff !important;
    font-family: var(--font-lexend), Lexend, system-ui, sans-serif;
    font-size: clamp(23px, 2.1vw, 30px);
    font-weight: 640;
    letter-spacing: 0;
    line-height: 1.1;
    text-transform: uppercase;
  }

  .today-next-card,
  .today-checkin-card,
  .today-week-card,
  .today-diana-live,
  .sd-lobby-attention {
    position: relative;
    min-width: 0;
    isolation: isolate;
    border: 1px solid var(--today-glass-border);
    background: var(--today-glass-panel);
    box-shadow: var(--today-glass-shadow);
    backdrop-filter: blur(28px) saturate(0.88) brightness(1.08);
    -webkit-backdrop-filter: blur(28px) saturate(0.88) brightness(1.08);
    scroll-margin-block: 88px calc(128px + env(safe-area-inset-bottom));
  }

  .today-next-card {
    display: grid;
    min-height: 0;
    grid-area: auto;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    overflow: clip;
    border-radius: 30px 14px 30px 18px;
  }

  .today-next-card::after,
  .today-checkin-card::after,
  .today-week-card::after,
  .today-diana-live::after,
  .sd-lobby-attention::after {
    position: absolute;
    z-index: -1;
    inset: 1px;
    border-radius: inherit;
    background: linear-gradient(120deg, rgb(255 255 255 / 0.09), transparent 34%, transparent 70%, rgb(255 255 255 / 0.035));
    content: "";
    pointer-events: none;
  }

  .today-next-content {
    display: flex;
    min-width: 0;
    grid-column: 1;
    grid-row: 1;
    flex-direction: column;
    align-items: flex-start;
    border-bottom: 0;
    padding: 15px 22px 11px;
  }

  .today-next-heading-row {
    display: flex;
    width: 100%;
    min-width: 0;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }

  .today-next-due {
    flex: none;
    max-width: 19ch;
    color: var(--today-glass-muted);
    font-family: var(--font-lexend), Lexend, system-ui, sans-serif;
    font-size: 14px;
    font-weight: 520;
    line-height: 1.4;
    text-align: right;
  }

  .sd-lobby-screen .today-next-course,
  .today-next-content h1,
  .sd-lobby-screen .today-next-title,
  .today-next-estimate {
    color: var(--today-glass-ink);
    font-family: var(--font-lexend), Lexend, system-ui, sans-serif;
    letter-spacing: 0;
    text-transform: none;
  }

  .sd-lobby-screen .today-next-course {
    margin: 0;
    color: var(--today-glass-ink);
    font-size: clamp(22px, 1.7vw, 25px);
    font-weight: 680;
    line-height: 1.2;
  }

  .today-next-content h1 {
    margin: 0;
    font-size: clamp(22px, 1.7vw, 26px);
    font-weight: 700;
    line-height: 1.2;
  }

  .sd-lobby-screen .today-next-title {
    display: -webkit-box;
    overflow: hidden;
    width: 100%;
    max-width: 30ch;
    margin: 7px 0 0;
    color: var(--today-glass-ink);
    font-size: 16px;
    font-weight: 480;
    line-height: 1.45;
    text-wrap: balance;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .today-next-meta {
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    margin-top: 22px;
    padding-top: 0;
  }

  .today-next-estimate {
    display: inline-flex;
    min-height: 24px;
    align-items: center;
    gap: 7px;
    margin-top: 0;
    color: var(--today-glass-muted);
    font-size: 14px;
    font-weight: 500;
  }

  .today-next-action {
    display: inline-flex;
    width: auto;
    min-width: 184px;
    min-height: 64px;
    align-items: center;
    justify-content: center;
    gap: 11px;
    margin-top: 0;
    border: 1px solid rgb(88 98 26 / 0.34);
    border-radius: 9px;
    background: var(--today-yellow);
    padding: 14px 22px;
    color: #17200f;
    font-size: 17px;
    font-weight: 700;
    text-decoration: none;
    box-shadow: 0 10px 24px rgb(12 20 11 / 0.18);
    transition: background 160ms ease, transform 160ms ease;
  }

  .today-next-action:hover { background: var(--today-yellow-hover); transform: translateY(-1px); }
  .today-next-action:active { transform: translateY(1px) scale(0.98); }
  .today-next-action span { margin: 0; }

  .today-homework-progress {
    position: relative;
    display: grid;
    min-width: 0;
    grid-column: 1;
    grid-row: 2;
    align-content: center;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 104%, rgb(116 220 243 / 0.12), transparent 50%),
      linear-gradient(180deg, rgb(255 255 255 / 0.015), rgb(255 247 217 / 0.055));
    padding: 10px 22px 12px;
  }

  .today-week-card {
    display: grid;
    min-width: 0;
    min-height: 0;
    grid-area: week;
    overflow: hidden;
    border-radius: 18px 28px 18px 28px;
  }

  .today-week-card .today-homework-progress {
    height: 100%;
    grid-column: auto;
    grid-row: auto;
    align-content: center;
    padding: 20px;
  }

  .today-homework-progress-heading {
    display: flex;
    align-items: baseline;
    justify-content: flex-start;
    gap: 16px;
    color: var(--today-glass-ink);
    font-family: var(--font-lexend), Lexend, system-ui, sans-serif;
  }

  .today-homework-progress-heading span {
    font-size: 15px;
    font-weight: 620;
  }

  .today-homework-progress-meter {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
  }

  .today-homework-progress-track {
    position: relative;
    display: grid;
    height: 8px;
    gap: 5px;
    background: transparent;
  }

  .today-homework-progress-track span {
    display: block;
    height: 100%;
    border: 1px solid rgb(255 255 255 / 0.24);
    border-radius: 999px;
    background: rgb(255 255 255 / 0.14);
  }

  .today-homework-progress-track span[data-complete] {
    border-color: rgb(255 255 255 / 0.5);
    background: #182126;
    box-shadow: 0 0 7px rgb(24 33 38 / 0.24);
  }

  .today-homework-progress-meter strong {
    min-width: 2.8ch;
    color: var(--today-glass-ink);
    font-family: var(--font-lexend), Lexend, system-ui, sans-serif;
    font-size: 24px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    line-height: 1;
    text-align: right;
  }

  .today-homework-progress-caption {
    color: var(--today-glass-muted);
    font-family: var(--font-lexend), Lexend, system-ui, sans-serif;
    font-size: 14px;
    font-weight: 450;
    line-height: 1.4;
    margin-top: 5px;
    text-align: left;
  }

  .today-checkin-card {
    display: grid;
    min-height: 0;
    grid-area: checkin;
    grid-template-columns: minmax(0, 1fr);
    overflow: hidden;
    border-radius: 18px 30px 18px 30px;
  }

  .today-checkin-content {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: flex-start;
    gap: 8px;
    padding: 18px 20px;
  }

  .today-panel-eyebrow {
    display: block;
    margin-bottom: 2px;
    color: var(--today-cyan);
    font-size: 12px;
    font-weight: 650;
    line-height: 1.4;
  }

  .today-checkin-card h2,
  .sd-lobby-attention > .today-attention-header h2 {
    margin: 0;
    color: var(--today-glass-ink);
    font-family: var(--font-lexend), Lexend, system-ui, sans-serif;
    font-size: clamp(22px, 1.7vw, 25px);
    font-weight: 680;
    letter-spacing: 0;
    line-height: 1.2;
    text-shadow: none;
    text-transform: none;
  }

  .today-checkin-card .sd-lobby-checkin {
    display: grid;
    width: 100%;
    min-width: 0;
    gap: 6px;
    padding: 0;
  }

  .today-checkin-card .sd-lobby-checkin-sliders {
    display: grid;
    gap: 7px;
  }

  .today-checkin-card .sd-lobby-checkin-slider-row {
    display: grid;
    min-height: 48px;
    grid-template-columns: 72px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin: 0;
    border: 1px solid rgb(255 255 255 / .48);
    border-radius: 12px;
    background: rgb(255 255 255 / .17);
    box-shadow: inset 0 1px rgb(255 255 255 / .34), 0 5px 14px rgb(12 20 19 / .06);
    padding: 5px 8px;
  }

  .today-checkin-card .sd-lobby-checkin-slider-label {
    display: block;
    margin: 0;
    padding: 0;
    color: var(--today-glass-ink);
    font-family: var(--font-lexend), Lexend, system-ui, sans-serif;
    font-size: 13px;
    font-weight: 650;
    line-height: 1.35;
    text-transform: none;
  }

  .today-checkin-card .sd-lobby-checkin-slider {
    position: relative;
    min-width: 0;
    height: 36px;
    overflow: hidden;
    border: 1px solid rgb(24 33 38 / .18);
    border-radius: 12px;
    background: rgb(255 255 255 / .32);
    box-shadow: inset 0 1px rgb(255 255 255 / .54), inset 0 -1px rgb(24 33 38 / .08), 0 5px 16px rgb(10 18 18 / .08);
  }

  .today-checkin-card .sd-lobby-checkin-slider[data-selected]::before {
    position: absolute;
    z-index: 1;
    top: 3px;
    bottom: 3px;
    left: calc(var(--checkin-offset) + 3px);
    width: calc(33.333% - 5px);
    border-radius: 7px;
    background: var(--today-yellow);
    box-shadow: inset 0 1px rgb(255 255 255 / .48), 0 2px 8px rgb(142 151 43 / .18);
    content: "";
    pointer-events: none;
  }

  .today-checkin-card .sd-lobby-checkin-range {
    position: relative;
    display: grid;
    min-width: 0;
    height: 36px;
    align-items: center;
    overflow: hidden;
    border: 1px solid rgb(24 33 38 / .18);
    border-radius: 12px;
    background: linear-gradient(90deg, rgb(36 48 51 / .58) var(--checkin-range-fill), rgb(255 255 255 / .32) var(--checkin-range-fill));
    box-shadow: inset 0 1px rgb(255 255 255 / .54), inset 0 -1px rgb(24 33 38 / .08), 0 5px 16px rgb(10 18 18 / .08);
  }

  .today-checkin-card .sd-lobby-checkin-range input {
    position: absolute;
    z-index: 2;
    inset: 0;
    width: 100%;
    height: 36px;
    margin: 0;
    appearance: none;
    border: 0!important;
    outline: 0;
    background: transparent;
    cursor: pointer;
  }

  .today-checkin-card .sd-lobby-checkin-range input::-webkit-slider-thumb {
    width: 44px;
    height: 44px;
    appearance: none;
    border: 0;
    background: transparent;
    opacity: 0;
  }

  .today-checkin-card .sd-lobby-checkin-range input::-moz-range-thumb {
    width: 44px;
    height: 44px;
    border: 0;
    background: transparent;
    opacity: 0;
  }

  .today-checkin-card .sd-lobby-checkin-range output {
    position: relative;
    z-index: 1;
    padding-inline: 12px;
    color: var(--today-glass-ink);
    font: 650 13px/1 var(--font-lexend), Lexend, system-ui, sans-serif;
    pointer-events: none;
  }

  .today-checkin-card .sd-lobby-checkin-range:has(input:focus-visible),
  .today-checkin-card .sd-lobby-checkin-activity-select select:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }

  .today-checkin-card .sd-lobby-checkin-movement {
    min-height: 76px;
  }

  .today-checkin-card .sd-lobby-checkin-movement-controls {
    display: grid;
    min-width: 0;
    gap: 5px;
  }

  .today-checkin-card .sd-lobby-checkin-activity-select select {
    width: 100%;
    height: 30px;
    border: 1px solid rgb(24 33 38 / .18);
    border-radius: 9px;
    outline: 0;
    background: rgb(255 255 255 / .34);
    padding: 0 9px;
    color: var(--today-glass-ink);
    font: 600 12px/1 var(--font-lexend), Lexend, system-ui, sans-serif;
  }

  .today-checkin-card .sd-lobby-checkin-movement .sd-lobby-checkin-slider-row {
    display: contents;
  }

  .today-checkin-card .sd-lobby-checkin-movement-controls > .sd-lobby-checkin-slider-row > .sd-lobby-checkin-slider-label {
    display: none;
  }

  .today-checkin-card .sd-lobby-checkin-movement .sd-lobby-checkin-range {
    height: 30px;
    border-radius: 9px;
  }

  .today-checkin-card .sd-lobby-checkin-movement .sd-lobby-checkin-range input {
    height: 30px;
  }

  .today-checkin-card .sd-lobby-checkin-movement .sd-lobby-checkin-range output {
    font-size: 12px;
  }

  .today-checkin-card .sd-lobby-checkin-slider input {
    position: absolute;
    z-index: 4;
    inset: 0;
    width: 100%;
    height: 36px;
    margin: 0;
    appearance: none;
    border: 0!important;
    border-radius: 12px;
    outline: 0;
    background: transparent;
    cursor: pointer;
  }

  .today-checkin-card .sd-lobby-checkin-slider input::-webkit-slider-thumb {
    width: 44px;
    height: 44px;
    appearance: none;
    border: 0;
    background: transparent;
    opacity: 0;
  }

  .today-checkin-card .sd-lobby-checkin-slider input::-moz-range-thumb {
    width: 44px;
    height: 44px;
    border: 0;
    background: transparent;
    opacity: 0;
  }

  .today-checkin-card .sd-lobby-checkin-slider-labels {
    position: absolute;
    z-index: 2;
    inset: 0 7px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: center;
    color: rgb(24 33 38 / 0.78);
    font-family: var(--font-lexend), Lexend, system-ui, sans-serif;
    font-size: 13px;
    font-weight: 540;
    line-height: 1.3;
    text-align: center;
    pointer-events: none;
  }

  .today-checkin-card .sd-lobby-checkin-slider-labels span[data-active] {
    color: #182126;
    font-weight: 700;
    text-shadow: none;
    text-decoration: none;
  }

  .today-checkin-card .sd-lobby-checkin-slider:has(input:focus-visible) { outline:3px solid #fff; outline-offset:3px; }

  .today-checkin-card .sd-lobby-checkin-status {
    display: flex;
    min-height: 20px;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: var(--today-glass-muted);
    font-size: 14px;
    font-weight: 450;
    line-height: 1.4;
  }

  .today-checkin-card .sd-lobby-checkin-open {
    display: inline-flex;
    min-height: 40px;
    align-items: center;
    justify-content: center;
    border: 1px solid #c6d23f;
    border-radius: 8px;
    background: var(--today-yellow);
    color: #182126;
    font: 650 14px/1 var(--font-lexend), Lexend, system-ui, sans-serif;
    text-decoration: none;
    transition: background 160ms ease, transform 160ms ease;
  }

  .today-checkin-card .sd-lobby-checkin-open:hover { background: #f0fb86; transform: translateY(-1px); }

  .today-checkin-card .sd-lobby-checkin-status button {
    min-height: 36px;
    border: 1px solid rgb(255 255 255 / 0.32);
    border-radius: 7px;
    background: rgb(255 255 255 / 0.12);
    padding: 7px 11px;
    color: #fff;
    font: inherit;
    font-weight: 650;
    cursor: pointer;
  }

  .today-diana-live {
    position: relative;
    display: flex;
    min-width: 0;
    grid-area: voice;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 28px 16px 28px 16px;
    color: var(--today-glass-ink);
  }

  .today-orb-stage {
    position: relative;
    display: grid;
    width: clamp(210px, 28vw, 370px);
    aspect-ratio: 1;
    place-items: center;
  }

  .today-diana-orb { position: absolute; inset: 0; display: grid; place-items: center; filter: drop-shadow(0 24px 36px rgb(24 26 36 / 0.24)); }
  .today-diana-orb canvas { display: block; width: 100% !important; height: 100% !important; }

  .today-orb-control {
    position: absolute;
    z-index: 5;
    bottom: 5%;
    display: grid;
    width: 58px;
    height: 58px;
    place-items: center;
    border: 2px solid var(--today-yellow);
    border-radius: 50%;
    background: rgb(18 29 30 / 0.82) !important;
    color: var(--today-yellow) !important;
    box-shadow: 0 12px 30px rgb(13 20 12 / 0.3), 0 0 22px rgb(238 246 108 / 0.22), inset 0 1px 0 rgb(255 255 255 / 0.2);
    cursor: pointer;
    clip-path: none !important;
  }
  .today-orb-control:hover { background: rgb(29 43 43 / 0.94) !important; transform: translateY(-1px); }
  .today-orb-control svg { width: 23px; height: 23px; }
  .today-orb-control:disabled { cursor: wait; opacity: 0.82; }

  .today-live-feedback {
    max-width: min(360px, 88vw);
    margin: 10px 0 0;
    border: 1px solid rgb(255 255 255 / 0.36);
    border-radius: 999px;
    background: rgb(17 26 28 / 0.58);
    padding: 8px 13px;
    color: #fff;
    font: 500 14px/1.4 var(--font-lexend), Lexend, system-ui, sans-serif;
    text-align: center;
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.16), 0 10px 24px rgb(8 16 18 / 0.16);
    backdrop-filter: blur(20px);
  }
  .today-live-feedback[data-kind="error"] { border-color: rgb(255 189 85 / 0.7); }

  .today-live-confirmation {
    position: absolute;
    z-index: 55;
    bottom: 2px;
    display: grid;
    width: min(430px, 94vw);
    grid-template-columns: minmax(0, 1fr) auto 44px;
    align-items: center;
    gap: 10px;
    border: 1px solid rgb(255 255 255 / 0.5);
    border-radius: 15px;
    background: rgb(235 241 237 / 0.96);
    padding: 12px;
    color: var(--today-ink);
    box-shadow: 0 22px 54px rgb(8 16 15 / 0.32);
    backdrop-filter: blur(28px);
  }
  .today-live-confirmation > div { display: grid; gap: 3px; min-width: 0; }
  .today-live-confirmation strong { font-size: 14px; }
  .today-live-confirmation span { overflow-wrap: anywhere; font-size: 13px; line-height: 1.45; }
  .today-live-confirmation button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 6px; border: 1px solid rgb(28 38 32 / 0.16); border-radius: 9px; background: var(--today-yellow); padding: 8px 12px; color: var(--today-ink); font: 650 13px/1.2 var(--font-lexend), Lexend, system-ui, sans-serif; cursor: pointer; }
  .today-live-confirmation button:last-child { width: 44px; padding: 0; background: #fff; }
  .today-live-confirmation svg { width: 18px; height: 18px; }

  .sd-lobby-attention {
    display: flex;
    min-width: 0;
    min-height: 0;
    grid-area: attention;
    flex-direction: column;
    margin: 0;
    overflow: clip;
    border-radius: 30px 18px 30px 18px;
    padding: 24px 22px;
    transform: none;
  }

  .today-attention-header {
    display: flex;
    min-height: 58px;
    align-items: center;
    gap: 14px;
    padding: 0 2px 14px;
    border-bottom: 1px solid rgb(24 33 38 / 0.16);
  }

  .sd-lobby-attention-stack {
    display: grid;
    gap: 12px;
    min-height: 0;
    flex: 1;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: repeat(3, minmax(0, 1fr));
    padding-top: 16px;
  }

  .sd-lobby-attention-stack:has(> .sd-lobby-attention-card:only-child) {
    grid-template-rows: minmax(180px, auto);
    align-content: center;
  }

  .sd-lobby-attention-stack:has(> .sd-lobby-attention-card:nth-child(2):last-child) {
    grid-template-rows: repeat(2, minmax(0, 1fr));
    align-content: center;
  }

  .sd-lobby-attention-card,
  .sd-lobby-attention-empty {
    position: relative;
    display: grid;
    min-width: 0;
    min-height: 0;
    grid-template-columns: 68px minmax(0, 1fr);
    align-items: center;
    gap: 16px;
    border: 1px solid rgb(255 255 255 / .54);
    border-radius: 16px 10px 16px 10px;
    background: rgb(255 255 255 / .18);
    box-shadow: inset 0 1px rgb(255 255 255 / .34), 0 12px 28px rgb(48 58 55 / .10);
    padding: 14px 16px;
    color: var(--today-ink);
    text-decoration: none;
    backdrop-filter: blur(16px) saturate(.9);
    -webkit-backdrop-filter: blur(16px) saturate(.9);
    transition: border-color 160ms ease, background 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  }
  .sd-lobby-attention-card:hover {
    border-color: rgb(255 255 255 / .8);
    background: rgb(255 255 255 / .28);
    box-shadow: inset 0 1px rgb(255 255 255 / .5), 0 16px 30px rgb(48 58 55 / .15);
    transform: translateY(-2px);
  }

  .sd-lobby-attention-card[data-state="empty"] { pointer-events: none; }
  .sd-lobby-attention-card[data-state="empty"] .sd-lobby-attention-category {
    color: var(--today-glass-muted);
  }
  .sd-lobby-attention-copy { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
  .sd-lobby-attention-category {
    color: var(--today-ink);
    font: 680 16px/1.3 var(--font-lexend), Lexend, system-ui, sans-serif;
    text-transform: none;
  }
  .sd-lobby-attention-card[data-tone] .sd-lobby-attention-category {
    color: var(--today-ink);
  }
  .sd-lobby-attention-card[data-tone] .sd-lobby-attention-count strong,
  .sd-lobby-attention-empty strong { color: var(--today-ink); font: 640 16px/1.35 var(--font-lexend), Lexend, system-ui, sans-serif; text-transform: none; }
  .sd-lobby-attention-description,
  .sd-lobby-attention-empty span { color: var(--today-glass-muted); font-size: 14px; line-height: 1.5; }
  .sd-lobby-attention-more {
    color: var(--today-glass-muted);
    font: 560 14px/1.4 var(--font-lexend), Lexend, system-ui, sans-serif;
  }
  .sd-lobby-attention-count {
    display: grid;
    width: 62px;
    min-height: 62px;
    grid-column: auto;
    grid-row: auto;
    place-items: center;
    align-self: center;
    border: 1px solid rgb(24 33 38 / .24);
    border-radius: 50%;
    background: rgb(255 255 255 / .26);
    align-content: center;
    text-align: center;
    box-shadow: inset 0 1px rgb(255 255 255 / .48);
  }
  .sd-lobby-attention-card[data-category="due_earlier"][data-state="active"] .sd-lobby-attention-count { border-color: rgb(226 76 68 / .7); background: rgb(244 107 94 / .14); }
  .sd-lobby-attention-card[data-category="not_submitted"][data-state="active"] .sd-lobby-attention-count,
  .sd-lobby-attention-card[data-category="tests"][data-state="active"] .sd-lobby-attention-count { border-color: rgb(166 143 10 / .72); background: rgb(232 245 107 / .28); }
  .sd-lobby-attention-card[data-state="empty"] .sd-lobby-attention-count { border-color: rgb(24 33 38 / .12); background: rgb(255 255 255 / .12); }
  .sd-lobby-attention-count strong {
    color: var(--today-ink);
    font: 720 25px/1 var(--font-lexend), Lexend, system-ui, sans-serif;
    font-variant-numeric: tabular-nums;
  }
  .sd-lobby-attention-count small {
    margin-top: 3px;
    color: var(--today-glass-muted);
    font: 500 11px/1 var(--font-lexend), Lexend, system-ui, sans-serif;
  }
  .sd-lobby-attention-empty { grid-column: 1 / -1; min-height: 160px; grid-template-columns: 1fr; align-content: center; border-bottom: 0; }

  .today-next-action:focus-visible,
  .today-orb-control:focus-visible,
  .today-live-confirmation button:focus-visible,
  .today-checkin-card .sd-lobby-checkin-trigger:focus-visible,
  .today-checkin-card .sd-lobby-checkin-close:focus-visible,
  .today-checkin-card .sd-lobby-checkin-row button:focus-visible,
  .sd-lobby-attention-card:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }

  .today-spin { animation: today-spin 900ms linear infinite; }
  @keyframes today-spin { to { transform: rotate(360deg); } }

  @media (min-width: 1200px) {
    .sd-lobby-screen { overflow-x: hidden; overflow-y: auto; }
    .today-dashboard-grid {
      height: calc(100dvh - 72px);
      min-height: 0;
      grid-template-areas:
        "left voice attention"
        "checkin week attention";
      grid-template-columns: minmax(0, 1fr) minmax(280px, 320px) minmax(0, 1fr);
      grid-template-rows: 290px 340px;
      column-gap: clamp(20px, 2vw, 32px);
      row-gap: 16px;
      align-content: center;
      align-items: stretch;
      padding: 18px 0 26px;
    }
    .today-left-rail {
      height: 100%;
      align-self: stretch;
      grid-template-rows: minmax(0, 1fr);
      align-content: stretch;
    }
    .today-section-label {
      position: absolute;
      z-index: 4;
      top: calc(clamp(20px, 3.2vw, 54px) + 7px);
      left: clamp(20px, 3.2vw, 54px);
      margin: 0;
    }
    .today-next-card { height: 100%; min-height: 0; }
    .today-next-card .today-next-content {
      justify-content: flex-start;
      border-bottom: 0;
      padding: 28px 30px 26px;
    }
    .sd-lobby-screen .today-next-title { max-width: 36ch; font-size: 18px; }
    .today-diana-live { height: 100%; min-height: 0; align-self: stretch; }
    .today-orb-stage { width: clamp(190px, 17vw, 230px); }
    .today-checkin-card {
      width: 100%;
      max-width: none;
      height: 100%;
      min-height: 0;
      justify-self: stretch;
      border-radius: 18px 26px 18px 26px;
    }
    .today-checkin-card .today-checkin-content { justify-content: center; gap: 12px; padding: 20px 26px; }
    .today-checkin-card h2,
    .sd-lobby-attention > .today-attention-header h2 { font-size: clamp(22px, 1.7vw, 25px); }
    .today-checkin-card .sd-lobby-checkin-sliders {
      grid-template-columns: minmax(0, 1fr);
      gap: 8px;
    }
    .today-checkin-card .sd-lobby-checkin {
      position: relative;
    }
    .today-checkin-card .sd-lobby-checkin-slider-row {
      display: grid;
      grid-template-columns: 72px minmax(0, 1fr);
      align-items: center;
      gap: 8px;
      padding: 5px 8px;
    }
    .today-checkin-card .sd-lobby-checkin-slider-label {
      margin: 0;
    }
    .today-checkin-card .sd-lobby-checkin-status {
      position: absolute;
      top: -40px;
      right: 0;
      min-height: 28px;
      padding-left: 0;
      text-align: right;
    }
    .today-week-card { height: 100%; }
    .sd-lobby-attention { height: 100%; min-height: 0; align-self: stretch; }
  }

  @media (min-width: 901px) and (max-width: 1199px) {
    .today-dashboard-grid {
      grid-template-areas:
        "voice week"
        "left attention"
        "checkin attention";
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-rows: auto auto auto;
      align-items: stretch;
      padding-top: 88px;
      padding-bottom: 40px;
    }
    .today-diana-live { min-height: 222px; }
    .today-orb-stage { width: 190px; }
    .today-week-card { min-height: 222px; }
    .today-left-rail { grid-template-rows: minmax(300px, auto); }
    .today-next-card { min-height: 300px; }
    .today-checkin-card { min-height: 340px; }
    .sd-lobby-attention { min-height: 618px; }
  }

  @media (max-width: 900px) {
    .sd-lobby-screen > .sd-student-desktop-nav { display: none !important; }
    .sd-lobby-screen > .sd-lobby-mobile-header {
      position: fixed;
      z-index: 80;
      top: 0;
      right: 0;
      left: 0;
      display: flex;
      min-height: 64px;
      align-items: center;
      justify-content: space-between;
      border: 0;
      background: linear-gradient(180deg, rgb(22 31 33 / 0.68), rgb(22 31 33 / 0.42));
      padding: 10px 16px;
      box-shadow: inset 0 -1px 0 rgb(255 255 255 / 0.18);
      backdrop-filter: blur(24px) saturate(0.9);
    }
    .sd-lobby-mobile-brand .sd-source-wordmark { height: 32px; }
    .sd-lobby-mobile-actions { display: flex; align-items: center; gap: 8px; }
    .today-mobile-add-menu { position: relative; }
    .today-mobile-add-menu > summary,
    .sd-lobby-mobile-actions > a[data-action="profile"] {
      display: grid;
      width: 44px;
      height: 44px;
      place-items: center;
      border: 1px solid rgb(255 255 255 / 0.34);
      border-radius: 10px;
      background: rgb(17 26 28 / 0.42);
      color: #fff;
      list-style: none;
      cursor: pointer;
      box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.16);
    }
    .today-mobile-add-menu > summary::-webkit-details-marker { display: none; }
    .sd-lobby-mobile-actions > a[data-action="profile"] { overflow: hidden; border-radius: 50%; }
    .sd-lobby-mobile-actions > a[data-action="profile"] img { width: 100%; height: 100%; object-fit: cover; }
    .today-mobile-add-options {
      position: absolute;
      z-index: 90;
      top: calc(100% + 9px);
      right: 0;
      display: grid;
      width: 230px;
      gap: 4px;
      border: 1px solid rgb(255 255 255 / 0.42);
      border-radius: 14px;
      background: rgb(19 28 30 / 0.92);
      padding: 7px;
      box-shadow: 0 20px 50px rgb(7 14 16 / 0.3);
      backdrop-filter: blur(28px);
    }
    .today-mobile-add-options a {
      display: flex;
      min-height: 48px;
      align-items: center;
      gap: 10px;
      border-radius: 9px;
      padding: 10px 11px;
      color: #fff;
      font-size: 14px;
      text-decoration: none;
    }
    .today-mobile-add-options a:hover { background: rgb(255 255 255 / 0.1); }
    .today-dashboard-grid { width: min(100% - 32px, 680px); gap: 14px; padding-top: 74px; padding-bottom: calc(108px + env(safe-area-inset-bottom)); }
    .today-diana-live { min-height: 184px; order: 0; }
    .today-orb-stage { width: 158px; }
    .today-orb-control { width: 48px; height: 48px; }
    .today-left-rail { order: 1; }
    .today-week-card { order: 2; min-height: 150px; }
    .today-checkin-card { order: 3; }
    .sd-lobby-attention { order: 4; min-height: auto; scroll-margin-bottom: calc(118px + env(safe-area-inset-bottom)); }
    .today-live-confirmation { bottom: -52px; }
    .sd-lobby-screen > .sd-student-bottom-nav {
      position: fixed !important;
      z-index: 75;
      right: 12px !important;
      bottom: calc(8px + env(safe-area-inset-bottom)) !important;
      left: 12px !important;
      top: auto !important;
      display: grid !important;
      width: auto !important;
      min-height: 68px;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      border: 1px solid rgb(255 255 255 / 0.34);
      border-radius: 18px;
      background: rgb(16 25 27 / 0.84);
      padding: 5px 6px;
      box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.18), 0 18px 44px rgb(7 14 16 / 0.28);
      transform: none !important;
      backdrop-filter: blur(26px) saturate(0.9);
    }
    .sd-lobby-screen > .sd-student-bottom-nav a {
      position: relative;
      display: flex;
      min-width: 0;
      min-height: 54px;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      border-radius: 11px;
      color: rgb(255 255 255 / 0.72);
      font-size: 11px;
      text-decoration: none;
    }
    .sd-lobby-screen > .sd-student-bottom-nav a > span {
      display: block;
      width: 100%;
      overflow: hidden;
      font-size: inherit;
      line-height: 1.2;
      text-align: center;
      text-overflow: clip;
      white-space: nowrap;
    }
    .sd-lobby-screen > .sd-student-bottom-nav a[aria-current="page"] {
      background: rgb(255 255 255 / 0.1);
      color: var(--today-yellow);
    }
  }

  @media (max-width: 560px) {
    .today-dashboard-grid { width: min(100% - 24px, 480px); gap: 12px; padding-top: 70px; }
    .today-diana-live { min-height: 188px; padding-bottom: 16px; }
    .today-orb-stage { width: 168px; }
    .today-next-card { min-height: 230px; grid-template-columns: minmax(0, 1fr); }
    .today-next-content { padding: 18px 16px 16px; }
    .sd-lobby-screen .today-next-course { font-size: 21px; }
    .sd-lobby-screen .today-next-title { font-size: 15px; }
    .today-next-meta { gap: 10px; }
    .today-next-action { min-width: 104px; }
    .today-week-card .today-homework-progress { padding: 18px 16px; }
    .today-checkin-card { min-height: 342px; grid-template-columns: minmax(0, 1fr); }
    .today-checkin-content { gap: 10px; padding: 16px; }
    .today-checkin-card h2 { font-size: 18px; }
    .today-checkin-card .sd-lobby-checkin-sliders { gap: 10px; }
    .sd-lobby-attention { padding: 16px; }
    .sd-lobby-attention-stack { grid-template-columns: 1fr; grid-template-rows: auto; }
    .today-attention-header { min-height: 66px; }
    .today-live-confirmation { position: fixed; right: 12px; bottom: calc(92px + env(safe-area-inset-bottom)); left: 12px; width: auto; }
    .today-checkin-card .sd-lobby-checkin-slider-row,
    .sd-lobby-attention-card { scroll-margin-bottom: calc(116px + env(safe-area-inset-bottom)); }
  }

  @media (min-width: 901px) {
    .today-page-background { display: none; }

    :root:has(.sd-lobby-screen),
    body:has(.sd-lobby-screen),
    .diana-app:has(.sd-lobby-screen),
    .diana-app-shell:has(.sd-lobby-screen),
    .diana-authenticated-field:has(.sd-lobby-screen),
    .app-command-frame:has(.sd-lobby-screen),
    .sd-source-viewport.sd-lobby-screen {
      background:
        linear-gradient(rgb(217 220 218 / 0.1), rgb(217 220 218 / 0.18)),
        #141922 url("/images/today-gamer-high-school.png") center / cover fixed no-repeat !important;
    }

    .today-dashboard-grid {
      width: calc(100% - (2 * clamp(12px, 1.6vw, 28px)));
      max-width: 1800px;
      min-height: calc(100dvh - 106px);
      height: calc(100dvh - 106px);
      margin: 22px auto 24px;
      overflow: visible;
      border: 7px solid #fff;
      border-radius: 30px;
      clip-path: polygon(0 0, calc(50% - 131px) 0, calc(50% - 61px) 49px, calc(50% + 61px) 49px, calc(50% + 131px) 0, 100% 0, 100% 100%, calc(50% + 131px) 100%, calc(50% + 61px) calc(100% - 49px), calc(50% - 61px) calc(100% - 49px), calc(50% - 131px) 100%, 0 100%);
      background: rgb(220 224 222 / 0.3);
      box-shadow: 0 22px 56px rgb(50 61 66 / 0.2), inset 0 1px 0 rgb(255 255 255 / 0.5);
      backdrop-filter: blur(24px) saturate(0.82);
      -webkit-backdrop-filter: blur(24px) saturate(0.82);
      padding: 18px clamp(20px, 2vw, 32px) 26px;
    }

    .today-dashboard-notch {
      position: absolute;
      z-index: 4;
      left: 50%;
      width: 262px;
      height: 56px;
      transform: translateX(-50%);
      background: transparent;
      pointer-events: none;
    }

    .today-dashboard-notch::after {
      position: absolute;
      inset: 0;
      background: center / 100% 100% no-repeat;
      content: "";
    }

    .today-dashboard-notch-top {
      top: -7px;
    }

    .today-dashboard-notch-top::after {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 262 56'%3E%3Cpath d='M0 4 L70 49 H192 L262 4' fill='none' stroke='%23ffffff' stroke-width='7' stroke-linejoin='round'/%3E%3C/svg%3E");
    }

    .today-dashboard-notch-bottom {
      bottom: -7px;
    }

    .today-dashboard-notch-bottom::after {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 262 56'%3E%3Cpath d='M0 52 L70 7 H192 L262 52' fill='none' stroke='%23ffffff' stroke-width='7' stroke-linejoin='round'/%3E%3C/svg%3E");
    }

    .sd-lobby-screen > .sd-lobby-mobile-header,
    .sd-lobby-screen > .sd-student-bottom-nav { display: none !important; }
    .sd-lobby-screen > .sd-student-desktop-nav {
      position: sticky;
      z-index: 90;
      top: 0;
      display: block !important;
      height: 72px;
      flex: none;
      background: #d6dad6;
    }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-nav-inner {
      display: flex;
      width: 100%;
      height: 72px;
      align-items: center;
      gap: 46px;
      margin-inline: 0;
      padding-inline: clamp(12px, 1.6vw, 28px);
    }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-tools,
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-actions,
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-destinations {
      display: flex;
      align-items: center;
    }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-brand {
      display: flex;
      min-width: 120px;
      color: #182126;
      height: 44px;
      align-items: center;
      text-decoration: none;
    }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-brand .sd-source-wordmark { width: auto; height: 36px; }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-destinations {
      align-self: stretch;
      gap: 28px;
    }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-destinations > a {
      position: relative;
      display: flex;
      align-items: center;
      color: #53615c;
      font-family: var(--font-lexend), "Lexend", sans-serif;
      font-size: 16px;
      font-weight: 400;
      letter-spacing: 0;
      text-transform: none;
      text-decoration: none;
    }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-destinations > a[aria-current="page"] { color: #182126; }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-destinations > a[aria-current="page"]::after {
      position: absolute;
      right: 0;
      bottom: 0;
      left: 0;
      height: 3px;
      background: #182126;
      content: "";
    }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-actions { gap: 8px; margin-left: auto; }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-settings,
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-avatar {
      display: grid;
      width: 44px;
      height: 44px;
      flex: none;
      place-items: center;
      border: 1px solid rgb(84 98 92 / 0.36);
      background: rgb(255 255 255 / 0.44);
      color: #182126;
      text-decoration: none;
    }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-settings { border-radius: 8px; }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-avatar {
      overflow: hidden;
      border-radius: 999px;
      background: linear-gradient(135deg, #e8eee8, #aebcb5);
      font-weight: 400;
    }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-add-menu { position: relative; }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-add-options {
      position: absolute;
      z-index: 110;
      top: calc(100% + 8px);
      right: 0;
      display: grid;
      width: 252px;
      gap: 4px;
      border: 1px solid rgb(84 98 92 / 0.3);
      border-radius: 10px;
      background: rgb(244 246 243 / 0.96);
      padding: 6px;
      box-shadow: 0 14px 32px rgb(24 33 38 / 0.17);
      backdrop-filter: blur(18px);
    }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-add-options > a {
      display: grid;
      min-height: 52px;
      grid-template-columns: 32px minmax(0, 1fr);
      align-items: center;
      gap: 9px;
      border-radius: 7px;
      padding: 9px;
      color: #182126;
      text-decoration: none;
    }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-add-options span { display: grid; gap: 2px; }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-add-options strong { font-size: 12px; }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-add-options small { color: #53615c; font-size: 11px; }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary {
      display: flex;
      min-width: 74px;
      min-height: 44px;
      align-items: center;
      gap: 7px;
      border: 1px solid #c6d23f !important;
      border-radius: 8px;
      background: #e8f56b !important;
      padding-inline: 13px;
      color: #141d20 !important;
      font-family: var(--font-lexend), "Lexend", sans-serif;
      font-size: 16px;
      font-weight: 400;
      letter-spacing: 0;
      text-transform: none;
      list-style: none;
      cursor: pointer;
      box-shadow: none !important;
    }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary > span,
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary > svg {
      color: #141d20 !important;
    }
    .sd-lobby-screen > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary::-webkit-details-marker { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .today-spin { animation: none; }
    .today-dashboard-grid *,
    .today-dashboard-grid *::before,
    .today-dashboard-grid *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
  }
`;
