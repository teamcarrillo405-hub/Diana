import { describe, expect, it } from "vitest";

import {
  coarseCoordinate,
  normalizeMediaAnnotations,
  normalizeStroke,
  pitchFrequency,
  privacySafeMarker,
  validateStudentMap,
} from "./creative";

describe("map privacy and completeness", () => {
  it("uses coarse coordinates unless precise location is explicitly authorized", () => {
    const marker = {
      id: "home-area",
      latitude: 45.523064,
      longitude: -122.676483,
      label: "Study area",
      source: "USGS",
    };
    expect(coarseCoordinate(marker.latitude)).toBe(45.52);
    expect(privacySafeMarker(marker, false)).toMatchObject({ latitude: 45.52, longitude: -122.68 });
    expect(privacySafeMarker(marker, true)).toEqual(marker);
  });

  it("requires title, legend, attribution, and valid coordinates", () => {
    expect(validateStudentMap({
      title: "",
      legend: "",
      scale: "",
      sourceAttribution: "",
      markers: [{ id: "m", latitude: 100, longitude: 0, label: "", source: "" }],
    })).toEqual(["Add a map title.", "Add a legend.", "Add source attribution.", "Check marker coordinates."]);
  });
});

describe("creative artifact normalization", () => {
  it("bounds drawing strokes and retains student geometry", () => {
    expect(normalizeStroke({
      id: "stroke",
      color: "unsafe",
      width: 99,
      points: [{ x: -1, y: 2 }, { x: 0.5, y: 0.25 }],
    })).toEqual({
      id: "stroke",
      color: "#0f172a",
      width: 24,
      points: [{ x: 0, y: 1 }, { x: 0.5, y: 0.25 }],
    });
  });

  it("calculates notation playback pitch and normalizes timestamped evidence", () => {
    expect(pitchFrequency("A4")).toBeCloseTo(440);
    expect(normalizeMediaAnnotations([
      { id: "later", timeSeconds: 12, note: "  Revise this entrance. ", author: "student" },
      { id: "early", timeSeconds: -1, note: "Check breath support.", author: "teacher" },
      { id: "blank", timeSeconds: 2, note: " ", author: "student" },
    ], 10)).toEqual([
      { id: "early", timeSeconds: 0, note: "Check breath support.", author: "teacher" },
      { id: "later", timeSeconds: 10, note: "Revise this entrance.", author: "student" },
    ]);
  });
});
