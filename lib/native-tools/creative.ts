export type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  source: string;
};

export type StudentMap = {
  title: string;
  legend: string;
  scale: string;
  sourceAttribution: string;
  markers: MapMarker[];
};

export function coarseCoordinate(value: number, precision = 2): number {
  const safePrecision = Math.min(3, Math.max(0, Math.trunc(precision)));
  const factor = 10 ** safePrecision;
  return Math.round(value * factor) / factor;
}

export function privacySafeMarker(
  marker: MapMarker,
  preciseLocationAuthorized: boolean,
): MapMarker {
  return preciseLocationAuthorized
    ? marker
    : {
        ...marker,
        latitude: coarseCoordinate(marker.latitude),
        longitude: coarseCoordinate(marker.longitude),
      };
}

export function validateStudentMap(map: StudentMap): string[] {
  return [
    !map.title.trim() ? "Add a map title." : "",
    !map.legend.trim() ? "Add a legend." : "",
    !map.sourceAttribution.trim() ? "Add source attribution." : "",
    map.markers.some((marker) =>
      !Number.isFinite(marker.latitude) ||
      marker.latitude < -90 ||
      marker.latitude > 90 ||
      !Number.isFinite(marker.longitude) ||
      marker.longitude < -180 ||
      marker.longitude > 180
    ) ? "Check marker coordinates." : "",
  ].filter(Boolean);
}

export type DrawingPoint = { x: number; y: number };
export type DrawingStroke = {
  id: string;
  color: string;
  width: number;
  points: DrawingPoint[];
};

export function normalizeStroke(stroke: DrawingStroke): DrawingStroke {
  return {
    id: stroke.id.slice(0, 100),
    color: /^#[0-9a-f]{6}$/iu.test(stroke.color) ? stroke.color : "#0f172a",
    width: Math.min(24, Math.max(1, stroke.width)),
    points: stroke.points.slice(0, 10_000).map((point) => ({
      x: Math.min(1, Math.max(0, point.x)),
      y: Math.min(1, Math.max(0, point.y)),
    })),
  };
}

export const MUSIC_PITCHES = [
  "C4", "D4", "E4", "F4", "G4", "A4", "B4",
  "C5", "D5", "E5", "F5", "G5", "A5", "B5",
] as const;
export type MusicPitch = (typeof MUSIC_PITCHES)[number];
export type MusicNote = {
  pitch: MusicPitch;
  beats: 0.25 | 0.5 | 1 | 2 | 4;
};

export function pitchFrequency(pitch: MusicPitch): number {
  const noteOffsets = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as const;
  const note = pitch[0] as keyof typeof noteOffsets;
  const octave = Number(pitch[1]);
  const midi = (octave + 1) * 12 + noteOffsets[note];
  return 440 * 2 ** ((midi - 69) / 12);
}

export type MediaAnnotation = {
  id: string;
  timeSeconds: number;
  note: string;
  author: "student" | "teacher";
};

export function normalizeMediaAnnotations(
  annotations: readonly MediaAnnotation[],
  durationSeconds: number,
): MediaAnnotation[] {
  return annotations
    .filter((annotation) => annotation.note.trim())
    .map((annotation) => ({
      ...annotation,
      timeSeconds: Math.min(
        Math.max(0, Number.isFinite(annotation.timeSeconds) ? annotation.timeSeconds : 0),
        Math.max(0, durationSeconds),
      ),
      note: annotation.note.trim().slice(0, 2000),
    }))
    .sort((left, right) => left.timeSeconds - right.timeSeconds);
}
