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
    dueAt: "2026-07-30T21:00:00.000Z",
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
  it("uses the first ranked assignment as the single featured action", () => {
    vi.mocked(usePathname).mockReturnValue("/assignments");
    const { container } = render(
      <WorkCommandCenter
        assignments={assignments}
        displayName="Grayson"
        nowIso="2026-07-20T18:00:00.000Z"
      />,
    );

    expect(screen.getByRole("heading", { name: "WORK" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Keep moving." })).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /start paragraph evidence check/iu }),
    ).toHaveAttribute("href", "/assignments/assignment-1/workspace");
    expect(screen.getByRole("heading", { name: "Your assignments" })).toBeVisible();
    expect(container.querySelectorAll(".sd-work-queue-row")).toHaveLength(2);
    expect(screen.queryByText("Up next, in order")).not.toBeInTheDocument();
    expect(screen.queryByText("Break it into steps")).not.toBeInTheDocument();
  });

  it("groups remaining work by time and preserves one route per assignment", () => {
    vi.mocked(usePathname).mockReturnValue("/assignments");
    render(
      <WorkCommandCenter
        assignments={assignments}
        displayName="Grayson"
        nowIso="2026-07-20T18:00:00.000Z"
      />,
    );

    expect(screen.getByRole("heading", { name: "Today" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "This week" })).toBeVisible();
    expect(screen.getByRole("link", { name: /unit 4 problem set.*in progress/iu }))
      .toHaveAttribute("href", "/assignments/assignment-2/workspace");
    expect(screen.getAllByRole("link", { name: /reading response.*ready to turn in/iu }).at(-1))
      .toHaveAttribute("href", "/assignments/assignment-3/workspace");
  });

  it("routes test preparation into the same assignment workspace", () => {
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

    expect(screen.getByRole("link", { name: /practice quiz: slope and intercepts/iu }))
      .toHaveAttribute("href", "/assignments/assignment-1/workspace");
  });

  it("keeps exporting work on submit while checking work stays in the workspace", () => {
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

    expect(screen.getByRole("link", { name: /open reading response/iu }))
      .toHaveAttribute("href", "/assignments/checking-assignment/workspace");
    expect(screen.getByRole("link", { name: /reading response.*ready to turn in/iu }))
      .toHaveAttribute("href", "/assignments/exporting-assignment/submit");
  });

  it("removes question counts from the visible assignment title", () => {
    vi.mocked(usePathname).mockReturnValue("/assignments");
    render(
      <WorkCommandCenter
        assignments={[{ ...assignments[0], title: "Algebra review: Three Questions" }]}
        displayName="Grayson"
        nowIso="2026-07-20T18:00:00.000Z"
      />,
    );

    expect(screen.getByRole("heading", { name: "Algebra review" })).toBeVisible();
    expect(screen.queryByText(/three questions/iu)).not.toBeInTheDocument();
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

    expect(screen.getByRole("heading", { name: "Caught up." })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Add assignment" }).at(-1)).toHaveAttribute(
      "href",
      "/quick-add",
    );
  });

  it("uses a clear late state without making planning a prerequisite", () => {
    vi.mocked(usePathname).mockReturnValue("/assignments");
    render(
      <WorkCommandCenter
        assignments={[
          assignments[0],
          { ...assignments[1], dueAt: "2026-07-19T21:00:00.000Z", status: "todo" },
        ]}
        displayName="Grayson"
        nowIso="2026-07-20T18:00:00.000Z"
      />,
    );

    expect(screen.getByRole("link", { name: /unit 4 problem set.*late/iu })).toBeVisible();
    expect(screen.queryByText("Needs a new plan")).not.toBeInTheDocument();
  });
});
