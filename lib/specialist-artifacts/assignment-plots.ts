import { chartSeriesForDataset, type DataChartSeries } from "@/lib/native-tools/data-runtime";
import { graphSegments } from "@/lib/native-tools/graphing";
import { GRAPH_SERIES_COLORS, readGraphSettings } from "@/lib/native-tools/graph-work";
import type { CanonicalRenderBlock } from "@/lib/specialist-artifacts/render-blocks";

export const ASSIGNMENT_PLOT_FRAME = {
  width: 540,
  height: 282,
  left: 64,
  top: 34,
  right: 511,
  bottom: 232,
} as const;

export const ASSIGNMENT_PLOT_COLORS = {
  frame: "#82948d",
  grid: "#dce5df",
  ink: "#263a30",
  background: "#ffffff",
  data: "#0f766e",
} as const;

type Point = { x: number; y: number };
type Bounds = readonly [number, number];
type Axes = { x: Bounds; y: Bounds };
type Tick = { position: number; label: string };
type Bar = { x: number; y: number; width: number; height: number };

export type AssignmentPlotMark = { label: string; color: string } & (
  | { kind: "line"; paths: Point[][]; dash: readonly number[] }
  | { kind: "points"; points: Point[] }
  | { kind: "bars"; bars: Bar[] }
);

export type AssignmentPlot = {
  kind: "function graph" | "plotted readings" | "bar chart" | "line chart" | "scatter plot";
  xLabel: string;
  yLabel: string;
  xTicks: Tick[];
  yTicks: Tick[];
  xZero: number | null;
  yZero: number | null;
  marks: AssignmentPlotMark[];
  note?: string;
};

export type AssignmentPlotProjection =
  | { plot: AssignmentPlot; fallback?: never }
  | { plot?: never; fallback: string }
  | null;

const PLOT_DASH_PATTERNS = [[], [9, 4], [3, 4]] as const;
const EQUATION_PREFIX = /^\s*(?:y|f\s*\(\s*x\s*\))\s*=/iu;
const NO_VISIBLE_GRAPH = "No graph is visible in the saved range. The saved work is shown below.";
const NO_DATA_CHART = "No chart was saved. The saved data is shown below.";
const NO_NUMERIC_DATA = "The saved chart has no plottable values in its selected columns. The saved data is shown below.";

function fraction(value: number, [min, max]: Bounds) {
  const span = max - min;
  if (Number.isFinite(span)) return (value - min) / span;
  return (value * .5 - min * .5) / (max * .5 - min * .5);
}

function coordinates(x: number, y: number): Point {
  const frame = ASSIGNMENT_PLOT_FRAME;
  return {
    x: frame.left + x * (frame.right - frame.left),
    y: frame.bottom - y * (frame.bottom - frame.top),
  };
}

function project(point: Point, axes: Axes): Point {
  return { x: fraction(point.x, axes.x), y: fraction(point.y, axes.y) };
}

function inside(point: Point) {
  return point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}

// Clip each stroke to the saved viewport. Each sampled segment stays separate
// across discontinuities and is never joined through an out-of-range interval.
function clipLine(start: Point, end: Point): readonly [Point, Point] | null {
  if (inside(start) && inside(end)) return [start, end];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (![dx, dy, start.x, start.y].every(Number.isFinite)) return null;
  let from = 0;
  let to = 1;
  for (const [direction, distance] of [[-dx, start.x], [dx, 1 - start.x], [-dy, start.y], [dy, 1 - start.y]]) {
    if (direction === 0) {
      if (distance < 0) return null;
      continue;
    }
    const ratio = distance / direction;
    if (direction < 0) from = Math.max(from, ratio);
    else to = Math.min(to, ratio);
    if (from > to) return null;
  }
  const endpoint = (t: number) => ({
    x: Math.max(0, Math.min(1, start.x + dx * t)),
    y: Math.max(0, Math.min(1, start.y + dy * t)),
  });
  return [endpoint(from), endpoint(to)];
}

function graphPaths(points: readonly Point[], axes: Axes): Point[][] {
  const visible: Point[][] = [];
  let active: Point[] | undefined;
  for (let index = 1; index < points.length; index += 1) {
    const start = project(points[index - 1]!, axes);
    const end = project(points[index]!, axes);
    const clipped = clipLine(start, end);
    if (!clipped) {
      active = undefined;
      continue;
    }
    const [from, to] = clipped;
    const a = coordinates(from.x, from.y);
    const b = coordinates(to.x, to.y);
    if (!active || !inside(start)) {
      active = [a];
      visible.push(active);
    }
    active.push(b);
  }
  return visible;
}

const tickNumber = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4, useGrouping: false });

function numericTick(value: number) {
  const absolute = Math.abs(value);
  return absolute !== 0 && (absolute < .001 || absolute >= 100_000)
    ? value.toExponential(1)
    : tickNumber.format(value);
}

function numericTicks([min, max]: Bounds, axis: "x" | "y"): Tick[] {
  return [0, .25, .5, .75, 1].map((step) => ({
    position: coordinates(step, step)[axis],
    label: numericTick(min * (1 - step) + max * step),
  }));
}

export function compactPlotLabel(label: string, length: number): string {
  const characters = Array.from(label.replace(/\s+/gu, " ").trim());
  return characters.length > length ? `${characters.slice(0, length - 1).join("")}…` : characters.join("");
}

function axesPlot(axes: Axes) {
  const xZero = fraction(0, axes.x);
  const yZero = fraction(0, axes.y);
  return {
    xTicks: numericTicks(axes.x, "x"),
    yTicks: numericTicks(axes.y, "y"),
    xZero: xZero >= 0 && xZero <= 1 ? coordinates(xZero, 0).x : null,
    yZero: yZero >= 0 && yZero <= 1 ? coordinates(0, yZero).y : null,
  };
}

export function projectAssignmentGraph(content: CanonicalRenderBlock<"graph">["content"]): AssignmentPlotProjection {
  const settings = readGraphSettings(content);
  const viewport = settings.viewport;
  const axes = { x: [viewport.xMin, viewport.xMax], y: [viewport.yMin, viewport.yMax] } as const;
  const marks: AssignmentPlotMark[] = [];
  const omitted: string[] = [];
  const hasEquation = Boolean(content.expression || content.series?.some((entry) => entry.expression));
  if (!hasEquation && !settings.photo && settings.points.length === 0) return null;
  if (hasEquation) {
    settings.series.forEach(({ expression, label }, index) => {
      if (!expression.trim()) return;
      const equation = EQUATION_PREFIX.test(expression) ? expression : `y = ${expression}`;
      const name = label && label !== equation && label !== expression ? `${label}: ${equation}` : equation;
      const paths = graphSegments(expression, { min: viewport.xMin, max: viewport.xMax })
        .flatMap((segment) => graphPaths(segment, axes));
      if (paths.length === 0) {
        omitted.push(compactPlotLabel(name, 80));
        return;
      }
      marks.push({ kind: "line", label: name, color: GRAPH_SERIES_COLORS[index]!, paths, dash: PLOT_DASH_PATTERNS[index] ?? [] });
    });
  }

  const readings = !hasEquation || settings.photo ? settings.points : [];
  if (readings.length > 0) {
    const points = readings.map((point) => project(point, axes)).filter(inside).map((point) => coordinates(point.x, point.y));
    const label = settings.photo ? `Confirmed readings from ${settings.photo.title}` : "Saved points";
    if (points.length > 0) marks.push({ kind: "points", label, color: ASSIGNMENT_PLOT_COLORS.data, points });
    if (points.length < readings.length) omitted.push(`${readings.length - points.length} readings outside the saved range`);
  }
  if (marks.length === 0 && settings.photo && readings.length === 0) {
    return { fallback: "No confirmed readings were saved from this graph photo." };
  }
  if (marks.length === 0) return { fallback: NO_VISIBLE_GRAPH };
  return { plot: {
    kind: hasEquation ? "function graph" : "plotted readings",
    xLabel: settings.xLabel || "x",
    yLabel: settings.yLabel || "y",
    ...axesPlot(axes),
    marks,
    note: omitted.length > 0 ? `Outside the saved plot or not plottable: ${omitted.join("; ")}.` : undefined,
  } };
}

function dataBounds(values: readonly number[], includeZero = false): Bounds {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (includeZero) {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (min !== max) return [min, max];
  const padding = Math.abs(min) * .05 || 1;
  return [Math.max(-Number.MAX_VALUE, min - padding), Math.min(Number.MAX_VALUE, max + padding)];
}

function categoryTicks(labels: readonly string[]): Tick[] {
  const count = Math.min(labels.length, 6);
  const chosen = Array.from({ length: count }, (_, index) =>
    count === 1 ? 0 : Math.round(index * (labels.length - 1) / (count - 1))
  );
  return chosen.map((index) => ({
    position: coordinates((index + .5) / labels.length, 0).x,
    label: compactPlotLabel(labels[index]!, 12),
  }));
}

function dataProjection(series: DataChartSeries): AssignmentPlotProjection {
  const numericX = series.xAxisType === "value";
  const datasetPoints = numericX ? series.points : series.values.map((y, index) => [index + .5, y] as const);
  if (datasetPoints.length === 0) return { fallback: NO_NUMERIC_DATA };
  const axes = {
    x: numericX ? dataBounds(datasetPoints.map(([x]) => x)) : [0, datasetPoints.length] as const,
    y: dataBounds(datasetPoints.map(([, y]) => y), series.type === "bar"),
  };
  const points = datasetPoints.map(([x, y]) => coordinates(fraction(x, axes.x), fraction(y, axes.y)));
  const style = { label: series.yLabel, color: ASSIGNMENT_PLOT_COLORS.data };
  const frame = ASSIGNMENT_PLOT_FRAME;
  const baseline = coordinates(0, fraction(0, axes.y)).y;
  const barWidth = (frame.right - frame.left) / points.length * .72;
  const mark: AssignmentPlotMark = series.type === "bar" ? {
    kind: "bars", ...style,
    bars: points.map(({ x, y }) => ({ x: x - barWidth / 2, y: Math.min(y, baseline), width: barWidth, height: Math.abs(y - baseline) })),
  } : series.type === "line" && points.length > 1 ? {
    kind: "line", ...style, paths: [points], dash: [],
  } : { kind: "points", ...style, points };
  return { plot: {
    kind: series.type === "scatter" ? "scatter plot" : series.type === "bar" ? "bar chart" : "line chart",
    xLabel: series.xLabel,
    yLabel: series.yLabel,
    ...axesPlot(axes),
    xTicks: numericX ? numericTicks(axes.x, "x") : categoryTicks(series.categories),
    xZero: null,
    marks: [mark],
  } };
}

export function assignmentPlotForBlock(block: CanonicalRenderBlock): AssignmentPlotProjection {
  if (block.type === "graph") return projectAssignmentGraph(block.content);
  if (block.type !== "lab_data" && block.type !== "spreadsheet") return null;
  const { dataset, chartConfig } = block.content;
  if (!dataset || !chartConfig) return { fallback: NO_DATA_CHART };
  const series = chartSeriesForDataset(dataset, chartConfig);
  return series ? dataProjection(series) : { fallback: NO_NUMERIC_DATA };
}

export function assignmentPlotPath(paths: readonly (readonly Point[])[]): string {
  return paths.flatMap((points) => points.map(({ x, y }, index) =>
    `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`,
  )).join(" ");
}
