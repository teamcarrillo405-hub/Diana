import { ScreenDesignViewport } from "./screen-design-viewport";
import { SourceMedia } from "./source-media";

interface SmartLoadingProps {
  readonly label: string;
}

export function SmartLoading({ label }: SmartLoadingProps) {
  return (
    <ScreenDesignViewport className="sd-smart-loading" aria-label="Diana loading screen">
      <style>{`
        .diana-app-shell:has(.sd-smart-loading) .agent-fab-anchor,
        .app-command-frame:has(.sd-smart-loading) .diana-mobile-command {
          display: none !important;
        }

        .app-command-frame:has(.sd-smart-loading) {
          padding: 0 !important;
        }

        .sd-smart-loading {
          display: flex;
          min-height: max(100dvh, 852px);
          flex-direction: column;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 31%, rgb(116 192 255 / 0.08), transparent 31%),
            #0f172a;
          color: #f8fafc;
          font-family: var(--font-body, Arial, sans-serif);
        }

        .sd-smart-loading-header {
          display: flex;
          min-height: 92px;
          align-items: flex-start;
          justify-content: center;
          padding-top: 55px;
        }

        .sd-smart-loading-logo {
          width: 64px;
          height: auto;
        }

        .sd-smart-loading-main {
          display: flex;
          flex: 1;
          flex-direction: column;
          align-items: center;
          padding: 16px 26px 35px;
          text-align: center;
        }

        .sd-smart-loading-orbit {
          position: relative;
          display: grid;
          width: 192px;
          height: 192px;
          flex: 0 0 auto;
          place-items: center;
          margin-bottom: 40px;
        }

        .sd-smart-loading-orbit::after {
          position: absolute;
          width: 116px;
          height: 116px;
          border: 1px solid rgb(116 192 255 / 0.15);
          border-radius: 999px;
          background: rgb(15 23 42 / 0.72);
          box-shadow: inset 0 0 28px rgb(116 192 255 / 0.05);
          content: "";
        }

        .sd-smart-loading-ring {
          width: 192px;
          height: 192px;
          transform-origin: center;
          animation: sd-smart-loading-orbit 2.4s linear infinite;
        }

        .sd-smart-loading-mark {
          position: absolute;
          z-index: 1;
          width: 42px;
          height: 42px;
          color: #f8fafc;
          filter: drop-shadow(0 0 12px rgb(255 121 218 / 0.28));
        }

        .sd-smart-loading-fact-label,
        .sd-smart-loading-tip-label {
          margin: 0;
          color: #ff79da;
          font-size: 0.68rem;
          font-weight: 900;
          letter-spacing: 0.19em;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .sd-smart-loading-fact {
          max-width: 295px;
          margin: 12px 0 0;
          color: #f8fafc;
          font-size: 1.16rem;
          font-weight: 800;
          line-height: 1.45;
        }

        .sd-smart-loading-tip {
          width: 100%;
          margin-top: 64px;
        }

        .sd-smart-loading-tip-label {
          color: #74c0ff;
        }

        .sd-smart-loading-tip-card {
          margin-top: 13px;
          border: 1px solid rgb(255 255 255 / 0.1);
          border-radius: 14px;
          background: rgb(255 255 255 / 0.05);
          padding: 18px 20px;
          color: #cbd5e1;
          font-size: 0.82rem;
          font-weight: 600;
          line-height: 1.55;
          backdrop-filter: blur(12px);
        }

        .sd-smart-loading-status {
          margin: auto 0 0;
          padding-top: 32px;
          color: #94a3b8;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          line-height: 1.4;
          text-transform: uppercase;
        }

        @keyframes sd-smart-loading-orbit {
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .sd-smart-loading-ring {
            animation: none;
          }
        }
      `}</style>

      <header className="sd-smart-loading-header">
        <SourceMedia
          assetId="diana-logo"
          width={1440}
          height={440}
          alt="Diana"
          className="sd-smart-loading-logo"
          priority
        />
      </header>

      <main className="sd-smart-loading-main">
        <div className="sd-smart-loading-orbit" aria-hidden="true">
          <svg className="sd-smart-loading-ring" viewBox="0 0 192 192">
            <defs>
              <linearGradient id="sd-smart-loading-gradient" x1="32" y1="28" x2="166" y2="164">
                <stop offset="0" stopColor="#74c0ff" />
                <stop offset="0.5" stopColor="#ff79da" />
                <stop offset="1" stopColor="#2dd4bf" />
              </linearGradient>
            </defs>
            <circle cx="96" cy="96" r="68" fill="none" stroke="#1e293b" strokeWidth="6" />
            <circle
              cx="96"
              cy="96"
              r="68"
              fill="none"
              stroke="url(#sd-smart-loading-gradient)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle cx="96" cy="28" r="5" fill="#f8fafc" />
          </svg>
          <svg className="sd-smart-loading-mark" viewBox="0 0 42 42">
            <path
              d="M21 3.5c1.5 9.7 7.1 15.3 16.8 17.5C28.1 23.2 22.5 28.8 21 38.5 19.5 28.8 13.9 23.2 4.2 21 13.9 18.8 19.5 13.2 21 3.5Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <p className="sd-smart-loading-fact-label">Did You Know?</p>
        <h1 className="sd-smart-loading-fact">Humans share 50% of DNA with bananas</h1>

        <section className="sd-smart-loading-tip" aria-labelledby="sd-smart-loading-tip-title">
          <h2 id="sd-smart-loading-tip-title" className="sd-smart-loading-tip-label">
            Pro Study Tip
          </h2>
          <p className="sd-smart-loading-tip-card">
            Hydrate like you are in the 4th quarter. Brain tissue is 75% water. Staying
            fueled helps keep your recall sharp.
          </p>
        </section>

        <p
          className="sd-smart-loading-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {label}
        </p>
      </main>
    </ScreenDesignViewport>
  );
}
