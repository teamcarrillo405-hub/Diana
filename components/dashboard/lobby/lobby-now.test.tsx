// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TodayTask } from "@/lib/dashboard/today-view";
import { LobbyNow } from "./lobby-now";

const task: TodayTask = { id: "a", title: "History report", subject: "History", color: "#9828ff", minutes: 25, due: "Tomorrow", date: "Sep 10", day: "10", month: "SEP", ready: false, href: "/assignments/a/workspace" };

describe("Lobby assignment briefing", () => {
  afterEach(cleanup);

  it("labels the real due date and estimated time", () => {
    render(<LobbyNow task={task} unavailable={false} onRetry={vi.fn()} />);
    expect(screen.getByText("Estimated time").nextElementSibling).toHaveTextContent("25 min");
    expect(screen.getByText("Due").nextElementSibling).toHaveTextContent("Tomorrow");
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("href", task.href);
  });

  it("labels submission readiness as status rather than a due date", () => {
    render(<LobbyNow task={{ ...task, minutes: 0, ready: true, due: "Ready to submit", href: "/assignments/a/submit" }} unavailable={false} onRetry={vi.fn()} />);
    expect(screen.getByText("Estimated time").nextElementSibling).toHaveTextContent("Not set");
    expect(screen.getByText("Status").nextElementSibling).toHaveTextContent("Ready to submit");
    expect(screen.getByRole("link", { name: "Review submission" })).toHaveAttribute("href", "/assignments/a/submit");
  });
});
