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
  href: "/classes/physics",
  progressPct: 88,
  openWorkCount: 1,
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

    expect(screen.getByRole("heading", { name: /academic roster/iu })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Empty playbook?" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Diana assistant" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Add a class" })).toHaveLength(2);
    for (const action of screen.getAllByRole("link", { name: "Add a class" })) {
      expect(action).toHaveAttribute("href", "/classes?create=1");
    }
    expect(screen.queryByText("Real class form")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Classes" })).toHaveAttribute(
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

    expect(screen.getByRole("heading", { name: /your classes/iu })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: CARD.name })).toBeInTheDocument();
    expect(screen.getByText("88% complete")).toBeInTheDocument();
    expect(screen.getByText("1 open move")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open class" })).toHaveAttribute(
      "href",
      CARD.href,
    );
    expect(screen.getByText("Real class form")).toBeInTheDocument();
    expect(document.querySelector(".ds-class-card")).not.toBeInTheDocument();
  });
});
