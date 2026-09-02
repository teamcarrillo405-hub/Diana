import { describe, expect, it } from "vitest";

import {
  MAX_GEOJSON_FEATURES,
  parseSchoolGeoJson,
  restoreSchoolGeoJsonImport,
} from "./map-runtime";

const schoolMap = JSON.stringify({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Observation", nested: { ignored: true } },
      geometry: { type: "Point", coordinates: [0.25, 0.25] },
    },
    {
      type: "Feature",
      properties: { name: "Transect" },
      geometry: { type: "LineString", coordinates: [[0, 0], [0, 1]] },
    },
    {
      type: "Feature",
      properties: { name: "Study area" },
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    },
  ],
});

describe("bounded school GeoJSON runtime", () => {
  it("normalizes and analyzes a local feature collection with Turf", () => {
    const result = parseSchoolGeoJson(schoolMap, "field-study.geojson");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.analysis).toMatchObject({
      featureCount: 3,
      coordinateCount: 8,
      pointCount: 1,
      lineCount: 1,
      polygonCount: 1,
      bounds: [0, 0, 1, 1],
    });
    expect(result.value.analysis.areaSquareKilometers).toBeGreaterThan(12_000);
    expect(result.value.analysis.lineLengthKilometers).toBeCloseTo(111.2, 0);
    expect(result.value.data.features[0]?.properties).toEqual({ name: "Observation" });
    expect(restoreSchoolGeoJsonImport(result.value)?.analysis.featureCount).toBe(3);
  });

  it("rejects unsupported roots, coordinates, and feature counts", () => {
    expect(parseSchoolGeoJson(JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [0, 0] },
    }), "map.geojson")).toMatchObject({ ok: false });
    expect(parseSchoolGeoJson(JSON.stringify({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [181, 0] },
      }],
    }), "map.geojson")).toMatchObject({ ok: false });
    expect(parseSchoolGeoJson(JSON.stringify({
      type: "FeatureCollection",
      features: Array.from({ length: MAX_GEOJSON_FEATURES + 1 }, () => ({})),
    }), "map.geojson")).toMatchObject({ ok: false });
  });
});
