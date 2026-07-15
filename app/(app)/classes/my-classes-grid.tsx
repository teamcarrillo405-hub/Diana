import { ClassCard, type ClassCardModel, type CtaVariant } from "@/components/ui/class-card";
import { StatusPill } from "@/components/ui/status-pill";

export type { ClassCardModel, CtaVariant };

export function MyClassesGrid({
  cards,
  dueEarlierCount,
  notTurnedInCount,
}: {
  cards: ClassCardModel[];
  dueEarlierCount: number;
  notTurnedInCount: number;
}) {
  return (
    <section aria-label="My classes" style={{ display: "grid", gap: "var(--space-12)" }}>
      <header style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: "var(--weight-800)", fontSize: "var(--text-28)", letterSpacing: "var(--tracking-01)", textTransform: "uppercase", color: "var(--gl-text-primary)" }}>
          My Classes
        </h1>
        {dueEarlierCount > 0 && <StatusPill label={`${dueEarlierCount} need review`} tone="attention" />}
        {notTurnedInCount > 0 && <StatusPill label={`${notTurnedInCount} not turned in`} tone="attention" />}
      </header>

      <div className="myc-grid">
        {cards.map((card) => <ClassCard key={card.id} card={card} />)}
      </div>
    </section>
  );
}
