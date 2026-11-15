import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { DianaWordmark } from "./primitives";

type DianaRecoveryScreenProps = {
  eyebrow: string;
  title: string;
  message: string;
  backHref: string;
  backLabel: string;
  onRetry?: () => void;
};

export function DianaRecoveryScreen({
  eyebrow,
  title,
  message,
  backHref,
  backLabel,
  onRetry,
}: DianaRecoveryScreenProps) {
  return (
    <div className="diana-recovery-screen">
      <style>{`
        .diana-recovery-screen {
          min-height: 100dvh;
          display: grid;
          place-items: center;
          padding: clamp(16px, 3vw, 32px);
          background: #d6dad6 url("/images/diana-loading-empty-studio.png") center / cover fixed no-repeat;
          color: #fff;
          font-family: var(--font-lexend), Lexend, system-ui, sans-serif;
        }

        .diana-recovery-screen *,
        .diana-recovery-screen *::before,
        .diana-recovery-screen *::after { box-sizing: border-box; }

        .diana-recovery-screen__panel {
          width: min(100%, 520px);
          border: 1px solid rgb(255 255 255 / 0.42);
          border-radius: 8px;
          background: rgb(11 20 27 / 0.72);
          padding: clamp(26px, 5vw, 42px);
          text-align: center;
          box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.18), 0 20px 54px rgb(7 14 18 / 0.36);
          -webkit-backdrop-filter: blur(24px) saturate(1.08);
          backdrop-filter: blur(24px) saturate(1.08);
        }

        .diana-recovery-screen__brand {
          width: clamp(132px, 28vw, 184px) !important;
          height: auto !important;
          margin: 0 auto 28px !important;
          filter: drop-shadow(0 8px 18px rgb(0 0 0 / 0.34));
        }

        .diana-recovery-screen__eyebrow {
          margin: 0 0 10px;
          color: #cb9cff;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.3;
        }

        .diana-recovery-screen h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 700;
          letter-spacing: 0;
          line-height: 1.1;
        }

        .diana-recovery-screen__message {
          max-width: 34ch;
          margin: 14px auto 0;
          color: rgb(255 255 255 / 0.8);
          font-size: 15px;
          line-height: 1.55;
        }

        .diana-recovery-screen__actions {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 30px;
        }

        .diana-recovery-screen__action {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgb(255 255 255 / 0.38);
          border-radius: 7px;
          background: rgb(255 255 255 / 0.08);
          padding: 10px 14px;
          color: #fff;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.2;
          text-decoration: none;
          cursor: pointer;
        }

        .diana-recovery-screen__action--primary {
          border-color: #681ce0;
          background: linear-gradient(130deg, #8622ed, #681ce0);
          box-shadow: 0 6px 18px rgb(134 34 237 / 0.32);
        }

        .diana-recovery-screen__action:hover {
          border-color: rgb(255 255 255 / 0.72);
          background: rgb(255 255 255 / 0.16);
        }

        .diana-recovery-screen__action--primary:hover {
          border-color: #8622ed;
          background: linear-gradient(130deg, #9d4cf4, #8622ed);
        }

        .diana-recovery-screen__action:focus-visible {
          outline: 3px solid #cb9cff;
          outline-offset: 3px;
        }

        @media (max-width: 520px) {
          .diana-recovery-screen__actions { flex-direction: column; }
          .diana-recovery-screen__action { width: 100%; }
        }
      `}</style>
      <main id="main-content" className="diana-recovery-screen__panel" role="alert" aria-live="assertive">
        <DianaWordmark tight tone="light" className="diana-recovery-screen__brand" />
        <p className="diana-recovery-screen__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="diana-recovery-screen__message">{message}</p>
        <div className="diana-recovery-screen__actions">
          {onRetry ? (
            <button type="button" className="diana-recovery-screen__action diana-recovery-screen__action--primary" onClick={onRetry}>
              <RefreshCw size={17} aria-hidden="true" />
              Refresh page
            </button>
          ) : null}
          <Link className="diana-recovery-screen__action" href={backHref}>
            <ArrowLeft size={17} aria-hidden="true" />
            {backLabel}
          </Link>
        </div>
      </main>
    </div>
  );
}
