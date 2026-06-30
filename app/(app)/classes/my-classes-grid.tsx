import Link from "next/link";
import type { CSSProperties } from "react";
import { Clock } from "lucide-react";

const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";
const BODY = "var(--font-body)";

export type CtaVariant = "cyanFilled" | "redFilled" | "goldFilled" | "cyanOutline" | "dark";

export type ClassCardModel = {
  id: string;
  name: string;
  statusLabel: string;
  statusTone: "cyan" | "muted";
  isNow: boolean;
  eventPill: string | null;
  taskTitle: string | null;
  taskBadge: { text: string; tone: "neutral" | "overdue" | "done" } | null;
  doneBar: boolean;
  timeLabel: string | null;
  progressPct: number;
  cta: { label: string; href: string; variant: CtaVariant };
  quiz: { label: string; flashcardsHref: string; quizHref: string } | null;
  href: string;
};

function ctaStyle(variant: CtaVariant): CSSProperties {
  const base: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: "14px 16px",
    borderRadius: 10,
    fontFamily: SF,
    fontWeight: 800,
    fontSize: 16,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    textDecoration: "none",
    border: "1px solid transparent",
  };
  switch (variant) {
    case "cyanFilled":
      return { ...base, background: "#29d0ff", color: "#04080f", boxShadow: "0 0 22px rgba(41,208,255,.28)" };
    case "redFilled":
      return { ...base, background: "linear-gradient(180deg,#f2553f,#e0392b)", color: "#2a0606", boxShadow: "0 0 22px rgba(240,68,56,.30)" };
    case "goldFilled":
      return { ...base, background: "linear-gradient(180deg,#ffd86a,#f5b301)", color: "#3a2600", boxShadow: "0 0 24px rgba(255,210,74,.40)" };
    case "cyanOutline":
      return { ...base, background: "transparent", color: "#29d0ff", border: "1.5px solid rgba(41,208,255,.55)" };
    case "dark":
      return { ...base, background: "rgba(120,150,220,.10)", color: "var(--gl-text-muted)", border: "1px solid var(--gl-border-neutral)" };
  }
}

function TaskBadge({ badge }: { badge: NonNullable<ClassCardModel["taskBadge"]> }) {
  const tone =
    badge.tone === "overdue"
      ? { bg: "rgba(240,68,56,.16)", color: "#ff6b6b" }
      : { bg: "rgba(120,150,220,.14)", color: "var(--gl-text-muted)" };
  return (
    <span style={{ flexShrink: 0, borderRadius: 6, background: tone.bg, color: tone.color, padding: "3px 9px", fontFamily: BODY, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {badge.text}
    </span>
  );
}

function ClassCardView({ card }: { card: ClassCardModel }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        borderRadius: 16,
        border: card.isNow ? "1.5px solid #29d0ff" : "1px solid var(--gl-border-neutral)",
        background: "var(--gl-bg-card)",
        boxShadow: card.isNow ? "0 0 0 1px rgba(41,208,255,.35), 0 0 34px rgba(41,208,255,.16)" : "none",
        padding: 22,
      }}
    >
      {/* Status eyebrow + optional NOW badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontFamily: BODY, fontSize: 11, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: card.statusTone === "cyan" ? "#29d0ff" : "var(--gl-text-muted)" }}>
          {card.statusLabel}
        </span>
        {card.isNow && (
          <span style={{ flexShrink: 0, borderRadius: 6, background: "rgba(41,208,255,.16)", border: "1px solid rgba(41,208,255,.5)", color: "#29d0ff", padding: "2px 8px", fontFamily: BODY, fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
            Now
          </span>
        )}
      </div>

      {/* Class name */}
      <Link href={card.href} style={{ textDecoration: "none" }}>
        <h2 style={{ margin: 0, fontFamily: SF, fontWeight: 800, fontSize: 40, lineHeight: 1, letterSpacing: ".01em", textTransform: "uppercase", color: "var(--gl-text-primary)" }}>
          {card.name}
        </h2>
      </Link>

      {/* Optional event pill (e.g. a game) */}
      {card.eventPill && (
        <span style={{ alignSelf: "flex-start", borderRadius: 6, border: "1px solid rgba(240,68,56,.5)", background: "rgba(240,68,56,.10)", color: "#ff6b6b", padding: "5px 10px", fontFamily: BODY, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>
          {card.eventPill}
        </span>
      )}

      {/* Task row */}
      {card.taskTitle && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderRadius: 9, border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-base)", padding: "12px 14px" }}>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: BODY, fontSize: 14, fontWeight: 500, color: "var(--gl-text-card-body, #e8f0ff)" }}>
            {card.taskTitle}
          </span>
          {card.taskBadge && <TaskBadge badge={card.taskBadge} />}
        </div>
      )}

      {/* "You're done" reassurance bar */}
      {card.doneBar && (
        <div style={{ borderRadius: 9, border: "1px solid rgba(255,210,74,.28)", background: "rgba(255,210,74,.10)", padding: "11px 14px", textAlign: "center", fontFamily: BODY, fontSize: 13, fontWeight: 700, color: "var(--gl-gold)" }}>
          You&apos;re done — one tap to submit
        </div>
      )}

      {/* Time + progress */}
      {(card.timeLabel || card.progressPct > 0) && (
        <div style={{ display: "grid", gap: 8 }}>
          {card.timeLabel && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: BODY, fontSize: 12, color: "var(--gl-text-muted)" }}>
              <Clock size={13} aria-hidden="true" />
              {card.timeLabel}
            </span>
          )}
          <div style={{ height: 3, borderRadius: 2, background: "rgba(120,150,220,.18)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, card.progressPct))}%`, borderRadius: 2, background: "#29d0ff" }} />
          </div>
        </div>
      )}

      {/* Primary CTA */}
      <Link href={card.cta.href} style={ctaStyle(card.cta.variant)}>
        {card.cta.label}
      </Link>

      {/* Optional quiz row */}
      {card.quiz && (
        <div style={{ display: "grid", gap: 10 }}>
          <span style={{ fontFamily: BODY, fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gl-text-muted)" }}>
            {card.quiz.label}
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Link href={card.quiz.flashcardsHref} style={{ ...ctaStyle("dark"), color: "#29d0ff", fontSize: 13 }}>Flashcards</Link>
            <Link href={card.quiz.quizHref} style={{ ...ctaStyle("dark"), color: "#29d0ff", fontSize: 13 }}>Quiz me</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function MyClassesGrid({
  cards,
  overdueCount,
  notTurnedInCount,
}: {
  cards: ClassCardModel[];
  overdueCount: number;
  notTurnedInCount: number;
}) {
  return (
    <section aria-label="My classes" style={{ display: "grid", gap: 22 }}>
      <style>{`
        .myc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
        @media (max-width: 1100px) { .myc-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 680px) { .myc-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontFamily: SF, fontWeight: 800, fontSize: 30, letterSpacing: ".02em", textTransform: "uppercase", color: "var(--gl-text-primary)" }}>
          My Classes
        </h1>
        {overdueCount > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 6, border: "1px solid rgba(240,68,56,.45)", background: "rgba(240,68,56,.10)", padding: "4px 10px", fontFamily: BODY, fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "#ff6b6b" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff6b6b" }} />
            {overdueCount} overdue
          </span>
        )}
        {notTurnedInCount > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 6, border: "1px solid var(--gl-gold-28)", background: "var(--gl-gold-12)", padding: "4px 10px", fontFamily: BODY, fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--gl-gold)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gl-gold)" }} />
            {notTurnedInCount} not turned in
          </span>
        )}
      </div>

      {/* Card grid */}
      <div className="myc-grid">
        {cards.map((card) => (
          <ClassCardView key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
