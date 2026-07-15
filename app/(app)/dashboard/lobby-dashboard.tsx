import { Bell, Play, Timer } from "lucide-react";
import Link from "next/link";

import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import type { LobbyDashboardView } from "@/lib/dashboard/lobby-view";
import { LobbyBackgroundLayer } from "./lobby-background-layer";
import { NeedsAttention } from "./needs-attention";
import { PlayerPhotoSlot } from "./player-photo-slot";

export function LobbyDashboard({ view }: { view: LobbyDashboardView }) {
  return (
    <ScreenDesignViewport className="sd-lobby-screen" aria-label="Student Lobby">
      <style>{`
        .sd-lobby-screen {
          --sd-lobby-navy: #0f172a;
          --sd-lobby-pink: #ff79da;
          --sd-lobby-teal: #2dd4bf;
          --sd-lobby-orange: #fb923c;
          --sd-lobby-purple: #a78bfa;
          display: flex;
          height: max(100dvh, 852px);
          max-height: max(100dvh, 852px);
          flex-direction: column;
          overflow: hidden;
          background: var(--sd-lobby-navy);
          color: #fff;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .sd-lobby-background {
          position: absolute;
          z-index: 0;
          inset: 0;
          overflow: hidden;
          background: var(--sd-lobby-navy);
        }

        .sd-lobby-background .sd-lobby-background-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          max-width: none;
          object-fit: cover;
          object-position: center;
        }

        .sd-lobby-background-shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(rgb(15 23 42 / 0.1), rgb(15 23 42 / 0.7));
        }

        .sd-lobby-athlete {
          position: absolute;
          z-index: 5;
          top: 180px;
          right: -10px;
          width: 160px;
          height: auto;
          max-width: none;
          filter: drop-shadow(0 0 30px rgb(0 0 0 / 0.6));
          opacity: 0.95;
          pointer-events: none;
        }

        .sd-lobby-header {
          position: relative;
          z-index: 20;
          display: flex;
          flex: none;
          align-items: center;
          justify-content: space-between;
          padding: 56px 24px 16px;
        }

        .sd-lobby-wordmark {
          width: auto;
          height: 24px;
          margin-bottom: 8px;
          object-fit: contain;
          opacity: 0.9;
        }

        .sd-lobby-screen .sd-lobby-title {
          margin: 0;
          color: #fff;
          font-family: inherit;
          font-size: 30px;
          font-style: italic;
          font-weight: 900;
          letter-spacing: -0.05em;
          line-height: 1;
          text-transform: uppercase;
        }

        .sd-lobby-screen .sd-lobby-title span {
          display: block;
          color: var(--sd-lobby-pink);
        }

        .sd-lobby-notifications {
          display: grid;
          width: 40px;
          height: 40px;
          flex: none;
          place-items: center;
          border: 1px solid rgb(255 255 255 / 0.1);
          border-radius: 999px;
          background: rgb(255 255 255 / 0.05);
          color: #fff;
          text-decoration: none;
          backdrop-filter: blur(12px);
          transition: transform 150ms ease, border-color 150ms ease;
        }

        .sd-lobby-notifications:active {
          transform: scale(0.9);
        }

        .sd-lobby-notifications:focus-visible,
        .sd-lobby-attention-card:focus-visible {
          outline: 2px solid var(--sd-lobby-teal);
          outline-offset: 3px;
        }

        .sd-lobby-main {
          position: relative;
          z-index: 10;
          min-height: 0;
          flex: 1;
          overflow-y: auto;
          padding: 24px 24px 128px;
          scrollbar-width: none;
        }

        .sd-lobby-main::-webkit-scrollbar {
          display: none;
        }

        .sd-lobby-next-move {
          margin-bottom: 60px;
        }

        .sd-lobby-screen .sd-lobby-kicker {
          margin: 0 0 16px;
          color: var(--sd-lobby-teal);
          font-family: inherit;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.4em;
          line-height: 1.5;
          text-transform: uppercase;
        }

        .sd-lobby-start {
          width: 180px;
          min-height: 44px;
          margin-bottom: 16px;
          padding-inline: 16px;
          white-space: nowrap;
        }

        .sd-lobby-next-copy {
          padding-left: 4px;
        }

        .sd-lobby-next-title {
          margin: 0;
          color: #fff;
          font-size: 16px;
          font-style: italic;
          font-weight: 900;
          line-height: 1.5;
        }

        .sd-lobby-estimate {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          color: #cbd5e1;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.5;
          text-transform: uppercase;
        }

        .sd-lobby-estimate svg {
          color: var(--sd-lobby-teal);
        }

        .sd-lobby-attention-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sd-lobby-attention-card {
          position: relative;
          display: flex;
          min-height: 86px;
          align-items: center;
          gap: 16px;
          border: 1px solid rgb(45 212 191 / 0.1);
          border-radius: 12px;
          background: rgb(0 0 0 / 0.6);
          padding: 16px 20px;
          color: #fff;
          text-decoration: none;
          backdrop-filter: blur(8px);
          transition: transform 150ms ease, border-color 150ms ease;
        }

        .sd-lobby-attention-card::before,
        .sd-lobby-attention-card::after {
          position: absolute;
          width: 8px;
          height: 8px;
          content: "";
        }

        .sd-lobby-attention-card::before {
          top: -1px;
          left: -1px;
          border-top: 1px solid var(--sd-lobby-teal);
          border-left: 1px solid var(--sd-lobby-teal);
        }

        .sd-lobby-attention-card::after {
          right: -1px;
          bottom: -1px;
          border-right: 1px solid var(--sd-lobby-teal);
          border-bottom: 1px solid var(--sd-lobby-teal);
        }

        .sd-lobby-attention-card:active {
          transform: scale(0.98);
        }

        .sd-lobby-attention-icon {
          display: grid;
          width: 44px;
          height: 44px;
          flex: none;
          place-items: center;
          border-radius: 8px;
        }

        .sd-lobby-attention-card[data-tone="purple"] .sd-lobby-attention-icon {
          background: rgb(167 139 250 / 0.2);
          color: var(--sd-lobby-purple);
        }

        .sd-lobby-attention-card[data-tone="orange"] .sd-lobby-attention-icon {
          background: rgb(251 146 60 / 0.2);
          color: var(--sd-lobby-orange);
        }

        .sd-lobby-attention-card[data-tone="yellow"] .sd-lobby-attention-icon {
          background: rgb(250 204 21 / 0.2);
          color: #facc15;
        }

        .sd-lobby-attention-copy {
          min-width: 0;
          flex: 1;
        }

        .sd-lobby-attention-copy strong {
          display: block;
          overflow: hidden;
          color: #fff;
          font-size: 14px;
          font-style: italic;
          font-weight: 900;
          letter-spacing: -0.01em;
          line-height: 1.2;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .sd-lobby-attention-copy small {
          display: block;
          overflow: hidden;
          margin-top: 4px;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.05em;
          line-height: 1.3;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .sd-lobby-attention-count {
          flex: none;
          color: #fff;
          font-size: 24px;
          font-style: italic;
          font-weight: 900;
          line-height: 1;
        }

        .sd-lobby-attention-card[data-tone="orange"] .sd-lobby-attention-count {
          color: var(--sd-lobby-orange);
        }

        .sd-lobby-attention-card[data-tone="yellow"] .sd-lobby-attention-count {
          color: #facc15;
        }

        .sd-lobby-attention-chevron {
          flex: none;
          color: #475569;
        }

        .sd-lobby-screen > .sd-student-bottom-nav {
          position: relative;
          z-index: 50;
          flex: none;
          min-height: 94px;
        }

        .diana-app-shell:has(.sd-lobby-screen) .agent-fab-anchor,
        .app-command-frame:has(.sd-lobby-screen) .diana-mobile-command {
          display: none !important;
        }

        .app-command-frame:has(.sd-lobby-screen) {
          padding: 0 !important;
        }

        .diana-app:has(.sd-lobby-screen) nextjs-portal {
          display: none !important;
        }

        .diana-app:has(.sd-lobby-screen) .skip-link {
          transition: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .sd-lobby-notifications,
          .sd-lobby-attention-card {
            transition: none;
          }

          .sd-lobby-notifications:active,
          .sd-lobby-attention-card:active {
            transform: none;
          }
        }
      `}</style>

      <LobbyBackgroundLayer />
      <PlayerPhotoSlot />

      <header className="sd-lobby-header">
        <div>
          <SourceMedia
            assetId="diana-logo"
            width={1440}
            height={440}
            alt="Diana"
            priority
            className="sd-lobby-wordmark"
            sizes="80px"
          />
          <h1 className="sd-lobby-title">
            Lobby
            <span>{view.studentName}</span>
          </h1>
        </div>
        <Link
          href="/notifications"
          className="sd-lobby-notifications"
          aria-label="Notifications"
        >
          <Bell size={20} strokeWidth={1.9} aria-hidden="true" />
        </Link>
      </header>

      <main className="sd-lobby-main">
        <section className="sd-lobby-next-move" aria-labelledby="next-move-title">
          <h2 id="next-move-title" className="sd-lobby-kicker">
            Your next move
          </h2>
          <a
            href={view.nextMove.href}
            className="sd-source-action sd-lobby-start"
            data-tone="teal"
            data-variant="solid"
            aria-label={view.nextMove.ariaLabel}
          >
            <Play size={18} fill="currentColor" aria-hidden="true" />
            <span>{view.nextMove.actionLabel}</span>
          </a>
          <div className="sd-lobby-next-copy">
            <p className="sd-lobby-next-title">
              {view.nextMove.className} · {view.nextMove.title}
            </p>
            <p className="sd-lobby-estimate">
              <Timer size={12} strokeWidth={2} aria-hidden="true" />
              {view.nextMove.estimateLabel}
            </p>
          </div>
        </section>

        <NeedsAttention categories={view.attention} />
      </main>

      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}
