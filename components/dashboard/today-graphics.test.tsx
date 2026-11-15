// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SubjectDonut } from "./today-graphics";

afterEach(cleanup);
const subjects = [{ name: "History", minutes: 60, color: "#8924f6" }];

describe("Subject chart palette boundaries", () => {
  it("preserves the existing palette by default and for an empty override", () => {
    const { container, rerender } = render(<SubjectDonut subjects={subjects} />);
    expect(container.querySelectorAll("circle")[1].getAttribute("stroke")).toBe("#2589ae");
    rerender(<SubjectDonut subjects={subjects} palette={[]} />);
    expect(container.querySelectorAll("circle")[1].getAttribute("stroke")).toBe("#2589ae");
  });
  it("uses an optional review palette consistently without changing the data", () => {
    const { container } = render(<SubjectDonut subjects={subjects} palette={["#65dbef"]} />);
    expect(container.querySelectorAll("circle")[1].getAttribute("stroke")).toBe("#65dbef");
    expect(container.querySelector("i")?.style.background).toBe("rgb(101, 219, 239)");
    expect(screen.getByRole("img", { name: "History: 60 minutes" })).toBeTruthy();
  });
});
