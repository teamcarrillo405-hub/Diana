// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getPreviewData } from "./preview-data";
import { TodayStudyMixReview } from "./today-study-mix-review";

afterEach(cleanup);

describe("Study Mix review", () => {
  it("shows estimated work and lets keyboard focus isolate a subject's share", () => {
    const { container } = render(<TodayStudyMixReview {...getPreviewData("typical")} />);
    expect(screen.getByRole("heading", { name: "Study Mix" })).toBeTruthy();
    expect(screen.getByText("5h")).toBeTruthy();
    expect(screen.getByText("estimated")).toBeTruthy();
    const history = screen.getByRole("button", { name: /History.*30%/ });
    fireEvent.focus(history);
    expect(history.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector("[data-subject-value]")?.textContent).toBe("1h 30mthis subject");
    const arcs = container.querySelectorAll("[data-subject-chart] circle[opacity]");
    expect(arcs[0].getAttribute("opacity")).toBe("1");
    expect(arcs[1].getAttribute("opacity")).toBe("0.3");
    fireEvent.mouseEnter(screen.getByRole("button", { name: /Algebra I.*25%/ }));
    expect(history.getAttribute("aria-pressed")).toBe("false");
    fireEvent.mouseLeave(screen.getByRole("list"));
    expect(history.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector("[data-subject-value]")?.textContent).toBe("1h 30mthis subject");
    fireEvent.blur(history);
    expect(container.querySelector("[data-subject-value]")?.textContent).toBe("5hestimated");
  });

  it("keeps every busy-week subject and an accurate total", () => {
    render(<TodayStudyMixReview {...getPreviewData("busy")} />);
    expect(screen.getAllByRole("button")).toHaveLength(6);
    expect(screen.getByText("6h 30m")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Spanish Language and Culture/ })).toBeTruthy();
  });

  it("distinguishes unavailable data from an empty week", () => {
    const { rerender } = render(<TodayStudyMixReview {...getPreviewData("unavailable")} />);
    expect(screen.getByRole("status").textContent).toContain("Study mix unavailable");
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<TodayStudyMixReview {...getPreviewData("new")} />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("img", { name: "No weekly subject work planned" })).toBeTruthy();
    expect(screen.getByText("0m")).toBeTruthy();
  });
});
