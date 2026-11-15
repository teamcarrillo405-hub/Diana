// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { CourseDataGraph } from "./course-data-graph";
import { graphActivities, type CourseDataGraph as GraphData } from "@/lib/learning-engine/course-graphs";
afterEach(cleanup);
const method = graphActivities[0].method;
if (method.kind !== "science_graph") throw new Error("graph_fixture_expected");
const graph = method.graph;
it("provides labelled plotted observations and every coordinate in the visible equivalent table", () => {
  render(<CourseDataGraph graph={graph}/>);
  const image = screen.getByRole("img", { name: /Water in a classroom cylinder: plotted observations/ });
  expect(image.querySelectorAll("circle")).toHaveLength(graph.points.length);
  const table = screen.getByRole("table", { name: "Recorded observations" });
  expect(within(table).getByRole("columnheader", { name: "Elapsed time (min)" })).toBeTruthy();
  for (const point of graph.points) {
    const row = within(table).getByRole("rowheader", { name: String(point.x) }).closest("tr")!;
    expect(within(row).getByRole("cell", { name: String(point.y) })).toBeTruthy();
  }
  expect(screen.getByText(/A causal explanation needs separate evidence/)).toBeTruthy();
});
it("draws finite coordinates for negative or constant observations without inventing a trend", () => {
  const { container } = render(<CourseDataGraph graph={{ ...graph, points: [{ x: -4, y: -2 }, { x: -2, y: -2 }] }}/>);
  for (const circle of container.querySelectorAll("circle")) {
    expect(Number.isFinite(Number(circle.getAttribute("cx")))).toBe(true);
    expect(Number.isFinite(Number(circle.getAttribute("cy")))).toBe(true);
  }
  expect(container.querySelector("polyline")).toBeNull();
});
it("does not draw malformed graph data", () => {
  render(<CourseDataGraph graph={{ ...graph, kind: "unknown" } as unknown as GraphData}/>);
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("could not be displayed");
});
