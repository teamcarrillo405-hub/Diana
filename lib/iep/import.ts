export type IepImportSummary = {
  extraTimePct: number | null;
  accommodations: string[];
  ttsEnabled: boolean;
  dyslexiaFont: boolean;
  fontSize: "normal" | "large";
  lineSpacing: "normal" | "loose";
};

const ACCOMMODATION_PATTERNS: Array<{ id: string; pattern: RegExp }> = [
  { id: "extended_time", pattern: /extended time|extra time|time and (a )?half|double time|1\.5x|2x|50%|100%/i },
  { id: "reader", pattern: /text[- ]?to[- ]?speech|read aloud|reader|audio/i },
  { id: "scribe", pattern: /speech[- ]?to[- ]?text|scribe|dictation/i },
  { id: "breaks", pattern: /breaks?|movement break|frequent break/i },
  { id: "quiet_setting", pattern: /quiet|reduced distraction|separate setting/i },
  { id: "alternate_format", pattern: /alternate format|large print|digital copy|accessible format/i },
  { id: "reduced_quantity", pattern: /reduced (work|quantity)|shortened assignment/i },
];

export function parseIepText(text: string): IepImportSummary {
  const normalized = text.replace(/\s+/g, " ");
  const accommodations = new Set<string>();
  for (const item of ACCOMMODATION_PATTERNS) {
    if (item.pattern.test(normalized)) accommodations.add(item.id);
  }

  const extraTimePct = extractExtraTimePct(normalized);
  if (extraTimePct && extraTimePct > 0) accommodations.add("extended_time");

  const ttsEnabled = /text[- ]?to[- ]?speech|read aloud|reader|audio/i.test(normalized);
  const dyslexiaFont = /dyslexia|dyslexic|decoding|reading disability/i.test(normalized);

  return {
    extraTimePct,
    accommodations: [...accommodations],
    ttsEnabled,
    dyslexiaFont,
    fontSize: /large print|enlarged font|font size/i.test(normalized) ? "large" : "normal",
    lineSpacing: dyslexiaFont || /spacing|double spaced|increased spacing/i.test(normalized) ? "loose" : "normal",
  };
}

function extractExtraTimePct(text: string): number | null {
  if (/double time|2x|100% extra/i.test(text)) return 100;
  if (/time and (a )?half|1\.5x|50% extra|50% extended|50 percent/i.test(text)) return 50;
  const percent = text.match(/(\d{1,3})\s*%\s*(extra|extended)?\s*time/i);
  if (percent) return clamp(Number(percent[1]), 0, 100);
  const minutes = text.match(/(\d{1,3})\s*additional minutes/i);
  if (minutes) return clamp(Math.round((Number(minutes[1]) / 60) * 100), 0, 100);
  return null;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
