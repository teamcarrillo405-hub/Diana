import type { GraphPoint } from "./deterministic";

export const GRAPH_SERIES_COLORS = ["#176347", "#5b365f", "#93610b"] as const;
export const MAX_GRAPH_CURVES = GRAPH_SERIES_COLORS.length;
export const MAX_PHOTO_READINGS = 12;
export const MAX_GRAPH_AXIS = 1_000_000;

export type GraphViewport = { xMin: number; xMax: number; yMin: number; yMax: number };
export type GraphCurve = { expression: string; label: string };
export type ImagePoint = { u: number; v: number };
export type PhotoCalibration = {
  origin: ImagePoint & GraphPoint;
  xTick: ImagePoint & { value: number };
  yTick: ImagePoint & { value: number };
};
export type GraphPhoto = { sourceId: string; title: string; calibration?: PhotoCalibration; marks: ImagePoint[] };

export const DEFAULT_GRAPH_VIEWPORT: GraphViewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= MAX_GRAPH_AXIS ? value : null;
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function readGraphViewport(value: unknown): GraphViewport | null {
  const source = record(value);
  const xMin = number(source.xMin), xMax = number(source.xMax), yMin = number(source.yMin), yMax = number(source.yMax);
  return xMin !== null && xMax !== null && yMin !== null && yMax !== null &&
    xMax - xMin >= 0.000001 && yMax - yMin >= 0.000001 ? { xMin, xMax, yMin, yMax } : null;
}

function imagePoint(value: unknown): ImagePoint | null {
  const point = record(value);
  const u = number(point.u), v = number(point.v);
  return u !== null && v !== null && u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { u, v } : null;
}

export function readPhotoCalibration(value: unknown): PhotoCalibration | null {
  const source = record(value);
  const origin = imagePoint(source.origin), xTick = imagePoint(source.xTick), yTick = imagePoint(source.yTick);
  const x = number(record(source.origin).x), y = number(record(source.origin).y);
  const xValue = number(record(source.xTick).value), yValue = number(record(source.yTick).value);
  if (!origin || !xTick || !yTick || x === null || y === null || xValue === null || yValue === null || x === xValue || y === yValue) return null;
  const ax = xTick.u - origin.u, ay = xTick.v - origin.v;
  const bx = yTick.u - origin.u, by = yTick.v - origin.v;
  const lengths = Math.hypot(ax, ay) * Math.hypot(bx, by);
  if (lengths < 0.0004 || Math.abs(ax * by - ay * bx) < 0.15 * lengths) return null;
  return { origin: { ...origin, x, y }, xTick: { ...xTick, value: xValue }, yTick: { ...yTick, value: yValue } };
}

export function readGraphPhoto(value: unknown): GraphPhoto | undefined {
  const source = record(value);
  const sourceId = text(source.sourceId, 36);
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/iu.test(sourceId)) return;
  const calibration = readPhotoCalibration(source.calibration);
  const marks = Array.isArray(source.marks) && calibration
    ? source.marks.slice(0, MAX_PHOTO_READINGS).flatMap((mark) => imagePoint(mark) ?? []) : [];
  return { sourceId, title: text(source.title, 160) || "Graph photo", ...(calibration ? { calibration } : {}), marks };
}

export function readGraphSettings(value: unknown) {
  const source = record(value);
  const expression = text(source.expression, 160);
  const series = Array.isArray(source.series) ? source.series.slice(0, MAX_GRAPH_CURVES).map((item) => {
    const curve = record(item);
    return { expression: text(curve.expression, 160), label: text(curve.label, 48) };
  }) : expression ? [{ expression, label: "" }] : [];
  return {
    series,
    viewport: readGraphViewport(source.viewport) ?? DEFAULT_GRAPH_VIEWPORT,
    xLabel: text(source.xLabel, 48) || "x",
    yLabel: text(source.yLabel, 48) || "y",
    photo: readGraphPhoto(source.photo),
    points: Array.isArray(source.points) ? source.points.slice(0, 2_000).flatMap((item): GraphPoint[] => {
      const point = record(item);
      const x = number(point.x), y = number(point.y);
      return x === null || y === null ? [] : [{ x, y }];
    }) : [],
  };
}

export function pointFromPhoto(point: ImagePoint, calibration: PhotoCalibration): GraphPoint | null {
  const { origin, xTick, yTick } = calibration;
  const ax = xTick.u - origin.u, ay = xTick.v - origin.v;
  const bx = yTick.u - origin.u, by = yTick.v - origin.v;
  const det = ax * by - ay * bx;
  const u = point.u - origin.u, v = point.v - origin.v;
  const x = origin.x + ((u * by - v * bx) / det) * (xTick.value - origin.x);
  const y = origin.y + ((ax * v - ay * u) / det) * (yTick.value - origin.y);
  return number(x) === null || number(y) === null ? null : { x: Number(x.toPrecision(6)), y: Number(y.toPrecision(6)) };
}

export function photoPlotViewport(calibration: PhotoCalibration, points: readonly GraphPoint[]): GraphViewport {
  function extent(values: number[]) {
    const min = Math.min(...values), max = Math.max(...values);
    const padding = Math.max((max - min) * .12, .001);
    return { min: Math.max(-MAX_GRAPH_AXIS, min - padding), max: Math.min(MAX_GRAPH_AXIS, max + padding) };
  }
  const x = extent([calibration.origin.x, calibration.xTick.value, ...points.map((point) => point.x)]);
  const y = extent([calibration.origin.y, calibration.yTick.value, ...points.map((point) => point.y)]);
  return { xMin: x.min, xMax: x.max, yMin: y.min, yMax: y.max };
}

// A conservative candidate for an unobstructed, upright pair of dark axes.
// It supplies a pixel location only. Scale and labels still come from the worksheet.
export function suggestPhotoAxisCrossing(data: Uint8ClampedArray, width: number, height: number): ImagePoint | null {
  if (width < 20 || height < 20 || width > 320 || height > 320 || data.length !== width * height * 4) return null;
  const rows = new Uint16Array(height), cols = new Uint16Array(width);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const offset = (y * width + x) * 4;
      if (data[offset + 3] >= 200 && Math.max(data[offset], data[offset + 1], data[offset + 2]) < 90) {
        rows[y]++;
        cols[x]++;
      }
    }
  }
  const longest = (counts: Uint16Array, length: number) => {
    let best = 0;
    for (let index = Math.ceil(counts.length * .03); index < counts.length * .97; index++) {
      if (counts[index] > counts[best]) best = index;
    }
    return counts[best] < length * .48 ? null : best;
  };
  const x = longest(cols, height), y = longest(rows, width);
  return x === null || y === null ? null : { u: x / width, v: y / height };
}
