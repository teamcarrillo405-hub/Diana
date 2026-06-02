const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

const MAJOR_STEPS = [2, 2, 1, 2, 2, 2, 1];
const NATURAL_MINOR_STEPS = [2, 1, 2, 2, 1, 2, 2];

export type ScaleMode = "major" | "minor";
export type TriadQuality = "major" | "minor";

function normalizeRoot(root: string): string {
  const trimmed = root.trim();
  return FLAT_TO_SHARP[trimmed] ?? trimmed.toUpperCase().replace(/([A-G])#/, "$1#");
}

export function buildScale(root: string, mode: ScaleMode): string[] {
  const normalized = normalizeRoot(root);
  const start = CHROMATIC.indexOf(normalized as (typeof CHROMATIC)[number]);
  if (start < 0) return [];
  const steps = mode === "major" ? MAJOR_STEPS : NATURAL_MINOR_STEPS;
  const notes = [CHROMATIC[start]];
  let idx = start;
  for (const step of steps.slice(0, -1)) {
    idx = (idx + step) % CHROMATIC.length;
    notes.push(CHROMATIC[idx]);
  }
  return notes;
}

export function buildTriad(root: string, quality: TriadQuality): string[] {
  const scale = buildScale(root, quality);
  if (scale.length < 5) return [];
  return [scale[0], scale[2], scale[4]];
}

export function intervalName(semitones: number): string {
  return ({
    0: "unison",
    1: "minor 2nd",
    2: "major 2nd",
    3: "minor 3rd",
    4: "major 3rd",
    5: "perfect 4th",
    6: "tritone",
    7: "perfect 5th",
    8: "minor 6th",
    9: "major 6th",
    10: "minor 7th",
    11: "major 7th",
    12: "octave",
  } as Record<number, string>)[Math.abs(semitones)] ?? `${Math.abs(semitones)} semitones`;
}
