import { ArrowRight, Camera, Mic, Play, Timer } from "lucide-react";
import Link from "next/link";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import type { LobbyCheckInValue } from "@/lib/dashboard/lobby-check-in";
import type { LobbyDashboardView } from "@/lib/dashboard/lobby-view";
import { LobbyBackgroundLayer } from "./lobby-background-layer";
import { LobbyCheckIn } from "./lobby-check-in";
import { NeedsAttention } from "./needs-attention";
import { PlayerPhotoSlot } from "./player-photo-slot";

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
      <style>{LOBBY_STYLES}</style>

      <LobbyBackgroundLayer />
      <StudentDesktopNav
        active="Today"
        displayName={profile.displayName}
        photoUrl={profile.photoUrl}
        photoOffsetX={profile.photoOffsetX}
        photoOffsetY={profile.photoOffsetY}
      />

      <header className="sd-lobby-mobile-header">
        <Link href="/dashboard" aria-label="Diana home" className="sd-lobby-mobile-brand">
          <DianaWordmark tight />
        </Link>
        <div className="sd-lobby-mobile-actions">
          <Link href="/quick-add" aria-label="Capture work" data-action="capture">
            <Camera size={17} aria-hidden="true" />
          </Link>
          <Link href="/voice" aria-label="Record a note" data-action="record">
            <Mic size={17} aria-hidden="true" />
          </Link>
          <Link href="/me" aria-label={`${view.studentName} profile`} data-action="profile">
            {profile.photoUrl ? (
              // Profile photos may be data URLs or Supabase object URLs.
              // eslint-disable-next-line @next/next/no-img-element
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

      <main className="sd-lobby-stage">
        <div className="sd-lobby-left">
          <section className="sd-lobby-hero" aria-labelledby="next-move-title">
            <h1 id="next-move-title" className="sd-lobby-title sd-lobby-next-title">
              {view.hasNextMove ? "Next move" : "Caught up"}
            </h1>
          </section>

          <section
            className="sd-lobby-next-move"
            aria-label={view.hasNextMove ? "Next assignment" : "Daily check-in"}
            data-caught-up={view.hasNextMove ? undefined : "true"}
          >
            {view.hasNextMove ? (
              <>
                <Link
                  href={view.nextMove.href}
                  className="sd-lobby-start"
                  aria-label={view.nextMove.ariaLabel}
                >
                  <span>
                    <Play size={22} fill="currentColor" aria-hidden="true" />
                    {view.nextMove.actionLabel}
                  </span>
                  <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" />
                </Link>
                <div className="sd-lobby-next-copy">
                  <div className="sd-lobby-next-meta">
                    <span className="sd-lobby-estimate">
                      <Timer size={14} strokeWidth={2.2} aria-hidden="true" />
                      {view.nextMove.estimateLabel}
                    </span>
                    <LobbyCheckIn initialValue={initialCheckIn} sleepDate={today} />
                  </div>
                </div>
              </>
            ) : (
              <LobbyCheckIn
                initialValue={initialCheckIn}
                sleepDate={today}
                primary
              />
            )}
          </section>
        </div>

        <PlayerPhotoSlot
          photoUrl={profile.photoUrl}
          photoOffsetX={profile.photoOffsetX}
          photoOffsetY={profile.photoOffsetY}
          studentName={view.studentName}
        />

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
    width: 42px;
    height: 42px;
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

    .sd-lobby-screen .sd-student-desktop-nav {
      position: relative;
      flex: none;
    }

    .sd-lobby-screen .sd-student-desktop-destinations > a[aria-current="page"] {
      color: #fff;
    }

    .sd-lobby-screen .sd-student-desktop-destinations > a[aria-current="page"]::after {
      background: #fff;
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
