import Link from "next/link";

import { LobbyAudioNote } from "./dashboard/lobby-audio-note";
import { MoreMenu } from "./more-menu";
import { MobileTabBar } from "./mobile-tab-bar";

const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";

export type NavLabel = "Today" | "Work" | "Classes" | "Calendar" | "More";

// 4-tab model (Model A): classes live on the Today landing's class grid, so
// there is no standalone Classes tab — tapping a class on Today opens its hub.
// Today/Work/Calendar are direct links; More opens an overlay drawer (MoreMenu)
// holding every secondary destination.
const NAV_TABS: { label: NavLabel; href: string }[] = [
  { label: "Today", href: "/dashboard" },
  { label: "Work", href: "/assignments" },
  { label: "Calendar", href: "/calendar" },
];

/**
 * Shared application top navigation, extracted verbatim from the Student Lobby
 * hero so the dashboard, /assignments, and future real pages all share one nav.
 * `active` marks the current tab. The Record button keeps its exact
 * LobbyAudioNote wiring — do not change that logic.
 */
export function AppTopNav({ active }: { active: NavLabel }) {
  return (
    <>
      <style>{`
        .gl-tab:hover{color:#fff !important;}
        .gl-capture{transition:transform 160ms cubic-bezier(.23,1,.32,1),background .2s;}
        @media (hover:hover){.gl-capture:hover{background:rgba(41,208,255,.22);}}
        .gl-capture:active{transform:scale(.97);}
        @media (max-width: 900px) {
          .gl-nav-tabs { display: none !important; }
          .gl-nav-extra { display: none !important; }
        }
      `}</style>

      {/* TOP NAV */}
      <div
        style={{
          position: "relative",
          zIndex: 30,
          maxWidth: "var(--layout-max-width)",
          margin: "0 auto",
          height: 58,
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "0 22px",
          background: "rgba(2,5,14,.72)",
          borderBottom: "1px solid rgba(41,208,255,.18)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <div aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(120,150,220,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#aab8e0" }}>▦</div>
          <div aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(120,150,220,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#aab8e0" }}>⌕</div>
        </div>

        <div className="gl-nav-tabs" style={{ display: "flex", alignItems: "center", gap: 26, marginLeft: 6, fontFamily: SF, fontWeight: 700, fontSize: 18, letterSpacing: ".06em", textTransform: "uppercase" }}>
          {NAV_TABS.map(({ label, href }) => {
            const isActive = label === active;
            return (
              <Link
                key={label}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={isActive ? undefined : "gl-tab"}
                style={{ position: "relative", color: isActive ? "#fff" : "#8b96bd", textDecoration: "none", padding: isActive ? "18px 2px" : "0 2px" }}
              >
                {isActive && <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "#29d0ff", borderRadius: 2 }} />}
                {label}
              </Link>
            );
          })}
          <MoreMenu active={active === "More"} />
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            href="/quick-add"
            className="gl-capture"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, background: "rgba(41,208,255,.14)", border: "1px solid rgba(41,208,255,.28)", textDecoration: "none", fontFamily: SF, fontWeight: 800, fontSize: 16, letterSpacing: ".06em", textTransform: "uppercase", color: "#29d0ff" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            Capture
          </Link>

          <LobbyAudioNote />

          {/* Player avatar placeholder */}
          <div className="gl-nav-extra" aria-hidden="true" style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid rgba(41,208,255,.38)", flexShrink: 0, background: "rgba(120,150,220,.12)" }} />

          {/* Settings gear */}
          <Link className="gl-nav-extra" href="/settings" aria-label="Settings" style={{ width: 38, height: 38, borderRadius: 8, background: "rgba(120,150,220,.12)", border: "1px solid rgba(120,150,220,.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aab8e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </Link>
        </div>
      </div>

      {/* Mobile-only bottom tab bar (top tabs are hidden under 900px) */}
      <MobileTabBar active={active} />
    </>
  );
}
