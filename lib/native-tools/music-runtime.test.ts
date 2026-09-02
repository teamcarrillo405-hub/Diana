import { describe, expect, it } from "vitest";

import {
  MAX_SEQUENCE_NOTES,
  musicSequenceWithinPlaybackLimit,
  restoreMusicXmlImport,
  validateMusicXml,
} from "./music-runtime";

const score = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Bounded Study</work-title></work>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1"><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note></measure></part>
</score-partwise>`;

describe("bounded notation runtime", () => {
  it("validates view-only score-partwise MusicXML metadata", () => {
    const result = validateMusicXml(score, "study.musicxml");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.metadata).toEqual({
      fileName: "study.musicxml",
      title: "Bounded Study",
      partCount: 1,
      measureCount: 1,
      noteCount: 1,
    });
    expect(restoreMusicXmlImport(result.value)?.metadata.noteCount).toBe(1);
  });

  it("rejects external declarations, unsupported roots, and oversized playback", () => {
    expect(validateMusicXml(`<!DOCTYPE score [<!ENTITY ext SYSTEM "https://example.com/x">]>${score}`, "study.xml"))
      .toMatchObject({ ok: false });
    expect(validateMusicXml(score.replaceAll("score-partwise", "score-timewise"), "study.xml"))
      .toMatchObject({ ok: false });
    expect(musicSequenceWithinPlaybackLimit(Array.from(
      { length: MAX_SEQUENCE_NOTES + 1 },
      () => ({ pitch: "C4" as const, beats: 0.25 as const }),
    ))).toBe(false);
  });
});
