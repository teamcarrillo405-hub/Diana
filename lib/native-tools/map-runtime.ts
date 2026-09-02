import { area } from "@turf/area";
import { bbox } from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import { length } from "@turf/length";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  LineString,
  MultiLineString,
  Position,
} from "geojson";

export const MAX_GEOJSON_BYTES = 1_000_000;
export const MAX_GEOJSON_FEATURES = 500;
export const MAX_GEOJSON_COORDINATES = 10_000;
export const MAX_GEOJSON_PROPERTIES = 20;

export type SchoolGeoJsonAnalysis = {
  featureCount: number;
  coordinateCount: number;
  pointCount: number;
  lineCount: number;
  polygonCount: number;
  areaSquareKilometers: number;
  lineLengthKilometers: number;
  bounds: [number, number, number, number];
};

export type SchoolGeoJsonImport = {
  fileName: string;
  data: FeatureCollection<Geometry, GeoJsonProperties>;
  analysis: SchoolGeoJsonAnalysis;
};

export type SchoolGeoJsonImportResult =
  | { ok: true; value: SchoolGeoJsonImport }
  | { ok: false; error: string };

type CoordinateCounter = { value: number };

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function cleanText(value: unknown, maximum = 256): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ").trim().slice(0, maximum)
    : "";
}

function round(value: number, places = 6): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function normalizePosition(value: unknown, counter: CoordinateCounter): Position {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
    throw new TypeError("Each coordinate must contain longitude and latitude.");
  }
  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  const altitude = value.length === 3 ? Number(value[2]) : null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    (altitude !== null && !Number.isFinite(altitude))) {
    throw new TypeError("GeoJSON coordinates must use valid longitude and latitude values.");
  }
  counter.value += 1;
  if (counter.value > MAX_GEOJSON_COORDINATES) {
    throw new RangeError(`Keep GeoJSON imports under ${MAX_GEOJSON_COORDINATES.toLocaleString()} coordinates.`);
  }
  return altitude === null
    ? [round(longitude), round(latitude)]
    : [round(longitude), round(latitude), round(altitude, 3)];
}

function normalizeCoordinateTree(
  value: unknown,
  depth: number,
  counter: CoordinateCounter,
): unknown {
  if (depth === 1) return normalizePosition(value, counter);
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("GeoJSON coordinate arrays cannot be empty.");
  }
  return value.map((item) => normalizeCoordinateTree(item, depth - 1, counter));
}

function normalizeGeometry(value: unknown, counter: CoordinateCounter): Geometry {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Every feature needs a supported geometry.");
  }
  const source = value as Record<string, unknown>;
  const geometryType = source.type;
  const depthByType = {
    Point: 1,
    MultiPoint: 2,
    LineString: 2,
    MultiLineString: 3,
    Polygon: 3,
    MultiPolygon: 4,
  } as const;
  if (typeof geometryType !== "string" || !(geometryType in depthByType)) {
    throw new TypeError("Use Point, LineString, Polygon, or their multi-geometry variants.");
  }
  const coordinates = normalizeCoordinateTree(
    source.coordinates,
    depthByType[geometryType as keyof typeof depthByType],
    counter,
  );
  return { type: geometryType, coordinates } as Geometry;
}

function normalizeProperties(value: unknown): GeoJsonProperties {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const properties: Record<string, string | number | boolean | null> = {};
  for (const [rawKey, rawValue] of Object.entries(value).slice(0, MAX_GEOJSON_PROPERTIES)) {
    const key = cleanText(rawKey, 80);
    if (!key || key in properties) continue;
    if (typeof rawValue === "string") properties[key] = cleanText(rawValue, 512);
    else if (typeof rawValue === "number" && Number.isFinite(rawValue)) properties[key] = rawValue;
    else if (typeof rawValue === "boolean" || rawValue === null) properties[key] = rawValue;
  }
  return properties;
}

function normalizeFeature(
  value: unknown,
  index: number,
  counter: CoordinateCounter,
): Feature<Geometry, GeoJsonProperties> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`Feature ${index + 1} is not a GeoJSON feature.`);
  }
  const source = value as Record<string, unknown>;
  if (source.type !== "Feature") {
    throw new TypeError(`Item ${index + 1} must have type Feature.`);
  }
  const id = typeof source.id === "number" && Number.isFinite(source.id)
    ? source.id
    : cleanText(source.id, 120) || undefined;
  return {
    type: "Feature",
    ...(id === undefined ? {} : { id }),
    properties: normalizeProperties(source.properties),
    geometry: normalizeGeometry(source.geometry, counter),
  };
}

function analyzeGeoJson(
  data: FeatureCollection<Geometry, GeoJsonProperties>,
  coordinateCount: number,
): SchoolGeoJsonAnalysis {
  let pointCount = 0;
  let lineCount = 0;
  let polygonCount = 0;
  let lineLengthKilometers = 0;
  for (const item of data.features) {
    if (item.geometry.type === "Point" || item.geometry.type === "MultiPoint") pointCount += 1;
    if (item.geometry.type === "LineString" || item.geometry.type === "MultiLineString") {
      lineCount += 1;
      lineLengthKilometers += length(
        item as Feature<LineString | MultiLineString>,
        { units: "kilometers" },
      );
    }
    if (item.geometry.type === "Polygon" || item.geometry.type === "MultiPolygon") polygonCount += 1;
  }
  const rawBounds = bbox(data);
  return {
    featureCount: data.features.length,
    coordinateCount,
    pointCount,
    lineCount,
    polygonCount,
    areaSquareKilometers: round(area(data) / 1_000_000, 3),
    lineLengthKilometers: round(lineLengthKilometers, 3),
    bounds: rawBounds.slice(0, 4).map((value) => round(value)) as [number, number, number, number],
  };
}

export function parseSchoolGeoJson(
  sourceText: string,
  fileName = "student-map.geojson",
): SchoolGeoJsonImportResult {
  if (!/\.(?:geo)?json$/iu.test(fileName)) {
    return { ok: false, error: "Choose a .geojson or .json file." };
  }
  if (byteLength(sourceText) > MAX_GEOJSON_BYTES) {
    return { ok: false, error: "Keep GeoJSON imports under 1 MB for this beta workspace." };
  }
  if (sourceText.includes("\u0000")) {
    return { ok: false, error: "This GeoJSON file contains unsupported control data." };
  }
  try {
    const parsed = JSON.parse(sourceText) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new TypeError("The file must contain a GeoJSON FeatureCollection.");
    }
    const root = parsed as Record<string, unknown>;
    if (root.type !== "FeatureCollection" || !Array.isArray(root.features)) {
      throw new TypeError("The file must contain a GeoJSON FeatureCollection.");
    }
    if (root.features.length === 0) throw new TypeError("The GeoJSON file has no features to map.");
    if (root.features.length > MAX_GEOJSON_FEATURES) {
      throw new RangeError(`Keep GeoJSON imports under ${MAX_GEOJSON_FEATURES} features.`);
    }
    const counter = { value: 0 };
    const features = root.features.map((feature, index) =>
      normalizeFeature(feature, index, counter)
    );
    const data = featureCollection(features);
    if (byteLength(JSON.stringify(data)) > MAX_GEOJSON_BYTES) {
      throw new RangeError("The normalized GeoJSON exceeds the 1 MB workspace limit.");
    }
    return {
      ok: true,
      value: {
        fileName: cleanText(fileName, 160) || "student-map.geojson",
        data,
        analysis: analyzeGeoJson(data, counter.value),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error
        ? error.message
        : "This GeoJSON file could not be read.",
    };
  }
}

export function restoreSchoolGeoJsonImport(value: unknown): SchoolGeoJsonImport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const fileName = typeof source.fileName === "string"
    ? source.fileName
    : "student-map.geojson";
  try {
    const result = parseSchoolGeoJson(JSON.stringify(source.data), fileName);
    return result.ok ? result.value : null;
  } catch {
    return null;
  }
}
