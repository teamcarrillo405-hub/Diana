import { SaxesParser } from "saxes";

import type { MusicNote } from "@/lib/native-tools/creative";

export const MAX_MUSIC_XML_BYTES = 512_000;
export const MAX_MUSIC_XML_ELEMENTS = 20_000;
export const MAX_MUSIC_XML_PARTS = 16;
export const MAX_MUSIC_XML_MEASURES = 500;
export const MAX_MUSIC_XML_NOTES = 2_000;
export const MAX_SEQUENCE_NOTES = 256;
export const MAX_SEQUENCE_SECONDS = 60;

export type MusicXmlMetadata = {
  fileName: string;
  title: string;
  partCount: number;
  measureCount: number;
  noteCount: number;
};

export type MusicXmlImport = {
  xml: string;
  metadata: MusicXmlMetadata;
};

export type MusicXmlImportResult =
  | { ok: true; value: MusicXmlImport }
  | { ok: false; error: string };

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function safeText(value: string, maximum: number): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ").replaceAll(/\s+/gu, " ").trim().slice(0, maximum);
}

export function validateMusicXml(
  sourceText: string,
  fileName = "student-score.musicxml",
): MusicXmlImportResult {
  if (!/\.(?:musicxml|xml)$/iu.test(fileName)) {
    return { ok: false, error: "Choose an uncompressed .musicxml or .xml score." };
  }
  if (byteLength(sourceText) > MAX_MUSIC_XML_BYTES) {
    return { ok: false, error: "Keep MusicXML imports under 512 KB for this beta viewer." };
  }
  if (/<!\s*(?:DOCTYPE|ENTITY)/iu.test(sourceText) || sourceText.includes("\u0000")) {
    return { ok: false, error: "This MusicXML file contains unsupported external or control data." };
  }
  try {
    const parser = new SaxesParser({ xmlns: true, position: false });
    const stack: string[] = [];
    let root = "";
    let elementCount = 0;
    let partCount = 0;
    let measureCount = 0;
    let noteCount = 0;
    let title = "";
    let titleBuffer = "";

    parser.on("doctype", () => {
      throw new TypeError("Document type declarations are not supported.");
    });
    parser.on("error", (error) => {
      throw error;
    });
    parser.on("opentag", (tag) => {
      elementCount += 1;
      if (elementCount > MAX_MUSIC_XML_ELEMENTS) {
        throw new RangeError(`Keep MusicXML imports under ${MAX_MUSIC_XML_ELEMENTS.toLocaleString()} elements.`);
      }
      if (tag.uri === "http://www.w3.org/2001/XInclude") {
        throw new TypeError("External XML includes are not supported.");
      }
      stack.push(tag.local);
      if (stack.length === 1) root = tag.local;
      if (tag.local === "part" && stack.at(-2) === root) partCount += 1;
      if (tag.local === "measure") measureCount += 1;
      if (tag.local === "note") noteCount += 1;
      if (tag.local === "work-title" || tag.local === "movement-title") titleBuffer = "";
      if (partCount > MAX_MUSIC_XML_PARTS) {
        throw new RangeError(`Keep MusicXML imports under ${MAX_MUSIC_XML_PARTS} parts.`);
      }
      if (measureCount > MAX_MUSIC_XML_MEASURES) {
        throw new RangeError(`Keep MusicXML imports under ${MAX_MUSIC_XML_MEASURES} measures.`);
      }
      if (noteCount > MAX_MUSIC_XML_NOTES) {
        throw new RangeError(`Keep MusicXML imports under ${MAX_MUSIC_XML_NOTES.toLocaleString()} notes.`);
      }
    });
    parser.on("text", (text) => {
      const current = stack.at(-1);
      if (current === "work-title" || current === "movement-title") titleBuffer += text;
    });
    parser.on("closetag", (tag) => {
      if ((tag.local === "work-title" || tag.local === "movement-title") && !title) {
        title = safeText(titleBuffer, 160);
      }
      stack.pop();
    });
    parser.write(sourceText).close();

    if (root !== "score-partwise") {
      throw new TypeError("This beta viewer supports score-partwise MusicXML files.");
    }
    if (partCount === 0 || measureCount === 0) {
      throw new TypeError("The MusicXML file does not contain a playable score structure.");
    }
    return {
      ok: true,
      value: {
        xml: sourceText,
        metadata: {
          fileName: fileName.split(/[\\/]/u).at(-1)?.slice(0, 160) || "student-score.musicxml",
          title,
          partCount,
          measureCount,
          noteCount,
        },
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "This MusicXML score could not be read.",
    };
  }
}

export function restoreMusicXmlImport(value: unknown): MusicXmlImport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (typeof source.xml !== "string") return null;
  const metadata = source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
    ? source.metadata as Record<string, unknown>
    : {};
  const fileName = typeof metadata.fileName === "string"
    ? metadata.fileName
    : "student-score.musicxml";
  const result = validateMusicXml(source.xml, fileName);
  return result.ok ? result.value : null;
}

export function boundedMusicSequence(notes: readonly MusicNote[]): MusicNote[] {
  return notes.slice(0, MAX_SEQUENCE_NOTES).filter((note) =>
    Number.isFinite(note.beats) && note.beats > 0 && note.beats <= 4
  );
}

export function musicSequenceSeconds(notes: readonly MusicNote[], bpm = 120): number {
  const safeBpm = Math.min(240, Math.max(40, bpm));
  return boundedMusicSequence(notes).reduce((seconds, note) =>
    seconds + note.beats * (60 / safeBpm), 0
  );
}

export function musicSequenceWithinPlaybackLimit(
  notes: readonly MusicNote[],
  bpm = 120,
): boolean {
  return notes.length <= MAX_SEQUENCE_NOTES && musicSequenceSeconds(notes, bpm) <= MAX_SEQUENCE_SECONDS;
}

export async function playBoundedMusicSequence(
  notes: readonly MusicNote[],
  bpm = 120,
): Promise<{ ok: true; durationSeconds: number } | { ok: false; error: string }> {
  const bounded = boundedMusicSequence(notes);
  const durationSeconds = musicSequenceSeconds(bounded, bpm);
  if (bounded.length !== notes.length || durationSeconds > MAX_SEQUENCE_SECONDS) {
    return { ok: false, error: "Keep notation playback under 256 notes and 60 seconds." };
  }
  if (typeof window === "undefined") {
    return { ok: false, error: "Notation playback is available in the browser workspace." };
  }
  try {
    const Tone = await import("tone");
    await Tone.start();
    const synth = new Tone.Synth({ volume: -12 }).toDestination();
    let start = Tone.now() + 0.05;
    const beatSeconds = 60 / Math.min(240, Math.max(40, bpm));
    for (const note of bounded) {
      const noteSeconds = note.beats * beatSeconds;
      synth.triggerAttackRelease(note.pitch, noteSeconds * 0.9, start);
      start += noteSeconds;
    }
    await new Promise((resolve) => window.setTimeout(resolve, Math.ceil((durationSeconds + 0.15) * 1_000)));
    synth.dispose();
    return { ok: true, durationSeconds };
  } catch {
    return { ok: false, error: "The local notation player could not start. The score remains available without playback." };
  }
}
