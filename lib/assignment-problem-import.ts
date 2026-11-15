export type ImportedProblem = {
  number: number;
  text: string;
};

const NUMBERED_PROBLEM = /^\s*(?:problem\s*)?(\d{1,3})\s*[.)\]:-]\s*/imu;

/**
 * Keeps the import conservative: only clear numbered blocks become problems.
 * Ambiguous text stays together so students never lose an instruction paragraph.
 */
export function parseImportedProblems(text: string, maxProblems = 80): ImportedProblem[] {
  const normalized = text.replace(/\r\n?/gu, "\n").trim();
  if (!normalized) return [];
  const matches = [...normalized.matchAll(new RegExp(NUMBERED_PROBLEM.source, "gimu"))];
  if (matches.length < 2) return [];

  const problems = matches.flatMap((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? normalized.length;
    const value = normalized.slice(start, end).trim();
    const number = Number(match[1]);
    return value.length >= 2 && Number.isFinite(number) ? [{ number, text: value }] : [];
  });
  return problems.slice(0, maxProblems);
}
