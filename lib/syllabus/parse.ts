// Heuristic syllabus parser — pulls key dates and policy lines out of pasted
// syllabus text. No AI/network: regex + keyword matching, safe to run inline.

export type SyllabusKeyDate = { date: string; label: string };
export type SyllabusPolicy = { kind: string; text: string };
export type ParsedSyllabus = { keyDates: SyllabusKeyDate[]; policies: SyllabusPolicy[] };

const MONTHS =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

// "Jan 15", "January 15, 2026", "3/15", "03/15/2026", "Week 4"
const DATE_RE = new RegExp(
  `(\\b${MONTHS}\\.?\\s+\\d{1,2}(?:,?\\s*\\d{4})?\\b)` +
    `|(\\b\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?\\b)` +
    `|(\\bweek\\s+\\d{1,2}\\b)`,
  "i",
);

const POLICY_KEYWORDS: { kind: string; patterns: RegExp }[] = [
  { kind: "Late work", patterns: /\b(late|past due|deadline|penalt)/i },
  { kind: "Grading", patterns: /\b(grad(e|ing)|weight|percent|points|rubric|curve)/i },
  { kind: "Attendance", patterns: /\b(attendance|absent|tard)/i },
  { kind: "Academic integrity", patterns: /\b(integrity|plagiar|cheat|original work|ai (use|policy))/i },
  { kind: "Participation", patterns: /\b(participation|discussion)/i },
  { kind: "Extra credit", patterns: /\b(extra credit|bonus)/i },
];

export function parseSyllabusText(raw: string): ParsedSyllabus {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const keyDates: SyllabusKeyDate[] = [];
  const seenDates = new Set<string>();
  const policies: SyllabusPolicy[] = [];
  const seenPolicyKinds = new Set<string>();

  for (const line of lines) {
    const match = DATE_RE.exec(line);
    if (match && keyDates.length < 25) {
      const date = match[0];
      // Label = the line with the date removed, trimmed; fall back to the date.
      const label = line.replace(date, "").replace(/^[\s\-–—:•·.]+|[\s\-–—:•·.]+$/g, "").trim();
      const key = `${date}|${label}`.toLowerCase();
      if (!seenDates.has(key)) {
        seenDates.add(key);
        keyDates.push({ date, label: label || "Key date" });
      }
    }

    for (const { kind, patterns } of POLICY_KEYWORDS) {
      if (seenPolicyKinds.has(kind)) continue;
      if (patterns.test(line)) {
        seenPolicyKinds.add(kind);
        policies.push({ kind, text: line.slice(0, 280) });
      }
    }
  }

  return { keyDates, policies };
}
