// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  WorkCommandCenter,
  type WorkCommandItem,
} from "./work-command-center";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const assignments: WorkCommandItem[] = [
  {
    id: "assignment-1",
    title: "Paragraph evidence check: identity quote response",
    className: "English 9",
    classColor: "#f25fb0",
    dueAt: "2026-07-21T21:00:00.000Z",
    minutes: 48,
    kind: "essay",
    status: "todo",
    reasons: ["due tomorrow", "core class priority"],
  },
  {
    id: "assignment-2",
    title: "Unit 4 problem set",
    className: "Algebra I",
    classColor: "#29d0ff",
    dueAt: "2026-07-22T21:00:00.000Z",
    minutes: 25,
    kind: "problem_set",
    status: "drafting",
    reasons: ["recently worked on"],
  },
  {
    id: "assignment-3",
    title: "Reading response",
    className: "English 9",
    classColor: "#f25fb0",
    dueAt: "2026-07-23T21:00:00.000Z",
    minutes: 15,
    kind: "reading",
    status: "checking",
    reasons: [],
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WorkCommandCenter", () => {
  it("uses the first ranked assignment as the priority row", () => {
    vi.mocked(usePathname).mockReturnValue("/assignments");
    const { container } = render(
      <WorkCommandCenter
        assignments={assignments}
        displayName="Grayson"
        nowIso="2026-07-20T18:00:00.000Z"
      />,
    );

    expect(screen.getByRole("heading", { name: "Work" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: /paragraph evidence check.*start/iu }),
    ).toHaveAttribute("href", "/assignments/assignment-1/workspace");
    expect(
      screen.queryByRole("link", { name: "Break it into steps" }),
    ).not.toBeInTheDocument();
    expect(container.querySelector(".sd-work-mobile-capture")).toHaveAttribute(
      "href",
      "/quick-add",
    );
    expect(container.querySelector(".sd-work-mobile-record")).toHaveAttribute(
      "href",
      "/voice",
    );
    expect(screen.queryByText("Your next move")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Start now" })).not.toBeInTheDocument();
  });

  it("labels test preparation as preparation instead of generic work", () => {
    vi.mocked(usePathname).mockReturnValue("/assignments");
    render(
      <WorkCommandCenter
        assignments={[{
          ...assignments[0],
          kind: "test_prep",
          title: "Quiz: slope and intercepts",
        }]}
        displayName="Grayson"
        nowIso="2026-07-20T18:00:00.000Z"
      />,
    );

    expect(screen.getByText("Prepare")).toBeVisible();
    expect(screen.getByRole("link", { name: /quiz: slope and intercepts.*prepare/iu }))
      .toHaveAttribute(
        "href",
        "/study-artifacts?source=assignment:assignment-1&type=practice_test",
      );
  });

  it("keeps the full queue in ranked order without duplicate work tools", () => {
    vi.mocked(usePathname).mockReturnValue("/assignments");
    const { container } = render(
      <WorkCommandCenter
        assignments={assignments}
        displayName="Grayson"
        nowIso="2026-07-20T18:00:00.000Z"
      />,
    );

    const rows = Array.from(container.querySelectorAll(".sd-work-queue-row"));
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.getAttribute("href"))).toEqual([
      "/assignments/assignment-1/workspace",
      "/assignments/assignment-2/workspace",
      "/assignments/assignment-3/workspace",
    ]);
    expect(rows[0]).toHaveAttribute("data-priority", "true");
    expect(screen.getByText("Start")).toBeVisible();
    expect(screen.getByText("In progress")).toBeVisible();
    expect(screen.getByText("Turn in")).toBeVisible();
    expect(screen.queryByText("Work tools")).not.toBeInTheDocument();
    expect(screen.queryByText(/Diana keeps this order/iu)).not.toBeInTheDocument();
  });

  it("opens exporting work at submit while checking work stays in the workspace", () => {
    vi.mocked(usePathname).mockReturnValue("/assignments");
    render(
      <WorkCommandCenter
        assignments={[
          { ...assignments[2], id: "checking-assignment", status: "checking" },
          { ...assignments[2], id: "exporting-assignment", status: "exporting" },
        ]}
        displayName="Grayson"
        nowIso="2026-07-20T18:00:00.000Z"
      />,
    );

    const turnInLinks = screen.getAllByRole("link", {
      name: /reading response.*turn in/iu,
    });
    expect(turnInLinks[0]).toHaveAttribute(
      "href",
      "/assignments/checking-assignment/workspace",
    );
    expect(turnInLinks[1]).toHaveAttribute(
      "href",
      "/assignments/exporting-assignment/submit",
    );
  });

  it("keeps an actionable empty state when no work is queued", () => {
    vi.mocked(usePathname).mockReturnValue("/assignments");
    render(
      <WorkCommandCenter
        assignments={[]}
        displayName="Grayson"
        nowIso="2026-07-20T18:00:00.000Z"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Caught up." }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Capture new work" }),
    ).toHaveAttribute("href", "/quick-add");
  });
  it("shows an overdue date without making planning a student prerequisite", () => {
    vi.mocked(usePathname).mockReturnValue("/assignments");
    render(
      <WorkCommandCenter
        assignments={[{ ...assignments[0], dueAt: "2026-07-19T21:00:00.000Z" }]}
        displayName="Grayson"
        nowIso="2026-07-20T18:00:00.000Z"
      />,
    );

    expect(screen.getAllByText(/Due date passed/iu)).toHaveLength(2);
    expect(screen.queryByText("Needs a new plan")).not.toBeInTheDocument();
  });
});
