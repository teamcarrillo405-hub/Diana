// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { LobbyAttentionCard } from "@/lib/dashboard/lobby-view";
import { NeedsAttention } from "./needs-attention";

afterEach(cleanup);

const categories: readonly LobbyAttentionCard[] = [
  {
    key: "tests",
    label: "Quizzes & tests",
    count: 0,
    description: "Nothing coming up this week",
    href: "/assignments",
    tone: "purple",
  },
  {
    key: "due_earlier",
    label: "Due earlier",
    count: 1,
    description: "1 past the due date",
    href: "/assignments/earlier",
    tone: "orange",
  },
  {
    key: "not_submitted",
    label: "Not turned in",
    count: 0,
    description: "Everything ready is submitted",
    href: "/assignments",
    tone: "yellow",
  },
  {
    key: "feedback",
    label: "Feedback",
    count: 7,
    description: "7 new notes from teachers",
    href: "/notifications",
    tone: "green",
  },
];

describe("NeedsAttention", () => {
  it("shows the three assignment categories and omits feedback", () => {
    render(<NeedsAttention categories={categories} />);

    expect(screen.getByRole("link", { name: "Due earlier: 1 past the due date" })).toBeTruthy();
    expect(screen.getByText("Quizzes & tests")).toBeTruthy();
    expect(screen.getByText("Not turned in")).toBeTruthy();
    expect(screen.queryByText("Feedback")).toBeNull();
  });

  it("keeps the calm zero-count states visible when there is nothing actionable", () => {
    render(
      <NeedsAttention
        categories={categories.map((category) => ({ ...category, count: 0 }))}
      />,
    );

    expect(screen.getByText("Nothing coming up this week")).toBeTruthy();
    expect(screen.getByText("Everything ready is submitted")).toBeTruthy();
    expect(screen.queryByText("Feedback")).toBeNull();
  });
});
