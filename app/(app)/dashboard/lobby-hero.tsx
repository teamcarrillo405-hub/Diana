import Link from "next/link";

import { AppTopNav } from "../app-top-nav";
import { PlayerPhotoSlot } from "./player-photo-slot";
import { LobbyBackgroundLayer } from "./lobby-background-layer";

export type NextMove = {
  className: string | null;
  title: string;
  estMin: number | null;
};

type LobbyHeroProps = {
  studentName: string;
  focusHref: string;
  photoUrl?: string | null;
  // Explicit ?energy= choice, or null when the student hasn't picked today.
  // Drives the ENERGY CHECK two-state widget (picker → confirmed) per the
  // Student Lobby design: showCheckin until a choice is made, then showFocus.
  selectedEnergy?: "low" | "medium" | "high" | null;
  nextMove: NextMove | null;
};

const ENERGY_META = {
  low: { label: "LOW", value: "Low", adapt: "Shortest tasks first — you've got this" },
  medium: { label: "OKAY", value: "Okay", adapt: "" },
  high: { label: "LOCKED IN", value: "Locked in", adapt: "Priority tasks first — locked in" },
} as const;

const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";
const BF = "var(--font-barlow), 'Barlow Semi Condensed', sans-serif";

export function LobbyHero({ studentName, focusHref, photoUrl = null, selectedEnergy = null, nextMove }: LobbyHeroProps) {
  const displayName = studentName.toUpperCase();
  const ctaLabel = nextMove?.className ? `▶ Start ${nextMove.className}` : "▶ Start Next Mission";
  const moveSub = nextMove
    ? [nextMove.className, nextMove.title].filter(Boolean).join(" · ")
    : "All caught up — nice work today";
  const finishBy = nextMove?.estMin ? `est. ${nextMove.estMin} min` : null;

  return (
    <div style={{ width: "100%", fontFamily: BF, color: "#fff" }}>
      <style>{`
        @keyframes gl-mic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,55,55,.55)}65%{box-shadow:0 0 0 16px rgba(255,55,55,0)}}
        .gl-tab:hover{color:#fff !important;}
        /* Emil: custom ease-out, hover gated for touch, press feedback on :active */
        .gl-lobby-cta{transition:transform 160ms cubic-bezier(.23,1,.32,1),box-shadow 240ms cubic-bezier(.23,1,.32,1);}
        @media (hover:hover){.gl-lobby-cta:hover{transform:translateY(-3px);box-shadow:0 0 50px rgba(41,208,255,.65),0 12px 32px rgba(0,0,0,.6);}}
        .gl-lobby-cta:active{transform:scale(.97);}
        .gl-capture{transition:transform 160ms cubic-bezier(.23,1,.32,1),background .2s;}
        @media (hover:hover){.gl-capture:hover{background:rgba(41,208,255,.22);}}
        .gl-capture:active{transform:scale(.97);}
        @media (hover:hover){.gl-energy-btn:hover{background:rgba(255,255,255,.17) !important;}}
        @media (hover:hover){.gl-energy-change:hover{background:rgba(120,150,220,.22) !important;}}
        /* Phones + small tablets: collapse the fixed-position hero into a stack. */
        @media (max-width: 900px) {
          .gl-nav-tabs { display: none !important; }
          .gl-nav-extra { display: none !important; }
          .gl-hero-bg { height: 100% !important; }
          .gl-hero-content {
            height: auto !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
            padding: 28px 16px 40px !important;
          }
          .gl-player { display: none !important; }
          .gl-title { position: static !important; left: auto !important; bottom: auto !important; order: 1; }
          .gl-energy { position: static !important; right: auto !important; bottom: auto !important; width: 100% !important; order: 2; }
          .gl-hero-name { font-size: 44px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gl-lobby-cta:hover { transform: none; }
        }
      `}</style>

      {/* ═══ HERO ZONE — nav + hero share one swappable background ═══ */}
      {/* Full-bleed breakout: span the viewport even inside a constrained shell. */}
      <div style={{ position: "relative", overflow: "hidden", background: "#0a1024", width: "100vw", marginLeft: "calc(50% - 50vw)" }}>

        {/* Hero background + tint — theme picked in Settings > Appearance */}
        <div className="gl-hero-bg" style={{ position: "absolute", inset: 0, width: "100%", height: 718, zIndex: 0 }}>
          <LobbyBackgroundLayer />
        </div>

        {/* TOP NAV — shared component (see app/(app)/app-top-nav.tsx) */}
        <AppTopNav active="Today" />

        {/* HERO ELEMENTS */}
        <div className="gl-hero-content" style={{ position: "relative", zIndex: 2, maxWidth: "var(--layout-max-width)", margin: "0 auto", height: 660 }}>

          {/* Player photo slot — shows the uploaded cutout, or the upload prompt. */}
          <PlayerPhotoSlot src={photoUrl} />

          {/* ENERGY CHECK (bottom-right) — each pill sets ?energy; the dashboard adapts and the active pill reflects current energy */}
          <div className="gl-energy" style={{ position: "absolute", right: 150, bottom: 120, width: 290, zIndex: 8, color: "#fff" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: "8px 8px 0 0", background: "transparent", border: "1px solid rgba(41,208,255,.28)", borderBottom: "none", fontFamily: SF, fontWeight: 800, fontSize: 14, letterSpacing: ".12em", color: "rgba(41,208,255,.95)", textShadow: "0 0 12px rgba(41,208,255,.4)" }}>ENERGY CHECK</div>
            <div style={{ position: "relative", borderRadius: "0 12px 12px 12px", border: "1px solid rgba(41,208,255,.22)", background: "transparent", minHeight: 128, padding: "18px 18px 16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span aria-hidden="true" style={{ position: "absolute", left: -1, top: -1, width: 12, height: 12, borderLeft: "2px solid rgba(41,208,255,.8)", borderTop: "2px solid rgba(41,208,255,.8)", borderRadius: "2px 0 0 0" }} />
              <span aria-hidden="true" style={{ position: "absolute", right: -1, top: -1, width: 12, height: 12, borderRight: "2px solid rgba(41,208,255,.8)", borderTop: "2px solid rgba(41,208,255,.8)", borderRadius: "0 2px 0 0" }} />
              <span aria-hidden="true" style={{ position: "absolute", left: -1, bottom: -1, width: 12, height: 12, borderLeft: "2px solid rgba(41,208,255,.8)", borderBottom: "2px solid rgba(41,208,255,.8)", borderRadius: "0 0 0 2px" }} />
              <span aria-hidden="true" style={{ position: "absolute", right: -1, bottom: -1, width: 12, height: 12, borderRight: "2px solid rgba(41,208,255,.8)", borderBottom: "2px solid rgba(41,208,255,.8)", borderRadius: "0 0 2px 0" }} />
              {!selectedEnergy ? (
                <>
                  <div style={{ fontFamily: SF, fontStyle: "italic", fontWeight: 800, fontSize: 26, lineHeight: ".95", textTransform: "uppercase", marginBottom: 5, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,.9)" }}>How&apos;s your energy?</div>
                  <div style={{ fontSize: 14, color: "rgba(210,228,255,.9)", marginBottom: 14, textShadow: "0 1px 8px rgba(0,0,0,.9)" }}>We&apos;ll match your study plan to your energy</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["low", "medium", "high"] as const).map((key) => (
                      <Link
                        key={key}
                        href={`/dashboard?energy=${key}`}
                        aria-label={`Set energy to ${ENERGY_META[key].label}`}
                        className="gl-energy-btn"
                        style={{
                          flex: 1,
                          padding: "13px 4px",
                          borderRadius: 10,
                          textAlign: "center",
                          textDecoration: "none",
                          fontFamily: SF,
                          fontWeight: 800,
                          fontSize: 15,
                          letterSpacing: ".06em",
                          whiteSpace: "nowrap",
                          background: "rgba(255,255,255,.09)",
                          border: "1.5px solid rgba(255,255,255,.22)",
                          color: "#eef2ff",
                        }}
                      >
                        {ENERGY_META[key].label}
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", color: "#9fb0dd", textTransform: "uppercase", marginBottom: 4 }}>Energy today</div>
                      <div style={{ fontFamily: SF, fontWeight: 800, fontStyle: "italic", fontSize: 32, lineHeight: ".9", textTransform: "uppercase", color: "#fff" }}>{ENERGY_META[selectedEnergy].value}</div>
                    </div>
                    <Link
                      href="/dashboard"
                      className="gl-energy-change"
                      style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(120,150,220,.14)", border: "1px solid rgba(120,150,220,.22)", textDecoration: "none", fontFamily: SF, fontWeight: 700, fontSize: 13, color: "#aab8e0", flexShrink: 0 }}
                    >
                      Change
                    </Link>
                  </div>
                  {ENERGY_META[selectedEnergy].adapt && (
                    <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(41,208,255,.06)", border: "1px solid rgba(41,208,255,.14)", fontSize: 12, fontWeight: 600, color: "rgba(200,218,255,.7)" }}>
                      {ENERGY_META[selectedEnergy].adapt}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Title + Next Move (mid-left) */}
          <div className="gl-title" style={{ position: "absolute", left: 34, bottom: 120, zIndex: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".3em", color: "rgba(41,208,255,.9)", textTransform: "uppercase", marginBottom: -4, fontFamily: BF, textShadow: "0 0 16px rgba(41,208,255,.55),0 2px 8px rgba(0,0,0,.9)" }}>YOUR LOBBY</div>
            <h1 className="gl-hero-name" style={{ margin: 0, fontFamily: SF, fontStyle: "italic", fontWeight: 800, fontSize: 72, lineHeight: ".88", letterSpacing: ".01em", textTransform: "uppercase", textShadow: "0 0 50px rgba(41,208,255,.65),0 2px 14px rgba(41,208,255,.35),0 8px 40px rgba(10,40,100,.9)" }}>{displayName}</h1>
            <div style={{ marginTop: 16, maxWidth: 390 }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".2em", color: "rgba(41,208,255,.9)", textTransform: "uppercase", marginBottom: 12, fontFamily: BF, textShadow: "0 0 14px rgba(41,208,255,.5),0 2px 6px rgba(0,0,0,.9)" }}>YOUR NEXT MOVE</div>
              <Link
                href={focusHref}
                className="gl-lobby-cta"
                style={{ background: "#29d0ff", padding: "22px 40px", borderRadius: 12, boxShadow: "0 0 32px rgba(41,208,255,.45),0 8px 28px rgba(0,0,0,.6)", display: "inline-flex", width: "fit-content", alignSelf: "flex-start", alignItems: "center", gap: 12, textDecoration: "none" }}
              >
                <span style={{ fontFamily: SF, fontWeight: 800, fontSize: 36, letterSpacing: ".04em", textTransform: "uppercase", color: "#04080f", whiteSpace: "nowrap" }}>{ctaLabel}</span>
              </Link>
              <div style={{ marginTop: 11, fontSize: 15, fontWeight: 600, color: "#eef2ff", textShadow: "0 1px 10px rgba(0,0,0,.95)" }}>{moveSub}</div>
              {finishBy && (
                <div style={{ marginTop: 6, display: "flex", gap: 5, alignItems: "center", fontSize: 14, fontWeight: 600, color: "#c0d0f0", textShadow: "0 1px 8px rgba(0,0,0,.95)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0d0f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  {finishBy}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
