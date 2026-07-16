import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";

export default function ProofLoading() {
  return (
    <ScreenDesignViewport className="sd-proof-loading" aria-label="Loading proof folder">
      <style>{`
        .diana-app-shell:has(.sd-proof-loading) .agent-fab-anchor,
        .app-command-frame:has(.sd-proof-loading) .diana-mobile-command { display: none !important; }
        .app-command-frame:has(.sd-proof-loading) { padding: 0 !important; }
        .diana-app:has(.sd-proof-loading) nextjs-portal { display: none !important; }
        .sd-proof-loading { min-height: max(100dvh, 852px); background: #0b1428; padding: 30px 22px; }
        .sd-proof-loading .sd-source-wordmark { height: 18px; }
        .sd-proof-loading-title { width: 12rem; height: 4.2rem; margin-top: 34px; }
        .sd-proof-loading-line { width: 17rem; height: .8rem; margin-top: 15px; }
        .sd-proof-loading-card { height: 72px; margin-top: 12px; border-radius: 16px; }
        .sd-proof-loading-title, .sd-proof-loading-line, .sd-proof-loading-card {
          background: linear-gradient(105deg, #151f35 25%, #1d2a45 42%, #151f35 58%);
          background-size: 220% 100%;
          animation: sd-proof-loading-pulse 1.4s ease-in-out infinite;
        }
        @keyframes sd-proof-loading-pulse { 0%, 100% { background-position: 100% 0; } 50% { background-position: 0 0; } }
        @media (prefers-reduced-motion: reduce) {
          .sd-proof-loading-title, .sd-proof-loading-line, .sd-proof-loading-card { animation: none; }
        }
      `}</style>
      <DianaWordmark />
      <div className="sd-proof-loading-title" aria-hidden="true" />
      <div className="sd-proof-loading-line" aria-hidden="true" />
      <div className="sd-proof-loading-card" aria-hidden="true" />
      <div className="sd-proof-loading-card" aria-hidden="true" />
      <div className="sd-proof-loading-card" aria-hidden="true" />
    </ScreenDesignViewport>
  );
}
