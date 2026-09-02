// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { LobbyAttentionCard } from "@/lib/dashboard/lobby-view";
import { NeedsAttention } from "./needs-attention";

afterEach(cleanup);

const categories: readonly LobbyAttentionCard[] = [
  {
    key: "tests",
    label: "Quizzes & Tests",
    count: 0,
    description: "Nothing coming up this week",
    href: "/assignments",
    tone: "purple",
    assignmentTitle: "Chapter quiz",
    className: "Algebra",
    contextLabel: "Due tomorrow",
    actionLabel: "Open",
    additionalItemCount: 0,
  },
  {
    key: "due_earlier",
    label: "Due Earlier",
    count: 1,
    description: "1 past the due date",
    href: "/assignments/earlier",
    tone: "orange",
    assignmentTitle: "Vocabulary notes",
    className: "History",
    contextLabel: "Due yesterday",
    actionLabel: "Open",
    additionalItemCount: 0,
  },
  {
    key: "not_submitted",
    label: "Not Turned In",
    count: 0,
    description: "Everything ready is submitted",
    href: "/assignments",
    tone: "yellow",
    assignmentTitle: "Lab report",
    className: "Chemistry",
    contextLabel: "Ready to submit",
    actionLabel: "Open",
    additionalItemCount: 0,
  },
  {
    key: "feedback",
    label: "Feedback",
    count: 7,
    description: "7 new notes from teachers",
    href: "/notifications",
    tone: "green",
    assignmentTitle: "Teacher feedback",
    className: "Notifications",
    contextLabel: "New feedback available",
    actionLabel: "Open",
    additionalItemCount: 6,
  },
];

describe("NeedsAttention", () => {
  it("always shows the three student work states and omits feedback", () => {
    render(<NeedsAttention categories={categories} />);

    expect(screen.getByRole("link", { name: "Late: Vocabulary notes, History, Due yesterday. Open" })).toBeTruthy();
    expect(screen.getByText("Late")).toBeTruthy();
    expect(screen.getByText(/History/)).toBeTruthy();
    expect(screen.queryByText("Vocabulary notes")).toBeNull();
    expect(screen.queryByText("Open")).toBeNull();
    expect(screen.getByText("Quizzes & Tests")).toBeTruthy();
    expect(screen.getByText("Ready to Turn In")).toBeTruthy();
    expect(screen.queryByText("Nothing coming up this week")).toBeNull();
    expect(screen.queryByText("Everything ready is submitted")).toBeNull();
    expect(screen.queryByText("Feedback")).toBeNull();
  });

  it("shows three quiet clear states when there is nothing actionable", () => {
    render(
      <NeedsAttention
        categories={categories.map((category) => ({ ...category, count: 0 }))}
      />,
    );

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getAllByRole("status")).toHaveLength(3);
    expect(screen.getByLabelText("Late: nothing due")).toBeTruthy();
    expect(screen.getByLabelText("Ready to Turn In: nothing due")).toBeTruthy();
    expect(screen.getByLabelText("Quizzes & Tests: nothing due")).toBeTruthy();
    expect(screen.queryByText("Feedback")).toBeNull();
  });

  it("orders visible rows by urgency", () => {
    render(
      <NeedsAttention
        categories={categories.map((category, index) => ({
          ...category,
          count: index < 3 ? index + 1 : 0,
        }))}
      />,
    );

    const cards = screen.getAllByRole("link");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveAccessibleName("Late: Vocabulary notes, History, Due yesterday. Open");
    expect(cards[1]).toHaveAccessibleName("Ready to Turn In: Lab report, Chemistry, Ready to submit. Open");
    expect(cards[2]).toHaveAccessibleName("Quizzes & Tests: Chapter quiz, Algebra, Due tomorrow. Open");
  });
});
