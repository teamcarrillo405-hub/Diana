// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EmptyClassLibrary,
  MyClassesGrid,
  type SubjectLibraryCardModel,
} from "./my-classes-grid";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const CARD: SubjectLibraryCardModel = {
  id: "physics",
  name: "AP Physics",
  teacher: "Dr. Rivera",
  href: "/classes/physics",
  progressPct: 88,
  openWorkCount: 1,
  nextAssignmentTitle: "Momentum lab report",
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ScreenDesign class library states", () => {
  it("renders the honest empty roster as its own canonical composition", () => {
    vi.mocked(usePathname).mockReturnValue("/classes");

    render(
      <EmptyClassLibrary createForm={<div>Real class form</div>} createOpen={false} />,
    );

    expect(screen.getByRole("heading", { name: "Your classes, in one place" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a class" })).toHaveAttribute("href", "/classes?create=1");
    expect(screen.queryByText("Real class form")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Classes" })[0]).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("renders owner-scoped subjects with truthful progress and real routes", () => {
    vi.mocked(usePathname).mockReturnValue("/classes");

    render(
      <MyClassesGrid
        cards={[CARD]}
        createForm={<div>Real class form</div>}
        createOpen
      />,
    );

    expect(screen.getByRole("heading", { name: "CLASSES" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: CARD.name })).toBeInTheDocument();
    expect(screen.getByText("Momentum lab report")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Open ${CARD.name} class` })).toHaveAttribute("href", CARD.href);
    expect(document.querySelector(".ds-class-card")).not.toBeInTheDocument();
  });
});
