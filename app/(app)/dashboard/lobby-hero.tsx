import Link from "next/link";
import Image from "next/image";

import { AppTopNav } from "../app-top-nav";
import { PlayerPhotoSlot } from "./player-photo-slot";
import { type QuestItem } from "./quest-carousel";

export type GameDay = {
  title: string;
  time: string;
  opponent: string;
};

type LobbyHeroProps = {
  studentName: string;
  weekNumber: number;
  weekDone: number;
  weekTotal: number;
  // Accepted for compatibility with the dashboard page data flow; not rendered
  // in the Student Lobby handoff hero.
  quests?: QuestItem[];
  gameDay?: GameDay | null;
  focusHref: string;
  photoUrl?: string | null;
};

const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";
const BF = "var(--font-barlow), 'Barlow Semi Condensed', sans-serif";

export function LobbyHero({
  studentName,
  weekNumber,
  weekDone,
  weekTotal,
  focusHref,
  photoUrl = null,
}: LobbyHeroProps) {
  const xpPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;
  const displayName = studentName.toUpperCase();

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
          .gl-energy { position: static !important; right: auto !important; top: auto !important; width: 100% !important; order: 2; }
          .gl-xp { position: static !important; right: auto !important; bottom: auto !important; width: 100% !important; order: 3; }
          .gl-hero-name { font-size: 44px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gl-lobby-cta:hover { transform: none; }
        }
      `}</style>

      {/* ═══ HERO ZONE — nav + hero share one swappable background ═══ */}
      {/* Full-bleed breakout: span the viewport even inside a constrained shell. */}
      <div style={{ position: "relative", overflow: "hidden", background: "#0a1024", width: "100vw", marginLeft: "calc(50% - 50vw)" }}>

        {/* Hero background + tint */}
        <div className="gl-hero-bg" style={{ position: "absolute", inset: 0, width: "100%", height: 718, zIndex: 0, background: "#000" }}>
          <Image
            src="/stadium-bg.jpg"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.68)", zIndex: 1 }} />
        </div>

        {/* TOP NAV — shared component (see app/(app)/app-top-nav.tsx) */}
        <AppTopNav active="Today" />

        {/* HERO ELEMENTS */}
        <div className="gl-hero-content" style={{ position: "relative", zIndex: 2, maxWidth: "var(--layout-max-width)", margin: "0 auto", height: 660 }}>

          {/* Player photo slot — shows the uploaded cutout, or the upload prompt. */}
          <PlayerPhotoSlot src={photoUrl} />

          {/* ENERGY CHECK (top-right) — links to the THINK tab where energy is set */}
          <Link className="gl-energy" href="/dashboard/think" aria-label="Check in on your energy" style={{ position: "absolute", right: 34, top: 72, width: 320, zIndex: 8, textDecoration: "none", color: "#fff" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: "8px 8px 0 0", background: "transparent", border: "1px solid rgba(41,208,255,.28)", borderBottom: "none", fontFamily: SF, fontWeight: 800, fontSize: 14, letterSpacing: ".12em", color: "rgba(41,208,255,.95)", textShadow: "0 0 12px rgba(41,208,255,.4)" }}>ENERGY CHECK</div>
            <div style={{ position: "relative", borderRadius: "0 12px 12px 12px", border: "1px solid rgba(41,208,255,.22)", background: "transparent", minHeight: 128, padding: "18px 18px 16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span aria-hidden="true" style={{ position: "absolute", left: -1, top: -1, width: 12, height: 12, borderLeft: "2px solid rgba(41,208,255,.8)", borderTop: "2px solid rgba(41,208,255,.8)", borderRadius: "2px 0 0 0" }} />
              <span aria-hidden="true" style={{ position: "absolute", right: -1, top: -1, width: 12, height: 12, borderRight: "2px solid rgba(41,208,255,.8)", borderTop: "2px solid rgba(41,208,255,.8)", borderRadius: "0 2px 0 0" }} />
              <span aria-hidden="true" style={{ position: "absolute", left: -1, bottom: -1, width: 12, height: 12, borderLeft: "2px solid rgba(41,208,255,.8)", borderBottom: "2px solid rgba(41,208,255,.8)", borderRadius: "0 0 0 2px" }} />
              <span aria-hidden="true" style={{ position: "absolute", right: -1, bottom: -1, width: 12, height: 12, borderRight: "2px solid rgba(41,208,255,.8)", borderBottom: "2px solid rgba(41,208,255,.8)", borderRadius: "0 0 2px 0" }} />
              <div style={{ fontFamily: SF, fontStyle: "italic", fontWeight: 800, fontSize: 26, lineHeight: ".95", textTransform: "uppercase", marginBottom: 5, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,.9)" }}>How&apos;s your energy?</div>
              <div style={{ fontSize: 14, color: "rgba(210,228,255,.9)", marginBottom: 14, textShadow: "0 1px 8px rgba(0,0,0,.9)" }}>We&apos;ll match your study plan to your energy</div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, padding: "13px 0", borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.15)", textAlign: "center", fontFamily: SF, fontWeight: 800, fontSize: 16, letterSpacing: ".06em", color: "rgba(200,210,230,.7)" }}>LOW</div>
                <div style={{ flex: 1, padding: "13px 0", borderRadius: 10, background: "rgba(255,255,255,.1)", border: "1.5px solid rgba(255,255,255,.22)", textAlign: "center", fontFamily: SF, fontWeight: 800, fontSize: 16, letterSpacing: ".06em", color: "#fff" }}>OKAY</div>
                <div style={{ flex: 1, padding: "13px 6px", borderRadius: 10, background: "rgba(41,208,255,.15)", border: "1.5px solid rgba(41,208,255,.6)", textAlign: "center", fontFamily: SF, fontWeight: 800, fontSize: 15, letterSpacing: ".06em", color: "#29d0ff", boxShadow: "0 0 14px rgba(41,208,255,.2)", whiteSpace: "nowrap" }}>LOCKED IN</div>
              </div>
            </div>
          </Link>

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
                <span style={{ fontFamily: SF, fontWeight: 800, fontSize: "var(--text-28)", letterSpacing: ".04em", textTransform: "uppercase", color: "#04080f", whiteSpace: "nowrap" }}>▶ Start Next Mission</span>
              </Link>
            </div>
          </div>

          {/* WEEKLY XP (bottom-right) */}
          <div className="gl-xp" style={{ position: "absolute", right: 34, bottom: 44, width: 380, zIndex: 8 }}>
            <div style={{ position: "relative", padding: "16px 18px", display: "flex", background: "transparent", border: "1px solid rgba(41,208,255,.2)", borderRadius: 14 }}>
              <span aria-hidden="true" style={{ position: "absolute", left: -1, top: -1, width: 14, height: 14, borderLeft: "2px solid rgba(41,208,255,.8)", borderTop: "2px solid rgba(41,208,255,.8)", borderRadius: "2px 0 0 0" }} />
              <span aria-hidden="true" style={{ position: "absolute", right: -1, top: -1, width: 14, height: 14, borderRight: "2px solid rgba(41,208,255,.8)", borderTop: "2px solid rgba(41,208,255,.8)", borderRadius: "0 2px 0 0" }} />
              <span aria-hidden="true" style={{ position: "absolute", left: -1, bottom: -1, width: 14, height: 14, borderLeft: "2px solid rgba(41,208,255,.8)", borderBottom: "2px solid rgba(41,208,255,.8)", borderRadius: "0 0 0 2px" }} />
              <span aria-hidden="true" style={{ position: "absolute", right: -1, bottom: -1, width: 14, height: 14, borderRight: "2px solid rgba(41,208,255,.8)", borderBottom: "2px solid rgba(41,208,255,.8)", borderRadius: "0 0 2px 0" }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div style={{ fontFamily: SF, fontWeight: 800, fontSize: 18, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(41,208,255,.9)", textShadow: "0 0 12px rgba(41,208,255,.4)" }}>WEEKLY XP</div>
                  <div style={{ fontFamily: SF, fontWeight: 800, fontSize: 22, color: "#fff" }}>{weekDone} <span style={{ fontSize: 14, color: "rgba(255,255,255,.45)" }}>/ {weekTotal}</span></div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".2em", color: "rgba(41,208,255,.55)", textTransform: "uppercase", marginBottom: 10 }}>WEEK {weekNumber}</div>
                {/* XP tier dots */}
                <div style={{ position: "relative", height: 16, display: "flex", alignItems: "center", gap: 2, marginBottom: 8 }}>
                  <div style={{ position: "absolute", left: 0, right: 0, height: 3, borderRadius: 2, background: "rgba(120,150,220,.18)" }} />
                  <div style={{ position: "absolute", left: 0, width: `${xpPct}%`, height: 3, borderRadius: 2, background: "linear-gradient(90deg,#29d0ff,rgba(41,208,255,.5))" }} />
                  {Array.from({ length: Math.max(0, weekTotal) }).map((_, i) => {
                    const earned = i < weekDone;
                    return (
                      <div
                        key={i}
                        style={{
                          position: "relative",
                          zIndex: 2,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: earned ? "#29d0ff" : "rgba(120,150,220,.25)",
                          border: earned ? "1.5px solid rgba(41,208,255,.4)" : "1.5px solid rgba(120,150,220,.12)",
                          flexShrink: 0,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
