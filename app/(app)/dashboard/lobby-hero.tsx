import Link from "next/link";

import { LobbyAudioNote } from "./lobby-audio-note";
import { QuestCarousel, type QuestItem } from "./quest-carousel";

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
  quests: QuestItem[];
  gameDay: GameDay | null;
  focusHref: string;
};

const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";
const BF = "var(--font-barlow), 'Barlow Semi Condensed', sans-serif";

export function LobbyHero({
  studentName,
  weekNumber,
  weekDone,
  weekTotal,
  quests,
  gameDay,
  focusHref,
}: LobbyHeroProps) {
  const xpPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;
  const displayName = studentName.toUpperCase();

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#0a1024",
        fontFamily: BF,
        color: "#fff",
      }}
    >
      <style>{`
        @keyframes gl-pulse {
          0%,100% { opacity:.55; transform:translateX(-50%) scale(1) }
          50%      { opacity:.95; transform:translateX(-50%) scale(1.06) }
        }
        @keyframes gl-spin { to { transform: rotate(360deg) } }
        @keyframes gl-mic-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,55,55,.55) }
          65%      { box-shadow: 0 0 0 16px rgba(255,55,55,0) }
        }
        .gl-tab:hover { color: #fff !important; }
        .gl-lobby-cta:hover { filter: brightness(1.1); }
        @media (max-width: 767px) {
          .gl-nav-tabs { display: none !important; }
          .gl-hero-content { height: 440px !important; }
          .gl-hero-name { font-size: 56px !important; }
          .gl-game-day { display: none !important; }
          .gl-platform-glow { width: 240px !important; }
          .gl-platform-ring { width: 200px !important; }
          .gl-char { width: 260px !important; height: 380px !important; }
          .gl-week-badge { right: 12px !important; bottom: 20px !important; }
          .gl-week-badge-circle { width: 72px !important; height: 72px !important; }
          .gl-week-num { font-size: 32px !important; }
          .gl-xp-bar { width: 160px !important; }
          .gl-title-area { left: 16px !important; top: 100px !important; }
        }
      `}</style>

      {/* ── Background image ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/stadium-bg.jpg"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: 718,
          objectFit: "cover",
          objectPosition: "center top",
          zIndex: 0,
        }}
      />

      {/* ── Cinematic gradient overlay ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          height: 718,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(900px 560px at 50% 100%,rgba(41,208,255,.28),transparent 62%)," +
            "radial-gradient(720px 400px at 16% 6%,rgba(126,92,255,.22),transparent 60%)," +
            "radial-gradient(720px 400px at 86% 8%,rgba(255,120,60,.16),transparent 60%)," +
            "linear-gradient(180deg,rgba(10,16,36,.78) 0%,rgba(13,24,56,.62) 48%,rgba(11,42,51,.65) 76%,rgba(10,58,38,.72) 100%)",
        }}
      />

      {/* ══════════════════════════════════════════
          TOP NAV — floats over the background
          ══════════════════════════════════════════ */}
      <nav
        style={{
          position: "relative",
          zIndex: 30,
          maxWidth: 1440,
          margin: "0 auto",
          height: 58,
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "0 22px",
          background: "linear-gradient(180deg,rgba(6,9,20,.55),rgba(6,9,20,.18))",
          borderBottom: "1px solid rgba(120,150,220,.08)",
          backdropFilter: "blur(6px)",
        }}
      >
        {/* Grid + search icons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "rgba(120,150,220,.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              color: "#aab8e0",
            }}
            aria-hidden="true"
          >
            ▦
          </div>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "rgba(120,150,220,.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: "#aab8e0",
            }}
            aria-hidden="true"
          >
            ⌕
          </div>
        </div>

        {/* Tab row — desktop only */}
        <div
          className="gl-nav-tabs"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 26,
            marginLeft: 6,
            fontFamily: SF,
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: ".06em",
            textTransform: "uppercase",
          }}
        >
          {[
            { label: "Today", href: "/dashboard", active: true },
            { label: "Work", href: "/dashboard/work", active: false },
            { label: "Think", href: "/study-buddy", active: false },
            { label: "Proof", href: "/proof", active: false },
            { label: "Future", href: "/future-path", active: false },
            { label: "More", href: "/settings", active: false },
          ].map(({ label, href, active }) => (
            <Link
              key={label}
              href={href}
              className={active ? undefined : "gl-tab"}
              style={{
                position: "relative",
                color: active ? "#fff" : "#8b96bd",
                textDecoration: "none",
                padding: active ? "18px 2px" : "0 2px",
              }}
            >
              {active && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 3,
                    background: "#29d0ff",
                    borderRadius: 2,
                  }}
                />
              )}
              {label}
            </Link>
          ))}
        </div>

        {/* Right cluster */}
        <div
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}
        >
          <Link
            href="/quick-add"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 8,
              background: "rgba(41,208,255,.14)",
              border: "1px solid rgba(41,208,255,.28)",
              textDecoration: "none",
              fontFamily: SF,
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: "#29d0ff",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Capture
          </Link>

          <LobbyAudioNote />
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          HERO CONTENT AREA
          ══════════════════════════════════════════ */}
      <div
        className="gl-hero-content"
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1440,
          margin: "0 auto",
          height: 660,
        }}
      >
        {/* Stadium light flares */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -60,
            left: "8%",
            width: 2,
            height: 240,
            background: "linear-gradient(180deg,rgba(180,210,255,.5),transparent)",
            transform: "rotate(14deg)",
            filter: "blur(1px)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -60,
            right: "10%",
            width: 2,
            height: 260,
            background: "linear-gradient(180deg,rgba(255,200,160,.45),transparent)",
            transform: "rotate(-14deg)",
            filter: "blur(1px)",
          }}
        />
        {/* Field band */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 120,
            background: "linear-gradient(180deg,transparent,rgba(20,120,70,.35))",
          }}
        />

        {/* Glowing platform */}
        <div
          aria-hidden="true"
          className="gl-platform-glow"
          style={{
            position: "absolute",
            left: "50%",
            bottom: 64,
            width: 380,
            height: 92,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center,rgba(41,208,255,.85),rgba(41,208,255,.18) 55%,transparent 72%)",
            filter: "blur(6px)",
            animation: "gl-pulse 3.4s ease-in-out infinite",
          }}
        />
        <div
          aria-hidden="true"
          className="gl-platform-ring"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 96,
            width: 300,
            height: 30,
            borderRadius: "50%",
            border: "2px solid rgba(150,235,255,.6)",
            boxShadow: "0 0 30px rgba(41,208,255,.6)",
          }}
        />

        {/* Character photo slot */}
        <div
          className="gl-char"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 124,
            width: 380,
            height: 540,
            zIndex: 5,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            background: "transparent",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          {/* Placeholder gradient silhouette — replaced by actual photo in Settings */}
          <div
            style={{
              width: "60%",
              height: "80%",
              background:
                "linear-gradient(180deg,rgba(41,208,255,.06) 0%,rgba(41,208,255,.14) 100%)",
              borderRadius: "50% 50% 0 0",
              filter: "blur(2px)",
            }}
          />
        </div>

        {/* Game Day tile — top right */}
        {gameDay && (
          <div
            className="gl-game-day"
            style={{ position: "absolute", right: 34, top: 30, width: 288, zIndex: 8 }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: "6px 6px 0 0",
                background: "linear-gradient(90deg,#ff6a3d,#ff3d6a)",
                fontFamily: SF,
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: ".12em",
              }}
            >
              ★ GAME DAY
            </div>
            <div
              style={{
                position: "relative",
                borderRadius: "0 12px 12px 12px",
                overflow: "hidden",
                border: "1px solid rgba(255,150,90,.35)",
                boxShadow: "0 14px 36px rgba(0,0,0,.5)",
                display: "flex",
                alignItems: "stretch",
                height: 128,
                background: "rgba(8,12,26,.96)",
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: "14px 14px 12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    fontFamily: SF,
                    fontStyle: "italic",
                    fontWeight: 800,
                    fontSize: 30,
                    lineHeight: 0.92,
                    textTransform: "uppercase",
                  }}
                >
                  {gameDay.title}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 6,
                    fontWeight: 600,
                    fontSize: 13,
                    color: "#cdd6f2",
                  }}
                >
                  <span style={{ color: "#ffd24a" }}>{gameDay.time}</span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{gameDay.opponent}</span>
                </div>
              </div>
              <div
                style={{
                  width: 112,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(8,12,26,.7)",
                  fontSize: 40,
                }}
              >
                🏈
              </div>
            </div>
          </div>
        )}

        {/* Title + CTA — mid left */}
        <div
          className="gl-title-area"
          style={{ position: "absolute", left: 34, top: 130, zIndex: 8 }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: ".34em",
              color: "#8fa6d8",
              textTransform: "uppercase",
              marginBottom: -6,
            }}
          >
            Your Lobby
          </div>
          <div
            className="gl-hero-name"
            style={{
              fontFamily: SF,
              fontStyle: "italic",
              fontWeight: 800,
              fontSize: 88,
              lineHeight: 0.86,
              letterSpacing: ".01em",
              textTransform: "uppercase",
              textShadow: "0 6px 30px rgba(41,208,255,.35)",
            }}
          >
            {displayName}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
            <Link
              href={focusHref}
              className="gl-lobby-cta"
              style={{
                transform: "skewX(-10deg)",
                background: "linear-gradient(180deg,#36e07a,#16a34a)",
                padding: "14px 26px",
                borderRadius: 6,
                boxShadow: "0 10px 26px rgba(34,180,90,.4)",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              <div
                style={{
                  transform: "skewX(10deg)",
                  fontFamily: SF,
                  fontWeight: 800,
                  fontSize: 21,
                  letterSpacing: ".05em",
                  textTransform: "uppercase",
                  color: "#06210f",
                }}
              >
                ▶ Start Next Mission
              </div>
            </Link>
            <Link
              href="/study-buddy"
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: "#8fa6d8",
                textDecoration: "none",
                borderBottom: "1px dashed rgba(143,166,216,.5)",
                paddingBottom: 1,
              }}
            >
              Stuck? Get a hint
            </Link>
          </div>
        </div>

        {/* Quest carousel — bottom left */}
        <QuestCarousel quests={quests} />

        {/* Week badge + XP bar — bottom right */}
        <div
          className="gl-week-badge"
          style={{
            position: "absolute",
            right: 34,
            bottom: 54,
            zIndex: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 12,
          }}
        >
          {/* Spinning ring badge */}
          <div
            className="gl-week-badge-circle"
            style={{ position: "relative", width: 96, height: 96 }}
            aria-label={`Week ${weekNumber}`}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: "50%",
                background: "conic-gradient(from 0deg,#29d0ff,#7e5cff,#ffd24a,#29d0ff)",
                animation: "gl-spin 8s linear infinite",
                filter: "blur(.5px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 3,
                borderRadius: "50%",
                background: "radial-gradient(circle at 38% 30%,#16203f,#0a1226)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{ fontWeight: 700, fontSize: 11, letterSpacing: ".18em", color: "#9fb0dd" }}
              >
                WEEK
              </div>
              <div
                className="gl-week-num"
                style={{
                  fontFamily: SF,
                  fontWeight: 800,
                  fontStyle: "italic",
                  fontSize: 44,
                  lineHeight: 0.8,
                  color: "#fff",
                }}
              >
                {weekNumber}
              </div>
            </div>
          </div>

          {/* XP bar */}
          {weekTotal > 0 && (
            <div className="gl-xp-bar" style={{ width: 220 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#9fb0dd",
                  marginBottom: 5,
                }}
              >
                <span>
                  COMPLETE WEEK {weekNumber} → WEEK {weekNumber + 1}
                </span>
                <span style={{ color: "#ffd24a" }}>
                  {weekDone} / {weekTotal} done
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 5,
                  background: "rgba(120,150,220,.18)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${xpPct}%`,
                    height: "100%",
                    borderRadius: 5,
                    background: "linear-gradient(90deg,#29d0ff,#7e5cff)",
                    transition: "width .6s ease",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
