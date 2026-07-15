import Link from "next/link";
import { Clock } from "lucide-react";
import { StatusPill } from "./status-pill";

export type CtaVariant = "cyanFilled" | "goldFilled" | "cyanOutline" | "dark";

export type ClassCardModel = {
  id: string;
  name: string;
  statusLabel: string;
  statusTone: "cyan" | "muted";
  isNow: boolean;
  eventPill: string | null;
  taskTitle: string | null;
  taskBadge: { text: string; tone: "neutral" | "dueEarlier" | "done" } | null;
  doneBar: boolean;
  timeLabel: string | null;
  progressPct: number;
  cta: { label: string; href: string; variant: CtaVariant };
  quiz: { label: string; flashcardsHref: string; quizHref: string } | null;
  href: string;
};

function TaskBadge({ badge }: { badge: NonNullable<ClassCardModel["taskBadge"]> }) {
  const tone = badge.tone === "dueEarlier" ? "attention" : badge.tone === "done" ? "submitted" : "muted";
  return <StatusPill label={badge.text} tone={tone} showIcon={false} />;
}

function ClassCta({ href, label, variant }: ClassCardModel["cta"]) {
  return <Link className={`ds-class-card__cta ds-class-card__cta--${variant}`} href={href}>{label}</Link>;
}

export function ClassCard({ card }: { card: ClassCardModel }) {
  const progress = Math.max(0, Math.min(100, card.progressPct));
  return (
    <article className={`ds-class-card ${card.isNow ? "ds-class-card--current" : ""}`.trim()}>
      <header className="ds-class-card__header">
        <span className={`ds-class-card__eyebrow ds-class-card__eyebrow--${card.statusTone}`}>{card.statusLabel}</span>
        {card.isNow && <StatusPill label="Now" tone="current" showIcon={false} />}
      </header>

      <Link className="ds-class-card__title-link" href={card.href}>
        <h2>{card.name}</h2>
      </Link>

      {card.eventPill && <StatusPill label={card.eventPill} tone="attention" showIcon={false} className="ds-class-card__event" />}

      {card.taskTitle && (
        <div className="ds-class-card__task">
          <span>{card.taskTitle}</span>
          {card.taskBadge && <TaskBadge badge={card.taskBadge} />}
        </div>
      )}

      {card.doneBar && <div className="ds-class-card__done">You&apos;re done. One tap to submit.</div>}

      {(card.timeLabel || progress > 0) && (
        <div className="ds-class-card__progress-group">
          {card.timeLabel && <span className="ds-class-card__time"><Clock size={13} aria-hidden="true" />{card.timeLabel}</span>}
          <span className="ds-class-card__progress" aria-label={`${progress}% complete`}>
            <i style={{ width: `${progress}%` }} />
          </span>
        </div>
      )}

      <ClassCta {...card.cta} />

      {card.quiz && (
        <div className="ds-class-card__quiz">
          <span>{card.quiz.label}</span>
          <div>
            <Link className="ds-class-card__cta ds-class-card__cta--dark ds-class-card__cta--small" href={card.quiz.flashcardsHref}>Flashcards</Link>
            <Link className="ds-class-card__cta ds-class-card__cta--dark ds-class-card__cta--small" href={card.quiz.quizHref}>Quiz me</Link>
          </div>
        </div>
      )}
    </article>
  );
}
