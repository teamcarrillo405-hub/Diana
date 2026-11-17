// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EmptyClassLibrary, MyClassesGrid, type SubjectLibraryCardModel } from "./my-classes-grid";
const CARD: SubjectLibraryCardModel = {
  id: "physics",
  name: "AP Physics",
  teacher: "Dr. Rivera",
  href: "/classes/physics",
  openWorkCount: 1,
  submittedCount: 2,
  nextAssignmentTitle: "Momentum lab report",
  nextAssignmentDueAt: "2026-11-18T00:30:00Z",
  gradeLabel: "A−",
  gradePercent: 91.5,
  gradeConfirmedAt: "2026-11-14T02:30:00Z",
};
const ENGLISH: SubjectLibraryCardModel = {
  ...CARD, id: "english", name: "English", href: "/classes/english",
  gradeLabel: null, gradePercent: null, gradeConfirmedAt: null,
};
afterEach(cleanup);
describe("Connected Classes", () => {
  it("offers actual class creation for an empty roster", () => {
    render(<EmptyClassLibrary createForm={<div>Class form</div>} createOpen={false} />);
    expect(screen.getByRole("heading", { name:"Add your first class" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name:"Add class" }).every(link => link.getAttribute("href") === "/classes?create=1")).toBe(true);
    expect(screen.queryByText("Class form")).not.toBeInTheDocument();
  });
  it("changes the real class destination with selection and keyboard focus", () => {
    render(<MyClassesGrid cards={[CARD, ENGLISH]} createForm={<div>Class form</div>} createOpen />);
    expect(screen.getByRole("link",{name:"Open class"})).toHaveAttribute("href",CARD.href);
    fireEvent.keyDown(screen.getByRole("tab",{name:/AP Physics/}), {key:"ArrowDown"});
    expect(screen.getByRole("tab",{name:/English/})).toHaveFocus();
    expect(screen.getByRole("link",{name:"Open class"})).toHaveAttribute("href","/classes/english");
    expect(screen.getByText("Class form")).toBeInTheDocument();
  });
  it("shows each confirmed grade in the roster and uses local dates in the featured class", () => {
    render(<MyClassesGrid cards={[CARD, ENGLISH]} createForm={null} createOpen={false} timeZone="America/Los_Angeles" />);
    expect(screen.getByRole("tab", { name: "AP Physics, confirmed grade A−" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "English, No grade posted" })).toBeInTheDocument();
    const featured = within(screen.getByRole("tabpanel"));
    expect(featured.getByText("91.5%")).toBeInTheDocument();
    expect(featured.getByText("Nov 13, 2026")).toBeInTheDocument();
    expect(featured.getByText("Due Tue, Nov 17")).toBeInTheDocument();
  });
  it("can search classes when grades cannot load and keeps the selected class reachable", () => {
    render(<MyClassesGrid cards={[CARD, { ...ENGLISH, gradeUnavailable: true }]} createForm={null} createOpen={false} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Find a class" }), { target: { value: "english" } });
    expect(screen.queryByRole("tab", { name: /AP Physics/ })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "English, Grade unavailable" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: "Open class" })).toHaveAttribute("href", ENGLISH.href);
    expect(within(screen.getByRole("tabpanel")).getByText("Grade unavailable")).toBeInTheDocument();
  });
  it("does not show empty success when loading is unavailable", () => {
    render(<EmptyClassLibrary createForm={null} createOpen={false} unavailable />);
    expect(screen.getByRole("status")).toHaveTextContent("Classes could not load");
    expect(screen.queryByText("Add your first class")).not.toBeInTheDocument();
  });
});
