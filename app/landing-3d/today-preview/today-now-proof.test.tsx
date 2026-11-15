// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TodayNowProof } from "./today-now-proof";
import { getPreviewData } from "./preview-data";

vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

describe("Now design proof", () => {
  afterEach(cleanup);
  it("keeps weekly assignment progress out of the Now review", () => {
    const tasks = getPreviewData("typical").plan;
    const { container } = render(<TodayNowProof compact composition graphicLanguage tasks={tasks} scenario="typical" onTask={vi.fn()} />);
    expect(container.querySelector("[data-now-weekly]")).toBeNull();
    expect(screen.queryByRole("progressbar", { name: "Assignments completed this week" })).toBeNull();
    expect(screen.queryByText("Weekly assignments")).toBeNull();
  });

  it("keeps the unboxed queue's subject, task action, and paused time intact", () => {
    const tasks = getPreviewData("typical").plan;
    const onTask = vi.fn();
    const { container } = render(<TodayNowProof compact composition graphicLanguage tasks={tasks} scenario="typical" onTask={onTask} pausedSessions={{ [tasks[1].id]: 600000 }} />);
    const queue = screen.getByRole("button", { name: /Algebra I.*Linear equations practice.*Paused.*10 min left/ });
    expect(container.querySelector("[data-now-queue-emblem]")?.getAttribute("aria-hidden")).toBe("true");
    expect(queue.querySelectorAll("[data-subject-emblem]")).toHaveLength(1);
    expect(queue.querySelector("[data-now-queue-title]")?.textContent).toBe(tasks[1].title);
    fireEvent.click(queue);
    expect(onTask).toHaveBeenCalledWith(tasks[1]);
  });

  it("keeps the approved composition unframed after Start", () => {
    const data = getPreviewData("typical");
    const onStart = vi.fn();
    const onTask = vi.fn();
    const { container, rerender } = render(<TodayNowProof compact composition tasks={data.plan} scenario="typical" onStart={onStart} onTask={onTask} />);
    expect(container.querySelector("[data-now-launch]")).toBeNull();
    expect(container.querySelector("[data-now-action]")).toBeTruthy();
    expect(container.querySelector("[data-now-weekly]")).toBeNull();
    expect(screen.queryByText("Next step")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(data.plan[0]);
    fireEvent.click(screen.getByRole("button", { name: /Linear equations practice/ }));
    expect(onTask).toHaveBeenCalledWith(data.plan[1]);
    rerender(<TodayNowProof compact tasks={data.plan} scenario="typical" onTask={onTask} />);
    expect(container.querySelector("[data-now-launch]")).toBeTruthy();
    expect(container.querySelector("[data-now-weekly]")).toBeNull();
  });

  it.each(["new", "complete", "unavailable"] as const)("keeps the composition's %s state truthful", scenario => {
    const data = getPreviewData(scenario);
    const { container } = render(<TodayNowProof compact composition tasks={data.plan} scenario={scenario} onTask={vi.fn()} />);
    expect(container.querySelector("[data-now-weekly]")).toBeNull();
    expect(screen.queryByText("Next step")).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
  it("removes repeated priority labels only in the compact review", () => {
    const { rerender } = render(<TodayNowProof compact tasks={getPreviewData("typical").plan} scenario="typical" onTask={vi.fn()} />);
    expect(screen.queryByText("Today's Plan")).toBeNull();
    expect(screen.queryByText("First up")).toBeNull();
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
    rerender(<TodayNowProof tasks={getPreviewData("typical").plan} scenario="typical" onTask={vi.fn()} />);
    expect(screen.getByText("Today's Plan")).toBeTruthy();
  });
  it("keeps the priority assignment, next step, Start, and queue functional", () => {
    const onTask = vi.fn();
    const tasks = getPreviewData("typical").plan;
    render(<TodayNowProof tasks={tasks} scenario="typical" onTask={onTask} />);
    expect(screen.getByRole("heading", { name: tasks[0].title })).toBeTruthy();
    expect(screen.getByText("Choose three sources for your argument.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onTask).toHaveBeenLastCalledWith(tasks[0]);
    fireEvent.click(screen.getByRole("button", { name: /Linear equations practice/ }));
    expect(onTask).toHaveBeenLastCalledWith(tasks[1]);
  });

  it("separates the scene heading from the action strip only in the review", () => {
    const onTask = vi.fn();
    const onStart = vi.fn();
    const tasks = getPreviewData("typical").plan;
    const { container, rerender } = render(<TodayNowProof compact tasks={tasks} scenario="typical" onTask={onTask} onStart={onStart} />);
    const launch = container.querySelector("[data-now-launch]")!;
    const heading = screen.getByRole("heading", { name: tasks[0].title });
    expect(launch.contains(heading)).toBe(false);
    expect(screen.queryByText("Next step")).toBeNull();
    expect(screen.queryByText("Choose three sources for your argument.")).toBeNull();
    expect(container.querySelector("[data-now-step]")).toBeNull();
    expect(launch.contains(screen.getByText("25 min today"))).toBe(true);
    expect(launch.contains(screen.getByText("Due tomorrow"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(tasks[0]);
    expect(onTask).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Linear equations practice/ }));
    expect(onTask).toHaveBeenCalledWith(tasks[1]);
    rerender(<TodayNowProof tasks={tasks} scenario="typical" onTask={onTask} />);
    expect(container.querySelector("[data-now-launch]")).toBeNull();
    expect(screen.getByText("Choose three sources for your argument.")).toBeTruthy();
  });

  it("keeps a long assignment title complete", () => {
    const tasks = getPreviewData("busy").plan;
    render(<TodayNowProof tasks={tasks} scenario="busy" onTask={vi.fn()} />);
    expect(screen.getByRole("heading", { name: tasks[0].title }).getAttribute("data-long-title")).toBe("true");
    expect(screen.getByRole("button", { name: /Cell structure and functions/ })).toBeTruthy();
  });

  it("shows a paused queued session without turning it into the primary task", () => {
    const tasks = getPreviewData("typical").plan;
    const onTask = vi.fn();
    const { rerender } = render(<TodayNowProof compact composition tasks={tasks} scenario="typical" onTask={onTask} pausedSessions={{ [tasks[1].id]: 1188000 }} />);
    const row = screen.getByRole("button", { name: /Linear equations practice.*Paused.*20 min left/ });
    expect(row.getAttribute("data-session-paused")).toBe("true");
    fireEvent.click(row);
    expect(onTask).toHaveBeenCalledWith(tasks[1]);
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
    rerender(<TodayNowProof compact composition tasks={tasks} scenario="typical" onTask={onTask} />);
    expect(screen.queryByText("Paused")).toBeNull();
  });

  it("keeps decorative subject emblems and weekly context out of the default preview", () => {
    const tasks = getPreviewData("typical").plan;
    const { container, rerender } = render(<TodayNowProof compact tasks={tasks} scenario="typical" onTask={vi.fn()} />);
    const emblem = container.querySelector<HTMLElement>("[data-now-subject] [data-subject-emblem]")!;
    expect(emblem.getAttribute("aria-hidden")).toBe("true");
    expect(emblem.style.getPropertyValue("--subject-color")).toBe(tasks[0].color);
    expect(emblem.querySelector(".lucide-landmark")).toBeTruthy();
    expect(container.querySelector("[data-now-queue] .lucide-sigma")).toBeTruthy();
    rerender(<TodayNowProof tasks={tasks} scenario="typical" onTask={vi.fn()} />);
    expect(container.querySelector("[data-subject-emblem]")).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it.each(["Media Arts", "constructor"])("uses a neutral symbol for an unconfigured subject: %s", subject => {
    const task = { ...getPreviewData("typical").plan[0], subject };
    const { container } = render(<TodayNowProof compact tasks={[task]} scenario="typical" onTask={vi.fn()} />);
    expect(container.querySelector("[data-now-subject] .lucide-book-open")).toBeTruthy();
    expect(screen.getByText(subject)).toBeTruthy();
  });

  it.each(["new", "complete"] as const)("does not show a phantom assignment in %s state", scenario => {
    const { container } = render(<TodayNowProof tasks={[]} scenario={scenario} onTask={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("canvas")).toBeNull();
    expect(screen.getByRole("link", { name: "Add an assignment" }).getAttribute("href")).toBe("/quick-add");
  });
});
