import { DianaWordmark } from "./primitives";

interface SmartLoadingProps {
  readonly label: string;
}

export function SmartLoading({ label }: SmartLoadingProps) {
  return (
    <div className="diana-cinematic-loading" aria-label="Diana loading screen">
      <style>{`
        body:has(.diana-cinematic-loading) .diana-loading-quick-capture,
        body:has(.diana-cinematic-loading) .diana-loading-overwhelmed,
        .diana-app-shell:has(.diana-cinematic-loading) .agent-fab-anchor,
        .app-command-frame:has(.diana-cinematic-loading) .diana-mobile-command {
          display: none !important;
        }

        .app-command-frame:has(.diana-cinematic-loading) {
          width: 100% !important;
          max-width: none !important;
          padding: 0 !important;
        }

        .diana-cinematic-loading {
          --loading-yellow: #e8f56b;
          min-height: 100dvh;
          overflow: hidden;
          background:
            linear-gradient(rgb(214 218 214 / .12), rgb(214 218 214 / .2)),
            #d6dad6 url("/images/diana-loading-empty-studio.png") center / cover fixed no-repeat;
          color: #fff;
          font-family: var(--font-lexend), Lexend, sans-serif;
        }

        .diana-cinematic-loading *,
        .diana-cinematic-loading *::before,
        .diana-cinematic-loading *::after { box-sizing: border-box; }

        .diana-cinematic-loading-main {
          position: relative;
          width: calc(100% - (2 * clamp(12px, 1.6vw, 28px)));
          max-width: 1800px;
          min-height: calc(100dvh - 106px);
          margin: 22px auto 24px;
          isolation: isolate;
          overflow: visible;
          border: 7px solid #fff;
          border-radius: 30px;
          clip-path: polygon(0 0, calc(50% - 131px) 0, calc(50% - 61px) 49px, calc(50% + 61px) 49px, calc(50% + 131px) 0, 100% 0, 100% 100%, calc(50% + 131px) 100%, calc(50% + 61px) calc(100% - 49px), calc(50% - 61px) calc(100% - 49px), calc(50% - 131px) 100%, 0 100%);
          background: rgb(220 224 222 / .3);
          box-shadow:
            inset 0 1px 0 rgb(255 255 255 / .32),
            0 22px 56px rgb(24 33 38 / .14);
          -webkit-backdrop-filter: blur(24px) saturate(.82);
          backdrop-filter: blur(24px) saturate(.82);
        }

        .diana-cinematic-loading-main::before {
          position: absolute;
          z-index: -1;
          inset: 0;
          background:
            repeating-linear-gradient(90deg, rgb(255 255 255 / .025) 0 1px, transparent 1px 64px),
            repeating-linear-gradient(0deg, rgb(255 255 255 / .02) 0 1px, transparent 1px 64px);
          content: "";
        }

        .diana-cinematic-loading-notch {
          position: absolute;
          z-index: 3;
          left: 50%;
          width: 262px;
          height: 56px;
          transform: translateX(-50%);
          background: transparent;
          pointer-events: none;
        }

        .diana-cinematic-loading-notch::after {
          position: absolute;
          inset: 0;
          background: center / 100% 100% no-repeat;
          content: "";
        }

        .diana-cinematic-loading-notch--top {
          top: -7px;
          clip-path: polygon(0 0, 100% 0, 73.3% 87.5%, 26.7% 87.5%);
        }

        .diana-cinematic-loading-notch--top::after {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 262 56'%3E%3Cpath d='M0 4 L70 49 H192 L262 4' fill='none' stroke='%23ffffff' stroke-width='7' stroke-linejoin='round'/%3E%3C/svg%3E");
        }

        .diana-cinematic-loading-notch--bottom {
          bottom: -7px;
          clip-path: polygon(26.7% 12.5%, 73.3% 12.5%, 100% 100%, 0 100%);
        }

        .diana-cinematic-loading-notch--bottom::after {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 262 56'%3E%3Cpath d='M0 52 L70 7 H192 L262 52' fill='none' stroke='%23ffffff' stroke-width='7' stroke-linejoin='round'/%3E%3C/svg%3E");
        }

        .diana-cinematic-loading-stage {
          display: grid;
          min-height: calc(100dvh - 62px);
          place-items: center;
          padding: 64px 24px;
        }

        .diana-cinematic-loading-console {
          display: grid;
          justify-items: center;
          width: min(100%, 520px);
          padding: 28px;
          text-align: center;
        }

        .diana-cinematic-loading-logo {
          width: clamp(178px, 19vw, 270px) !important;
          height: auto !important;
          margin-bottom: 22px !important;
          filter: drop-shadow(0 8px 24px rgb(0 0 0 / .32));
        }

        .diana-cinematic-loading-label {
          max-width: 30ch;
          margin: 0;
          color: #fff !important;
          font-size: clamp(18px, 2vw, 24px);
          font-weight: 600;
          line-height: 1.35;
          text-shadow: 0 2px 16px rgb(0 0 0 / .72);
        }

        .diana-cinematic-loading-progress {
          display: grid;
          width: min(100%, 310px);
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 10px;
          margin-top: 26px;
        }

        .diana-cinematic-loading-progress-track {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: rgb(255 255 255 / .3);
        }

        .diana-cinematic-loading-progress-track span {
          display: block;
          width: 0;
          height: 100%;
          border-radius: inherit;
          background: var(--loading-yellow);
          animation: loading-progress-forward 3.6s linear forwards;
          will-change: width;
        }

        .diana-cinematic-loading-progress small {
          color: rgb(255 255 255 / .92) !important;
          font-size: 12px;
          font-weight: 600;
          text-shadow: 0 2px 16px rgb(0 0 0 / .72);
        }

        /* The loading page has no header, but its frame shares Today's visible desktop bounds. */
        @media (min-width: 901px) {
          .diana-cinematic-loading-main {
            height: calc(100dvh - 106px);
            min-height: calc(100dvh - 106px);
            margin: 94px auto 24px;
          }

          .diana-cinematic-loading-stage {
            min-height: 100%;
          }
        }

        @keyframes loading-progress-forward {
          from { width: 0; }
          to { width: 90%; }
        }

        @media (max-width: 900px) {
          .diana-cinematic-loading-main {
            width: calc(100% - 24px);
            min-height: calc(100dvh - 36px);
            margin: 18px auto;
            border-width: 5px;
            border-radius: 20px;
            clip-path: none;
          }

          .diana-cinematic-loading-notch { display: none; }

          .diana-cinematic-loading-stage {
            min-height: calc(100dvh - 46px);
            padding: 38px 18px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .diana-cinematic-loading * { animation: none !important; }
          .diana-cinematic-loading-progress-track span { width: 68%; }
        }
      `}</style>
      <main className="diana-cinematic-loading-main">
        <span className="diana-cinematic-loading-notch diana-cinematic-loading-notch--top" aria-hidden="true" />
        <span className="diana-cinematic-loading-notch diana-cinematic-loading-notch--bottom" aria-hidden="true" />
        <div className="diana-cinematic-loading-stage">
          <section className="diana-cinematic-loading-console" role="status" aria-live="polite" aria-atomic="true">
            <DianaWordmark tight tone="light" className="diana-cinematic-loading-logo" />
            <p className="diana-cinematic-loading-label">{label}</p>
            <div className="diana-cinematic-loading-progress" aria-hidden="true">
              <div className="diana-cinematic-loading-progress-track"><span /></div>
              <small>Loading</small>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
