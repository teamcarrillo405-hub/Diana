import Link from "next/link";

export type ClassCardData = {
  id: string;
  name: string;
  symbol: string;
  bannerBg: string;
  accent: string;
  active: boolean;
  overdue: boolean;
  allDone: boolean;
  pct: number;
  period: string;
  activeAssignment: string;
  dueBadge: string;
  href: string;
};

const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";

export function ClassesGrid({ classes }: { classes: ClassCardData[] }) {
  if (classes.length === 0) return null;

  const overdueCount = classes.filter((c) => c.overdue).length;

  return (
    <div
      style={{
        position: "relative",
        background: "linear-gradient(180deg,#080c1e,#04060f)",
        width: "100%",
        fontFamily: "var(--font-barlow), 'Barlow Semi Condensed', sans-serif",
        color: "#fff",
      }}
    >
      <style>{`
        @keyframes gl-overdue {
          0%,100% { box-shadow: 0 0 0 1.5px rgba(255,55,55,.8), 0 12px 36px rgba(0,0,0,.5); }
          55%      { box-shadow: 0 0 0 4px rgba(255,55,55,.15), 0 12px 36px rgba(0,0,0,.5); }
        }
        .gl-class-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 26px 56px rgba(0,0,0,.7) !important;
        }
      `}</style>

      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 34px 48px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div
            style={{
              fontFamily: SF,
              fontWeight: 800,
              fontStyle: "italic",
              fontSize: 26,
              letterSpacing: ".03em",
              textTransform: "uppercase",
            }}
          >
            My Classes
          </div>
          {overdueCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 11px",
                borderRadius: 6,
                background: "rgba(255,55,55,.14)",
                border: "1px solid rgba(255,55,55,.28)",
              }}
            >
              <div
                style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff5555" }}
              />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: "#ff7070",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                }}
              >
                {overdueCount} overdue
              </span>
            </div>
          )}
        </div>

        {/* 3-column grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {classes.map((cls) => (
            <ClassCard key={cls.id} cls={cls} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ClassCard({ cls }: { cls: ClassCardData }) {
  const done = cls.allDone;

  const badgeBg = done
    ? "rgba(54,224,122,.2)"
    : cls.overdue
      ? "rgba(255,55,55,.2)"
      : "rgba(8,12,26,.7)";
  const badgeFg = done ? "#36e07a" : cls.overdue ? "#ff7070" : "#aab8e0";
  const ctaBg = cls.active
    ? "linear-gradient(180deg,#36e07a,#16a34a)"
    : done
      ? "rgba(54,224,122,.12)"
      : "rgba(120,150,220,.12)";
  const ctaFg = cls.active ? "#06210f" : done ? "#36e07a" : "#cdd6f2";
  const ctaLabel = cls.active ? "OPEN NOW →" : done ? "REVIEW →" : "OPEN →";
  const ctaShadow = cls.active ? "0 6px 20px rgba(34,180,90,.35)" : "none";

  return (
    <Link
      href={cls.href}
      className="gl-class-card"
      style={{
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(120,150,220,.16)",
        animation: cls.overdue ? "gl-overdue 2s ease-in-out infinite" : "none",
        transition: "transform .2s, box-shadow .2s",
        textDecoration: "none",
        color: "#fff",
        display: "block",
      }}
    >
      {/* Banner */}
      <div
        style={{
          position: "relative",
          height: 160,
          background: cls.bannerBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Symbol watermark */}
        <div
          aria-hidden="true"
          style={{
            fontFamily: SF,
            fontStyle: "italic",
            fontWeight: 800,
            fontSize: 80,
            color: "rgba(255,255,255,.15)",
            userSelect: "none",
            letterSpacing: "-.02em",
          }}
        >
          {cls.symbol}
        </div>

        {/* Accent glow */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: -20,
            left: "50%",
            transform: "translateX(-50%)",
            width: 160,
            height: 80,
            borderRadius: "50%",
            background: cls.accent,
            opacity: 0.2,
            filter: "blur(24px)",
          }}
        />

        {/* Gradient overlay */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg,rgba(8,12,26,0) 40%,rgba(8,12,26,.8))",
          }}
        />

        {/* CURRENT badge */}
        {cls.active && (
          <div
            style={{
              position: "absolute",
              left: 10,
              top: 10,
              fontFamily: SF,
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: ".1em",
              padding: "3px 9px",
              borderRadius: 5,
              background: "#29d0ff",
              color: "#06243a",
            }}
          >
            CURRENT
          </div>
        )}

        {/* Due badge */}
        <div
          style={{
            position: "absolute",
            right: 10,
            top: 10,
            padding: "3px 9px",
            borderRadius: 5,
            fontFamily: SF,
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: ".06em",
            background: badgeBg,
            color: badgeFg,
          }}
        >
          {cls.dueBadge}
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          padding: "14px 16px 16px",
          background: "linear-gradient(180deg,rgba(16,22,46,.98),rgba(10,14,32,.98))",
        }}
      >
        <div
          style={{
            fontFamily: SF,
            fontWeight: 700,
            fontSize: 22,
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          {cls.name}
        </div>
        {cls.period && (
          <div style={{ fontWeight: 500, fontSize: 12, color: "#7d88ad", marginTop: 3 }}>
            {cls.period}
          </div>
        )}
        {cls.activeAssignment && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 11px",
              borderRadius: 8,
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(120,150,220,.14)",
              fontSize: 12,
              fontWeight: 600,
              color: "#cdd6f2",
            }}
          >
            📌 {cls.activeAssignment}
          </div>
        )}

        {/* Progress bar */}
        <div
          style={{
            height: 5,
            borderRadius: 4,
            background: "rgba(120,150,220,.18)",
            overflow: "hidden",
            marginTop: 12,
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 4,
              width: `${cls.pct}%`,
              background: cls.accent,
              transition: "width .6s ease",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 7,
            fontSize: 11,
            fontWeight: 600,
            color: "#7d88ad",
          }}
        >
          {cls.pct}% complete
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 12,
            padding: 11,
            borderRadius: 9,
            background: ctaBg,
            textAlign: "center",
            fontFamily: SF,
            fontWeight: 800,
            fontSize: 17,
            letterSpacing: ".05em",
            textTransform: "uppercase",
            color: ctaFg,
            boxShadow: ctaShadow,
          }}
        >
          {ctaLabel}
        </div>
      </div>
    </Link>
  );
}
