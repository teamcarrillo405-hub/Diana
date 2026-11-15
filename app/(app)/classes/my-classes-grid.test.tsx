// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EmptyClassLibrary, MyClassesGrid, type SubjectLibraryCardModel } from "./my-classes-grid";
const CARD: SubjectLibraryCardModel = { id:"physics", name:"AP Physics", teacher:"Dr. Rivera", href:"/classes/physics", progressPct:88, openWorkCount:1, submittedCount:2, nextAssignmentTitle:"Momentum lab report" };
afterEach(cleanup);
describe("Connected Classes", () => {
  it("offers actual class creation for an empty roster", () => {
    render(<EmptyClassLibrary createForm={<div>Class form</div>} createOpen={false} />);
    expect(screen.getByRole("heading", { name:"Add your first class" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name:"Add class" }).every(link => link.getAttribute("href") === "/classes?create=1")).toBe(true);
    expect(screen.queryByText("Class form")).not.toBeInTheDocument();
  });
  it("changes the real class destination with selection and keyboard focus", () => {
    render(<MyClassesGrid cards={[CARD,{...CARD,id:"english",name:"English",href:"/classes/english"}]} createForm={<div>Class form</div>} createOpen />);
    expect(screen.getByRole("link",{name:"Open class"})).toHaveAttribute("href",CARD.href);
    fireEvent.keyDown(screen.getByRole("tab",{name:"AP Physics"}), {key:"ArrowDown"});
    expect(screen.getByRole("tab",{name:"English"})).toHaveFocus();
    expect(screen.getByRole("link",{name:"Open class"})).toHaveAttribute("href","/classes/english");
    expect(screen.getByText("Class form")).toBeInTheDocument();
  });
  it("does not show empty success when loading is unavailable", () => {
    render(<EmptyClassLibrary createForm={null} createOpen={false} unavailable />);
    expect(screen.getByRole("status")).toHaveTextContent("Classes could not load");
    expect(screen.queryByText("Add your first class")).not.toBeInTheDocument();
  });
});
