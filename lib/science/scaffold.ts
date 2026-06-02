export type ScienceScaffoldMode =
  | "hypothesis"
  | "lab_report"
  | "method"
  | "formula"
  | "chemistry_balance"
  | "diagram"
  | "frq";

export type ScienceCard = {
  label: string;
  prompt: string;
  exampleFrame: string | null;
};

export type ScienceScaffoldResult = {
  mode: ScienceScaffoldMode;
  title: string;
  cards: ScienceCard[];
  formulaContext: Array<{ variable: string; meaning: string; unit: string | null }>;
  mermaid: string | null;
  checkPrompt: string;
};

export function parseScienceScaffoldResponse(
  content: string,
  mode: ScienceScaffoldMode,
): ScienceScaffoldResult {
  const json = extractJsonObject(content);
  if (!json) return fallbackScienceScaffold(mode);
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const cards = normalizeCards(parsed.cards);
    return {
      mode,
      title: stringOr(parsed.title, titleForMode(mode)),
      cards: cards.length > 0 ? cards : fallbackScienceScaffold(mode).cards,
      formulaContext: normalizeFormulaContext(parsed.formulaContext),
      mermaid: nullableString(parsed.mermaid),
      checkPrompt: stringOr(parsed.checkPrompt, fallbackScienceScaffold(mode).checkPrompt),
    };
  } catch {
    return fallbackScienceScaffold(mode);
  }
}

export function fallbackScienceScaffold(mode: ScienceScaffoldMode): ScienceScaffoldResult {
  return {
    mode,
    title: titleForMode(mode),
    cards: fallbackCards(mode),
    formulaContext: [],
    mermaid: mode === "diagram" ? "flowchart TD\n  A[Start with what you observe]\n  B[Connect it to the science idea]\n  A --> B" : null,
    checkPrompt: "Pause and name what evidence would support the next step.",
  };
}

function fallbackCards(mode: ScienceScaffoldMode): ScienceCard[] {
  if (mode === "lab_report") {
    return [
      card("Question", "What question is this lab trying to answer?", "This lab asks whether..."),
      card("Data", "What measurements or observations belong in the table?", "Measure..., record..."),
      card("Claim", "What does the pattern in the data suggest?", "The data suggests..."),
    ];
  }
  if (mode === "chemistry_balance") {
    return [
      card("Count atoms", "List each element and count atoms on both sides.", null),
      card("Pick one element", "Balance one element that appears in only one compound per side.", null),
      card("Recount", "Recount before changing another coefficient.", null),
    ];
  }
  if (mode === "frq") {
    return [
      card("Claim", "Write the science claim in one sentence.", "The evidence supports..."),
      card("Evidence", "Pick the data or observation that supports the claim.", "The data shows..."),
      card("Reasoning", "Explain the science rule connecting them.", "This happens because..."),
    ];
  }
  return [
    card("Predict", "What do you think will happen before reading the explanation?", "I predict..."),
    card("Explain", "What science idea connects to your prediction?", "This connects to..."),
    card("Check", "What observation would make the prediction stronger?", "I would look for..."),
  ];
}

function card(label: string, prompt: string, exampleFrame: string | null): ScienceCard {
  return { label, prompt, exampleFrame };
}

function normalizeCards(value: unknown): ScienceCard[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, `Step ${index + 1}`).slice(0, 80),
      prompt: stringOr(item.prompt, "").slice(0, 400),
      exampleFrame: nullableString(item.exampleFrame),
    };
  }).filter((item) => item.prompt.length > 0);
}

function normalizeFormulaContext(value: unknown): ScienceScaffoldResult["formulaContext"] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      variable: stringOr(item.variable, "").slice(0, 24),
      meaning: stringOr(item.meaning, "").slice(0, 160),
      unit: nullableString(item.unit),
    };
  }).filter((item) => item.variable.length > 0 && item.meaning.length > 0);
}

function titleForMode(mode: ScienceScaffoldMode): string {
  return mode === "hypothesis"
    ? "Hypothesis scaffold"
    : mode === "lab_report"
    ? "Lab report builder"
    : mode === "method"
    ? "Scientific method coach"
    : mode === "formula"
    ? "Formula context"
    : mode === "chemistry_balance"
    ? "Chemistry balancer"
    : mode === "diagram"
    ? "Science diagram"
    : "FRQ scaffold";
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

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
