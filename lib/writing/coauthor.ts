export type WritingCoauthorMode =
  | "essay_scaffold"
  | "cowrite"
  | "transition"
  | "evidence"
  | "argument"
  | "readability"
  | "tone";

export type WritingSuggestion = {
  label: string;
  text: string;
  rationale: string;
  action: string;
};

export type WritingCoauthorResult = {
  mode: WritingCoauthorMode;
  title: string;
  suggestions: WritingSuggestion[];
  authorshipNote: string;
};

export function parseWritingCoauthorResponse(
  content: string,
  mode: WritingCoauthorMode,
): WritingCoauthorResult {
  const json = extractJsonObject(content);
  if (!json) return fallbackWritingResult(mode);
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const suggestions = normalizeSuggestions(parsed.suggestions);
    return {
      mode,
      title: stringOr(parsed.title, titleForMode(mode)),
      suggestions: suggestions.length > 0 ? suggestions : fallbackWritingResult(mode).suggestions,
      authorshipNote: stringOr(
        parsed.authorshipNote,
        "Keep student wording as the source of truth.",
      ),
    };
  } catch {
    return fallbackWritingResult(mode);
  }
}

export function authorshipPercent(studentChars: number, acceptedAiChars: number): number {
  const student = Math.max(0, studentChars);
  const ai = Math.max(0, acceptedAiChars);
  const total = student + ai;
  if (total === 0) return 100;
  return Math.round((student / total) * 100);
}

function fallbackWritingResult(mode: WritingCoauthorMode): WritingCoauthorResult {
  return {
    mode,
    title: titleForMode(mode),
    suggestions: [
      {
        label: "Next move",
        text: fallbackText(mode),
        rationale: "This keeps the draft student-led.",
        action: "Use it as a prompt, then write your own line.",
      },
    ],
    authorshipNote: "Student wording stays primary.",
  };
}

function fallbackText(mode: WritingCoauthorMode): string {
  switch (mode) {
    case "essay_scaffold":
      return "State your claim, choose two pieces of evidence, then explain how each one supports the claim.";
    case "cowrite":
      return "One possible next phrase is...";
    case "transition":
      return "Name the relationship between these paragraphs before adding a bridge.";
    case "evidence":
      return "Pick one quote or note line, then explain why it belongs in this paragraph.";
    case "argument":
      return "Check that the claim, evidence, and reasoning all point to the same idea.";
    case "readability":
      return "Find the longest sentence and split it at a natural pause.";
    case "tone":
      return "Look for vague words and replace one with a concrete noun or verb.";
  }
}

function normalizeSuggestions(value: unknown): WritingSuggestion[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, `Suggestion ${index + 1}`).slice(0, 80),
      text: stringOr(item.text, "").slice(0, 800),
      rationale: stringOr(item.rationale, "Use this as a guide.").slice(0, 400),
      action: stringOr(item.action, "Try this in your own words.").slice(0, 240),
    };
  }).filter((item) => item.text.length > 0);
}

function titleForMode(mode: WritingCoauthorMode): string {
  return mode === "essay_scaffold"
    ? "Essay scaffold"
    : mode === "cowrite"
    ? "Co-write suggestion"
    : mode === "transition"
    ? "Transition check"
    : mode === "evidence"
    ? "Evidence finder"
    : mode === "argument"
    ? "Argument check"
    : mode === "readability"
    ? "Readability tune"
    : "Tone check";
}

function extractJsonObject(content: string): string | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return content.slice(start, end + 1);
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}
