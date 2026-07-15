// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MyClassesGrid, type ClassCardModel } from "./my-classes-grid";

const CARD: ClassCardModel = {
  id: "digital-media",
  name: "Digital Media and Communication",
  statusLabel: "Not started",
  statusTone: "cyan",
  isNow: false,
  eventPill: null,
  taskTitle: "Canva poster draft: digital citizenship",
  taskBadge: { text: "Sun Jul 19", tone: "neutral" },
  doneBar: false,
  timeLabel: "est. 45 min",
  progressPct: 0,
  cta: { label: "Start now", href: "/assignments/one", variant: "cyanFilled" },
  quiz: null,
  href: "/classes/digital-media",
};

describe("MyClassesGrid mobile containment", () => {
  it("uses the shared responsive grid and class-card components", () => {
    const { container } = render(
      <MyClassesGrid cards={[CARD]} dueEarlierCount={0} notTurnedInCount={0} />,
    );

    expect(container.querySelector(".myc-grid")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: CARD.name }).closest(".ds-class-card")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start now" })).toHaveClass("ds-class-card__cta--cyanFilled");
  });
});
