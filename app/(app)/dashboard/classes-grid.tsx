import Link from "next/link";

export type ClassCardData = {
  id: string;
  name: string;
  symbol: string;
  bannerBg: string;
  accent: string;
  active: boolean;
  needsAttention: boolean;
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

  const needsAttentionCount = classes.filter((c) => c.needsAttention).length;

  return (
    <div
      style={{
        position: "relative",
        background: "var(--gl-bg-base)",
        width: "100%",
        fontFamily: "var(--font-barlow), 'Barlow Semi Condensed', sans-serif",
        color: "#fff",
      }}
    >
      <style>{`
        @keyframes gl-needs-attention {
          0%,100% { box-shadow: 0 0 0 1.5px rgba(255,210,74,.75), 0 12px 36px rgba(0,0,0,.5); }
          55%      { box-shadow: 0 0 0 4px rgba(255,210,74,.15), 0 12px 36px rgba(0,0,0,.5); }
        }
        .gl-class-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 26px 56px rgba(0,0,0,.7) !important;
        }
      `}</style>

      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "24px 34px 48px" }}>
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
          {needsAttentionCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 11px",
                borderRadius: 6,
                background: "var(--gl-gold-12)",
                border: "1px solid var(--gl-gold-28)",
              }}
            >
              <div
                style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gl-gold)" }}
              />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: "var(--gl-gold)",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                }}
              >
                {needsAttentionCount} need attention
              </span>
            </div>
          )}
        </div>

        {/* Responsive class grid: 3 → 2 → 1 columns */}
        <style>{`
          .gl-classes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          @media (max-width: 1024px) { .gl-classes-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 640px) { .gl-classes-grid { grid-template-columns: 1fr; } }
          /* Emil: tactile cards — custom ease-out, hover lift gated for touch, press feedback */
          .gl-class-card { transition: transform 200ms cubic-bezier(.23,1,.32,1), box-shadow 200ms cubic-bezier(.23,1,.32,1); }
          @media (hover:hover) { .gl-class-card:hover { transform: translateY(-4px); } }
          .gl-class-card:active { transform: scale(.99); }
        `}</style>
        <div className="gl-classes-grid">
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
    ? "var(--gl-green-20)"
    : cls.needsAttention
      ? "var(--gl-gold-16)"
      : "var(--gl-bg-card)";
  const badgeFg = done ? "var(--gl-green)" : cls.needsAttention ? "var(--gl-gold)" : "var(--gl-text-muted)";
  const ctaBg = cls.active
    ? "linear-gradient(180deg,var(--gl-green),var(--gl-green-dark))"
    : done
      ? "var(--gl-green-12)"
      : "var(--gl-blue-12)";
  const ctaFg = cls.active ? "#06210f" : done ? "var(--gl-green)" : "var(--gl-text-secondary)";
  const ctaLabel = cls.active ? "OPEN NOW →" : done ? "REVIEW →" : "OPEN →";
  const ctaShadow = cls.active ? "var(--shadow-cta-green)" : "none";

  return (
    <Link
      href={cls.href}
      className="gl-class-card"
      style={{
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid var(--gl-blue-20)",
        animation: cls.needsAttention ? "gl-needs-attention 2s ease-in-out infinite" : "none",
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
              background: "var(--gl-cyan)",
              color: "var(--gl-text-on-cyan)",
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
          background: "var(--gradient-card-navy)",
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
          <div style={{ fontWeight: 500, fontSize: 12, color: "var(--gl-text-dim)", marginTop: 3 }}>
            {cls.period}
          </div>
        )}
        {cls.activeAssignment && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 11px",
              borderRadius: 8,
              background: "var(--gl-bg-card)",
              border: "1px solid var(--gl-blue-14)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--gl-text-secondary)",
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
            background: "var(--gl-blue-20)",
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
            color: "var(--gl-text-dim)",
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
