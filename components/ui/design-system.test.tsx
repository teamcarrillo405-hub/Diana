import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AlertStrip } from "./alert-strip";
import { AssignmentLane } from "./assignment-lane";
import { ClassCard, type ClassCardModel } from "./class-card";
import { EmptyState } from "./empty-state";
import { HeroCtaButton } from "./hero-cta-button";
import { MetricTile } from "./metric-tile";
import { MissionCard, MissionProgress } from "./mission-card";
import { SlantedActionButton } from "./slanted-action-button";
import { StatusPill, assignmentStatusTone } from "./status-pill";

const CLASS_CARD: ClassCardModel = {
  id: "biology",
  name: "Biology",
  statusLabel: "Ready",
  statusTone: "cyan",
  isNow: true,
  eventPill: null,
  taskTitle: "Photosynthesis review",
  taskBadge: { text: "Review", tone: "dueEarlier" },
  doneBar: true,
  timeLabel: "20 min",
  progressPct: 45,
  cta: { label: "Open now", href: "/assignments/biology", variant: "cyanFilled" },
  quiz: null,
  href: "/classes/biology",
};

describe("Diana design-system components", () => {
  it("maps assignment states to calm status variants", () => {
    expect(assignmentStatusTone("in_progress")).toBe("in-progress");
    expect(assignmentStatusTone("submitted")).toBe("submitted");
    expect(assignmentStatusTone("done")).toBe("attention");
    expect(renderToStaticMarkup(<StatusPill label="Needs review" tone="attention" />)).toContain("ds-status-pill--attention");
  });

  it("renders the reusable mission hierarchy", () => {
    const html = renderToStaticMarkup(
      <AssignmentLane eyebrow="Time window" title="Due soon" count={1} tone="gold">
        <MissionCard href="/assignments/one" tone="gold">
          Biology review
          <MissionProgress percent={120} />
        </MissionCard>
      </AssignmentLane>,
    );
    expect(html).toContain("ds-assignment-lane__grid");
    expect(html).toContain("ds-mission-card");
    expect(html).toContain("width:100%");
  });

  it("renders shared action, metric, alert, empty, and class-card surfaces", () => {
    const html = renderToStaticMarkup(
      <div>
        <HeroCtaButton href="/assignments/new">Add assignment</HeroCtaButton>
        <MetricTile label="Due soon" value={2} detail="3-day window" tone="gold" />
        <AlertStrip tone="warning">Two items to review</AlertStrip>
        <EmptyState title="Nothing open" description="Add a task when it arrives." />
        <SlantedActionButton href="/voice">Talk to Diana</SlantedActionButton>
        <ClassCard card={CLASS_CARD} />
      </div>,
    );
    expect(html).toContain("ds-hero-cta");
    expect(html).toContain("ds-metric-tile");
    expect(html).toContain("ds-alert-strip--warning");
    expect(html).toContain("ds-empty-state");
    expect(html).toContain("ds-slanted-action");
    expect(html).toContain("You&#x27;re done. One tap to submit.");
    expect(html).not.toContain("\u2014");
  });
});
